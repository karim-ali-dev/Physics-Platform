const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, uploadsDir } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload, validateFileSignature } = require('../middleware/upload');
const { saveFile, deleteByUrl } = require('../storage');
const {
  validate, courseSchema, lessonSchema, quizSchema, questionSchema,
  testimonialSchema, testimonialStatusSchema, faqSchema, settingsSchema, scheduleSchema, paymentStatusSchema,
  materialSchema, taskSchema
} = require('../middleware/validate');
const { audit } = require('../security');
const { getCached, setCached, clearCache } = require('../cache');
const { sendSpreadsheet, sendWorkbook, isoToDisplay } = require('../exports');
const { ah } = require('../asyncHandler');

const router = express.Router();
router.use(requireAuth);

const toInt = (v, def = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

const safePath = (url) => {
  const file = path.join(uploadsDir, path.basename(url || ''));
  return file.startsWith(uploadsDir) ? file : null;
};

const deleteUpload = (url) => {
  deleteByUrl(url).catch(() => {});
};

function bookingListQuery(q) {
  const where = [];
  const params = [];
  if (q.status === 'new' || q.status === 'done') {
    where.push('status = ?');
    params.push(q.status);
  }
  if (q.governorate) {
    where.push('governorate = ?');
    params.push(String(q.governorate));
  }
  if (q.academic_year) {
    where.push('academic_year = ?');
    params.push(String(q.academic_year));
  }
  if (q.grade) {
    where.push('grade = ?');
    params.push(String(q.grade));
  }
  if (q.search) {
    where.push('(student_name LIKE ? OR parent_name LIKE ? OR phone LIKE ? OR parent_phone LIKE ?)');
    const like = `%${String(q.search).trim()}%`;
    params.push(like, like, like, like);
  }
  const sql = `SELECT * FROM bookings${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`;
  return { sql, params };
}

/* ---------------- Dashboard ---------------- */
const CAIRO = 'Africa/Cairo';

function cairoDayStrings(n) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: CAIRO, year: 'numeric', month: '2-digit', day: '2-digit' });
  const base = Date.now();
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(fmt.format(new Date(base - i * 86400000)));
  return out;
}

function cairoDayStartUtc(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  let t = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: CAIRO, year: 'numeric', month: '2-digit', day: '2-digit' });
  for (let g = 0; g < 48; g++) {
    if (fmt.format(new Date(t)) >= dateStr) break;
    t += 3600000;
  }
  return new Date(t).toISOString();
}

function cairoNowParts() {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO, hour: '2-digit', minute: '2-digit', hour12: false });
  const p = fmt.formatToParts(new Date());
  const get = (t) => (p.find((x) => x.type === t) || {}).value || '';
  let h = parseInt(get('hour'), 10);
  if (h === 24) h = 0;
  return { hour: h, minute: parseInt(get('minute'), 10) };
}
router.get('/dashboard', ah(async (req, res) => {
  const cached = getCached('admin:dashboard');
  if (cached) return res.json(cached);

  const count = async (table) => (await db.get(`SELECT COUNT(*) AS c FROM ${table}`)).c;
  const unread = (await db.get('SELECT COUNT(*) AS c FROM messages WHERE is_read = 0')).c;
  const students = (await db.get('SELECT COUNT(*) AS c FROM customers')).c;
  const enrolled = (await db.get('SELECT COUNT(*) AS c FROM enrollments')).c;
  const watched = (await db.get('SELECT COUNT(*) AS c FROM lesson_progress WHERE watched = 1')).c;
  const attempts = (await db.get('SELECT COUNT(*) AS c FROM quiz_attempts')).c;
  const payments = (await db.get('SELECT COUNT(*) AS c FROM payments')).c;
  const pendingPayments = (await db.get("SELECT COUNT(*) AS c FROM payments WHERE status = 'pending'")).c;
  const bookings = (await db.get('SELECT COUNT(*) AS c FROM bookings')).c;
  const pendingBookings = (await db.get("SELECT COUNT(*) AS c FROM bookings WHERE status = 'new'")).c;
  const pendingTestimonials = (await db.get("SELECT COUNT(*) AS c FROM testimonials WHERE status = 'pending'")).c;
  const materials = (await db.get('SELECT COUNT(*) AS c FROM materials WHERE active = 1')).c;
  const paymentsTotal = (await db.get("SELECT COALESCE(SUM(amount), 0) AS s FROM payments WHERE status = 'paid'")).s;
  const avgScore = (await db.get('SELECT COALESCE(ROUND(AVG(CAST(score AS REAL) / total * 100)), 0) AS a FROM quiz_attempts WHERE total > 0')).a;
  const recentMessages = await db.all('SELECT * FROM messages ORDER BY id DESC LIMIT 5');
  const recentStudents = await db.all('SELECT id, name, email, created_at FROM customers ORDER BY id DESC LIMIT 5');
  const recentAttempts = await db.all(`SELECT a.*, q.title AS quiz_title, c.name AS student_name
    FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id JOIN customers c ON c.id = a.student_id
    ORDER BY a.id DESC LIMIT 5`);
  const recentActivity = await db.all('SELECT action, detail, created_at FROM audit_log ORDER BY id DESC LIMIT 8');
  const grades = await db.all(`SELECT c.grade, COUNT(DISTINCT e.student_id) AS students_count
    FROM enrollments e JOIN courses c ON c.id = e.course_id GROUP BY c.grade ORDER BY students_count DESC`);
  const recentEnrollments = await db.all(`SELECT e.created_at, c.title AS course_title, cu.name AS student_name
    FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN customers cu ON cu.id = e.student_id
    ORDER BY e.id DESC LIMIT 5`);

  const passQ = await db.get(`SELECT COUNT(*) AS t,
    COALESCE(SUM(CASE WHEN total > 0 AND CAST(score AS REAL) / total >= 0.7 THEN 1 ELSE 0 END), 0) AS p
    FROM quiz_attempts`);
  const passRate = passQ.t > 0 ? Math.round((passQ.p / passQ.t) * 100) : 0;

  const topCourses = await db.all(`SELECT c.title, COUNT(e.id) AS enrollments
    FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
    GROUP BY c.id, c.title ORDER BY enrollments DESC LIMIT 5`);

  const days = cairoDayStrings(7);
  const trend = [];
  const dayFmt = new Intl.DateTimeFormat('ar-EG', { timeZone: CAIRO, weekday: 'short', day: 'numeric', month: 'short' });
  const countRange = async (table, col, startIso, endIso) =>
    (await db.get(`SELECT COUNT(*) AS c FROM ${table} WHERE ${col} >= ? AND ${col} < ?`, [startIso, endIso])).c;
  for (let i = 0; i < days.length; i++) {
    const startIso = cairoDayStartUtc(days[i]);
    const endIso = i < days.length - 1 ? cairoDayStartUtc(days[i + 1]) : new Date().toISOString();
    trend.push({
      day: days[i],
      label: dayFmt.format(new Date(startIso)),
      students: await countRange('customers', 'created_at', startIso, endIso),
      enrollments: await countRange('enrollments', 'created_at', startIso, endIso),
      attempts: await countRange('quiz_attempts', 'created_at', startIso, endIso)
    });
  }
  const weekStudents = trend.reduce((s, d) => s + d.students, 0);
  const weekAttempts = trend.reduce((s, d) => s + d.attempts, 0);

  const payload = {
    stats: {
      students,
      courses: await count('courses'),
      lessons: await count('lessons'),
      quizzes: await count('quizzes'),
      testimonials: await count('testimonials'),
      faqs: await count('faqs'),
      messages: await count('messages'),
      unread,
      enrolled,
      watched,
      attempts,
      avgScore: Math.round(avgScore),
      passRate,
      weekStudents,
      weekAttempts,
      payments,
      pendingPayments,
      paymentsTotal: Math.round(paymentsTotal * 100) / 100,
      bookings,
      pendingBookings,
      pendingTestimonials,
      materials
    },
    trend,
    topCourses,
    recentMessages,
    recentStudents,
    recentAttempts,
    recentActivity,
    grades,
    recentEnrollments
  };
  setCached('admin:dashboard', payload, 30000);
  res.json(payload);
}));

/* ---------------- Upload ---------------- */
router.post('/upload', upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'من فضلك اختر ملف' });
  const kind = String(req.body.kind || 'image').toLowerCase();
  if (!validateFileSignature(kind, req.file.buffer)) {
    return res.status(400).json({ error: 'محتوى الملف غير مطابق للصيغة المطلوبة — ارفع ملف سليم' });
  }
  const saved = await saveFile({ buffer: req.file.buffer, originalname: req.file.originalname, mimeType: req.file.mimetype });
  await audit(req.user.id, 'upload', `${kind}: ${saved.filename}`, req.ip);
  res.json({ url: saved.url });
}));

/* ---------------- Courses ---------------- */
router.get('/courses', ah(async (req, res) => {
  const rows = await db.all(`SELECT c.*,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lessons_count,
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS students_count
    FROM courses c ORDER BY c.sort_order ASC, c.id DESC`);
  res.json({ courses: rows });
}));

router.get('/courses/:id', ah(async (req, res) => {
  const course = await db.get('SELECT * FROM courses WHERE id = ?', [toInt(req.params.id)]);
  if (!course) return res.status(404).json({ error: 'الكورس غير موجود' });
  res.json({ course });
}));

router.post('/courses', validate(courseSchema), ah(async (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  await db.run(`INSERT INTO courses (title, grade, term, description, icon, cover, price, price_amount, featured, active, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.title, b.grade, b.term, b.description, b.icon, b.cover, b.price, b.price_amount || 0,
      b.featured ? 1 : 0, b.active === false ? 0 : 1, b.sort_order, now, now]);
  clearCache();
  await audit(req.user.id, 'course_create', b.title, req.ip);
  res.json({ ok: true, message: 'تم إضافة الكورس بنجاح' });
}));

router.put('/courses/:id', validate(courseSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM courses WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الكورس غير موجود' });
  const b = req.body;
  await db.run(`UPDATE courses SET title = ?, grade = ?, term = ?, description = ?, icon = ?, cover = ?, price = ?, price_amount = ?,
    featured = ?, active = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    [b.title, b.grade, b.term, b.description, b.icon, b.cover, b.price, b.price_amount || 0,
      b.featured ? 1 : 0, b.active === false ? 0 : 1, b.sort_order, new Date().toISOString(), id]);
  clearCache();
  await audit(req.user.id, 'course_update', b.title, req.ip);
  res.json({ ok: true, message: 'تم تحديث الكورس بنجاح' });
}));

router.delete('/courses/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT title, cover FROM courses WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الكورس غير موجود' });
  await db.run('DELETE FROM courses WHERE id = ?', [id]);
  deleteUpload(row.cover);
  clearCache();
  await audit(req.user.id, 'course_delete', row.title, req.ip);
  res.json({ ok: true, message: 'تم حذف الكورس وكل محتواه' });
}));

/* ---------------- Lessons ---------------- */
router.get('/lessons', ah(async (req, res) => {
  const { course_id } = req.query;
  let q = `SELECT l.*, c.title AS course_title, c.grade AS course_grade
    FROM lessons l JOIN courses c ON c.id = l.course_id`;
  const params = [];
  if (course_id) {
    q += ' WHERE l.course_id = ?';
    params.push(toInt(course_id));
  }
  q += ' ORDER BY l.course_id ASC, l.sort_order ASC, l.id ASC';
  res.json({ lessons: await db.all(q, params) });
}));

router.get('/lessons/:id', ah(async (req, res) => {
  const lesson = await db.get('SELECT * FROM lessons WHERE id = ?', [toInt(req.params.id)]);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  res.json({ lesson });
}));

router.post('/lessons', validate(lessonSchema), ah(async (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  await db.run(`INSERT INTO lessons (course_id, title, video_url, duration, summary, sort_order, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.course_id, b.title, b.video_url, b.duration, b.summary, b.sort_order, b.active === false ? 0 : 1, now, now]);
  clearCache();
  await audit(req.user.id, 'lesson_create', b.title, req.ip);
  res.json({ ok: true, message: 'تم إضافة الدرس بنجاح' });
}));

router.put('/lessons/:id', validate(lessonSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM lessons WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الدرس غير موجود' });
  const b = req.body;
  await db.run(`UPDATE lessons SET course_id = ?, title = ?, video_url = ?, duration = ?, summary = ?, sort_order = ?, active = ?, updated_at = ? WHERE id = ?`,
    [b.course_id, b.title, b.video_url, b.duration, b.summary, b.sort_order, b.active === false ? 0 : 1, new Date().toISOString(), id]);
  clearCache();
  await audit(req.user.id, 'lesson_update', b.title, req.ip);
  res.json({ ok: true, message: 'تم تحديث الدرس بنجاح' });
}));

router.delete('/lessons/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT title FROM lessons WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الدرس غير موجود' });
  await db.run('DELETE FROM lessons WHERE id = ?', [id]);
  clearCache();
  await audit(req.user.id, 'lesson_delete', row.title, req.ip);
  res.json({ ok: true, message: 'تم حذف الدرس' });
}));

/* ---------------- Quizzes + Questions ---------------- */
router.get('/quizzes', ah(async (req, res) => {
  const rows = await db.all(`SELECT q.*, c.title AS course_title, c.grade AS course_grade,
    (SELECT COUNT(*) FROM questions qq WHERE qq.quiz_id = q.id) AS questions_count
    FROM quizzes q JOIN courses c ON c.id = q.course_id ORDER BY q.id DESC`);
  const allQuestions = await db.all('SELECT * FROM questions ORDER BY quiz_id ASC, sort_order ASC, id ASC');
  const byQuiz = new Map();
  for (const q of allQuestions) {
    if (!byQuiz.has(q.quiz_id)) byQuiz.set(q.quiz_id, []);
    byQuiz.get(q.quiz_id).push(q);
  }
  rows.forEach((r) => { r.questions = byQuiz.get(r.id) || []; });
  res.json({ quizzes: rows });
}));

router.get('/quizzes/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const quiz = await db.get('SELECT * FROM quizzes WHERE id = ?', [id]);
  if (!quiz) return res.status(404).json({ error: 'الاختبار غير موجود' });
  quiz.questions = await db.all('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order ASC, id ASC', [id]);
  res.json({ quiz });
}));

router.post('/quizzes', validate(quizSchema), ah(async (req, res) => {
  const b = req.body;
  const result = await db.run('INSERT INTO quizzes (course_id, title, description, duration_minutes, active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [b.course_id, b.title, b.description, b.duration_minutes, b.active === false ? 0 : 1, new Date().toISOString()]);
  clearCache();
  await audit(req.user.id, 'quiz_create', b.title, req.ip);
  res.json({ ok: true, quizId: Number(result.lastInsertRowid), message: 'تم إنشاء الاختبار بنجاح' });
}));

router.put('/quizzes/:id', validate(quizSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM quizzes WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الاختبار غير موجود' });
  const b = req.body;
  await db.run('UPDATE quizzes SET course_id = ?, title = ?, description = ?, duration_minutes = ?, active = ? WHERE id = ?',
    [b.course_id, b.title, b.description, b.duration_minutes, b.active === false ? 0 : 1, id]);
  clearCache();
  await audit(req.user.id, 'quiz_update', b.title, req.ip);
  res.json({ ok: true, message: 'تم تحديث الاختبار بنجاح' });
}));

router.delete('/quizzes/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT title FROM quizzes WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الاختبار غير موجود' });
  await db.run('DELETE FROM quizzes WHERE id = ?', [id]);
  clearCache();
  await audit(req.user.id, 'quiz_delete', row.title, req.ip);
  res.json({ ok: true, message: 'تم حذف الاختبار' });
}));

/* ---------------- Questions ---------------- */
router.post('/questions', validate(questionSchema), ah(async (req, res) => {
  const b = req.body;
  await db.run('INSERT INTO questions (quiz_id, question, options, correct_index, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [b.quiz_id, b.question, JSON.stringify(b.options), b.correct_index, b.explanation, b.sort_order]);
  clearCache();
  await audit(req.user.id, 'question_create', `quiz#${b.quiz_id}`, req.ip);
  res.json({ ok: true, message: 'تم إضافة السؤال بنجاح' });
}));

router.put('/questions/:id', validate(questionSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM questions WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'السؤال غير موجود' });
  const b = req.body;
  await db.run('UPDATE questions SET quiz_id = ?, question = ?, options = ?, correct_index = ?, explanation = ?, sort_order = ? WHERE id = ?',
    [b.quiz_id, b.question, JSON.stringify(b.options), b.correct_index, b.explanation, b.sort_order, id]);
  clearCache();
  await audit(req.user.id, 'question_update', `question#${id}`, req.ip);
  res.json({ ok: true, message: 'تم تحديث السؤال بنجاح' });
}));

router.delete('/questions/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM questions WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'السؤال غير موجود' });
  await db.run('DELETE FROM questions WHERE id = ?', [id]);
  clearCache();
  await audit(req.user.id, 'question_delete', `question#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف السؤال' });
}));

/* ---------------- Students ---------------- */
router.get('/students', ah(async (req, res) => {
  const rows = await db.all(`SELECT c.id, c.name, c.email, c.status, c.created_at, c.last_login,
    (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = c.id) AS courses_count,
    (SELECT COUNT(*) FROM lesson_progress p WHERE p.student_id = c.id AND p.watched = 1) AS watched_count,
    (SELECT COUNT(*) FROM quiz_attempts a WHERE a.student_id = c.id) AS attempts_count
    FROM customers c ORDER BY c.id DESC LIMIT 1000`);
  res.json({ students: rows });
}));

router.put('/students/:id/status', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const { status } = (req.body && req.body) || {};
  if (!['active', 'blocked', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة' });
  }
  const row = await db.get('SELECT name FROM customers WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الطالب غير موجود' });
  await db.run('UPDATE customers SET status = ? WHERE id = ?', [status, id]);
  await audit(req.user.id, 'student_status', `${row.name} → ${status}`, req.ip);
  const message = status === 'active' ? 'تم تفعيل حساب الطالب — يقدر يدخل دلوقتي'
    : status === 'blocked' ? 'تم إيقاف حساب الطالب'
    : 'رجع الحساب لحالة قيد المراجعة';
  res.json({ ok: true, message });
}));

router.get('/students/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const student = await db.get('SELECT id, name, email, created_at, last_login FROM customers WHERE id = ?', [id]);
  if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });
  const enrollments = await db.all(`SELECT c.id, c.title, c.grade, c.icon, e.created_at AS enrolled_at,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.active = 1) AS lessons_count,
    (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id WHERE p.student_id = ? AND l.course_id = c.id AND p.watched = 1) AS watched_count
    FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ? ORDER BY e.created_at DESC`, [id, id]);
  const attempts = await db.all(`SELECT a.*, q.title AS quiz_title FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id WHERE a.student_id = ? ORDER BY a.id DESC LIMIT 20`, [id]);
  res.json({ student, enrollments, attempts });
}));

router.delete('/students/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT name FROM customers WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الطالب غير موجود' });
  await db.run('DELETE FROM customers WHERE id = ?', [id]);
  await audit(req.user.id, 'student_delete', row.name, req.ip);
  res.json({ ok: true, message: 'تم حذف الطالب' });
}));

/* ---------------- Exports (تصدير Excel / CSV) ---------------- */
const exportFormat = (q) => (q === 'csv' ? 'csv' : 'xlsx');

router.get('/export/students', ah(async (req, res) => {
  const rows = await db.all(`SELECT c.name, c.email, c.phone, c.parent_phone, c.governorate, c.academic_year, c.created_at,
    (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = c.id) AS courses_count,
    (SELECT COUNT(*) FROM quiz_attempts a WHERE a.student_id = c.id) AS attempts_count
    FROM customers c ORDER BY c.id DESC`);
  const columns = [
    { header: 'م', width: 6 },
    { header: 'الاسم', width: 28 },
    { header: 'البريد الإلكتروني', width: 32 },
    { header: 'رقم الموبايل', width: 18 },
    { header: 'رقم ولي الأمر', width: 18 },
    { header: 'المحافظة', width: 16 },
    { header: 'السنة الدراسية', width: 16 },
    { header: 'عدد الكورسات', width: 14 },
    { header: 'عدد الاختبارات', width: 16 },
    { header: 'تاريخ التسجيل', width: 20 }
  ];
  const data = rows.map((r, i) => [
    i + 1, r.name, r.email, r.phone || '', r.parent_phone || '', r.governorate || '',
    r.academic_year || '', r.courses_count, r.attempts_count, isoToDisplay(r.created_at)
  ]);
  await sendSpreadsheet(res, exportFormat(req.query.format), {
    filename: `students-${new Date().toISOString().slice(0, 10)}`,
    sheet: 'الطلاب',
    columns,
    rows: data
  });
}));

router.get('/export/quiz/:id', ah(async (req, res) => {
  const quizId = toInt(req.params.id);
  const quiz = await db.get('SELECT title, course_id FROM quizzes WHERE id = ?', [quizId]);
  if (!quiz) return res.status(404).json({ error: 'الاختبار غير موجود' });
  const rows = await db.all(`SELECT c.name AS student_name, c.email AS student_email,
    (SELECT COUNT(*) FROM quiz_attempts a WHERE a.student_id = c.id AND a.quiz_id = ?) AS attempts,
    (SELECT a.score FROM quiz_attempts a WHERE a.student_id = c.id AND a.quiz_id = ?
      ORDER BY (a.score * 1.0 / a.total) DESC, a.id DESC LIMIT 1) AS best_score,
    (SELECT a.total FROM quiz_attempts a WHERE a.student_id = c.id AND a.quiz_id = ?
      ORDER BY (a.score * 1.0 / a.total) DESC, a.id DESC LIMIT 1) AS best_total,
    (SELECT MAX(a.created_at) FROM quiz_attempts a WHERE a.student_id = c.id AND a.quiz_id = ?) AS last_attempt
    FROM customers c
    WHERE EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.student_id = c.id AND a.quiz_id = ?)
    ORDER BY best_score DESC`, [quizId, quizId, quizId, quizId, quizId]);
  const columns = [
    { header: 'م', width: 6 },
    { header: 'اسم الطالب', width: 28 },
    { header: 'البريد الإلكتروني', width: 32 },
    { header: 'أفضل نتيجة', width: 14 },
    { header: 'الدرجة النهائية', width: 16 },
    { header: 'النسبة المئوية', width: 16 },
    { header: 'عدد المحاولات', width: 16 },
    { header: 'آخر حل للاختبار', width: 22 }
  ];
  const data = rows.map((r, i) => {
    const pct = r.best_total > 0 ? Math.round((r.best_score / r.best_total) * 100) : '';
    return [i + 1, r.student_name, r.student_email, r.best_score, r.best_total, pct === '' ? '' : `${pct}%`, r.attempts, isoToDisplay(r.last_attempt)];
  });
  await sendSpreadsheet(res, exportFormat(req.query.format), {
    filename: `quiz-${quizId}-${new Date().toISOString().slice(0, 10)}`,
    sheet: quiz.title.slice(0, 31) || 'نتائج الاختبار',
    columns,
    rows: data
  });
}));

/* ---------------- Study Materials (ملفات المذاكرة) ---------------- */
const ALL_GRADES = [
  'رابعة ابتدائي', 'خامسة ابتدائي', 'سادسة ابتدائي',
  'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي',
  'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'
];

router.get('/materials/grades', ah(async (req, res) => {
  const rows = await db.all(`SELECT DISTINCT grade FROM courses
    UNION SELECT DISTINCT grade FROM materials WHERE grade != 'الكل'
    ORDER BY grade`);
  const extra = rows.map((r) => r.grade).filter((g) => g && !ALL_GRADES.includes(g));
  res.json({ grades: [...ALL_GRADES, ...extra] });
}));

router.get('/materials', ah(async (req, res) => {
  const rows = await db.all(`SELECT m.*, COALESCE(c.title, '') AS course_title
    FROM materials m LEFT JOIN courses c ON c.id = m.course_id
    ORDER BY m.sort_order ASC, m.id DESC`);
  res.json({ materials: rows });
}));

router.get('/materials/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT * FROM materials WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الملف غير موجود' });
  res.json({ material: row });
}));

router.post('/materials', validate(materialSchema), ah(async (req, res) => {
  const { title, description, grade, course_id, file_url, file_name, file_size, is_optional, active, sort_order } = req.body;
  const now = new Date().toISOString();
  const info = await db.run(`INSERT INTO materials
    (title, description, grade, course_id, file_url, file_name, file_size, is_optional, active, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, grade, course_id, file_url, file_name, file_size,
      is_optional ? 1 : 0, active ? 1 : 0, sort_order, now, now]);
  await audit(req.user.id, 'material_add', title, req.ip);
  res.status(201).json({ ok: true, message: 'تم إضافة الملف', id: info.lastInsertRowid });
}));

router.put('/materials/:id', validate(materialSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const old = await db.get('SELECT file_url, title FROM materials WHERE id = ?', [id]);
  if (!old) return res.status(404).json({ error: 'الملف غير موجود' });
  const { title, description, grade, course_id, file_url, file_name, file_size, is_optional, active, sort_order } = req.body;
  await db.run(`UPDATE materials SET
    title = ?, description = ?, grade = ?, course_id = ?, file_url = ?, file_name = ?, file_size = ?,
    is_optional = ?, active = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    [title, description, grade, course_id, file_url, file_name, file_size,
      is_optional ? 1 : 0, active ? 1 : 0, sort_order, new Date().toISOString(), id]);
  if (old.file_url && old.file_url !== file_url) deleteUpload(old.file_url);
  await audit(req.user.id, 'material_update', title, req.ip);
  res.json({ ok: true, message: 'تم تحديث الملف' });
}));

router.delete('/materials/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT file_url, title FROM materials WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الملف غير موجود' });
  await db.run('DELETE FROM materials WHERE id = ?', [id]);
  deleteUpload(row.file_url);
  await audit(req.user.id, 'material_delete', row.title, req.ip);
  res.json({ ok: true, message: 'تم حذف الملف' });
}));

/* ---------------- Payments (Vodafone Cash) ---------------- */
router.get('/payments', ah(async (req, res) => {
  const { status } = req.query;
  let q = `SELECT p.*, c.title AS course_title, c.icon AS course_icon, cu.name AS student_name, cu.email AS student_email
    FROM payments p JOIN courses c ON c.id = p.course_id JOIN customers cu ON cu.id = p.student_id`;
  const params = [];
  if (status === 'pending' || status === 'paid' || status === 'rejected') {
    q += ' WHERE p.status = ?';
    params.push(status);
  }
  q += ' ORDER BY p.id DESC';
  res.json({ payments: await db.all(q, params) });
}));

router.put('/payments/:id/status', validate(paymentStatusSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الدفعة غير موجودة' });
  const { status, note } = req.body;
  if (status === 'paid') {
    const now = new Date().toISOString();
    await db.run("UPDATE payments SET status = 'paid', admin_note = ?, paid_at = ? WHERE id = ?", [note, now, id]);
    const enrolled = await db.get('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [row.student_id, row.course_id]);
    if (!enrolled) {
      await db.run('INSERT INTO enrollments (student_id, course_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [row.student_id, row.course_id, 'active', now, now]);
    }
    await audit(req.user.id, 'payment_approve', `payment#${id} (${row.amount} EGP)`, req.ip);
    res.json({ ok: true, message: 'تم تأكيد الدفع وتفعيل الكورس للطالب' });
  } else {
    await db.run("UPDATE payments SET status = 'rejected', admin_note = ? WHERE id = ?", [note, id]);
    await audit(req.user.id, 'payment_reject', `payment#${id}`, req.ip);
    res.json({ ok: true, message: 'تم رفض الدفعة' });
  }
}));

router.delete('/payments/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM payments WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الدفعة غير موجودة' });
  await db.run('DELETE FROM payments WHERE id = ?', [id]);
  await audit(req.user.id, 'payment_delete', `payment#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الدفعة' });
}));

/* ---------------- Center bookings (حجز السنتر) ---------------- */
router.get('/bookings', ah(async (req, res) => {
  const q = bookingListQuery(req.query);
  res.json({ bookings: await db.all(q.sql, q.params) });
}));

router.get('/bookings/filters', ah(async (req, res) => {
  const [govs, years, grades] = await Promise.all([
    db.all("SELECT DISTINCT governorate FROM bookings WHERE governorate IS NOT NULL AND governorate != '' ORDER BY governorate"),
    db.all("SELECT DISTINCT academic_year FROM bookings WHERE academic_year IS NOT NULL AND academic_year != '' ORDER BY academic_year DESC"),
    db.all("SELECT DISTINCT grade FROM bookings WHERE grade IS NOT NULL AND grade != '' ORDER BY grade")
  ]);
  res.json({
    governorates: govs.map((r) => r.governorate),
    academicYears: years.map((r) => r.academic_year),
    grades: grades.map((r) => r.grade)
  });
}));

router.get('/bookings/export', ah(async (req, res) => {
  const { sql, params } = bookingListQuery(req.query);
  const rows = await db.all(sql, params);
  const columns = [
    { header: 'م', width: 6 },
    { header: 'اسم الطالب', width: 26 },
    { header: 'رقم موبايل الطالب', width: 20 },
    { header: 'اسم ولي الأمر', width: 26 },
    { header: 'رقم موبايل ولي الأمر', width: 20 },
    { header: 'المحافظة', width: 16 },
    { header: 'السنة الدراسية', width: 16 },
    { header: 'الصف الدراسي', width: 20 },
    { header: 'ملاحظات', width: 40 },
    { header: 'تاريخ الحجز', width: 20 },
    { header: 'الحالة', width: 14 }
  ];
  const data = rows.map((r, i) => [
    i + 1, r.student_name || '', r.phone || '', r.parent_name || '', r.parent_phone || '',
    r.governorate || '', r.academic_year || '', r.grade || '', r.note || '',
    isoToDisplay(r.created_at), r.status === 'done' ? 'تم التواصل' : 'جديدة'
  ]);

  if (exportFormat(req.query.format) === 'csv') {
    return sendSpreadsheet(res, 'csv', {
      filename: `bookings-${new Date().toISOString().slice(0, 10)}`,
      sheet: 'الحجوزات',
      columns,
      rows: data
    });
  }

  const sheetRows = (label) => [
    { header: 'م', width: 6 },
    { header: label, width: 34 },
    { header: 'عدد الحجوزات', width: 18 }
  ];
  const stat = (list) => list.map((x, i) => [i + 1, x.v || '(فاضي)', x.c]);

  const [byGov, byYear, byGrade, byStatus] = await Promise.all([
    db.all(`SELECT COALESCE(NULLIF(governorate,''), '(فاضي)') AS v, COUNT(*) AS c FROM bookings GROUP BY v ORDER BY c DESC`),
    db.all(`SELECT COALESCE(NULLIF(academic_year,''), '(فاضي)') AS v, COUNT(*) AS c FROM bookings GROUP BY v ORDER BY c DESC`),
    db.all(`SELECT COALESCE(NULLIF(grade,''), '(فاضي)') AS v, COUNT(*) AS c FROM bookings GROUP BY v ORDER BY c DESC`),
    db.all(`SELECT COALESCE(NULLIF(status,''), '(فاضي)') AS v, COUNT(*) AS c FROM bookings GROUP BY v ORDER BY c DESC`)
  ]);

  await sendWorkbook(res, `bookings-${new Date().toISOString().slice(0, 10)}`, [
    {
      name: 'كل الحجوزات',
      columns,
      rows: data
    },
    {
      name: 'حسب المحافظة',
      columns: sheetRows('المحافظة'),
      rows: stat(byGov)
    },
    {
      name: 'حسب السنة الدراسية',
      columns: sheetRows('السنة الدراسية'),
      rows: stat(byYear)
    },
    {
      name: 'حسب الصف',
      columns: sheetRows('الصف الدراسي'),
      rows: stat(byGrade)
    },
    {
      name: 'حسب الحالة',
      columns: sheetRows('الحالة'),
      rows: stat(byStatus)
    }
  ]);
}));

router.patch('/bookings/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM bookings WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الحجز غير موجود' });
  const status = req.body && req.body.status === 'done' ? 'done' : 'new';
  await db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
  await audit(req.user.id, 'booking_update', `booking#${id} → ${status}`, req.ip);
  res.json({ ok: true });
}));

router.delete('/bookings/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM bookings WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الحجز غير موجود' });
  await db.run('DELETE FROM bookings WHERE id = ?', [id]);
  await audit(req.user.id, 'booking_delete', `booking#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الحجز' });
}));

/* ---------------- Testimonials ---------------- */
router.get('/testimonials', ah(async (req, res) => {
  const { status } = req.query;
  let q = `SELECT t.*, c.email AS student_email
    FROM testimonials t LEFT JOIN customers c ON c.id = t.student_id`;
  const params = [];
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    q += ' WHERE t.status = ?';
    params.push(status);
  }
  q += ' ORDER BY t.id DESC';
  res.json({ testimonials: await db.all(q, params) });
}));

router.post('/testimonials', validate(testimonialSchema), ah(async (req, res) => {
  const b = req.body;
  await db.run("INSERT INTO testimonials (client_name, client_role, content, rating, active, image_url, status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, 'approved', 'admin', ?)",
    [b.client_name, b.client_role, b.content, b.rating, b.active === false ? 0 : 1, b.image_url || '', new Date().toISOString()]);
  clearCache();
  await audit(req.user.id, 'testimonial_create', b.client_name, req.ip);
  res.json({ ok: true, message: 'تم إضافة الرأي' });
}));

router.put('/testimonials/:id', validate(testimonialSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM testimonials WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الرأي غير موجود' });
  const b = req.body;
  await db.run('UPDATE testimonials SET client_name = ?, client_role = ?, content = ?, rating = ?, active = ?, image_url = ?, status = ? WHERE id = ?',
    [b.client_name, b.client_role, b.content, b.rating, b.active === false ? 0 : 1, b.image_url || '', b.status || 'approved', id]);
  clearCache();
  await audit(req.user.id, 'testimonial_update', b.client_name, req.ip);
  res.json({ ok: true, message: 'تم تحديث الرأي' });
}));

router.patch('/testimonials/:id/status', validate(testimonialStatusSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT * FROM testimonials WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الرأي غير موجود' });
  const { status } = req.body;
  const active = status === 'approved' ? 1 : 0;
  await db.run('UPDATE testimonials SET status = ?, active = ? WHERE id = ?', [status, active, id]);
  clearCache();
  await audit(req.user.id, status === 'approved' ? 'testimonial_approve' : status === 'rejected' ? 'testimonial_reject' : 'testimonial_update',
    `${row.client_name} (#${id})`, req.ip);
  const message = status === 'approved' ? 'تم الموافقة على الرأي وهيظهر في الرئيسية' : status === 'rejected' ? 'تم رفض الرأي' : 'تم إعادة التعليق للمراجعة';
  res.json({ ok: true, message });
}));

router.delete('/testimonials/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id, image_url FROM testimonials WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الرأي غير موجود' });
  await db.run('DELETE FROM testimonials WHERE id = ?', [id]);
  clearCache();
  await audit(req.user.id, 'testimonial_delete', `testimonial#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الرأي' });
}));

/* ---------------- FAQs ---------------- */
router.get('/faqs', ah(async (req, res) => {
  res.json({ faqs: await db.all('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC') });
}));

router.post('/faqs', validate(faqSchema), ah(async (req, res) => {
  const b = req.body;
  await db.run('INSERT INTO faqs (question, answer, sort_order, active, created_at) VALUES (?, ?, ?, ?, ?)',
    [b.question, b.answer, b.sort_order, b.active === false ? 0 : 1, new Date().toISOString()]);
  clearCache();
  await audit(req.user.id, 'faq_create', b.question, req.ip);
  res.json({ ok: true, message: 'تم إضافة السؤال' });
}));

router.put('/faqs/:id', validate(faqSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM faqs WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'السؤال غير موجود' });
  const b = req.body;
  await db.run('UPDATE faqs SET question = ?, answer = ?, sort_order = ?, active = ? WHERE id = ?',
    [b.question, b.answer, b.sort_order, b.active === false ? 0 : 1, id]);
  clearCache();
  await audit(req.user.id, 'faq_update', b.question, req.ip);
  res.json({ ok: true, message: 'تم تحديث السؤال' });
}));

router.delete('/faqs/:id', ah(async (req, res) => {
  await db.run('DELETE FROM faqs WHERE id = ?', [toInt(req.params.id)]);
  clearCache();
  await audit(req.user.id, 'faq_delete', `faq#${req.params.id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف السؤال' });
}));

/* ---------------- Schedule ---------------- */
router.get('/schedule', ah(async (req, res) => {
  res.json({ schedule: await db.all('SELECT * FROM schedule_items ORDER BY sort_order ASC, id ASC') });
}));

router.post('/schedule', validate(scheduleSchema), ah(async (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  await db.run('INSERT INTO schedule_items (grade, day, start_time, end_time, note, period, tag, tag_active, active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [b.grade, b.day, b.start_time, b.end_time, b.note, b.period, b.tag, b.tag_active === false ? 0 : 1, b.active === false ? 0 : 1, b.sort_order, now, now]);
  clearCache();
  await audit(req.user.id, 'schedule_create', `${b.grade} — ${b.day}`, req.ip);
  res.json({ ok: true, message: 'تم إضافة الموعد بنجاح' });
}));

router.put('/schedule/:id', validate(scheduleSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM schedule_items WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الموعد غير موجود' });
  const b = req.body;
  await db.run('UPDATE schedule_items SET grade = ?, day = ?, start_time = ?, end_time = ?, note = ?, period = ?, tag = ?, tag_active = ?, active = ?, sort_order = ?, updated_at = ? WHERE id = ?',
    [b.grade, b.day, b.start_time, b.end_time, b.note, b.period, b.tag, b.tag_active === false ? 0 : 1, b.active === false ? 0 : 1, b.sort_order, new Date().toISOString(), id]);
  clearCache();
  await audit(req.user.id, 'schedule_update', `${b.grade} — ${b.day}`, req.ip);
  res.json({ ok: true, message: 'تم تحديث الموعد بنجاح' });
}));

router.delete('/schedule/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM schedule_items WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الموعد غير موجود' });
  await db.run('DELETE FROM schedule_items WHERE id = ?', [id]);
  clearCache();
  await audit(req.user.id, 'schedule_delete', `schedule#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الموعد' });
}));

/* ---------------- Tasks (مهام المدرس) ---------------- */
const TASK_STATUS = ['pending', 'in_progress', 'done'];
const TASK_PRIORITY = ['high', 'medium', 'low'];

router.get('/tasks/stats', ah(async (req, res) => {
  const total = (await db.get('SELECT COUNT(*) AS c FROM tasks')).c;
  const pending = (await db.get("SELECT COUNT(*) AS c FROM tasks WHERE status = 'pending'")).c;
  const in_progress = (await db.get("SELECT COUNT(*) AS c FROM tasks WHERE status = 'in_progress'")).c;
  const done = (await db.get("SELECT COUNT(*) AS c FROM tasks WHERE status = 'done'")).c;
  const today = cairoDayStrings(1)[0];
  const np = cairoNowParts();
  const nowHm = `${String(np.hour).padStart(2, '0')}:${String(np.minute).padStart(2, '0')}`;
  const overdue = (await db.get(`SELECT COUNT(*) AS c FROM tasks
    WHERE status != 'done' AND due_date != '' AND (due_date < ? OR (due_date = ? AND due_time != '' AND due_time < ?))`,
    [today, today, nowHm])).c;
  res.json({ total, pending, in_progress, done, overdue });
}));

router.get('/tasks', ah(async (req, res) => {
  const { status, priority, grade, q } = req.query;
  const where = [];
  const params = [];
  if (status && TASK_STATUS.includes(status)) { where.push('status = ?'); params.push(status); }
  if (priority && TASK_PRIORITY.includes(priority)) { where.push('priority = ?'); params.push(priority); }
  if (grade) { where.push('grade = ?'); params.push(String(grade)); }
  if (q && String(q).trim()) {
    where.push('(title LIKE ? OR description LIKE ?)');
    const like = `%${String(q).trim()}%`;
    params.push(like, like);
  }
  const sql = `SELECT * FROM tasks${where.length ? ' WHERE ' + where.join(' AND ') : ''}
    ORDER BY CASE status WHEN 'done' THEN 1 ELSE 0 END,
      CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      due_date ASC, due_time ASC, id DESC`;
  res.json({ tasks: await db.all(sql, params) });
}));

router.post('/tasks', validate(taskSchema), ah(async (req, res) => {
  const b = req.body;
  const now = new Date().toISOString();
  await db.run('INSERT INTO tasks (title, description, category, grade, priority, status, due_date, due_time, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [b.title, b.description, b.category, b.grade, b.priority, b.status, b.due_date, b.due_time, now, now, b.status === 'done' ? now : '']);
  await audit(req.user.id, 'task_create', b.title, req.ip);
  res.json({ ok: true, message: 'تم إضافة المهمة' });
}));

router.put('/tasks/:id', validate(taskSchema), ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM tasks WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'المهمة مش موجودة' });
  const b = req.body;
  const now = new Date().toISOString();
  await db.run('UPDATE tasks SET title = ?, description = ?, category = ?, grade = ?, priority = ?, status = ?, due_date = ?, due_time = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    [b.title, b.description, b.category, b.grade, b.priority, b.status, b.due_date, b.due_time, b.status === 'done' ? now : '', now, id]);
  await audit(req.user.id, 'task_update', b.title, req.ip);
  res.json({ ok: true, message: 'تم تحديث المهمة' });
}));

router.patch('/tasks/:id/status', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM tasks WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'المهمة مش موجودة' });
  const status = String(req.body.status || '');
  if (!TASK_STATUS.includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
  const now = new Date().toISOString();
  await db.run('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    [status, status === 'done' ? now : '', now, id]);
  await audit(req.user.id, 'task_status', `${id} -> ${status}`, req.ip);
  res.json({ ok: true, message: 'تم تحديث الحالة' });
}));

router.delete('/tasks/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM tasks WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'المهمة مش موجودة' });
  await db.run('DELETE FROM tasks WHERE id = ?', [id]);
  await audit(req.user.id, 'task_delete', `task#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف المهمة' });
}));

/* ---------------- Help requests (AI assistant inbox) ---------------- */
router.get('/help-requests', ah(async (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM help_requests';
  const params = [];
  if (status === 'new' || status === 'done') {
    q += ' WHERE status = ?';
    params.push(status);
  }
  q += ' ORDER BY id DESC';
  const requests = await db.all(q, params);
  const ids = requests.map((r) => r.id);
  const replies = ids.length ? await db.all(`SELECT id, help_id, reply, created_at FROM help_replies WHERE help_id IN (${ids.map(() => '?').join(',')}) ORDER BY id ASC`, ids) : [];
  const byHelp = {};
  replies.forEach((r) => { (byHelp[r.help_id] = byHelp[r.help_id] || []).push({ id: r.id, reply: r.reply, created_at: r.created_at }); });
  requests.forEach((r) => { r.replies = byHelp[r.id] || []; });
  res.json({ requests });
}));

router.patch('/help-requests/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM help_requests WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
  const status = req.body && req.body.status === 'done' ? 'done' : 'new';
  await db.run('UPDATE help_requests SET status = ? WHERE id = ?', [status, id]);
  await audit(req.user.id, 'help_request_update', `help#${id} → ${status}`, req.ip);
  res.json({ ok: true });
}));

router.post('/help-requests/:id/reply', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT id FROM help_requests WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
  const reply = String(req.body && req.body.reply || '').trim().slice(0, 3000);
  if (!reply) return res.status(400).json({ error: 'اكتب ردك الأول' });
  await db.run('INSERT INTO help_replies (help_id, reply, created_at) VALUES (?, ?, ?)', [id, reply, new Date().toISOString()]);
  await db.run("UPDATE help_requests SET status = 'done' WHERE id = ?", [id]);
  await audit(req.user.id, 'help_request_reply', `help#${id}`, req.ip);
  res.json({ ok: true, message: 'وصل ردك للطالب، هيظهر في شات المساعد على جهازه' });
}));

router.delete('/help-requests/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT image_url FROM help_requests WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
  await db.run('DELETE FROM help_requests WHERE id = ?', [id]);
  deleteUpload(row.image_url);
  await audit(req.user.id, 'help_request_delete', `help#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الطلب' });
}));

/* ---------------- Community moderation ---------------- */
router.get('/community', ah(async (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM community_posts';
  const params = [];
  if (status === 'active' || status === 'hidden') {
    q += ' WHERE status = ?';
    params.push(status);
  }
  q += ' ORDER BY id DESC LIMIT 200';
  const posts = await db.all(q, params);
  const ids = posts.map((p) => p.id);
  const comments = ids.length ? await db.all(`SELECT c.* FROM community_comments c WHERE c.post_id IN (${ids.map(() => '?').join(',')}) ORDER BY c.id ASC`, ids) : [];
  const byPost = {};
  comments.forEach((c) => { (byPost[c.post_id] = byPost[c.post_id] || []).push(c); });
  posts.forEach((p) => { p.comments = byPost[p.id] || []; });
  res.json({ posts });
}));

router.patch('/community/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const status = req.body && req.body.status === 'hidden' ? 'hidden' : 'active';
  const row = await db.get('SELECT id FROM community_posts WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'البوست غير موجود' });
  await db.run('UPDATE community_posts SET status = ? WHERE id = ?', [status, id]);
  await audit(req.user.id, 'community_post_' + status, `post#${id}`, req.ip);
  res.json({ ok: true });
}));

router.delete('/community/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  await db.run('DELETE FROM community_posts WHERE id = ?', [id]);
  await db.run('DELETE FROM community_comments WHERE post_id = ?', [id]);
  await audit(req.user.id, 'community_post_delete', `post#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف البوست' });
}));

router.delete('/community/:id/comments/:commentId', ah(async (req, res) => {
  const commentId = toInt(req.params.commentId);
  await db.run('DELETE FROM community_comments WHERE id = ?', [commentId]);
  await audit(req.user.id, 'community_comment_delete', `comment#${commentId}`, req.ip);
  res.json({ ok: true, message: 'تم حذف التعليق' });
}));

/* ---------------- Notifications (إشعارات للطلاب) ---------------- */
router.get('/notifications', ah(async (req, res) => {
  const notifications = await db.all('SELECT * FROM notifications ORDER BY id DESC LIMIT 200');
  const ids = notifications.map((n) => n.id);
  const stats = {};
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const rows = await db.all(`SELECT notification_id, COUNT(*) AS cnt FROM notification_reads WHERE notification_id IN (${ph}) GROUP BY notification_id`, ids);
    rows.forEach((r) => { stats[r.notification_id] = r.cnt; });
  }
  const totalCustomers = (await db.get('SELECT COUNT(*) AS c FROM customers')).c;
  notifications.forEach((n) => { n.reads = stats[n.id] || 0; });
  res.json({ notifications, totalCustomers });
}));

router.post('/notifications', ah(async (req, res) => {
  const title = String(req.body && req.body.title || '').trim().slice(0, 200);
  const body = String(req.body && req.body.body || '').trim().slice(0, 2000);
  const link = String(req.body && req.body.link || '').trim().slice(0, 500);
  if (!title || !body) return res.status(400).json({ error: 'اكتب عنوان ونص الإشعار' });
  const now = new Date().toISOString();
  const r = await db.run('INSERT INTO notifications (title, body, link, created_at) VALUES (?, ?, ?, ?)', [title, body, link, now]);
  await audit(req.user.id, 'notification_send', `notification#${r.lastInsertRowid} — ${title.slice(0, 60)}`, req.ip);
  res.status(201).json({ ok: true, id: r.lastInsertRowid, message: 'اتبعث الإشعار لكل الطلاب' });
}));

router.delete('/notifications/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  await db.run('DELETE FROM notifications WHERE id = ?', [id]);
  await db.run('DELETE FROM notification_reads WHERE notification_id = ?', [id]);
  await audit(req.user.id, 'notification_delete', `notification#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الإشعار' });
}));

/* ---------------- Messages ---------------- */
router.get('/messages', ah(async (req, res) => {
  res.json({ messages: await db.all('SELECT * FROM messages ORDER BY id DESC') });
}));

router.patch('/messages/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const is_read = req.body && req.body.is_read === true ? 1 : 0;
  const row = await db.get('SELECT id FROM messages WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الرسالة غير موجودة' });
  await db.run('UPDATE messages SET is_read = ? WHERE id = ?', [is_read, id]);
  await audit(req.user.id, 'message_read', `message#${id}`, req.ip);
  res.json({ ok: true });
}));

router.delete('/messages/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  await db.run('DELETE FROM messages WHERE id = ?', [id]);
  await audit(req.user.id, 'message_delete', `message#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الرسالة' });
}));

/* ---------------- Settings ---------------- */
router.get('/settings', ah(async (req, res) => {
  const settings = {};
  (await db.all('SELECT key, value FROM settings')).forEach((s) => { settings[s.key] = s.value; });
  res.json({ settings });
}));

router.put('/settings', validate(settingsSchema), ah(async (req, res) => {
  const allowed = new Set([
    'hero_badge', 'hero_title', 'hero_subtitle', 'about_title', 'about_text', 'about_quote',
    'phone', 'whatsapp', 'email', 'city', 'instagram', 'tiktok', 'youtube', 'facebook',
    'footer_tagline', 'stats_students', 'stats_courses', 'stats_years', 'stats_lessons',
    'schedule_note', 'schedule_address',
    'vodafone_cash', 'vodafone_cash_name',
    'show_social', 'show_email',
    'gemini_api_key', 'gemini_model',
    'google_client_id', 'google_client_secret'
  ]);
  const upsert = 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value';
  let changed = 0;
  const body = (req.body && req.body.settings) || {};
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.has(key)) continue;
    await db.run(upsert, [key, String(value == null ? '' : value).slice(0, 5000)]);
    changed++;
  }
  clearCache();
  await audit(req.user.id, 'settings_update', `${changed} حقول`, req.ip);
  res.json({ ok: true, message: `تم حفظ الإعدادات (${changed} حقل)` });
}));

module.exports = router;

const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, uploadsDir } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload, validateFileSignature } = require('../middleware/upload');
const {
  validate, courseSchema, lessonSchema, quizSchema, questionSchema,
  testimonialSchema, testimonialStatusSchema, faqSchema, settingsSchema, scheduleSchema, paymentStatusSchema,
  materialSchema
} = require('../middleware/validate');
const { audit } = require('../security');
const { getCached, setCached, clearCache } = require('../cache');
const { sendSpreadsheet, isoToDisplay } = require('../exports');
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
  if (url && String(url).startsWith('/uploads/')) {
    const file = safePath(url);
    if (file) { try { fs.unlinkSync(file); } catch (_) { /* ignore */ } }
  }
};

/* ---------------- Dashboard ---------------- */
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
      payments,
      pendingPayments,
      paymentsTotal: Math.round(paymentsTotal * 100) / 100,
      bookings,
      pendingBookings,
      pendingTestimonials,
      materials
    },
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
  if (!validateFileSignature(kind, req.file.path)) {
    deleteUpload('/uploads/' + req.file.filename);
    return res.status(400).json({ error: 'محتوى الملف غير مطابق للصيغة المطلوبة — ارفع ملف سليم' });
  }
  await audit(req.user.id, 'upload', `${kind}: ${req.file.filename}`, req.ip);
  res.json({ url: '/uploads/' + req.file.filename });
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
  const rows = await db.all(`SELECT c.id, c.name, c.email, c.created_at, c.last_login,
    (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = c.id) AS courses_count,
    (SELECT COUNT(*) FROM lesson_progress p WHERE p.student_id = c.id AND p.watched = 1) AS watched_count,
    (SELECT COUNT(*) FROM quiz_attempts a WHERE a.student_id = c.id) AS attempts_count
    FROM customers c ORDER BY c.id DESC LIMIT 1000`);
  res.json({ students: rows });
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
router.get('/materials/grades', ah(async (req, res) => {
  const grades = (await db.all(`SELECT DISTINCT grade FROM courses
    UNION SELECT DISTINCT grade FROM materials WHERE grade != 'الكل'
    ORDER BY grade`)).map((r) => r.grade);
  res.json({ grades });
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
  const { status } = req.query;
  let q = 'SELECT * FROM bookings';
  const params = [];
  if (status === 'new' || status === 'done') {
    q += ' WHERE status = ?';
    params.push(status);
  }
  q += ' ORDER BY id DESC';
  res.json({ bookings: await db.all(q, params) });
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
  res.json({ requests: await db.all(q, params) });
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

router.delete('/help-requests/:id', ah(async (req, res) => {
  const id = toInt(req.params.id);
  const row = await db.get('SELECT image_url FROM help_requests WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
  await db.run('DELETE FROM help_requests WHERE id = ?', [id]);
  deleteUpload(row.image_url);
  await audit(req.user.id, 'help_request_delete', `help#${id}`, req.ip);
  res.json({ ok: true, message: 'تم حذف الطلب' });
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
    'vodafone_cash', 'vodafone_cash_name'
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

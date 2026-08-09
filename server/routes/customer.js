const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db, uploadsDir } = require('../db');
const {
  createSession, getCustomerBySession, revokeSession, revokeAllSessions, revokeOtherSessions,
  recordAttempt, clearAttempts, lockoutRemainingMs, audit
} = require('../security');
const { requireCustomer } = require('../middleware/customerAuth');
const { upload, validateFileSignature } = require('../middleware/upload');
const { saveFile, deleteByUrl } = require('../storage');
const {
  validate,
  studentRegisterSchema,
  studentLoginSchema,
  studentForgotSchema,
  studentVerifyCodeSchema,
  studentResetSchema,
  studentPasswordChangeSchema,
  enrollSchema,
  checkoutSchema,
  quizSubmitSchema
} = require('../middleware/validate');
const { sendMail } = require('../email');
const { ah } = require('../asyncHandler');

const router = express.Router();

const CUSTOMER_COOKIE = 'ctoken';

function requestBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const host = req.get('host');
  return `${req.protocol}://${host || `localhost:${process.env.PORT || 5000}`}`;
}

let oauthCache = null;
let oauthCacheTs = 0;
async function oauthConfig() {
  if (oauthCache && Date.now() - oauthCacheTs < 30000) return oauthCache;
  let settings = {};
  try {
    (await db.all('SELECT key, value FROM settings')).forEach((s) => { settings[s.key] = s.value; });
  } catch (_) { /* ignore */ }
  oauthCache = {
    googleId: process.env.GOOGLE_CLIENT_ID || (settings.google_client_id || '').trim(),
    googleSecret: process.env.GOOGLE_CLIENT_SECRET || (settings.google_client_secret || '').trim()
  };
  oauthCacheTs = Date.now();
  return oauthCache;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات دخول كتيرة، استنى شوية وجرب تاني' }
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كتيرة، جرب بعد 15 دقيقة' }
});

function setCustomerCookie(res, rawToken) {
  res.cookie(CUSTOMER_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function publicCustomer(c) {
  return {
    id: c.id, email: c.email, name: c.name, avatar: c.avatar || '',
    phone: c.phone || '', parent_phone: c.parent_phone || '',
    governorate: c.governorate || '', academic_year: c.academic_year || '',
    status: c.status || 'active'
  };
}

const statusMessage = (status) => status === 'blocked'
  ? 'حسابك متوقف على المنصة — تواصل مع مستر أحمد على الواتساب.'
  : 'حسابك لسه قيد المراجعة — مستر أحمد هيفعّله أول ما يتأكد إنك طالب حقيقي. جرب تاني بعد ما يوصلك التنبيه.';

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

const safeDelete = (url) => {
  deleteByUrl(url).catch(() => {});
};

/* ---------------- Register / Login ---------------- */
router.post('/register', validate(studentRegisterSchema), ah(async (req, res) => {
  const { name, email, password, phone, parent_phone, governorate, academic_year } = req.body;
  const exists = await db.get('SELECT id FROM customers WHERE email = ?', [email]);
  if (exists) return res.status(409).json({ error: 'الإيميل مسجل بالفعل — سجّل دخول بدل التسجيل' });
  const now = new Date().toISOString();
  const info = await db.run('INSERT INTO customers (email, name, password_hash, phone, parent_phone, governorate, academic_year, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [email, name, bcrypt.hashSync(password, 10), phone, parent_phone, governorate, academic_year, 'pending', now]);
  const rawToken = await createSession(info.lastInsertRowid, req.headers['user-agent'], req.ip, 'customer');
  setCustomerCookie(res, rawToken);
  await audit(0, 'student_register', `${name} (${email})`, req.ip);
  const c = await db.get('SELECT * FROM customers WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json({ ok: true, user: publicCustomer(c) });
}));

router.post('/login', loginLimiter, validate(studentLoginSchema), ah(async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  const remaining = await lockoutRemainingMs(email);
  if (remaining > 0) {
    return res.status(429).json({ error: `الحساب متقفل مؤقتاً، جرب بعد ${Math.ceil(remaining / 60000)} دقيقة` });
  }

  const row = await db.get('SELECT * FROM customers WHERE email = ?', [email]);
  const ok = Boolean(row) && row.password_hash && bcrypt.compareSync(password, row.password_hash);
  await recordAttempt(email, ip, ok);
  if (!ok) {
    await audit(0, 'student_login_fail', email, ip);
    return res.status(401).json({ error: 'الإيميل أو كلمة السر غير صحيحة' });
  }

  if (row.status && row.status !== 'active') {
    return res.status(403).json({ error: statusMessage(row.status), code: row.status });
  }

  await clearAttempts(email);
  const rawToken = await createSession(row.id, req.headers['user-agent'], ip, 'customer');
  setCustomerCookie(res, rawToken);
  await db.run('UPDATE customers SET last_login = ? WHERE id = ?', [new Date().toISOString(), row.id]);
  await audit(0, 'student_login', `${row.name} (${row.email})`, ip);
  res.json({ ok: true, user: publicCustomer(row) });
}));

router.post('/logout', ah(async (req, res) => {
  await revokeSession(req.cookies && req.cookies[CUSTOMER_COOKIE]);
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' });
  res.json({ ok: true });
}));

router.get('/me', ah(async (req, res) => {
  const raw = req.cookies && req.cookies[CUSTOMER_COOKIE];
  const data = await getCustomerBySession(raw);
  if (!data) return res.status(401).json({ error: 'غير مسجل دخول' });
  res.json({ user: publicCustomer(data.customer) });
}));

/* ---------------- Forgot / Reset password ---------------- */
router.post('/forgot', forgotLimiter, validate(studentForgotSchema), ah(async (req, res) => {
  const { email } = req.body;
  const row = await db.get('SELECT id, name, email FROM customers WHERE email = ?', [email]);

  if (row) {
    const token = crypto.randomBytes(24).toString('hex');
    const code = String(crypto.randomInt(100000, 999999));
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await db.run('UPDATE customers SET reset_token_hash = ?, reset_code_hash = ?, reset_expires = ? WHERE id = ?',
      [sha256(token), sha256(code), expires, row.id]);

    const link = `${requestBaseUrl(req)}/student/reset?token=${token}`;
    const html = `<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:1.8">
      <h2 style="color:#7c3aed">إعادة تعيين كلمة السر</h2>
      <p>أهلاً ${row.name}،</p>
      <p>ده الكود الخاص بك لإعادة تعيين كلمة السر (صالح لمدة 30 دقيقة):</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#f3e8ff;border:2px dashed #7c3aed;border-radius:12px;padding:12px;text-align:center;color:#5b21b6;direction:ltr">${code}</p>
      <p>أو اضغط الرابط ده بدل إدخال الكود:</p>
      <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">إعادة تعيين كلمة السر</a></p>
      <p>لو معملتش الطلب، تجاهل الرسالة دي.</p>
    </div>`;
    const result = await sendMail({ to: row.email, subject: 'كود إعادة تعيين كلمة السر — منصة مستر أحمد علي الديب للفيزياء', html });

    if (result.sent) {
      return res.json({ ok: true, message: 'لو الإيميل موجود، هتوصلك رسالة فيها الكود' });
    }
    console.log(`[password-reset] كود إعادة تعيين كلمة السر لـ ${row.email}: ${code}`);
    console.log(`[password-reset] رابط إعادة تعيين كلمة السر لـ ${row.email}: ${link}`);
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ok: true, devLink: link, devCode: code, message: 'الكود جاهز (وضع التطوير) — استخدمه خلال 30 دقيقة' });
    }
    return res.json({ ok: true, message: 'فشل إرسال الإيميل حالياً — جرب بعد شوية أو تواصل مع الدعم' });
  }

  res.json({ ok: true, message: 'لو الإيميل موجود، هتوصلك رسالة فيها الكود' });
}));

router.post('/verify-code', forgotLimiter, validate(studentVerifyCodeSchema), ah(async (req, res) => {
  const { email, code } = req.body;
  const row = await db.get('SELECT id, reset_code_hash, reset_expires FROM customers WHERE email = ?', [email]);
  const valid = row && row.reset_code_hash === sha256(String(code).trim()) && row.reset_expires > new Date().toISOString();
  if (!valid) return res.status(400).json({ error: 'الكود غير صحيح أو انتهت صلاحيته — اطلب كود جديد' });
  res.json({ ok: true });
}));

router.post('/reset', validate(studentResetSchema), ah(async (req, res) => {
  const { token = '', email = '', code = '', password } = req.body;

  let row;
  if (token) {
    row = await db.get('SELECT id FROM customers WHERE reset_token_hash = ? AND reset_expires > ?',
      [sha256(token), new Date().toISOString()]);
    if (!row) return res.status(400).json({ error: 'الرابط غير صالح أو انتهت صلاحيته — اطلب رابط جديد' });
  } else {
    row = await db.get('SELECT id, reset_code_hash, reset_expires FROM customers WHERE email = ?', [email]);
    const valid = row && row.reset_code_hash === sha256(String(code).trim()) && row.reset_expires > new Date().toISOString();
    if (!valid) return res.status(400).json({ error: 'الكود غير صحيح أو انتهت صلاحيته — اطلب كود جديد' });
  }

  await db.run("UPDATE customers SET password_hash = ?, reset_token_hash = '', reset_code_hash = '', reset_expires = '' WHERE id = ?",
    [bcrypt.hashSync(password, 10), row.id]);
  await revokeAllSessions(row.id, 'customer');
  await audit(0, 'student_password_reset', `student#${row.id}`, req.ip);
  res.json({ ok: true, message: 'تم تعيين كلمة السر الجديدة — سجّل دخول عادي' });
}));

/* ---------------- Profile ---------------- */
router.post('/change-password', requireCustomer, validate(studentPasswordChangeSchema), ah(async (req, res) => {
  const row = await db.get('SELECT * FROM customers WHERE id = ?', [req.customer.id]);
  if (!row.password_hash) return res.status(400).json({ error: 'حسابك مسجل بجوجل — مفيش كلمة سر لتغييرها' });
  if (!bcrypt.compareSync(req.body.current_password, row.password_hash)) {
    return res.status(400).json({ error: 'كلمة السر الحالية غير صحيحة' });
  }
  await db.run('UPDATE customers SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(req.body.new_password, 10), req.customer.id]);
  await revokeOtherSessions(req.customer.id, req.cookies && req.cookies[CUSTOMER_COOKIE], 'customer');
  await audit(0, 'student_password_change', row.email, req.ip);
  res.json({ ok: true, message: 'تم تغيير كلمة السر' });
}));

/* ---------------- File upload (avatar) ---------------- */
router.post('/upload', requireCustomer, upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'من فضلك اختار ملف' });
  const kind = String(req.body.kind || 'image').toLowerCase();
  if (!validateFileSignature(kind, req.file.buffer)) {
    return res.status(400).json({ error: 'محتوى الملف غير مطابق للصيغة المطلوبة — ارفع ملف سليم' });
  }
  const saved = await saveFile({ buffer: req.file.buffer, originalname: req.file.originalname, mimeType: req.file.mimetype });
  await audit(0, 'student_upload', `${kind}: ${saved.filename}`, req.ip);
  res.json({ url: saved.url });
}));

/* ---------------- Enrollments ---------------- */
router.get('/enrollments', requireCustomer, ah(async (req, res) => {
  const rows = await db.all(`SELECT c.*, e.created_at AS enrolled_at,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.active = 1) AS lessons_count,
    (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id WHERE p.student_id = ? AND l.course_id = c.id AND p.watched = 1) AS watched_count
    FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ? ORDER BY e.created_at DESC`,
    [req.customer.id, req.customer.id]);
  res.json({ enrollments: rows });
}));

router.post('/enroll', requireCustomer, validate(enrollSchema), ah(async (req, res) => {
  const course = await db.get('SELECT id, title, price_amount FROM courses WHERE id = ? AND active = 1', [req.body.course_id]);
  if (!course) return res.status(404).json({ error: 'الكورس غير موجود' });
  if (course.price_amount > 0) {
    return res.status(400).json({ error: 'الكورس ده مدفوع — ادفع الأول عشان يتفعّل عندك' });
  }
  const now = new Date().toISOString();
  try {
    await db.run('INSERT INTO enrollments (student_id, course_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [req.customer.id, req.body.course_id, 'active', now, now]);
  } catch (_) {
    return res.json({ ok: true, message: 'أنت مسجل في الكورس ده بالفعل', already: true });
  }
  await audit(req.customer.id, 'student_enroll', `student ${req.customer.id} → course ${req.body.course_id}`, req.ip);
  res.status(201).json({ ok: true, message: 'تم تسجيلك في الكورس بنجاح — بالتوفيق!' });
}));

/* ---------------- Paid course checkout (Vodafone Cash) ---------------- */
router.get('/payments', requireCustomer, ah(async (req, res) => {
  const rows = await db.all(`SELECT p.*, c.title AS course_title, c.icon AS course_icon
    FROM payments p JOIN courses c ON c.id = p.course_id
    WHERE p.student_id = ? ORDER BY p.id DESC`, [req.customer.id]);
  res.json({ payments: rows });
}));

router.post('/checkout', requireCustomer, validate(checkoutSchema), ah(async (req, res) => {
  const { course_id, reference, payer_phone } = req.body;
  const course = await db.get('SELECT id, title, price_amount FROM courses WHERE id = ? AND active = 1', [course_id]);
  if (!course) return res.status(404).json({ error: 'الكورس غير موجود' });
  if (!(course.price_amount > 0)) return res.status(400).json({ error: 'الكورس ده مجاني — اشترك من زر الاشتراك' });
  const enrolled = await db.get('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [req.customer.id, course_id]);
  if (enrolled) return res.status(400).json({ error: 'أنت مسجل في الكورس ده بالفعل' });
  const existing = await db.get("SELECT * FROM payments WHERE student_id = ? AND course_id = ? AND status = 'pending'", [req.customer.id, course_id]);
  if (existing) {
    return res.json({ ok: true, already: true, payment: existing, message: 'عندك طلب دفع تحت المراجعة لهذا الكورس — مستني موافقة مستر أحمد' });
  }
  const info = await db.run('INSERT INTO payments (student_id, course_id, amount, method, reference, payer_phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.customer.id, course_id, course.price_amount, 'vodafone', reference, payer_phone, 'pending', new Date().toISOString()]);
  await audit(req.customer.id, 'payment_submit', `student ${req.customer.id} → course ${course_id} (${course.price_amount} EGP)`, req.ip);
  const payment = await db.get('SELECT * FROM payments WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json({ ok: true, payment, message: 'تم إرسال تفاصيل الدفع — هيتفعّل الكورس عندك أول ما مستر أحمد يتأكد من التحويل' });
}));

/* ---------------- My testimonials (تقييماتي) ---------------- */
router.get('/my-testimonials', requireCustomer, ah(async (req, res) => {
  const rows = await db.all('SELECT id, client_name, client_role, content, rating, status, created_at FROM testimonials WHERE student_id = ? ORDER BY id DESC', [req.customer.id]);
  res.json({ testimonials: rows });
}));

/* ---------------- Study Materials (ملفات المذاكرة) ---------------- */
router.get('/materials', requireCustomer, ah(async (req, res) => {
  const rows = await db.all(`SELECT m.*, COALESCE(c.title, '') AS course_title
    FROM materials m LEFT JOIN courses c ON c.id = m.course_id
    WHERE m.active = 1 AND (
      m.grade = 'الكل' OR EXISTS (
        SELECT 1 FROM enrollments e JOIN courses c2 ON c2.id = e.course_id
        WHERE e.student_id = ? AND c2.grade = m.grade
      ) OR EXISTS (
        SELECT 1 FROM customers c3 WHERE c3.id = ? AND c3.academic_year = m.grade
      )
    )
    ORDER BY m.is_optional ASC, m.sort_order ASC, m.id DESC`, [req.customer.id, req.customer.id]);
  res.json({ materials: rows });
}));

/* ---------------- Course content + progress ---------------- */
router.get('/course/:id', requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'كورس غير صالح' });
  const course = await db.get('SELECT * FROM courses WHERE id = ?', [id]);
  if (!course) return res.status(404).json({ error: 'الكورس غير موجود' });
  const enrolled = await db.get('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [req.customer.id, id]);
  if (!enrolled) return res.status(403).json({ error: 'سجّل في الكورس الأول عشان تشوف الدروس' });
  const lessons = await db.all('SELECT l.id, l.title, l.video_url, l.duration, l.summary, l.sort_order, COALESCE(p.watched, 0) AS watched FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.student_id = ? WHERE l.course_id = ? AND l.active = 1 ORDER BY l.sort_order ASC, l.id ASC', [req.customer.id, id]);
  const quizzes = await db.all(`SELECT q.*, (SELECT MAX(ROUND(a.score * 100.0 / CASE WHEN a.total > 0 THEN a.total ELSE 1 END)) FROM quiz_attempts a WHERE a.quiz_id = q.id AND a.student_id = ?) AS best_pct FROM quizzes q WHERE q.course_id = ? AND q.active = 1 ORDER BY q.id ASC`, [req.customer.id, id]);
  res.json({ course, lessons, quizzes });
}));

router.post('/lesson/:id/watch', requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const lesson = await db.get('SELECT id, course_id FROM lessons WHERE id = ? AND active = 1', [id]);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  const enrolled = await db.get('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [req.customer.id, lesson.course_id]);
  if (!enrolled) return res.status(403).json({ error: 'سجّل في الكورس الأول عشان تشاهد الدروس' });
  const now = new Date().toISOString();
  await db.run(`INSERT INTO lesson_progress (student_id, lesson_id, watched, completed_at, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(student_id, lesson_id) DO UPDATE SET watched = 1, completed_at = ?, updated_at = ?`,
    [req.customer.id, id, now, now, now, now, now]);
  res.json({ ok: true, message: 'تم حفظ تقدمك' });
}));

/* ---------------- Quizzes ---------------- */
router.get('/quiz/:id', requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'اختبار غير صالح' });
  const quiz = await db.get('SELECT * FROM quizzes WHERE id = ? AND active = 1', [id]);
  if (!quiz) return res.status(404).json({ error: 'الاختبار غير موجود' });
  const enrolled = await db.get('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [req.customer.id, quiz.course_id]);
  if (!enrolled) return res.status(403).json({ error: 'سجّل في الكورس الأول عشان تحل الاختبار' });
  const questions = await db.all('SELECT id, question, options, sort_order FROM questions WHERE quiz_id = ? ORDER BY sort_order ASC, id ASC', [id]);
  const attempts = await db.all('SELECT id, score, total, details, created_at FROM quiz_attempts WHERE student_id = ? AND quiz_id = ? ORDER BY id DESC', [req.customer.id, id]);
  res.json({ quiz, questions, attempts });
}));

router.post('/quiz/submit', requireCustomer, validate(quizSubmitSchema), ah(async (req, res) => {
  const { quiz_id, answers } = req.body;
  const quiz = await db.get('SELECT * FROM quizzes WHERE id = ? AND active = 1', [quiz_id]);
  if (!quiz) return res.status(404).json({ error: 'الاختبار غير موجود' });
  const enrolled = await db.get('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [req.customer.id, quiz.course_id]);
  if (!enrolled) return res.status(403).json({ error: 'سجّل في الكورس الأول عشان تحل الاختبار' });
  const questions = await db.all('SELECT id, question, correct_index, explanation FROM questions WHERE quiz_id = ?', [quiz_id]);
  let score = 0;
  const details = questions.map((q) => {
    const answer = answers[String(q.id)];
    const correct = Number.isInteger(answer) && answer === q['correct_index'];
    if (correct) score += 1;
    return { question_id: q.id, question: q.question, chosen: answer == null ? -1 : answer, correct: q['correct_index'], is_correct: correct, explanation: q.explanation || '' };
  });
  await db.run('INSERT INTO quiz_attempts (student_id, quiz_id, score, total, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [req.customer.id, quiz_id, score, questions.length, JSON.stringify(details), new Date().toISOString()]);
  await audit(req.customer.id, 'student_quiz', `student ${req.customer.id} → quiz ${quiz_id}: ${score}/${questions.length}`, req.ip);
  res.json({ ok: true, score, total: questions.length, details, message: score === questions.length ? 'ممتاز! إجابة كاملة 🎉' : score >= questions.length / 2 ? 'أحسنت! محتاج مراجعة بسيطة' : 'راجع الدرس تاني وحاول كمان مرة — النجاح بييجي بالمحاولة' });
}));

/* ---------------- Student dashboard ---------------- */
router.get('/dashboard', requireCustomer, ah(async (req, res) => {
  const uid = req.customer.id;
  const enrolled = (await db.get('SELECT COUNT(*) AS c FROM enrollments WHERE student_id = ?', [uid])).c;
  const watched = (await db.get('SELECT COUNT(*) AS c FROM lesson_progress WHERE student_id = ? AND watched = 1', [uid])).c;
  const totalLessons = (await db.get('SELECT COUNT(*) AS c FROM lessons WHERE active = 1')).c;
  const quizzesTaken = (await db.get('SELECT COUNT(*) AS c FROM quiz_attempts WHERE student_id = ?', [uid])).c;
  const avgScore = (await db.get('SELECT COALESCE(ROUND(AVG(CAST(score AS REAL) / total * 100)), 0) AS a FROM quiz_attempts WHERE student_id = ? AND total > 0', [uid])).a;
  const enrollments = await db.all(`SELECT c.id, c.title, c.grade, c.icon, e.created_at AS enrolled_at,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.active = 1) AS lessons_count,
    (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id WHERE p.student_id = ? AND l.course_id = c.id AND p.watched = 1) AS watched_count
    FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ? ORDER BY e.created_at DESC LIMIT 4`, [uid, uid]);
  res.json({ stats: { enrolled, watched, totalLessons, quizzesTaken, avgScore: Math.round(avgScore) }, enrollments });
}));

router.get('/progress', requireCustomer, ah(async (req, res) => {
  const uid = req.customer.id;
  const rows = await db.all(`SELECT c.id AS course_id, c.title, c.grade, c.icon,
    COUNT(l.id) AS lessons_count,
    SUM(CASE WHEN p.watched = 1 THEN 1 ELSE 0 END) AS watched_count
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN lessons l ON l.course_id = c.id AND l.active = 1
    LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.student_id = ?
    WHERE e.student_id = ?
    GROUP BY c.id`, [uid, uid]);
  res.json({ progress: rows });
}));

/* ---------------- Social login status ---------------- */
router.get('/social-status', ah(async (req, res) => {
  const cfg = await oauthConfig();
  res.json({ google: Boolean(cfg.googleId && cfg.googleSecret) });
}));

/* ---------------- OAuth helpers ---------------- */
function oauthState(req, res) {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
    path: '/'
  });
  return state;
}

function verifyOAuthState(req, res) {
  const expected = req.cookies && req.cookies.oauth_state;
  res.clearCookie('oauth_state', { path: '/' });
  return Boolean(expected && req.query.state && expected === req.query.state);
}

async function completeOAuth(res, profile) {
  const base = requestBaseUrl(res.req);
  const email = profile.email || `oauth_google_${profile.id}@local`;
  const exists = await db.get('SELECT * FROM customers WHERE email = ? OR google_id = ?', [email, profile.id]);
  let c = exists;
  if (c) {
    await db.run('UPDATE customers SET google_id = ?, last_login = ? WHERE id = ?',
      [profile.id, new Date().toISOString(), c.id]);
  } else {
    const info = await db.run(`INSERT INTO customers (email, name, google_id, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)`,
      [email, profile.name || email, profile.id, new Date().toISOString()]);
    c = { id: info.lastInsertRowid, email, name: profile.name || email, status: 'pending' };
    await audit(0, 'student_oauth_register', `google: ${email} — قيد المراجعة`, res.req.ip);
  }
  if (c.status && c.status !== 'active') {
    await audit(0, 'student_oauth_blocked', `google: ${email} — ${c.status}`, res.req.ip);
    return res.redirect(`${base}/student/login?error=pending`);
  }
  const rawToken = await createSession(c.id, res.req.headers['user-agent'], res.req.ip, 'customer');
  setCustomerCookie(res, rawToken);
  await audit(0, 'student_oauth_login', `google: ${email}`, res.req.ip);
  res.redirect(`${base}/student/account?social=1`);
}

/* ---------------- Google ---------------- */
router.get('/auth/google', ah(async (req, res) => {
  const cfg = await oauthConfig();
  if (!cfg.googleId) return res.status(503).json({ error: 'تسجيل جوجل غير متاح حالياً — سجّل بالإيميل أو كلم مستر أحمد على الواتساب' });
  const base = requestBaseUrl(req);
  const params = new URLSearchParams({
    client_id: cfg.googleId,
    redirect_uri: `${base}/api/customer/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: oauthState(req, res)
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}));

router.get('/auth/google/callback', ah(async (req, res) => {
  const cfg = await oauthConfig();
  const base = requestBaseUrl(req);
  if (!verifyOAuthState(req, res)) return res.redirect(`${base}/student/login?error=state`);
  if (req.query.error) return res.redirect(`${base}/student/login?error=denied`);
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: cfg.googleId,
        client_secret: cfg.googleSecret,
        redirect_uri: `${base}/api/customer/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return res.redirect(`${base}/student/login?error=token`);
    const meRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const me = await meRes.json();
    if (!me.sub) return res.redirect(`${base}/student/login?error=profile`);
    await completeOAuth(res, { id: me.sub, email: me.email, name: me.name });
  } catch (_) {
    res.redirect(`${base}/student/login?error=server`);
  }
}));

/* ---------------- Notifications (إشعاراتي) ---------------- */
router.get('/notifications', requireCustomer, ah(async (req, res) => {
  const notifications = await db.all(`SELECT n.id, n.title, n.body, n.link, n.created_at,
      CASE WHEN r.read_at IS NULL THEN 0 ELSE 1 END AS read
    FROM notifications n
    LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.customer_id = ?
    ORDER BY n.id DESC LIMIT 100`, [req.customer.id]);
  const unread = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unread });
}));

router.post('/notifications/:id/read', requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await db.get('SELECT id FROM notifications WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'الإشعار غير موجود' });
  await db.run('INSERT INTO notification_reads (notification_id, customer_id, read_at) VALUES (?, ?, ?) ON CONFLICT(notification_id, customer_id) DO NOTHING',
    [id, req.customer.id, new Date().toISOString()]);
  res.json({ ok: true });
}));

router.post('/notifications/read-all', requireCustomer, ah(async (req, res) => {
  const now = new Date().toISOString();
  await db.run('INSERT INTO notification_reads (notification_id, customer_id, read_at) SELECT id, ?, ? FROM notifications n WHERE NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.customer_id = ?)',
    [req.customer.id, now, req.customer.id]);
  res.json({ ok: true, message: 'اتقرت كل الإشعارات' });
}));

module.exports = router;

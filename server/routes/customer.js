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
const {
  validate,
  studentRegisterSchema,
  studentLoginSchema,
  studentForgotSchema,
  studentResetSchema,
  studentPasswordChangeSchema,
  enrollSchema,
  checkoutSchema,
  quizSubmitSchema
} = require('../middleware/validate');
const { sendMail, SMTP_CONFIGURED } = require('../email');
const { ah } = require('../asyncHandler');

const router = express.Router();

const BASE_URL = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

const CUSTOMER_COOKIE = 'ctoken';

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
    governorate: c.governorate || '', academic_year: c.academic_year || ''
  };
}

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

const safeDelete = (url) => {
  if (!url || !String(url).startsWith('/uploads/')) return;
  const file = path.join(uploadsDir, path.basename(url));
  if (file.startsWith(uploadsDir)) { try { fs.unlinkSync(file); } catch (_) { /* ignore */ } }
};

/* ---------------- Register / Login ---------------- */
router.post('/register', validate(studentRegisterSchema), ah(async (req, res) => {
  const { name, email, password, phone, parent_phone, governorate, academic_year } = req.body;
  const exists = await db.get('SELECT id FROM customers WHERE email = ?', [email]);
  if (exists) return res.status(409).json({ error: 'الإيميل مسجل بالفعل — سجّل دخول بدل التسجيل' });
  const now = new Date().toISOString();
  const info = await db.run('INSERT INTO customers (email, name, password_hash, phone, parent_phone, governorate, academic_year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [email, name, bcrypt.hashSync(password, 10), phone, parent_phone, governorate, academic_year, now]);
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
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await db.run('UPDATE customers SET reset_token_hash = ?, reset_expires = ? WHERE id = ?',
      [sha256(token), expires, row.id]);

    const link = `${BASE_URL}/student/reset?token=${token}`;
    const html = `<div dir="rtl" style="font-family:Tahoma,sans-serif"><h2>إعادة تعيين كلمة السر</h2><p>أهلاً ${row.name}،</p><p>اضغط الرابط ده لإعادة تعيين كلمة السر (صالح لمدة 30 دقيقة):</p><p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">إعادة تعيين كلمة السر</a></p><p>لو معملتش الطلب، تجاهل الرسالة دي.</p></div>`;
    const result = await sendMail({ to: row.email, subject: 'إعادة تعيين كلمة السر — منصة مستر أحمد علي الديب للفيزياء', html });

    if (result.sent) {
      return res.json({ ok: true, message: 'لو الإيميل موجود، هتوصلك رسالة فيها الرابط' });
    }
    console.log(`[password-reset] رابط إعادة تعيين كلمة السر لـ ${row.email}: ${link}`);
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ok: true, devLink: link, message: 'وضع التطوير: الرابط معروض هنا مباشرة (فعّل SMTP في .env عشان يبعت إيميل)' });
    }
    return res.json({ ok: true, message: 'فشل إرسال الإيميل حالياً — جرب بعد شوية أو تواصل مع الدعم' });
  }

  res.json({ ok: true, message: 'لو الإيميل موجود، هتوصلك رسالة فيها الرابط' });
}));

router.post('/reset', validate(studentResetSchema), ah(async (req, res) => {
  const { token, password } = req.body;
  const row = await db.get('SELECT id FROM customers WHERE reset_token_hash = ? AND reset_expires > ?',
    [sha256(token), new Date().toISOString()]);
  if (!row) return res.status(400).json({ error: 'الرابط غير صالح أو انتهت صلاحيته — اطلب رابط جديد' });
  await db.run("UPDATE customers SET password_hash = ?, reset_token_hash = '', reset_expires = '' WHERE id = ?",
    [bcrypt.hashSync(password, 10), row.id]);
  await revokeAllSessions(row.id, 'customer');
  await audit(0, 'student_password_reset', `student#${row.id}`, req.ip);
  res.json({ ok: true, message: 'تم تعيين كلمة السر الجديدة — سجّل دخول عادي' });
}));

/* ---------------- Profile ---------------- */
router.post('/change-password', requireCustomer, validate(studentPasswordChangeSchema), ah(async (req, res) => {
  const row = await db.get('SELECT * FROM customers WHERE id = ?', [req.customer.id]);
  if (!row.password_hash) return res.status(400).json({ error: 'حسابك مسجل بجوجل/فيسبوك — مفيش كلمة سر لتغييرها' });
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
  if (!validateFileSignature(kind, req.file.path)) {
    safeDelete('/uploads/' + req.file.filename);
    return res.status(400).json({ error: 'محتوى الملف غير مطابق للصيغة المطلوبة — ارفع ملف سليم' });
  }
  await audit(0, 'student_upload', `${kind}: ${req.file.filename}`, req.ip);
  res.json({ url: '/uploads/' + req.file.filename });
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
      )
    )
    ORDER BY m.is_optional ASC, m.sort_order ASC, m.id DESC`, [req.customer.id]);
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
router.get('/social-status', (req, res) => {
  res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
  });
});

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
  const email = profile.email || `oauth_${profile.provider}_${profile.id}@local`;
  const exists = await db.get(`SELECT * FROM customers WHERE email = ? OR ${profile.provider === 'google' ? 'google_id' : 'facebook_id'} = ?`, [email, profile.id]);
  let c = exists;
  if (c) {
    await db.run(`UPDATE customers SET ${profile.provider === 'google' ? 'google_id' : 'facebook_id'} = ?, last_login = ? WHERE id = ?`,
      [profile.id, new Date().toISOString(), c.id]);
  } else {
    const info = await db.run(`INSERT INTO customers (email, name, ${profile.provider === 'google' ? 'google_id' : 'facebook_id'}, created_at)
      VALUES (?, ?, ?, ?)`,
      [email, profile.name || email, profile.id, new Date().toISOString()]);
    c = { id: info.lastInsertRowid, email, name: profile.name || email };
    await audit(0, 'student_oauth_register', `${profile.provider}: ${email}`, res.req.ip);
  }
  const rawToken = await createSession(c.id, res.req.headers['user-agent'], res.req.ip, 'customer');
  setCustomerCookie(res, rawToken);
  await audit(0, 'student_oauth_login', `${profile.provider}: ${email}`, res.req.ip);
  res.redirect(`${BASE_URL}/student/account?social=1`);
}

/* ---------------- Google ---------------- */
router.get('/auth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'تسجيل جوجل مش مفعّل — ضيف المفاتيح في .env' });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${BASE_URL}/api/customer/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: oauthState(req, res)
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/auth/google/callback', ah(async (req, res) => {
  if (!verifyOAuthState(req, res)) return res.redirect(`${BASE_URL}/student/login?error=state`);
  if (req.query.error) return res.redirect(`${BASE_URL}/student/login?error=denied`);
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/api/customer/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return res.redirect(`${BASE_URL}/student/login?error=token`);
    const meRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const me = await meRes.json();
    if (!me.sub) return res.redirect(`${BASE_URL}/student/login?error=profile`);
    await completeOAuth(res, { provider: 'google', id: me.sub, email: me.email, name: me.name });
  } catch (_) {
    res.redirect(`${BASE_URL}/student/login?error=server`);
  }
}));

/* ---------------- Facebook ---------------- */
router.get('/auth/facebook', (req, res) => {
  if (!process.env.FACEBOOK_APP_ID) return res.status(503).json({ error: 'تسجيل فيسبوك مش مفعّل — ضيف المفاتيح في .env' });
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: `${BASE_URL}/api/customer/auth/facebook/callback`,
    scope: 'email',
    state: oauthState(req, res)
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

router.get('/auth/facebook/callback', ah(async (req, res) => {
  if (!verifyOAuthState(req, res)) return res.redirect(`${BASE_URL}/student/login?error=state`);
  if (req.query.error) return res.redirect(`${BASE_URL}/student/login?error=denied`);
  try {
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: `${BASE_URL}/api/customer/auth/facebook/callback`,
      code: String(req.query.code)
    })}`);
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return res.redirect(`${BASE_URL}/student/login?error=token`);
    const proof = crypto.createHmac('sha256', process.env.FACEBOOK_APP_SECRET).update(tokens.access_token).digest('hex');
    const meRes = await fetch(`https://graph.facebook.com/me?${new URLSearchParams({
      fields: 'id,name,email',
      access_token: tokens.access_token,
      appsecret_proof: proof
    })}`);
    const me = await meRes.json();
    if (!me.id) return res.redirect(`${BASE_URL}/student/login?error=profile`);
    await completeOAuth(res, { provider: 'facebook', id: me.id, email: me.email, name: me.name });
  } catch (_) {
    res.redirect(`${BASE_URL}/student/login?error=server`);
  }
}));

module.exports = router;

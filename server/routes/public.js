const express = require('express');
const rateLimit = require('express-rate-limit');
const { db } = require('../db');
const { audit } = require('../security');
const { validate, contactSchema, testimonialSubmitSchema, bookingSchema } = require('../middleware/validate');
const { upload, validateFileSignature } = require('../middleware/upload');
const { getCached, setCached } = require('../cache');
const { requireCustomer } = require('../middleware/customerAuth');
const { ah } = require('../asyncHandler');

const router = express.Router();

const DAYS_ORDER = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'أرسلت كتير، جرب بعد ساعة' }
});

const testimonialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'بعت كتير، جرب بعد ساعة' }
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'أرسلت كتير، جرب بعد ساعة' }
});

async function cachedRoute(req, res, ttlMs = 30000, builder) {
  const key = req.originalUrl;
  const hit = getCached(key);
  if (hit) {
    res.set('Cache-Control', 'public, max-age=30');
    return res.json(hit);
  }
  const data = await builder();
  setCached(key, data, ttlMs);
  res.set('Cache-Control', 'public, max-age=30');
  res.json(data);
}

router.get('/site', ah(async (req, res) => {
  await cachedRoute(req, res, 30000, async () => {
    const settings = {};
    (await db.all('SELECT key, value FROM settings')).forEach((s) => { settings[s.key] = s.value; });
    return { settings };
  });
}));

router.get('/courses', ah(async (req, res) => {
  await cachedRoute(req, res, 20000, async () => {
    const { grade } = req.query;
    const params = [];
    let q = `SELECT c.*,
      (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.active = 1) AS lessons_count
      FROM courses c WHERE c.active = 1`;
    if (grade && grade !== 'الكل') {
      q += ' AND c.grade = ?';
      params.push(String(grade).slice(0, 100));
    }
    q += ' ORDER BY c.sort_order ASC, c.id ASC';
    return { courses: await db.all(q, params) };
  });
}));

router.get('/courses/grades', ah(async (req, res) => {
  await cachedRoute(req, res, 30000, async () => {
    const rows = await db.all("SELECT DISTINCT grade FROM courses WHERE active = 1 AND grade != '' ORDER BY grade");
    return { grades: rows.map((r) => r.grade) };
  });
}));

router.get('/courses/:id', ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'كورس غير صالح' });
  const course = await db.get('SELECT * FROM courses WHERE id = ? AND active = 1', [id]);
  if (!course) return res.status(404).json({ error: 'الكورس غير موجود' });
  const lessons = await db.all('SELECT id, title, video_url, duration, summary, sort_order FROM lessons WHERE course_id = ? AND active = 1 ORDER BY sort_order ASC, id ASC', [id]);
  const quizzes = await db.all('SELECT id, title, description, duration_minutes FROM quizzes WHERE course_id = ? AND active = 1 ORDER BY id ASC', [id]);
  res.json({ course, lessons, quizzes });
}));

router.get('/testimonials', ah(async (req, res) => {
  await cachedRoute(req, res, 30000, async () => ({
    testimonials: await db.all("SELECT * FROM testimonials WHERE active = 1 AND status = 'approved' ORDER BY id DESC")
  }));
}));

router.post('/testimonials/upload', testimonialLimiter, upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'اختار صورة الأول' });
  if (!validateFileSignature('image', req.file.path)) {
    try { require('fs').unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    return res.status(400).json({ error: 'الملف مش صورة سليمة — ارفع jpg أو png أو webp' });
  }
  res.json({ url: '/uploads/' + req.file.filename });
}));

router.post('/testimonials', testimonialLimiter, requireCustomer, validate(testimonialSubmitSchema), ah(async (req, res) => {
  const { client_name, client_role, content, rating, image_url } = req.body;
  const name = (client_name || '').trim() || req.customer.name;
  await db.run("INSERT INTO testimonials (client_name, client_role, content, rating, active, image_url, status, source, student_id, created_at) VALUES (?, ?, ?, ?, 0, ?, 'pending', 'student', ?, ?)",
    [name, client_role || '', content, rating, image_url || '', req.customer.id, new Date().toISOString()]);
  await audit(req.customer.id, 'testimonial_submit', `${name} — ${rating} نجوم`, req.ip);
  res.status(201).json({ ok: true, message: 'وصل تقييمك، هيظهر على الموقع بعد موافقة مستر أحمد' });
}));

router.get('/faqs', ah(async (req, res) => {
  await cachedRoute(req, res, 30000, async () => ({
    faqs: await db.all('SELECT * FROM faqs WHERE active = 1 ORDER BY sort_order ASC, id ASC')
  }));
}));

router.get('/schedule', ah(async (req, res) => {
  await cachedRoute(req, res, 30000, async () => ({
    schedule: await db.all('SELECT id, grade, day, start_time, end_time, note, period, tag, tag_active FROM schedule_items WHERE active = 1 ORDER BY sort_order ASC, id ASC'),
    dayOrder: DAYS_ORDER
  }));
}));

router.post('/contact', contactLimiter, validate(contactSchema), ah(async (req, res) => {
  const { name, phone, email, subject, message } = req.body;
  await db.run('INSERT INTO messages (name, phone, email, subject, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [name, phone, email, subject, message, new Date().toISOString()]);
  await audit(0, 'contact_message', `${name} — ${subject || 'بدون موضوع'}`, req.ip);
  res.json({ ok: true, message: 'وصلت رسالتك بنجاح، مستر أحمد هيرد عليك في أقرب وقت' });
}));

router.post('/bookings', bookingLimiter, validate(bookingSchema), ah(async (req, res) => {
  const b = req.body;
  await db.run("INSERT INTO bookings (student_name, phone, parent_name, parent_phone, governorate, academic_year, grade, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)",
    [b.student_name, b.phone, b.parent_name, b.parent_phone, b.governorate, b.academic_year, b.grade, b.note, new Date().toISOString()]);
  await audit(0, 'booking_submit', `${b.student_name} — ${b.governorate || ''} ${b.academic_year || ''}`, req.ip);
  res.json({ ok: true, message: 'وصل طلب الحجز، هيتواصل معاك مستر أحمد على نفس الرقم لتأكيد الموعد' });
}));

module.exports = router;

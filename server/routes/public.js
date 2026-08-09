const express = require('express');
const rateLimit = require('express-rate-limit');
const { db } = require('../db');
const { audit } = require('../security');
const { validate, contactSchema, testimonialSubmitSchema, testimonialPublicSchema, bookingSchema } = require('../middleware/validate');
const { upload, validateFileSignature } = require('../middleware/upload');
const { saveFile } = require('../storage');

const { getCustomerBySession } = require('../security');
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

async function cachedRoute(req, res, ttlMs, builder) {
  res.set('Cache-Control', 'no-cache');
  res.json(await builder());
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
    testimonials: await db.all("SELECT * FROM testimonials WHERE active = 1 AND status = 'approved' ORDER BY id DESC LIMIT 5")
  }));
}));

router.post('/testimonials/upload', testimonialLimiter, upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'اختار صورة الأول' });
  if (!validateFileSignature('image', req.file.buffer)) {
    return res.status(400).json({ error: 'الملف مش صورة سليمة — ارفع jpg أو png أو webp' });
  }
  const saved = await saveFile({ buffer: req.file.buffer, originalname: req.file.originalname, mimeType: req.file.mimetype });
  res.json({ url: saved.url });
}));

router.post('/testimonials', testimonialLimiter, requireCustomer, validate(testimonialSubmitSchema), ah(async (req, res) => {
  const { client_name, client_role, content, rating, image_url } = req.body;
  const name = (client_name || '').trim() || req.customer.name;
  await db.run("INSERT INTO testimonials (client_name, client_role, content, rating, active, image_url, status, source, student_id, created_at) VALUES (?, ?, ?, ?, 0, ?, 'pending', 'student', ?, ?)",
    [name, client_role || '', content, rating, image_url || '', req.customer.id, new Date().toISOString()]);
  await audit(req.customer.id, 'testimonial_submit', `${name} — ${rating} نجوم`, req.ip);
  res.status(201).json({ ok: true, message: 'وصل تقييمك، هيظهر على الموقع بعد موافقة مستر أحمد' });
}));

router.post('/testimonials/public', testimonialLimiter, validate(testimonialPublicSchema), ah(async (req, res) => {
  const { client_name, client_role, content, rating, image_url, website } = req.body;
  if (website) return res.status(200).json({ ok: true, message: 'وصل تقييمك، هيظهر بعد موافقة مستر أحمد' });
  await db.run("INSERT INTO testimonials (client_name, client_role, content, rating, active, image_url, status, source, submitted_ip, created_at) VALUES (?, ?, ?, ?, 0, ?, 'pending', 'public', ?, ?)",
    [client_name.trim(), client_role || '', content, rating, image_url || '', req.ip || '', new Date().toISOString()]);
  res.status(201).json({ ok: true, message: 'وصل تقييمك، هيظهر على الموقع بعد موافقة مستر أحمد' });
}));

router.get('/faqs', ah(async (req, res) => {
  await cachedRoute(req, res, 30000, async () => ({
    faqs: await db.all('SELECT * FROM faqs WHERE active = 1 ORDER BY sort_order ASC, id ASC')
  }));
}));

router.get('/schedule', ah(async (req, res) => {
  await cachedRoute(req, res, 30000, async () => {
    const schedule = await db.all('SELECT id, grade, day, start_time, end_time, note, period, tag, tag_active FROM schedule_items WHERE active = 1 ORDER BY sort_order ASC, id ASC');
    const { cairoParts, now24, nextSession, fmt24m } = require('../scheduleUtil');
    const parts = cairoParts();
    const nxt = nextSession(schedule, parts);
    return {
      schedule,
      dayOrder: DAYS_ORDER,
      now24: now24(),
      today: parts.weekday,
      next: nxt ? {
        grade: nxt.item.grade,
        day: nxt.item.day,
        start_time: nxt.item.start_time,
        start24: fmt24m(nxt.startMin),
        end_time: nxt.item.end_time,
        status: nxt.status,
        minutesUntil: nxt.minutesUntil
      } : null
    };
  });
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

/* ---------------- Community ---------------- */
const communityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'كتير قوي، استنى شوية وجرب تاني' }
});

const POST_CATEGORIES = ['عام', 'مذاكرة', 'سؤال فيزياء', 'ملخصات', 'نصائح', 'أمنية 🎯'];
const REACTION_EMOJIS = ['👍', '🔥', '❤️', '😂', '🎯', '💡'];

async function optionalCustomer(req) {
  const raw = req.cookies && req.cookies.ctoken;
  if (!raw) return null;
  try {
    const d = await getCustomerBySession(raw);
    return d && d.customer ? d.customer : null;
  } catch (_) {
    return null;
  }
}

async function attachReactions(posts, customerId) {
  const ids = posts.map((p) => p.id);
  if (!ids.length) return;
  const ph = ids.map(() => '?').join(',');
  const rows = await db.all(`SELECT post_id, emoji, COUNT(*) AS cnt FROM community_reactions WHERE post_id IN (${ph}) GROUP BY post_id, emoji`, ids);
  const byPost = {};
  rows.forEach((r) => { (byPost[r.post_id] = byPost[r.post_id] || {})[r.emoji] = r.cnt; });
  posts.forEach((p) => {
    p.reactions = byPost[p.id] || {};
    p.reactions_count = Object.values(p.reactions).reduce((a, b) => a + b, 0);
  });
  if (customerId) {
    const mine = await db.all(`SELECT post_id, emoji FROM community_reactions WHERE customer_id = ? AND post_id IN (${ph})`, [customerId, ...ids]);
    const m = {};
    mine.forEach((r) => { (m[r.post_id] = m[r.post_id] || []).push(r.emoji); });
    posts.forEach((p) => { p.my_reactions = m[p.id] || []; });
  }
}

router.get('/community/posts', ah(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const per = Math.min(50, Math.max(1, parseInt(req.query.per, 10) || 20));
  const sort = ['new', 'hot', 'active'].includes(req.query.sort) ? req.query.sort : 'new';
  const q = String(req.query.q || '').trim().slice(0, 100);
  const customer = await optionalCustomer(req);

  let where = "WHERE p.status = 'active'";
  const params = [];
  if (q) {
    const like = `%${q}%`;
    where += ' AND (p.title LIKE ? OR p.content LIKE ?)';
    params.push(like, like);
  }
  const total = (await db.get(`SELECT COUNT(*) AS c FROM community_posts p ${where}`, params)).c;
  const order = sort === 'hot'
    ? '(p.likes + (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id) * 2) DESC, p.id DESC'
    : sort === 'active'
      ? '(SELECT MAX(c.id) FROM community_comments c WHERE c.post_id = p.id) DESC, p.id DESC'
      : 'p.id DESC';
  const posts = await db.all(
    `SELECT p.id, p.author_name, p.title, p.content, p.category, p.image_url, p.views, p.likes, p.created_at,
      (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id) AS comments_count
     FROM community_posts p ${where}
     ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, per, (page - 1) * per]
  );
  await attachReactions(posts, customer && customer.id);
  res.json({ posts, total, page, per, sort });
}));

router.get('/community/posts/:id', ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'بوست غير صالح' });
  const customer = await optionalCustomer(req);
  const post = await db.get("SELECT * FROM community_posts WHERE id = ? AND status = 'active'", [id]);
  if (!post) return res.status(404).json({ error: 'البوست غير موجود' });
  await db.run('UPDATE community_posts SET views = views + 1 WHERE id = ?', [id]);
  await attachReactions([post], customer && customer.id);
  post.views = (post.views || 0) + 1;
  const comments = await db.all('SELECT id, author_name, content, likes, created_at FROM community_comments WHERE post_id = ? ORDER BY id ASC', [id]);
  if (customer) {
    const cids = comments.map((c) => c.id);
    if (cids.length) {
      const liked = await db.all(`SELECT comment_id FROM comment_likes WHERE customer_id = ? AND comment_id IN (${cids.map(() => '?').join(',')})`, [customer.id, ...cids]);
      const likedSet = new Set(liked.map((r) => r.comment_id));
      comments.forEach((c) => { c.my_liked = likedSet.has(c.id); });
    }
  }
  res.json({ post, comments });
}));

router.post('/community/posts', communityLimiter, requireCustomer, ah(async (req, res) => {
  const title = String(req.body && req.body.title || '').trim().slice(0, 200);
  const content = String(req.body && req.body.content || '').trim().slice(0, 3000);
  let category = String(req.body && req.body.category || 'عام').trim().slice(0, 50) || 'عام';
  if (!POST_CATEGORIES.includes(category)) category = 'عام';
  const image_url = String(req.body && req.body.image_url || '').slice(0, 500);
  const askTeacher = Boolean(req.body && req.body.ask_teacher);
  if (!title) return res.status(400).json({ error: 'اكتب عنوان البوست' });
  if (!content) return res.status(400).json({ error: 'اكتب نص البوست' });
  const now = new Date().toISOString();
  const r = await db.run('INSERT INTO community_posts (student_id, author_name, title, content, category, image_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.customer.id, req.customer.name || req.customer.email, title, content, category, image_url, 'active', now, now]);
  await audit(req.customer.id, 'community_post', `post#${r.lastInsertRowid} — ${title.slice(0, 60)}`, req.ip);
  if (askTeacher && category === 'سؤال فيزياء') {
    await db.run('INSERT INTO help_requests (student_name, contact, client_id, student_id, type, content, image_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.customer.name || req.customer.email, req.customer.email, `stu:${req.customer.id}`, req.customer.id, 'community',
        `[بوست الكوميونتي #${r.lastInsertRowid}] ${title}\n${content}`, image_url, 'new', now]);
    await audit(req.customer.id, 'community_ask_teacher', `post#${r.lastInsertRowid} → طلب رد من المدرس`, req.ip);
  }
  res.status(201).json({ ok: true, id: r.lastInsertRowid, message: 'تم نشر بوستك في الكوميونتي' });
}));

router.post('/community/posts/:id/comments', communityLimiter, requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const content = String(req.body && req.body.content || '').trim().slice(0, 1000);
  const post = await db.get("SELECT id FROM community_posts WHERE id = ? AND status = 'active'", [id]);
  if (!post) return res.status(404).json({ error: 'البوست غير موجود' });
  if (!content) return res.status(400).json({ error: 'اكتب التعليق الأول' });
  await db.run('INSERT INTO community_comments (post_id, student_id, author_name, content, likes, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    [id, req.customer.id, req.customer.name || req.customer.email, content, new Date().toISOString()]);
  res.status(201).json({ ok: true, message: 'تم إضافة تعليقك' });
}));

router.post('/community/posts/:id/like', communityLimiter, requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = await db.get("SELECT id FROM community_posts WHERE id = ? AND status = 'active'", [id]);
  if (!post) return res.status(404).json({ error: 'البوست غير موجود' });
  await db.run('UPDATE community_posts SET likes = likes + 1 WHERE id = ?', [id]);
  res.json({ ok: true, message: 'تمام' });
}));

router.post('/community/posts/:id/reactions', communityLimiter, requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const emoji = String(req.body && req.body.emoji || '').trim().slice(0, 8);
  const post = await db.get("SELECT id FROM community_posts WHERE id = ? AND status = 'active'", [id]);
  if (!post) return res.status(404).json({ error: 'البوست غير موجود' });
  if (!REACTION_EMOJIS.includes(emoji)) return res.status(400).json({ error: 'تفاعل غير مسموح' });
  const existing = await db.get('SELECT 1 FROM community_reactions WHERE post_id = ? AND customer_id = ? AND emoji = ?', [id, req.customer.id, emoji]);
  if (existing) {
    await db.run('DELETE FROM community_reactions WHERE post_id = ? AND customer_id = ? AND emoji = ?', [id, req.customer.id, emoji]);
  } else {
    await db.run('DELETE FROM community_reactions WHERE post_id = ? AND customer_id = ?', [id, req.customer.id]);
    await db.run('INSERT INTO community_reactions (post_id, customer_id, emoji, created_at) VALUES (?, ?, ?, ?)', [id, req.customer.id, emoji, new Date().toISOString()]);
  }
  const [p] = [await db.get('SELECT id FROM community_posts WHERE id = ?', [id])];
  await attachReactions([p], req.customer.id);
  res.json({ ok: true, reactions: p.reactions, my_reactions: p.my_reactions, reactions_count: p.reactions_count });
}));

router.post('/community/comments/:id/like', communityLimiter, requireCustomer, ah(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const comment = await db.get('SELECT id FROM community_comments WHERE id = ?', [id]);
  if (!comment) return res.status(404).json({ error: 'التعليق غير موجود' });
  const existing = await db.get('SELECT 1 FROM comment_likes WHERE comment_id = ? AND customer_id = ?', [id, req.customer.id]);
  if (existing) {
    await db.run('DELETE FROM comment_likes WHERE comment_id = ? AND customer_id = ?', [id, req.customer.id]);
    await db.run('UPDATE community_comments SET likes = MAX(0, likes - 1) WHERE id = ?', [id]);
    return res.json({ ok: true, liked: false });
  }
  await db.run('INSERT INTO comment_likes (comment_id, customer_id, created_at) VALUES (?, ?, ?)', [id, req.customer.id, new Date().toISOString()]);
  await db.run('UPDATE community_comments SET likes = likes + 1 WHERE id = ?', [id]);
  res.json({ ok: true, liked: true });
}));

module.exports = router;

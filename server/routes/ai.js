const express = require('express');
const rateLimit = require('express-rate-limit');
const { ah } = require('../asyncHandler');
const { db } = require('../db');

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

const { cairoParts, scheduleLiveText } = require('../scheduleUtil');

const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'مفيش استفسارات كتير في الدقيقة الواحدة، جرب بعد شوية.' }
});

const DAY_ORDER = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

async function buildContext() {
  try {
    const settings = {};
    (await db.all('SELECT key, value FROM settings')).forEach((s) => { settings[s.key] = s.value; });
    const courses = await db.all('SELECT title, grade FROM courses WHERE active = 1 ORDER BY sort_order ASC, id ASC');
    const items = await db.all('SELECT grade, day, start_time, end_time, note, tag, tag_active FROM schedule_items WHERE active = 1 ORDER BY sort_order ASC, id ASC');
    const faqs = await db.all('SELECT question, answer FROM faqs WHERE active = 1 ORDER BY sort_order ASC, id ASC');
    const byDay = {};
    items.forEach((r) => { (byDay[r.day] = byDay[r.day] || []).push(r); });
    const scheduleText = DAY_ORDER.filter((d) => byDay[d]).map((d) =>
      `${d}: ` + byDay[d].map((r) =>
        `${r.grade} ${r.start_time}${r.end_time ? ' حتى ' + r.end_time : ''}${r.tag && r.tag_active !== 0 ? ' (' + r.tag + ')' : ''}`
      ).join('، ')
    ).join('\n');
    const liveText = scheduleLiveText(items, cairoParts());
    return {
      settings,
      phone: settings.phone || '',
      whatsapp: settings.whatsapp || '',
      email: settings.email || '',
      city: settings.city || '',
      scheduleAddress: settings.schedule_address || '',
      courses: courses.map((c) => `${c.title} (${c.grade})`).join('، ') || 'لا توجد كورسات مسجلة',
      schedule: scheduleText || 'لا يوجد جدول مسجل حالياً',
      live: liveText,
      faqs: faqs.slice(0, 12).map((f) => `${f.question} — ${f.answer}`).join('\n') || 'لا توجد',
      statsYears: settings.stats_years || ''
    };
  } catch (err) {
    console.error('[ai] buildContext error:', err.message);
    return { settings: {}, phone: '', whatsapp: '', email: '', city: '', scheduleAddress: '', courses: 'لا توجد', schedule: 'لا يوجد', live: '', faqs: 'لا توجد', statsYears: '' };
  }
}

function geminiKey(ctx) {
  return (process.env.GEMINI_API_KEY || (ctx && ctx.settings && ctx.settings.gemini_api_key) || '').trim();
}

async function fetchImageData(url, baseUrl) {
  try {
    const abs = String(url || '').trim();
    const resolved = /^https?:\/\//i.test(abs) ? abs : `${String(baseUrl || '').replace(/\/+$/, '')}${abs.startsWith('/') ? abs : '/' + abs}`;
    const res = await fetch(resolved, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return { mime_type: mime.split(';')[0].trim() || 'image/jpeg', data: buffer.toString('base64') };
  } catch (err) {
    console.error('[ai] fetch image error:', err.message);
    return null;
  }
}

async function askGemini(message, ctx, imageUrl, baseUrl) {
  const c = ctx || (await buildContext());
  const key = geminiKey(c);
  if (!key) return null;
  const system = [
    'أنت «مساعد مستر أحمد الذكي» — المساعد الرسمي الوحيد لمستر أحمد علي الديب على منصة الفيزياء، وبتتكلم باسمه وتمثّله.',
    'المنصة: منصة تعليم الفيزياء للطلاب المصريين من رابعة ابتدائي لتالتة ثانوي، وكل محتواها مجاني بالكامل.',
    '',
    'قواعد الرد (مهم جداً):',
    '1. رد دايماً بالعربية المصرية البسيطة وبأسلوب مستر المحترم المشجع، وبلغة منظمة ومرتبة.',
    '2. نظّم ردك: اجابة مباشرة في الأول (سطر أو سطرين)، ثم التفاصيل بنقاط مرقمة لو لزوم، واختم بسؤال مساعدة واحد (على الأقل).',
    '3. التزم حرفياً ببيانات المنصة المكتوبة تحت «بيانات المنصة الحالية» — ممنوع تخترع مواعيد، أسعار، كورسات، أرقام تليفونات، أو روابط غير الموجودة. لو البيانات ناقصة قول: «البيانات دي مش مسجلة حالياً — تقدر تسأل مستر أحمد على الواتساب».',
    '4. لو طلب الطالب صفحة/إجراء على المنصة، دله على المسار الصحيح: التسجيل /student/register، الكورسات /courses، المواعيد /schedule، الأسئلة الشائعة /faq، تواصل معنا /contact.',
    '5. فيزياء: شرح مبسط بمثال من الحياة، وعند حل مسائل اكتب القانون أولاً ثم الخطوات بالوحدات الصحيحة.',
    '6. لو السؤال برة الفيزياء أو المنصة بكثير، اعتذر بلطف وارجع بيها للفيزياء فوراً.',
    '7. ممنوع: نصائح طبية/قانونية/مالية، أي كلام مسيء أو مثير، والكذب على بيانات المنصة.',
    '',
    'بيانات المنصة الحالية:',
    `- الكورسات: ${c.courses}`,
    `- جدول الحصص الحضورية (أوفلاين):\n${c.schedule}`,
    `- الوقت الحقيقي للحصص (بتوقيت القاهرة - نظام 24 ساعة):\n${c.live}`,
    `- مكان الحصص: ${c.scheduleAddress || 'يُعلن عنه عند الحجز'}`,
    `- تليفون مستر أحمد: ${c.phone || 'متاح على الموقع'}`,
    `- واتساب مستر أحمد: ${c.whatsapp ? 'https://wa.me/' + c.whatsapp : 'متاح على الموقع'}`,
    c.email ? `- الإيميل: ${c.email}` : '- الإيميل: غير مُعلن',
    c.city ? `- المدينة: ${c.city}` : '',
    `- خبرة المدرس: ${c.statsYears || ''} سنة`,
    'الأسئلة الشائعة:',
    c.faqs
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const parts = [];
    if (imageUrl) {
      const img = await fetchImageData(imageUrl, baseUrl);
      if (img) parts.push({ inline_data: img });
    }
    parts.push({ text: String(message || '').slice(0, 2000) });
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1500, topP: 0.95 }
        })
      }
    );
    clearTimeout(timer);

    if (!response.ok) {
      console.error(`[ai] Gemini error ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text).join('');
    return text ? text.slice(0, 6000) : null;
  } catch (err) {
    clearTimeout(timer);
    console.error('[ai] fetch error:', err.message);
    return null;
  }
}

function cleanInput(text) {
  return String(text || '').trim().slice(0, 2000);
}

router.get('/config', ah(async (req, res) => {
  const c = await buildContext();
  const enabled = Boolean(geminiKey(c));
  res.json({ enabled, model: enabled ? GEMINI_MODEL : null });
}));

router.post('/ask', askLimiter, ah(async (req, res) => {
  const c = await buildContext();
  if (!geminiKey(c)) {
    return res.status(501).json({ error: 'خدمة المساعد الذكي مش متاحة حالياً — جرب بعد شوية أو كلم مستر أحمد على الواتساب.' });
  }
  const message = cleanInput(req.body && req.body.message);
  if (!message) return res.status(400).json({ error: 'اكتب سؤالك الأول.' });

  const answer = await askGemini(message, c);
  if (!answer) {
    return res.status(502).json({ error: 'خدمة الذكاء الاصطناعي مش مستجيبة حالياً، جرب بعد شوية أو راسل مستر أحمد على الواتساب.' });
  }
  res.json({ answer });
}));

module.exports = router;
module.exports.askGemini = askGemini;

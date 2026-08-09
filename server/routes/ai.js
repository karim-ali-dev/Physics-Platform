const express = require('express');
const rateLimit = require('express-rate-limit');
const { ah } = require('../asyncHandler');

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const AI_ENABLED = Boolean(GEMINI_API_KEY);

const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'مفيش استفسارات كتير في الدقيقة الواحدة، جرب بعد شوية.' }
});

const SYSTEM_PROMPT = [
  'أنت مساعد ذكاء اصطناعي على منصة تعليم الفيزياء للطلاب المصريين (ثانوية عامة).',
  'ردودك بالعربية المصرية البسيطة والمفهومة.',
  'شرحك لمفاهيم الفيزياء يكون مبسطاً مع أمثلة تطبيقية من الحياة اليومية.',
  'عند حل مسائل رياضية اكتب خطوات الحل بوضوح واستخدم رموز الوحدات الصحيحة.',
  'إن سُئلت عن شيء خارج الفيزياء أو التعليم، رد بلطف ووجّه الحديث لمادة الفيزياء.',
  'لا تقدم أي نصائح طبية أو قانونية أو مالية.'
].join(' ');

function cleanInput(text) {
  return String(text || '').trim().slice(0, 2000);
}

router.get('/config', (req, res) => {
  res.json({ enabled: AI_ENABLED, model: AI_ENABLED ? GEMINI_MODEL : null });
});

router.post('/ask', askLimiter, ah(async (req, res) => {
  if (!AI_ENABLED) {
    return res.status(501).json({ error: 'مساعد الذكاء الاصطناعي مش مُفعّل — أضف GEMINI_API_KEY في ملف .env.' });
  }
  const message = cleanInput(req.body && req.body.message);
  if (!message) return res.status(400).json({ error: 'اكتب سؤالك الأول.' });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 900, topP: 0.95 }
        })
      }
    );
    clearTimeout(timer);

    if (!response.ok) {
      const bodyText = await response.text();
      console.error(`[ai] Gemini error ${response.status}: ${bodyText.slice(0, 300)}`);
      if (response.status === 429) {
        return res.status(429).json({ error: 'الحد الأقصى لطلبات الذكاء الاصطناعي اتقفل دلوقتي، جرب بعد شوية.' });
      }
      if (response.status === 400 && bodyText.includes('model')) {
        return res.status(500).json({ error: 'اسم موديل الذكاء الاصطناعي غلط في ملف .env — غير قيمة GEMINI_MODEL.' });
      }
      if (response.status === 403 || response.status === 401) {
        return res.status(500).json({ error: 'مفتاح Gemini غير صالح — راجع GEMINI_API_KEY في ملف .env.' });
      }
      return res.status(502).json({ error: 'خدمة الذكاء الاصطناعي مش مستجيبة حالياً، جرب بعد شوية.' });
    }

    const data = await response.json();
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text).join('');
    if (!text) {
      return res.status(502).json({ error: 'مفيش رد من الذكاء الاصطناعي، حاول تاني بكلام مختلف.' });
    }
    res.json({ answer: text.slice(0, 6000) });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return res.status(504).json({ error: 'الاستعلام طول أوي — اختصر السؤال وجرب تاني.' });
    }
    console.error('[ai] fetch error:', err.message);
    res.status(502).json({ error: 'مشكلة في الاتصال بخدمة الذكاء الاصطناعي.' });
  }
}));

module.exports = router;

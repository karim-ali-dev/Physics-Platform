const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { db } = require('../db');
const {
  createSession, revokeSession, revokeAllSessions, revokeOtherSessions, countSessions,
  csrfToken, setCsrfCookie, ensureCsrfCookie, recordAttempt, clearAttempts,
  lockoutRemainingMs, generateTotpSecret, verifyTotp, audit
} = require('../security');
const { requireAuth } = require('../middleware/auth');
const { validate, loginSchema, changePasswordSchema, verify2faSchema, disable2faSchema } = require('../middleware/validate');
const { ah } = require('../asyncHandler');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات دخول كتيرة من جهازك، استنى 15 دقيقة وجرب تاني' }
});

function setSessionCookie(res, rawToken) {
  res.cookie('token', rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

router.post('/login', loginLimiter, validate(loginSchema), ah(async (req, res) => {
  const { username, password, code } = req.body;
  const ip = req.ip;

  const remaining = await lockoutRemainingMs(username);
  if (remaining > 0) {
    return res.status(429).json({ error: `الحساب متقفل مؤقتاً، جرب بعد ${Math.ceil(remaining / 60000)} دقيقة` });
  }

  const row = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  const ok = Boolean(row) && bcrypt.compareSync(password, row.password_hash);
  await recordAttempt(username, ip, ok);
  if (!ok) {
    await audit(0, 'login_fail', username, ip);
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }

  if (row['totp_enabled']) {
    if (!code) {
      return res.status(200).json({ ok: true, requires2fa: true, message: 'اكتب كود المصادقة الثنائية' });
    }
    if (!verifyTotp(row['totp_secret'], code)) {
      await audit(row.id, 'login_fail_2fa', username, ip);
      return res.status(401).json({ error: 'كود المصادقة الثنائية غير صحيح' });
    }
  }

  await clearAttempts(username);
  const rawToken = await createSession(row.id, req.headers['user-agent'], ip);
  setSessionCookie(res, rawToken);
  ensureCsrfCookie(req, res);
  await audit(row.id, 'login_ok', username, ip);
  res.json({ ok: true, user: { id: row.id, username: row.username } });
}));

router.post('/logout', ah(async (req, res) => {
  await revokeSession(req.cookies && req.cookies.token);
  res.clearCookie('token', { path: '/' });
  res.clearCookie('csrf', { path: '/' });
  res.json({ ok: true });
}));

router.post('/logout-all', requireAuth, ah(async (req, res) => {
  await revokeAllSessions(req.user.id);
  res.clearCookie('token', { path: '/' });
  res.clearCookie('csrf', { path: '/' });
  await audit(req.user.id, 'logout_all', 'تسجيل خروج من كل الأجهزة', req.ip);
  res.json({ ok: true });
}));

router.get('/me', requireAuth, ah(async (req, res) => {
  ensureCsrfCookie(req, res);
  const sessions = await countSessions(req.user.id);
  res.json({ user: { id: req.user.id, username: req.user.username, twofa: Boolean(req.user['totp_enabled']), sessions } });
}));

router.post('/change-password', requireAuth, validate(changePasswordSchema), ah(async (req, res) => {
  const row = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!row) return res.status(404).json({ error: 'المستخدم غير موجود' });
  if (!bcrypt.compareSync(req.body.current_password, row.password_hash)) {
    await audit(req.user.id, 'password_change_fail', 'كلمة السر الحالية غير صحيحة', req.ip);
    return res.status(400).json({ error: 'كلمة السر الحالية غير صحيحة' });
  }
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(req.body.new_password, 10), req.user.id]);
  await revokeOtherSessions(req.user.id, req.rawToken);
  await audit(req.user.id, 'password_change', 'تم تغيير كلمة السر', req.ip);
  res.json({ ok: true, message: 'تم تغيير كلمة السر، واتسجل خروج من باقي الأجهزة' });
}));

/* ---------------- 2FA ---------------- */
router.post('/2fa/generate', requireAuth, ah(async (req, res) => {
  const { base32, otpauth_url } = generateTotpSecret(req.user.username);
  res.json({ base32, otpauth_url });
}));

router.post('/2fa/verify', requireAuth, validate(verify2faSchema), ah(async (req, res) => {
  const { base32, otpauth_url, code } = req.body;
  if (!verifyTotp(base32, code)) {
    return res.status(400).json({ error: 'الكود غير صحيح، جرب تاني' });
  }
  await db.run('UPDATE users SET totp_secret = ?, totp_enabled = 1 WHERE id = ?', [base32, req.user.id]);
  await audit(req.user.id, '2fa_enabled', 'تم تفعيل المصادقة الثنائية', req.ip);
  res.json({ ok: true, message: 'تم تفعيل المصادقة الثنائية بنجاح' });
}));

router.post('/2fa/disable', requireAuth, validate(disable2faSchema), ah(async (req, res) => {
  const row = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!row['totp_enabled']) return res.status(400).json({ error: 'المصادقة الثنائية مش مفعلة أصلاً' });
  if (!verifyTotp(row['totp_secret'], req.body.code)) {
    return res.status(400).json({ error: 'الكود غير صحيح' });
  }
  await db.run("UPDATE users SET totp_secret = '', totp_enabled = 0 WHERE id = ?", [req.user.id]);
  await audit(req.user.id, '2fa_disabled', 'تم إيقاف المصادقة الثنائية', req.ip);
  res.json({ ok: true, message: 'تم إيقاف المصادقة الثنائية' });
}));

module.exports = router;

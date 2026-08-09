const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { db } = require('./db');

const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const TOKEN_BYTES = 32;

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

/* ---------------- Sessions ---------------- */
async function createSession(userId, userAgent, ip, userType = 'admin') {
  await db.run('DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString()]);
  const raw = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.run(
    'INSERT INTO sessions (token_hash, user_id, user_type, user_agent, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sha256(raw), userId, userType, String(userAgent || '').slice(0, 300), String(ip || '').slice(0, 60), expires, new Date().toISOString()]
  );
  return raw;
}

async function getSessionByToken(rawToken, userType) {
  if (!rawToken) return null;
  const session = await db.get('SELECT * FROM sessions WHERE token_hash = ? AND user_type = ?', [sha256(rawToken), userType]);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db.run('DELETE FROM sessions WHERE id = ?', [session.id]);
    return null;
  }
  return session;
}

async function getUserBySession(rawToken) {
  const session = await getSessionByToken(rawToken, 'admin');
  if (!session) return null;
  const user = await db.get('SELECT id, username, totp_enabled FROM users WHERE id = ?', [session.user_id]);
  if (!user) return null;
  return { session, user };
}

async function getCustomerBySession(rawToken) {
  const session = await getSessionByToken(rawToken, 'customer');
  if (!session) return null;
  const customer = await db.get('SELECT id, email, name, avatar FROM customers WHERE id = ?', [session.user_id]);
  if (!customer) return null;
  return { session, customer };
}

async function revokeSession(rawToken) {
  if (rawToken) await db.run('DELETE FROM sessions WHERE token_hash = ?', [sha256(rawToken)]);
}

async function revokeAllSessions(userId, userType = 'admin') {
  await db.run('DELETE FROM sessions WHERE user_id = ? AND user_type = ?', [userId, userType]);
}

async function revokeOtherSessions(userId, rawToken, userType = 'admin') {
  if (rawToken) await db.run('DELETE FROM sessions WHERE user_id = ? AND user_type = ? AND token_hash <> ?', [userId, userType, sha256(rawToken)]);
}

async function countSessions(userId, userType = 'admin') {
  const row = await db.get('SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND user_type = ?', [userId, userType]);
  return row ? row.c : 0;
}

/* ---------------- CSRF ---------------- */
function csrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function setCsrfCookie(res, value) {
  res.cookie('csrf', value, {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    path: '/'
  });
}

function ensureCsrfCookie(req, res) {
  if (req.cookies && req.cookies.csrf) return req.cookies.csrf;
  const value = csrfToken();
  setCsrfCookie(res, value);
  return value;
}

function csrfValid(req) {
  const cookie = req.cookies && req.cookies.csrf;
  const header = req.headers['x-csrf-token'];
  return Boolean(cookie && header && cookie === header);
}

/* ---------------- Lockout ---------------- */
async function recordAttempt(username, ip, success) {
  await db.run('DELETE FROM login_attempts WHERE created_at < ?', [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()]);
  await db.run('INSERT INTO login_attempts (username, ip, success, created_at) VALUES (?, ?, ?, ?)',
    [String(username).slice(0, 100), String(ip || '').slice(0, 60), success ? 1 : 0, new Date().toISOString()]);
}

async function clearAttempts(username) {
  await db.run('DELETE FROM login_attempts WHERE username = ? AND success = 0', [String(username).slice(0, 100)]);
}

async function lockoutRemainingMs(username) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60 * 1000).toISOString();
  const failsRow = await db.get('SELECT COUNT(*) AS c FROM login_attempts WHERE username = ? AND success = 0 AND created_at >= ?',
    [String(username).slice(0, 100), since]);
  const fails = failsRow ? failsRow.c : 0;
  if (fails < MAX_FAILS) return 0;
  const lastRow = await db.get('SELECT MAX(created_at) AS m FROM login_attempts WHERE username = ? AND success = 0 AND created_at >= ?',
    [String(username).slice(0, 100), since]);
  const last = lastRow ? lastRow.m : null;
  if (!last) return 0;
  const end = new Date(new Date(last).getTime() + LOCK_MINUTES * 60 * 1000).getTime();
  return Math.max(0, end - Date.now());
}

/* ---------------- 2FA (TOTP) ---------------- */
function generateTotpSecret(username) {
  const secret = speakeasy.generateSecret({ name: `منصة مستر أحمد علي الديب (${username})` });
  return { base32: secret.base32, otpauth_url: secret.otpauth_url };
}

function verifyTotp(secret, code) {
  if (!secret || !code) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(code).replace(/\s/g, ''),
    window: 2
  });
}

/* ---------------- Audit ---------------- */
async function audit(userId, action, detail, ip) {
  await db.run('INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, ?, ?)',
    [userId || 0, String(action).slice(0, 100), String(detail || '').slice(0, 500), String(ip || '').slice(0, 60), new Date().toISOString()]);
}

module.exports = {
  createSession,
  getUserBySession,
  getCustomerBySession,
  revokeSession,
  revokeAllSessions,
  revokeOtherSessions,
  countSessions,
  csrfToken,
  setCsrfCookie,
  ensureCsrfCookie,
  csrfValid,
  recordAttempt,
  clearAttempts,
  lockoutRemainingMs,
  generateTotpSecret,
  verifyTotp,
  audit
};

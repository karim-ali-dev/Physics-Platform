require('dotenv').config();

const SMTP_CONFIGURED = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
const RESEND_CONFIGURED = Boolean(process.env.RESEND_API_KEY);
const BREVO_CONFIGURED = Boolean(process.env.BREVO_API_KEY);
const EMAIL_CONFIGURED = SMTP_CONFIGURED || RESEND_CONFIGURED || BREVO_CONFIGURED;

async function sendResend({ to, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: process.env.SMTP_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {})
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`resend ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true };
}

async function sendBrevo({ to, subject, text, html }) {
  const senderEmail = (process.env.SMTP_FROM || process.env.BREVO_FROM || '').trim();
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: senderEmail ? { email: senderEmail } : undefined,
      to: (Array.isArray(to) ? to : [to]).map((t) => ({ email: t })),
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(!html && text ? { textContent: text } : {})
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`brevo ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true };
}

async function sendSmtp({ to, subject, text, html }) {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (_) {
    return { sent: false, reason: 'nodemailer-missing' };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: `smtp: ${err.message}` };
  }
}

async function sendMail(payload) {
  if (RESEND_CONFIGURED) return sendResend(payload);
  if (BREVO_CONFIGURED) return sendBrevo(payload);
  if (SMTP_CONFIGURED) return sendSmtp(payload);
  return { sent: false, reason: 'no-email-config' };
}

module.exports = { sendMail, SMTP_CONFIGURED, EMAIL_CONFIGURED };

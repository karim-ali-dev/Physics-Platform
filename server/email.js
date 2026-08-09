require('dotenv').config();

const SMTP_CONFIGURED = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

async function sendMail({ to, subject, text, html }) {
  if (!SMTP_CONFIGURED) return { sent: false, reason: 'no-smtp' };
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (_) {
    return { sent: false, reason: 'nodemailer-missing' };
  }
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
}

module.exports = { sendMail, SMTP_CONFIGURED };

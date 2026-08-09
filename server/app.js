require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const { init, uploadsDir } = require('./db');
const { ensureCsrfCookie } = require('./security');
const { csrfProtect } = require('./middleware/csrf');
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const botRoutes = require('./routes/bot');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');
const aiRoutes = require('./routes/ai');

const ADMIN_PORT = process.env.ADMIN_PORT;
const clientDist = path.join(__dirname, '..', 'client', 'dist');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
app.set('trust proxy', 1);

const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    directives: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

app.use(helmet(securityHeaders));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true, setHeaders: (res, filePath) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
}}));

app.use('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, uptime: Math.round(process.uptime()), ts: new Date().toISOString() });
});

app.use((req, res, next) => {
  ensureCsrfCookie(req, res);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/uploads')) return;
    const line = {
      t: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.ip
    };
    console.log(JSON.stringify(line));
  });
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كتيرة جداً، جرب بعد شوية' }
});
app.use('/api', apiLimiter);

app.use('/api', csrfProtect);
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/ai', aiRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'الرابط غير موجود' }));

let adminApp = null;
if (ADMIN_PORT) {
  adminApp = express();
  adminApp.set('trust proxy', 1);
  adminApp.use(helmet(securityHeaders));
  adminApp.use(compression());
  adminApp.use(cookieParser());
  adminApp.use(express.json({ limit: '1mb' }));
  adminApp.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true }));
  adminApp.use((req, res, next) => {
    ensureCsrfCookie(req, res);
    next();
  });
  adminApp.use('/api/admin', csrfProtect);
  adminApp.use('/api/admin', adminRoutes);
  adminApp.use('/api/auth', authRoutes);
  adminApp.use('/admin', (req, res) => res.redirect('/teacher-panel-2026'));
  if (fs.existsSync(clientDist)) {
    adminApp.use(express.static(clientDist, { maxAge: '1h', index: false, setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=3600');
    }}));
    adminApp.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }
  app.use('/admin', (req, res) => res.status(404).send('الصفحة غير موجودة'));
} else {
  app.use('/api/admin', adminRoutes);
}

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false, setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=3600');
  }}));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'الملف أكبر من 250 ميجا المسموح بها' });
    }
    return res.status(400).json({ error: 'حدث خطأ في رفع الملف' });
  }
  if (err && err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع' });
});

module.exports = { app, adminApp, init, ADMIN_PORT };

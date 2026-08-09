const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { uploadsDir } = require('../db');

const IMAGE_RE = /\.(jpe?g|png|webp|gif|svg)$/i;
const VIDEO_RE = /\.(mp4|webm|mov|mkv|m4v)$/i;
const PDF_RE = /\.pdf$/i;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

function makeError(msg) {
  const e = new Error(msg);
  e.status = 400;
  return e;
}

const fileFilter = (req, file, cb) => {
  const kind = String(req.body.kind || 'image').toLowerCase();
  if (kind === 'pdf') {
    const extOk = PDF_RE.test(file.originalname);
    const mimeOk = file.mimetype === 'application/pdf';
    if (extOk || mimeOk) return cb(null, true);
    return cb(makeError('صيغة الملف غير مسموحة (PDF فقط)'));
  }
  const extOk = kind === 'video' ? VIDEO_RE.test(file.originalname) : IMAGE_RE.test(file.originalname);
  const mimeOk = kind === 'video' ? /^video\//.test(file.mimetype) : /^image\//.test(file.mimetype);
  if (kind === 'video') {
    if (extOk || mimeOk) return cb(null, true);
    return cb(makeError('صيغة الفيديو غير مسموحة (mp4 / webm / mov)'));
  }
  if (extOk || mimeOk) return cb(null, true);
  return cb(makeError('صيغة الصورة غير مسموحة (jpg / png / webp / gif / svg)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 250 * 1024 * 1024, files: 1 }
});

function readHead(filePath, bytes = 16) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(bytes);
    fs.readSync(fd, buf, 0, bytes, 0);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

function validateFileSignature(kind, filePath) {
  const head = readHead(filePath, 16);
  if (kind === 'pdf') {
    return head.slice(0, 5).toString('latin1') === '%PDF-';
  }
  if (kind === 'video') {
    if (head.slice(4, 8).equals(Buffer.from('ftyp'))) return true; // mp4 / mov
    if (head.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return true; // webm
    return false;
  }
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (head.slice(0, 8).equals(png)) return true;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return true; // jpeg
  const gif = head.slice(0, 6).toString('latin1');
  if (gif === 'GIF87a' || gif === 'GIF89a') return true;
  if (head.slice(0, 4).equals(Buffer.from('RIFF')) && head.slice(8, 12).equals(Buffer.from('WEBP'))) return true;
  const text = head.toString('utf8').toLowerCase();
  if (text.includes('<svg')) return true;
  return false;
}

module.exports = { upload, validateFileSignature };


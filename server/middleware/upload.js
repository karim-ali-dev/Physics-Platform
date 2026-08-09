const multer = require('multer');
const path = require('path');

const IMAGE_RE = /\.(jpe?g|png|webp|gif|svg)$/i;
const VIDEO_RE = /\.(mp4|webm|mov|mkv|m4v)$/i;
const PDF_RE = /\.pdf$/i;

const storage = multer.memoryStorage();

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

function validateFileBuffer(kind, buf) {
  const b = buf || Buffer.alloc(0);
  if (kind === 'pdf') {
    return b.length >= 5 && b.slice(0, 5).toString('latin1') === '%PDF-';
  }
  if (kind === 'video') {
    if (b.length >= 12 && b.slice(4, 8).equals(Buffer.from('ftyp'))) return true; // mp4 / mov
    if (b.length >= 4 && b.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return true; // webm
    return false;
  }
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length >= 8 && b.slice(0, 8).equals(png)) return true;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true; // jpeg
  const gif = b.length >= 6 ? b.slice(0, 6).toString('latin1') : '';
  if (gif === 'GIF87a' || gif === 'GIF89a') return true;
  if (b.length >= 12 && b.slice(0, 4).equals(Buffer.from('RIFF')) && b.slice(8, 12).equals(Buffer.from('WEBP'))) return true;
  const text = b.slice(0, 2048).toString('utf8').toLowerCase();
  if (text.includes('<svg')) return true;
  return false;
}

module.exports = { upload, validateFileSignature: validateFileBuffer, validateFileBuffer };

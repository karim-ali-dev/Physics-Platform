const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadsDir } = require('./db');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

const cloudEnabled = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

function genFilename(originalname) {
  const ext = path.extname(String(originalname || '')).toLowerCase().slice(0, 8);
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

function cloudPath(filename) {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${filename}`;
}

function publicUrl(pathInBucket) {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${pathInBucket}`;
}

async function saveFile({ buffer, originalname, mimeType }) {
  const filename = genFilename(originalname);
  if (cloudEnabled()) {
    const p = cloudPath(filename);
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${p}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': mimeType || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: buffer
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`فشل رفع الملف للسحابة (${res.status}): ${text.slice(0, 150)}`);
    }
    return { url: publicUrl(p), filename };
  }
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return { url: '/uploads/' + filename, filename };
}

async function deleteByUrl(url) {
  const s = String(url || '');
  if (cloudEnabled() && s.includes(`/storage/v1/object/public/${SUPABASE_BUCKET}/`)) {
    const key = s.split(`/storage/v1/object/public/${SUPABASE_BUCKET}/`)[1];
    if (!key) return;
    try {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
    } catch (_) { /* ignore */ }
    return;
  }
  if (s.startsWith('/uploads/')) {
    const file = path.join(uploadsDir, path.basename(s));
    if (file.startsWith(uploadsDir)) { try { fs.unlinkSync(file); } catch (_) { /* ignore */ } }
  }
}

module.exports = { saveFile, deleteByUrl, cloudEnabled, publicUrl, SUPABASE_BUCKET };

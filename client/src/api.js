function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const method = (options.method || 'GET').toUpperCase();
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRF-Token'] = getCookie('csrf') || '';
  }
  const res = await fetch(path, {
    credentials: 'include',
    ...options,
    method,
    headers
  });
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    /* empty response */
  }
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ ما');
    err.status = res.status;
    throw err;
  }
  return data;
}

export function getEmbedType(url) {
  const yt = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0` };
  const vimeo = String(url || '').match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };
  return { kind: 'file', src: url };
}

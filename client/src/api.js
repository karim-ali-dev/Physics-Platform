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

function ytIdFrom(url) {
  const s = String(url || '').replace(/^https?:\/\//i, '');
  const m = s.match(/(?:youtube\.com\/(?:watch|embed|shorts|live)\/?\??(?:.*[?&])?v=([\w-]{11})|youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})|youtu\.be\/([\w-]{11}))/);
  const id = m && (m[1] || m[2] || m[3]);
  return id && id.length === 11 ? id : null;
}

export function getEmbedType(url) {
  const yt = ytIdFrom(url);
  if (yt) return { kind: 'youtube', id: yt, src: `https://www.youtube.com/embed/${yt}?rel=0&playsinline=1` };
  const vimeo = String(url || '').match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeo) return { kind: 'vimeo', id: vimeo[1], src: `https://player.vimeo.com/video/${vimeo[1]}?byline=0&portrait=0` };
  return { kind: 'file', src: url };
}

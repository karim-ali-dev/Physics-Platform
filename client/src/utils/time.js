export const CAIRO_TZ = 'Africa/Cairo';

const safe = (iso, fn) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return fn(d);
  } catch (_) {
    return '';
  }
};

export function fmtDateTime(iso) {
  return safe(iso, (d) => d.toLocaleString('ar-EG', { timeZone: CAIRO_TZ }));
}

export function fmtDate(iso) {
  return safe(iso, (d) => d.toLocaleDateString('ar-EG', { timeZone: CAIRO_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}

export function fmtTime(iso) {
  return safe(iso, (d) => d.toLocaleTimeString('ar-EG', { timeZone: CAIRO_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
}

export function timeAgo(iso) {
  return safe(iso, (d) => {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 86400 * 7) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return d.toLocaleDateString('ar-EG', { timeZone: CAIRO_TZ, day: 'numeric', month: 'short' });
  });
}

export function cairoWeekdayIndex(now = new Date()) {
  try {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const key = new Intl.DateTimeFormat('en-US', { timeZone: CAIRO_TZ, weekday: 'short' }).format(now);
    const idx = names.indexOf(key);
    return idx >= 0 ? idx : now.getDay();
  } catch (_) {
    return now.getDay();
  }
}

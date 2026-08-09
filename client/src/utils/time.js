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

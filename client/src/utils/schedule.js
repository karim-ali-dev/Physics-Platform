/* أدوات أوقات جدول الحصص — بتوقيت القاهرة ونظام 24 ساعة */

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const DAY_ORDER = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export function cairoClock(date = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hour12: false
    });
    const p = fmt.formatToParts(date);
    const get = (t) => (p.find((x) => x.type === t) || {}).value || '';
    let hour = parseInt(get('hour'), 10);
    if (hour === 24) hour = 0;
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { hour, minute: parseInt(get('minute'), 10), second: parseInt(get('second'), 10), weekdayIndex: map[get('weekday')] ?? date.getDay() };
  } catch (_) {
    return { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds(), weekdayIndex: date.getDay() };
  }
}

export function fmt24m(minutes) {
  const m = Math.max(0, Math.round(minutes || 0)) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export const fmtClock = ({ hour, minute, second }) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second ?? 0).padStart(2, '0')}`;

/* نظام 12 ساعة (بتوقيت القاهرة) */
export function fmt12m(minutes) {
  const m = Math.max(0, Math.round(minutes || 0)) % 1440;
  let h = Math.floor(m / 60);
  const min = m % 60;
  const period = h < 12 ? 'ص' : 'م';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(min).padStart(2, '0')} ${period}`;
}

export function fmt12Time(str) {
  const m = parseTime24(str);
  return m == null ? String(str || '') : fmt12m(m);
}

export const fmtClock12 = ({ hour, minute, second }) => {
  let h = (hour ?? 0) % 24;
  const period = h < 12 ? 'ص' : 'م';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}:${String(second ?? 0).padStart(2, '0')} ${period}`;
};

/* يقسّم وقت 24 ساعة إلى ساعة/دقيقة/فترة (لأداة الإدخال بنظام 12 ساعة) */
export function split12(str) {
  const m = parseTime24(str);
  if (m == null) return { h: 7, min: 0, pm: false };
  let h = Math.floor(m / 60);
  const min = m % 60;
  const pm = h >= 12;
  h = h % 12;
  if (h === 0) h = 12;
  return { h, min, pm };
}

/* يبني نص 24 ساعة من ساعة/دقيقة/فترة */
export function join24(h, min, pm) {
  let h24 = Number(h) % 12;
  if (pm) h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(Number(min)).padStart(2, '0')}`;
}


/* يحوّل نص وقت (6:00 م / 18:00 / 6 مساءً / 06:00 PM) إلى دقائق من منتصف الليل */
export function parseTime24(str) {
  const s = String(str || '').trim().toLowerCase().replace(/\./g, '');
  if (!s) return null;
  const m = s.match(/(\d{1,2})(?::(\d{1,2}))?\s*(مساءا?|مساءً|مساءًا|صباحا?|صباحاً|صباحًا|ص|م|am|pm|a\.m|p\.m)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = parseInt(m[2] || '0', 10);
  const suf = (m[3] || '').trim();
  const isPM = suf === 'م' || suf === 'مساء' || suf === 'مساءً' || suf === 'مساءا' || suf === 'مساءًا' || suf === 'pm' || suf === 'p.m';
  const isAM = suf === 'ص' || suf === 'صباح' || suf === 'صباحاً' || suf === 'صباحا' || suf === 'صباحًا' || suf === 'am' || suf === 'a.m';
  if (isPM) { if (h < 12) h += 12; }
  else if (isAM) { if (h === 12) h = 0; }
  else if (h > 23) h = 23;
  if (min > 59) min = 59;
  return h * 60 + min;
}

/* نص وقت موحد بنظام 24 ساعة (لو النص مش مفهوم بيرجع النص الأصلي) */
export function fmtTime24(str) {
  const m = parseTime24(str);
  return m == null ? String(str || '') : fmt24m(m);
}

/* الحصة اللي جاية (أو الجارية دلوقتي) */
export function nextSession(items, now, grade = null) {
  const rows = items.filter((r) => r.active !== 0 && (!grade || r.grade === grade));
  const nowMin = now.hour * 60 + now.minute;
  const todayIdx = now.weekdayIndex;
  let best = null;
  for (const r of rows) {
    const start = parseTime24(r.start_time);
    if (start == null) continue;
    const end = parseTime24(r.end_time);
    const dayIdx = DAY_ORDER.indexOf(r.day);
    if (dayIdx < 0) continue;
    const offset = (dayIdx - todayIdx + 7) % 7;
    const minutesUntil = offset * 1440 + start - nowMin;
    const ongoing = offset === 0 && start <= nowMin && (end == null || nowMin < end);
    const effective = minutesUntil >= 0 ? minutesUntil : minutesUntil + 7 * 1440;
    const cand = { item: r, status: ongoing ? 'ongoing' : 'upcoming', minutesUntil, effective, offset };
    if (!best) { best = cand; continue; }
    if (cand.status === 'ongoing' && best.status !== 'ongoing') { best = cand; continue; }
    if (best.status === 'ongoing' && cand.status !== 'ongoing') continue;
    if (cand.effective < best.effective) best = cand;
  }
  if (!best) return null;
  return {
    item: best.item,
    status: best.status,
    minutesUntil: best.status === 'ongoing' ? 0 : best.effective,
    startMin: parseTime24(best.item.start_time),
    dayOffset: best.status === 'ongoing' ? 0 : best.offset
  };
}

export function humanMinutes(minutes) {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m < 1) return 'أقل من دقيقة';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} دقيقة`;
  const hWord = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
  if (r === 0) return hWord;
  return `${hWord} و ${r} دقيقة`;
}

export function dayLabel(offset) {
  if (offset === 0) return 'النهارده';
  if (offset === 1) return 'بكرا';
  if (offset === 6) return 'إمبارح';
  return 'بعد ' + (offset === 2 ? 'يومين' : `${offset} أيام`);
}

export function isOngoing(s, now) {
  const start = parseTime24(s.start_time);
  if (start == null) return false;
  const end = parseTime24(s.end_time);
  const nowMin = now.hour * 60 + now.minute;
  return start <= nowMin && (end == null || nowMin < end);
}

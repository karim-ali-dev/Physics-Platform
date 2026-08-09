/* أدوات الأوقات لنظام المواعيد — بتوقيت القاهرة ونظام 24 ساعة */

const DAY_ORDER = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const WEEKDAY_MAP = { Sun: 'الأحد', Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة', Sat: 'السبت' };

function cairoParts(date = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short',
      hour12: false
    });
    const p = fmt.formatToParts(date);
    const get = (t) => (p.find((x) => x.type === t) || {}).value || '';
    let hour = parseInt(get('hour'), 10);
    if (hour === 24) hour = 0;
    return {
      year: parseInt(get('year'), 10),
      month: parseInt(get('month'), 10),
      day: parseInt(get('day'), 10),
      hour,
      minute: parseInt(get('minute'), 10),
      weekday: WEEKDAY_MAP[get('weekday')] || ''
    };
  } catch (_) {
    const wd = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const d = date;
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), weekday: wd[d.getDay()] };
  }
}

/* يحوّل نص وقت لأي صيغة (6:00 م / 6:00 ص / 18:00 / 6 مساءً / 06:00 PM) إلى دقائق من منتصف الليل */
function parseTime(str) {
  const s = String(str || '').trim().toLowerCase().replace(/\./g, '');
  if (!s) return null;
  const m = s.match(/(\d{1,2})(?::(\d{1,2}))?\s*(مساءا?|مساءً|مساءًا|صباحا?|صباحاً|صباحًا|ص|م|am|pm|a\.m|p\.m)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = parseInt(m[2] || '0', 10);
  const suf = (m[3] || '').trim();
  const isPM = suf === 'م' || suf === 'مساء' || suf === 'مساءً' || suf === 'مساءا' || suf === 'مساءًا' || suf === 'pm' || suf === 'p.m';
  const isAM = suf === 'ص' || suf === 'صباح' || suf === 'صباحاً' || suf === 'صباحا' || suf === 'صباحًا' || suf === 'am' || suf === 'a.m';
  if (isPM) {
    if (h < 12) h += 12;
  } else if (isAM) {
    if (h === 12) h = 0;
  } else {
    if (h > 23) h = 23;
  }
  if (min > 59) min = 59;
  return h * 60 + min;
}

function fmt24m(minutes) {
  const m = Math.max(0, Math.round(minutes || 0)) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/* الوقت الحالي بنظام 24 ساعة كنص */
function now24(date = new Date()) {
  const p = cairoParts(date);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/* حصص يوم معين مرتبة حسب وقت البداية */
function daySessions(items, weekdayName) {
  return items
    .filter((r) => r.day === weekdayName && r.active !== 0)
    .sort((a, b) => (parseTime(a.start_time) ?? 1440) - (parseTime(b.start_time) ?? 1440));
}

/* الحصة اللي جاية (أو الجارية دلوقتي) — بتراعي كل أيام الأسبوع */
function nextSession(items, parts, grade = null) {
  const rows = items.filter((r) => r.active !== 0 && (!grade || r.grade === grade));
  const now = parts.hour * 60 + parts.minute;
  const todayIdx = DAY_ORDER.indexOf(parts.weekday);
  let best = null;
  for (const r of rows) {
    const start = parseTime(r.start_time);
    if (start == null) continue;
    const end = parseTime(r.end_time);
    const dayIdx = DAY_ORDER.indexOf(r.day);
    if (dayIdx < 0) continue;
    const offset = (dayIdx - todayIdx + 7) % 7;
    const minutesUntil = offset * 1440 + start - now;
    const ongoing = offset === 0 && start <= now && (end == null || now < end);
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
    startMin: parseTime(best.item.start_time),
    dayOffset: best.status === 'ongoing' ? 0 : best.offset
  };
}

/* تحويل عدد دقائق لوصف عربي (ساعتين و 15 دقيقة) */
function humanMinutes(minutes) {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m < 1) return 'أقل من دقيقة';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} دقيقة`;
  const hWord = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
  if (r === 0) return hWord;
  return `${hWord} و ${r} دقيقة`;
}

function dayLabel(offset) {
  if (offset === 0) return 'النهارده';
  if (offset === 1) return 'بكرا';
  if (offset === 6) return 'إمبارح';
  return 'بعد ' + (offset === 2 ? 'يومين' : `${offset} أيام`);
}

/* وصف نصي لحصص اليوم + الحصة الجاية — مستخدم في البوت و الـ AI */
function scheduleLiveText(items, parts) {
  const today = daySessions(items, parts.weekday);
  const nxt = nextSession(items, parts);
  let text = `الوقت دلوقتي (بتوقيت القاهرة): ${now24()}، اليوم ${parts.weekday}`;
  text += `\nحصص النهارده (${parts.weekday}): ` + (today.length
    ? today.map((r) => `${r.grade} الساعة ${fmt24m(parseTime(r.start_time))}${r.end_time ? ' حتى ' + fmt24m(parseTime(r.end_time)) : ''}${r.tag && r.tag_active !== 0 ? ' (ملاحظة: ' + r.tag + ')' : ''}`).join('، ')
    : 'لا توجد حصص مسجلة');
  if (nxt) {
    text += `\nالحصة اللي جاية: ${nxt.item.grade} يوم ${nxt.item.day} الساعة ${fmt24m(nxt.startMin)}${nxt.status === 'ongoing' ? ' — جارية دلوقتي 🔴' : ` — ${dayLabel(nxt.dayOffset)} (${humanMinutes(nxt.minutesUntil)})`}`;
  } else {
    text += '\nالحصة اللي جاية: لا يوجد جدول مسجل';
  }
  return text;
}

module.exports = { DAY_ORDER, cairoParts, parseTime, fmt24m, now24, daySessions, nextSession, humanMinutes, dayLabel, scheduleLiveText };

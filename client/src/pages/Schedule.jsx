import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays, MapPin, Clock, Sparkles, GraduationCap, ArrowLeft, Zap,
  BookOpen, FlaskConical, Microscope, Atom, Rocket, Cpu, Trophy, ListOrdered
} from 'lucide-react';
import { api } from '../api';
import { GRADES, DAYS } from '../config';
import { useApp } from '../store/AppContext';
import Spinner from '../components/Spinner';
import BookingForm from '../components/BookingForm';
import {
  cairoClock, fmtClock, fmt24m, fmtTime24, nextSession, humanMinutes, dayLabel, isOngoing, DAY_NAMES
} from '../utils/schedule';

const GRADE_COLORS = [
  'bg-teal-500/15 border-teal-400/40 text-teal-300',
  'bg-amber-400/15 border-amber-300/40 text-amber-200',
  'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
  'bg-sky-500/15 border-sky-400/40 text-sky-300',
  'bg-rose-400/15 border-rose-300/40 text-rose-300',
  'bg-violet-500/15 border-violet-400/40 text-violet-300',
  'bg-cyan-400/15 border-cyan-300/40 text-cyan-300',
  'bg-lime-500/15 border-lime-400/40 text-lime-300',
  'bg-orange-400/15 border-orange-300/40 text-orange-300'
];

const GRADE_ICONS = [BookOpen, GraduationCap, FlaskConical, Microscope, Atom, Rocket, Zap, Cpu, Trophy];

function gradeColor(grade) {
  const idx = GRADES.indexOf(grade);
  return GRADE_COLORS[idx >= 0 ? idx % GRADE_COLORS.length : 5];
}

const STORAGE_KEY = 'phys_schedule_grade';

function SessionCard({ s, showGrade, now }) {
  const live = isOngoing(s, now);
  return (
    <div className={`rounded-xl border border-white/10 bg-ink-800/60 p-3 transition-colors hover:border-brand-500/40 ${live ? 'border-emerald-400/50 bg-emerald-500/5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        {showGrade && (
          <span className={`rounded-lg border px-2.5 py-1 text-xs font-extrabold ${gradeColor(s.grade)}`}>{s.grade}</span>
        )}
        <span className="flex items-center gap-1 text-xs font-bold text-neon-300">
          <Clock size={12} /> {fmtTime24(s.start_time)}{s.end_time ? ` حتى ${fmtTime24(s.end_time)}` : ''}
        </span>
      </div>
      {live && (
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> جارية دلوقتي
        </span>
      )}
      {s.note && <p className="mt-2 flex items-start gap-1 text-xs leading-5 text-white/50"><Sparkles size={12} className="mt-0.5 shrink-0 text-brand-400" /> {s.note}</p>}
    </div>
  );
}

function DayCard({ day, sessions, isToday, showGrade, now }) {
  return (
    <div className={`card p-5 ${isToday ? 'ring-2 ring-brand-500/50 shadow-glow' : ''}`}>
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="flex items-center gap-2 font-black">
          <span className={`h-2.5 w-2.5 rounded-full ${isToday ? 'bg-neon-400' : 'bg-brand-500/60'}`} />
          {day}
        </h3>
        {isToday && <span className="rounded-full bg-neon-400/15 px-3 py-1 text-xs font-bold text-neon-300">اليوم</span>}
      </div>
      <div className="space-y-3">
        {sessions.map((s, i) => (
          <SessionCard key={s.id || i} s={s} showGrade={showGrade} now={now} />
        ))}
      </div>
    </div>
  );
}

function BookingSection() {
  return <BookingForm className="mt-16" />;
}

export default function Schedule() {
  const { settings, customer } = useApp();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(() => cairoClock());
  const savedRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'الكل' || GRADES.includes(saved))) {
        setSelected(saved);
        savedRef.current = saved;
      }
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    const load = () => api('/api/schedule')
      .then((d) => { setSchedule(Array.isArray(d.schedule) ? d.schedule : []); setLoading(false); })
      .catch(() => setLoading(false));
    load();
    const t1 = setInterval(load, 60000);
    const t2 = setInterval(() => setNow(cairoClock()), 30000);
    const t3 = setTimeout(() => setNow(cairoClock()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); clearTimeout(t3); };
  }, []);

  /* اختيار صف الطالب تلقائياً من كورساته — بضغطة زرار أقل */
  useEffect(() => {
    if (!customer || savedRef.current || selected) return;
    api('/api/customer/dashboard')
      .then((d) => {
        const g = d.enrollments && d.enrollments[0] && d.enrollments[0].grade;
        if (g && GRADES.includes(g)) {
          setSelected(g);
          try { localStorage.setItem(STORAGE_KEY, g); } catch (_) { /* ignore */ }
        }
      })
      .catch(() => {});
  }, [customer, selected]);

  const today = DAY_NAMES[now.weekdayIndex];
  const isGradeView = selected && selected !== 'الكل';

  const byDay = useMemo(() => {
    const map = {};
    schedule.forEach((s) => { (map[s.day] = map[s.day] || []).push(s); });
    return map;
  }, [schedule]);

  const gradeItems = useMemo(
    () => (isGradeView ? schedule.filter((s) => s.grade === selected) : []),
    [schedule, selected, isGradeView]
  );
  const gradeDays = useMemo(
    () => (isGradeView ? DAYS.filter((d) => gradeItems.some((s) => s.day === d)) : []),
    [gradeItems, isGradeView]
  );

  const nxt = useMemo(() => nextSession(schedule, now, isGradeView ? selected : null), [schedule, now, selected, isGradeView]);

  const pick = (g) => {
    setSelected(g);
    try { localStorage.setItem(STORAGE_KEY, g); } catch (_) { /* ignore */ }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center pt-28"><Spinner label="جاري تحميل المواعيد..." /></div>;
  }

  return (
    <div className="pb-20 pt-28">
      <div className="container-x">
        {/* Hero */}
        <div className="grid-bg relative overflow-hidden rounded-[2rem] border border-white/10 p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute -inset-10 bg-gradient-to-br from-brand-600/20 to-neon-400/10 blur-2xl" />
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 shadow-glow">
            <CalendarDays size={26} className="text-pure" />
          </span>
          <h1 className="text-3xl font-black sm:text-4xl">
            {isGradeView ? `مواعيد حصص ${selected}` : 'مواعيد الدروس الحضورية'}
            <span className="grad-text"> (أوفلاين)</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            {settings.schedule_note || 'اختار سنتك الدراسية وشوف جدول حصصك الحضوري — بيحدث لحظياً وبالتوقيت بتوقيت القاهرة (نظام 24 ساعة).'}
          </p>
          {settings.schedule_address && (
            <div className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-200">
              <MapPin size={16} className="shrink-0" /> {settings.schedule_address}
            </div>
          )}
        </div>

        {/* الحصة اللي جاية + الساعة الحية */}
        {nxt && (
          <div className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${nxt.status === 'ongoing' ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-brand-500/40 bg-gradient-to-l from-brand-600/20 to-neon-400/10'}`}>
            <div className="flex items-center gap-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${nxt.status === 'ongoing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-brand-500/20 text-brand-300'}`}>
                <Zap size={22} className="animate-pulse" />
              </span>
              <div>
                <div className="text-sm font-bold text-white/50">{nxt.status === 'ongoing' ? 'الحصة الجارية دلوقتي' : 'الحصة اللي جاية'}</div>
                <div className="mt-0.5 text-lg font-black leading-6">
                  {nxt.item.grade} <span className="text-white/45">•</span> يوم {nxt.item.day}{' '}
                  <span className="text-neon-300">{fmt24m(nxt.startMin)}</span>
                </div>
                <div className="mt-0.5 text-xs font-bold text-white/45">
                  {nxt.status === 'ongoing'
                    ? `بتخلص ${nxt.item.end_time ? fmtTime24(nxt.item.end_time) : 'بعد شوية'}`
                    : `${dayLabel(nxt.dayOffset)} — هتبدأ بعد ${humanMinutes(nxt.minutesUntil)}`}
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-white/45">توقيت القاهرة (24 ساعة)</div>
              <div className="font-mono text-2xl font-black text-neon-300" dir="ltr">{fmtClock(now)}</div>
            </div>
          </div>
        )}

        {/* Change grade bar (in view modes) */}
        {selected && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/60 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white/75">
              <GraduationCap size={18} className="text-brand-400" />
              {isGradeView ? `أنت بتشوف مواعيد ${selected}` : 'أنت بتشوف مواعيد كل الصفوف'}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-300 transition-colors hover:bg-brand-500/20"
            >
              <ArrowLeft size={14} /> تغيير الصف
            </button>
          </div>
        )}

        {/* ===== Picker (first time) ===== */}
        {!selected && (
          <div className="mt-10">
            <div className="text-center">
              <h2 className="text-2xl font-black">اختار سنتك الدراسية 👇</h2>
              <p className="mt-2 text-sm text-white/55">هتلاقي مواعيد حصص سنتك بس، منظمة بالأيام — لو مسجل في كورس هنختارها لك تلقائياً.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GRADES.map((g, i) => {
                const Icon = GRADE_ICONS[i % GRADE_ICONS.length];
                const has = schedule.some((s) => s.grade === g);
                return (
                  <button
                    key={g}
                    onClick={() => pick(g)}
                    className={`group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4 text-right transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-glow`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${gradeColor(g)}`}>
                        <Icon size={22} />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm font-extrabold">{g}</span>
                        <span className={`text-[11px] font-bold ${has ? 'text-emerald-300' : 'text-white/35'}`}>
                          {has ? `${schedule.filter((s) => s.grade === g).length} حصة أسبوعياً` : 'لسه مفيش مواعيد'}
                        </span>
                      </span>
                    </span>
                    <ArrowLeft size={18} className="shrink-0 text-white/30 transition-colors group-hover:text-brand-400" />
                  </button>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => pick('الكل')}
                className="btn-ghost !py-2.5 text-sm"
              >
                <ListOrdered size={16} /> عرض مواعيد كل الصفوف
              </button>
            </div>
          </div>
        )}

        {/* ===== Grade view ===== */}
        {isGradeView && (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-white/85">
                <CalendarDays size={20} className="text-brand-400" />
                جدول {selected}
              </h3>
              <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs font-bold text-white/60">
                {gradeItems.length} حصة أسبوعياً
              </span>
            </div>

            {gradeDays.length === 0 ? (
              <div className="card mt-6 p-10 text-center">
                <p className="text-white/55">لسه مفيش مواعيد متسجلة لـ <b className="text-brand-300">{selected}</b> — تواصل مع مستر أحمد أو اختار صف تاني.</p>
                <button onClick={() => setSelected(null)} className="btn-ghost mx-auto mt-6 !py-2.5 text-sm">
                  <ArrowLeft size={16} /> اختار صف تاني
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {gradeDays.map((day) => (
                  <DayCard
                    key={day}
                    day={day}
                    sessions={gradeItems.filter((s) => s.day === day)}
                    isToday={day === today}
                    showGrade={false}
                    now={now}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== All grades view ===== */}
        {selected === 'الكل' && (
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-white/85">
              <CalendarDays size={20} className="text-brand-400" />
              مواعيد كل الصفوف
            </h3>
            <p className="mt-1 text-sm text-white/45">بس عشان تبقى أسهل، اختار سنتك من الأعلى وشوف مواعيدك انت بس.</p>
            {DAYS.filter((d) => (byDay[d] || []).length).length === 0 ? (
              <div className="card mt-6 p-10 text-center">
                <p className="text-white/45">مفيش مواعيد متسجلة لحد دلوقتي — راسل مستر أحمد من صفحة تواصل معنا.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {DAYS.filter((d) => (byDay[d] || []).length).map((day) => (
                  <DayCard key={day} day={day} sessions={byDay[day]} isToday={day === today} showGrade now={now} />
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-white/40">
          لو عندك أي سؤال عن موعد أو مكان الحصة، اسأل المساعد الذكي في الزاوية 👈 أو تواصل مع مستر أحمد مباشرة.
        </p>

        <BookingSection />
      </div>
    </div>
  );
}

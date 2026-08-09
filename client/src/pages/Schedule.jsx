import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, MapPin, Clock, Sparkles, GraduationCap, ArrowLeft, Bell,
  BookOpen, FlaskConical, Microscope, Atom, Rocket, Zap, Cpu, Trophy, ListOrdered,
  ClipboardList, UserRound, Phone, School, Send, Loader2, CheckCircle2
} from 'lucide-react';
import { api } from '../api';
import { GRADES, DAYS } from '../config';
import { useApp } from '../store/AppContext';
import Spinner from '../components/Spinner';
import { cairoWeekdayIndex } from '../utils/time';

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الأسكندرية', 'الدقهلية', 'الشرقية', 'الغربية', 'المنوفية', 'القليوبية',
  'كفر الشيخ', 'دمياط', 'البحيرة', 'الإسماعيلية', 'بورسعيد', 'السويس', 'شمال سيناء', 'جنوب سيناء',
  'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد'
];

const ACADEMIC_YEARS = ['2025/2026', '2026/2027', '2027/2028'];

const BOOKING_BLANK = {
  student_name: '', phone: '', parent_name: '', parent_phone: '',
  governorate: '', academic_year: '', grade: '', note: ''
};

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

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

function SessionCard({ s, showGrade }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800/60 p-3 transition-colors hover:border-brand-500/40">
      <div className="flex items-start justify-between gap-2">
        {showGrade && (
          <span className={`rounded-lg border px-2.5 py-1 text-xs font-extrabold ${gradeColor(s.grade)}`}>{s.grade}</span>
        )}
        <span className="flex items-center gap-1 text-xs font-bold text-neon-300">
          <Clock size={12} /> {s.start_time}{s.end_time ? ` حتى ${s.end_time}` : ''}
        </span>
      </div>
      {s.note && <p className="mt-2 flex items-start gap-1 text-xs leading-5 text-white/50"><Sparkles size={12} className="mt-0.5 shrink-0 text-brand-400" /> {s.note}</p>}
    </div>
  );
}

function DayCard({ day, sessions, isToday, showGrade }) {
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
          <SessionCard key={s.id || i} s={s} showGrade={showGrade} />
        ))}
      </div>
    </div>
  );
}

function BookingSection() {
  const [form, setForm] = useState({ ...BOOKING_BLANK });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/bookings', { method: 'POST', body: JSON.stringify(form) });
      setDone(true);
      setForm({ ...BOOKING_BLANK });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt-16 overflow-hidden">
      <div className="border-b border-white/10 bg-gradient-to-l from-brand-600/15 to-neon-400/10 p-6">
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <ClipboardList size={22} className="text-brand-400" /> عايز تحجز مكانك في السنتر؟
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          اكتب بياناتك وبيانات ولي الأمر، وهيتواصل معاك مستر أحمد على الرقم اللي هتكتبه لتأكيد الحجز والموعد.
        </p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </span>
          <h3 className="text-xl font-black">وصل طلب الحجز 🎉</h3>
          <p className="max-w-md text-sm leading-7 text-white/60">
            مستر أحمد هيشوف بياناتك وهيتواصل معاك في أقرب وقت لتأكيد الحجز. لو عايز تحجز لطالب تاني، اضغط تحت.
          </p>
          <button onClick={() => setDone(false)} className="btn-ghost !py-2.5 text-sm">
            حجز جديد
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label flex items-center gap-1.5"><UserRound size={14} className="text-brand-400" /> اسم الطالب *</label>
              <input className="input" value={form.student_name} onChange={set('student_name')} required maxLength={100} placeholder="اسم الطالب بالكامل" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Phone size={14} className="text-brand-400" /> رقم موبايل الطالب</label>
              <input type="tel" dir="ltr" className="input text-right" value={form.phone} onChange={set('phone')} maxLength={30} placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><UserRound size={14} className="text-brand-400" /> اسم ولي الأمر</label>
              <input className="input" value={form.parent_name} onChange={set('parent_name')} maxLength={100} placeholder="اسم ولي الأمر" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Phone size={14} className="text-brand-400" /> رقم موبايل ولي الأمر</label>
              <input type="tel" dir="ltr" className="input text-right" value={form.parent_phone} onChange={set('parent_phone')} maxLength={30} placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><MapPin size={14} className="text-brand-400" /> المحافظة</label>
              <select className="input" value={form.governorate} onChange={set('governorate')}>
                <option value="">اختار المحافظة</option>
                {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><School size={14} className="text-brand-400" /> السنة الدراسية</label>
              <select className="input" value={form.academic_year} onChange={set('academic_year')}>
                <option value="">اختار السنة</option>
                {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5"><GraduationCap size={14} className="text-brand-400" /> الصف الدراسي</label>
              <select className="input" value={form.grade} onChange={set('grade')}>
                <option value="">اختار الصف</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">أي ملاحظات للمدرس؟</label>
              <textarea className="input min-h-[90px] resize-y" value={form.note} onChange={set('note')} maxLength={1000} placeholder="مثال: حابب الحصة تبقى يوم السبت بعد العصر" />
            </div>
          </div>

          {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !py-4 disabled:opacity-60">
            {busy ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
            {busy ? 'جاري إرسال طلب الحجز...' : 'أرسل طلب الحجز'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function Schedule() {
  const { settings } = useApp();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'الكل' || GRADES.includes(saved))) setSelected(saved);
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    api('/api/schedule')
      .then((d) => { setSchedule(Array.isArray(d.schedule) ? d.schedule : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const today = DAY_NAMES[cairoWeekdayIndex()];

  const pick = (g) => {
    setSelected(g);
    try { localStorage.setItem(STORAGE_KEY, g); } catch (_) { /* ignore */ }
  };

  const byDay = useMemo(() => {
    const map = {};
    schedule.forEach((s) => { (map[s.day] = map[s.day] || []).push(s); });
    return map;
  }, [schedule]);

  const isGradeView = selected && selected !== 'الكل';
  const gradeItems = useMemo(
    () => (isGradeView ? schedule.filter((s) => s.grade === selected) : []),
    [schedule, selected, isGradeView]
  );
  const gradeDays = useMemo(
    () => (isGradeView ? DAYS.filter((d) => gradeItems.some((s) => s.day === d)) : []),
    [gradeItems, isGradeView]
  );

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
            {settings.schedule_note || 'اختار سنتك الدراسية وشوف جدول حصصك الحضوري — بيحدث باستمرار من المدرس.'}
          </p>
          {settings.schedule_address && (
            <div className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-200">
              <MapPin size={16} className="shrink-0" /> {settings.schedule_address}
            </div>
          )}
        </div>

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
              <p className="mt-2 text-sm text-white/55">هتلاقي مواعيد حصص سنتك بس، منظمة بالأيام.</p>
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
                  <DayCard key={day} day={day} sessions={byDay[day]} isToday={day === today} showGrade />
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

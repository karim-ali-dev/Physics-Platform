import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, PlaySquare, ClipboardCheck, Users, Star, HelpCircle, Inbox, Plus,
  MailOpen, Activity, ShieldCheck, GraduationCap, Trophy, Eye, Wallet, Building2,
  TrendingUp, CheckCircle2, Award, Target, ListChecks, ArrowUpRight
} from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const actionLabels = {
  login_ok: 'تسجيل دخول',
  login_fail: 'محاولة دخول فاشلة',
  login_fail_2fa: 'كود 2FA خاطئ',
  logout_all: 'خروج من كل الأجهزة',
  password_change: 'تغيير كلمة السر',
  '2fa_enabled': 'تفعيل المصادقة الثنائية',
  '2fa_disabled': 'إيقاف المصادقة الثنائية',
  course_create: 'إضافة كورس',
  course_update: 'تعديل كورس',
  course_delete: 'حذف كورس',
  lesson_create: 'إضافة درس',
  lesson_update: 'تعديل درس',
  lesson_delete: 'حذف درس',
  quiz_create: 'إنشاء اختبار',
  quiz_update: 'تعديل اختبار',
  quiz_delete: 'حذف اختبار',
  question_create: 'إضافة سؤال',
  question_update: 'تعديل سؤال',
  question_delete: 'حذف سؤال',
  testimonial_create: 'إضافة رأي',
  testimonial_update: 'تعديل رأي',
  testimonial_delete: 'حذف رأي',
  testimonial_approve: 'موافقة على تقييم طالب',
  testimonial_reject: 'رفض تقييم طالب',
  testimonial_submit: 'تقييم جديد من طالب',
  faq_create: 'إضافة سؤال شائع',
  faq_update: 'تعديل سؤال شائع',
  faq_delete: 'حذف سؤال شائع',
  message_read: 'قراءة رسالة',
  message_delete: 'حذف رسالة',
  settings_update: 'تعديل إعدادات',
  contact_message: 'رسالة جديدة من الزوار',
  upload: 'رفع ملف',
  student_enroll: 'تسجيل طالب',
  student_quiz: 'حل اختبار',
  student_password_change: 'تغيير كلمة سر طالب',
  student_password_reset: 'إعادة تعيين كلمة سر طالب',
  student_upload: 'رفع ملف طالب',
  student_delete: 'حذف طالب'
};

const styles = `
  @keyframes dashIn { to { stroke-dashoffset: var(--dash-to); } }
  @keyframes growUp { from { height: 0; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } }
  @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,.35); } 50% { box-shadow: 0 0 22px 6px rgba(124,58,237,.25); } }
  .dash-anim { animation: dashIn 1.4s cubic-bezier(.4,0,.2,1) forwards; }
  .grow-anim { animation: growUp .9s cubic-bezier(.4,0,.2,1) backwards; }
  .fade-up { animation: fadeUp .6s ease backwards; }
`;

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function CountCard({ icon: Icon, label, value, to, color, badge, delay = 0 }) {
  const n = useCountUp(value);
  const content = (
    <div className="card relative h-full overflow-hidden p-5" style={{ animation: `fadeUp .5s ease ${delay}ms backwards` }}>
      <span className={`absolute -left-6 -top-6 h-20 w-20 rounded-full opacity-10 ${color.split(' ')[1]}`} />
      <div className="flex items-center justify-between">
        <Icon size={22} className={color} />
        {badge > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-black text-white">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-black tabular-nums">{n}</div>
      <div className="mt-1 text-xs font-semibold text-white/50">{label}</div>
    </div>
  );
  return to ? (
    <Link to={to} className="transition-transform hover:-translate-y-0.5">{content}</Link>
  ) : content;
}

function Donut({ value, size = 150, stroke = 12, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  const color = v >= 70 ? '#34d399' : v >= 50 ? '#fbbf24' : '#fb7185';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          style={{ ['--dash-to']: `${c * (1 - v / 100)}px`, strokeDashoffset: c }}
          className="dash-anim"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums" style={{ color }}>{v}%</span>
        <span className="text-[11px] font-semibold text-white/45">{label}</span>
      </div>
    </div>
  );
}

function MiniBarChart({ data, series }) {
  const max = Math.max(1, ...data.map((d) => Math.max(...series.map((s) => d[s.key] || 0))));
  return (
    <div className="flex h-40 items-end gap-2" dir="ltr">
      {data.map((d, i) => (
        <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1.5" style={{ height: '100%' }}>
          <div className="flex w-full flex-1 items-end justify-center gap-1">
            {series.map((s) => {
              const h = Math.round(((d[s.key] || 0) / max) * 100);
              return (
                <div
                  key={s.key}
                  title={`${s.label}: ${d[s.key] || 0}`}
                  className={`grow-anim w-full max-w-[10px] rounded-t-md ${s.bar}`}
                  style={{ height: `${Math.max(4, h)}%`, animationDelay: `${i * 60 + s.idx * 30}ms` }}
                />
              );
            })}
          </div>
          <span className="text-[10px] font-bold text-white/40">{d.day.slice(8, 10)}</span>
        </div>
      ))}
    </div>
  );
}

function PctBar({ label, count, total, accent, delay = 0 }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold text-white/70">{label}</span>
        <span className="font-black tabular-nums text-white/60">{count} طالب • {pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-l ${accent}`}
          style={{ width: `${pct}%`, transition: 'width 1s cubic-bezier(.4,0,.2,1)', animation: `growUp .9s ease ${delay}ms backwards` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/api/admin/dashboard')
      .then((d) => { setData(d); setLoading(false); setReady(true); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="جاري تحميل البيانات..." />;

  const { stats = {}, recentMessages = [], recentEnrollments = [], recentStudents = [], recentAttempts = [], recentActivity = [], grades = [], trend = [], topCourses = [] } = data || {};
  const totalGradeStudents = grades.reduce((s, g) => s + g.students_count, 0);
  const maxTopCourse = Math.max(1, ...topCourses.map((c) => c.enrollments));

  const cards = [
    { icon: Users, label: 'الطلاب', value: stats.students, to: `${ADMIN_PATH}/students`, color: 'text-brand-400 bg-brand-500' },
    { icon: BookOpen, label: 'الكورسات', value: stats.courses, to: `${ADMIN_PATH}/courses`, color: 'text-neon-400 bg-neon-400' },
    { icon: PlaySquare, label: 'الدروس', value: stats.lessons, to: `${ADMIN_PATH}/lessons`, color: 'text-emerald-400 bg-emerald-500' },
    { icon: ClipboardCheck, label: 'الاختبارات', value: stats.quizzes, to: `${ADMIN_PATH}/quizzes`, color: 'text-amber-400 bg-amber-400' },
    { icon: Inbox, label: 'الرسائل', value: stats.messages, to: `${ADMIN_PATH}/messages`, color: 'text-rose-400 bg-rose-500', badge: stats.unread }
  ];
  const miniCards = [
    { icon: GraduationCap, label: 'تسجيلات كورسات', value: stats.enrolled, color: 'text-brand-300' },
    { icon: Eye, label: 'مشاهدات دروس', value: stats.watched, color: 'text-neon-300' },
    { icon: Trophy, label: 'محاولات اختبارات', value: stats.attempts, color: 'text-emerald-300' },
    { icon: Star, label: 'متوسط الدرجات', value: `${stats.avgScore}%`, color: 'text-amber-300' },
    { icon: TrendingUp, label: 'طلاب جديد آخر 7 أيام', value: stats.weekStudents, color: 'text-sky-300' },
    { icon: Wallet, label: 'مدفوعات قيد المراجعة', value: stats.pendingPayments, color: 'text-neon-300', to: `${ADMIN_PATH}/payments` },
    { icon: Building2, label: 'حجوزات جديدة', value: stats.pendingBookings, color: 'text-brand-300', to: `${ADMIN_PATH}/bookings` }
  ];

  return (
    <div className={ready ? '' : ''}>
      <style>{styles}</style>
      <PageHeader
        title="مرحباً بيك مستر أحمد"
        subtitle="نظرة تحليلية على أداء المنصة وطلابك خلال آخر 7 أيام."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to={`${ADMIN_PATH}/tasks`} className="btn-ghost !py-2.5 text-sm">
              <ListChecks size={16} /> المهام
            </Link>
            <Link to={`${ADMIN_PATH}/courses/new`} className="btn-primary !py-2.5 text-sm">
              <Plus size={17} /> إضافة كورس جديد
            </Link>
          </div>
        }
      />

      {/* بطاقات الأعداد المتحركة */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => <CountCard key={c.label} {...c} delay={i * 70} />)}
      </div>

      {/* التحليلات */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* نسبة النجاح */}
        <div className="card fade-up flex flex-col items-center justify-center gap-4 p-6" style={{ animationDelay: '100ms' }}>
          <h3 className="flex items-center gap-2 self-start font-extrabold">
            <Target size={18} className="text-emerald-400" /> نسبة النجاح في الاختبارات
          </h3>
          <Donut value={stats.passRate} label="نسبة النجاح (70%+) " />
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> ناجح</span>
            <span className="flex items-center gap-1.5"><Award size={13} className="text-amber-400" /> متوسط الدرجات {stats.avgScore}%</span>
          </div>
        </div>

        {/* نشاط آخر 7 أيام */}
        <div className="card fade-up p-6 lg:col-span-2" style={{ animationDelay: '180ms' }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-extrabold">
              <Activity size={18} className="text-brand-400" /> نشاط آخر 7 أيام
            </h3>
            <div className="flex items-center gap-4 text-[11px] font-bold text-white/50">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> طلاب جدد ({stats.weekStudents})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-neon-400" /> تسجيلات ({trend.reduce((s, d) => s + d.enrollments, 0)})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> اختبارات ({stats.weekAttempts})</span>
            </div>
          </div>
          {trend.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">مفيش بيانات نشاط لسه.</p>
          ) : (
            <MiniBarChart
              data={trend}
              series={[
                { key: 'students', label: 'طلاب', bar: 'bg-brand-500', idx: 0 },
                { key: 'enrollments', label: 'تسجيلات', bar: 'bg-neon-400', idx: 1 },
                { key: 'attempts', label: 'اختبارات', bar: 'bg-emerald-400', idx: 2 }
              ]}
            />
          )}
        </div>

        {/* توزيع الطلاب بالنسب */}
        <div className="card fade-up p-6 lg:col-span-2" style={{ animationDelay: '260ms' }}>
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Users size={18} className="text-brand-400" /> توزيع الطلاب على الصفوف بالنسب
          </h3>
          {grades.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">مفيش بيانات توزيع لسه.</p>
          ) : (
            <div className="space-y-4">
              {grades.map((g, i) => (
                <PctBar
                  key={g.grade}
                  label={g.grade}
                  count={g.students_count}
                  total={totalGradeStudents}
                  accent={['from-brand-500 to-neon-400', 'from-emerald-500 to-teal-400', 'from-amber-500 to-orange-400', 'from-sky-500 to-cyan-400', 'from-rose-500 to-pink-400', 'from-violet-500 to-purple-400'][i % 6]}
                  delay={i * 80}
                />
              ))}
            </div>
          )}
        </div>

        {/* أكتر الكورسات تسجيلاً */}
        <div className="card fade-up p-6" style={{ animationDelay: '340ms' }}>
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <BookOpen size={18} className="text-neon-400" /> أكتر الكورسات تسجيلاً
          </h3>
          {topCourses.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">مفيش كورسات لسه.</p>
          ) : (
            <div className="space-y-4">
              {topCourses.map((c, i) => (
                <div key={c.title}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-white/70">{c.title}</span>
                    <span className="font-black tabular-nums text-white/60">{c.enrollments}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-neon-400 to-brand-500"
                      style={{ width: `${Math.round((c.enrollments / maxTopCourse) * 100)}%`, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to={`${ADMIN_PATH}/students`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            كل الطلاب <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      {/* بطاقات مصغرة */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        {miniCards.map((c, i) =>
          c.to ? (
            <Link key={c.label} to={c.to} className="card fade-up flex items-center gap-3 p-4 transition-colors hover:border-brand-500/40" style={{ animationDelay: `${i * 60}ms` }}>
              <c.icon size={20} className={`shrink-0 ${c.color}`} />
              <div className="min-w-0">
                <div className="text-lg font-black">{c.value}</div>
                <div className="truncate text-[10px] font-semibold text-white/50">{c.label}</div>
              </div>
            </Link>
          ) : (
            <div key={c.label} className="card fade-up flex items-center gap-3 p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <c.icon size={20} className={`shrink-0 ${c.color}`} />
              <div className="min-w-0">
                <div className="text-lg font-black">{c.value}</div>
                <div className="truncate text-[10px] font-semibold text-white/50">{c.label}</div>
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Inbox size={18} className="text-brand-400" /> أحدث الرسائل
          </h3>
          {recentMessages.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش رسائل وصلت لسه.</p>
          ) : (
            <ul className="space-y-3">
              {recentMessages.map((m) => (
                <li key={m.id} className={`rounded-xl border border-white/10 bg-ink-900 p-4 ${m.is_read ? '' : 'border-brand-500/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold">{m.name}</span>
                    {!m.is_read && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-black text-pure">جديد</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-white/55">{m.message}</p>
                  <div className="mt-2 text-xs text-white/35">{fmtDateTime(m.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${ADMIN_PATH}/messages`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <MailOpen size={16} /> كل الرسائل
          </Link>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <GraduationCap size={18} className="text-brand-400" /> أحدث تسجيلات الكورسات
          </h3>
          {recentEnrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش تسجيلات لسه.</p>
          ) : (
            <ul className="space-y-3">
              {recentEnrollments.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
                  <div>
                    <div className="font-extrabold">{e.student_name}</div>
                    <div className="mt-1 text-xs text-white/40">{e.course_title}</div>
                  </div>
                  <span className="shrink-0 text-xs text-white/35">{fmtDateTime(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${ADMIN_PATH}/students`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <Users size={16} /> كل الطلاب
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Trophy size={18} className="text-brand-400" /> أحدث نتائج الاختبارات
          </h3>
          {recentAttempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش اختبارات متحلّة لسه.</p>
          ) : (
            <ul className="space-y-3">
              {recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
                  <div>
                    <div className="font-extrabold">{a.student_name}</div>
                    <div className="mt-1 text-xs text-white/40">{a.quiz_title}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${a.total && a.score / a.total >= 0.7 ? 'bg-emerald-500/15 text-emerald-300' : a.total && a.score / a.total >= 0.5 ? 'bg-brand-500/15 text-brand-300' : 'bg-white/10 text-white/50'}`}>
                    {a.score} / {a.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${ADMIN_PATH}/quizzes`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <ClipboardCheck size={16} /> كل الاختبارات
          </Link>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Users size={18} className="text-brand-400" /> أحدث الطلاب المسجلين
          </h3>
          {recentStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش طلاب لسه.</p>
          ) : (
            <ul className="space-y-3">
              {recentStudents.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400 text-xs font-black text-pure">
                      {s.name?.charAt(0) || 'ط'}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-extrabold">{s.name}</div>
                      <div className="truncate text-xs text-white/40" dir="ltr">{s.email}</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-white/35">{fmtDateTime(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${ADMIN_PATH}/students`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <Users size={16} /> كل الطلاب
          </Link>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h3 className="mb-4 flex items-center gap-2 font-extrabold">
          <Activity size={18} className="text-brand-400" /> سجل النشاط الأخير
        </h3>
        {recentActivity.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">مفيش نشاط مسجل لحد دلوقتي.</p>
        ) : (
          <ul className="space-y-2">
            {recentActivity.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-ink-900/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <ShieldCheck size={15} />
                  </span>
                  <div>
                    <div className="text-sm font-bold">{actionLabels[a.action] || a.action}</div>
                    {a.detail && <div className="text-xs text-white/40">{a.detail}</div>}
                  </div>
                </div>
                <span className="text-xs text-white/35">{fmtDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

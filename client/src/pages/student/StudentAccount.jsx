import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRound, KeyRound, LogOut, BookOpen, PlayCircle, ClipboardCheck, Award, LogIn, Wallet, FileText } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../store/AppContext';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

export default function StudentAccount() {
  const { customer, customerLogout } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!customer) { navigate('/student/login', { replace: true }); return; }
    api('/api/customer/dashboard')
      .then(setData)
      .catch(() => setData({ stats: {}, enrollments: [] }));
    api('/api/customer/payments').then((d) => setPayments(d.payments || [])).catch(() => {});
  }, [customer, navigate]);

  const doLogout = async () => {
    await customerLogout();
    navigate('/student/login');
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (form.new_password.length < 8) {
      setStatus({ type: 'error', text: 'كلمة السر الجديدة لازم تكون 8 أحرف على الأقل' });
      return;
    }
    if (form.new_password !== form.confirm) {
      setStatus({ type: 'error', text: 'كلمتا السر مش متطابقتين' });
      return;
    }
    setBusy(true);
    try {
      await api('/api/customer/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password })
      });
      setStatus({ type: 'ok', text: 'تم تغيير كلمة السر بنجاح' });
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (!customer) return null;

  const stats = data?.stats || {};
  const enrollments = data?.enrollments || [];
  const statCards = [
    { icon: BookOpen, label: 'كورسات مسجل فيها', value: stats.enrolled ?? '—', color: 'text-brand-400 bg-brand-500/15' },
    { icon: PlayCircle, label: 'دروس شاهدتها', value: `${stats.watched ?? 0} / ${stats.totalLessons ?? 0}`, color: 'text-neon-300 bg-neon-400/10' },
    { icon: ClipboardCheck, label: 'اختبارات حليتها', value: stats.quizzesTaken ?? '—', color: 'text-emerald-300 bg-emerald-500/15' },
    { icon: Award, label: 'متوسط الدرجات', value: `${stats.avgScore ?? 0}%`, color: 'text-amber-300 bg-amber-500/15' }
  ];

  return (
    <div className="container-x pt-28 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">منصتي</h1>
          <p className="mt-1 text-sm text-white/50">تابع دروسك واختباراتك وتقدمك.</p>
        </div>
        <button onClick={doLogout} className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20">
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${s.color}`}>
              <s.icon size={22} />
            </span>
            <div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs font-bold text-white/50">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Link to="/student/materials" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-brand-500/30 bg-gradient-to-l from-brand-500/15 to-neon-400/10 p-5 transition-colors hover:border-brand-400/60">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15">
            <FileText size={22} className="text-red-400" />
          </span>
          <div>
            <div className="font-black">ملفات المذاكرة</div>
            <div className="mt-0.5 text-sm text-white/50">مذكرات ومراجعات PDF من مستر أحمد لصفك — اضغط للفتح</div>
          </div>
        </div>
        <span className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-pure">افتح الملفات</span>
      </Link>

      {payments.length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Wallet size={20} className="text-brand-400" /> مدفوعاتي (Vodafone Cash)
          </h2>
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
                <div className="min-w-0">
                  <div className="font-extrabold">{p.course_icon} {p.course_title}</div>
                  <div className="mt-0.5 text-xs text-white/45">
                    {fmtDateTime(p.created_at)}{p.reference ? ` • رقم العملية ${p.reference}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-neon-300">{p.amount} ج.م</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    p.status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : p.status === 'rejected'
                        ? 'bg-red-500/15 text-red-300'
                        : 'bg-amber-400/15 text-amber-300'
                  }`}>
                    {p.status === 'paid' ? 'مدفوع ✓' : p.status === 'rejected' ? 'مرفوض' : 'تحت المراجعة'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {payments.some((p) => p.status === 'pending') && (
            <p className="mt-3 text-xs text-white/45">
              دفعة تحت المراجعة؟ هيتفعّل الكورس عندك تلقائياً أول ما مستر أحمد يتأكد من التحويل.
            </p>
          )}
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <BookOpen size={20} className="text-brand-400" /> كورساتي
          </h2>
          {!data ? (
            <Spinner label="جاري تحميل الكورسات..." />
          ) : enrollments.length === 0 ? (
            <div className="py-10 text-center">
              <LogIn size={36} className="mx-auto mb-3 text-white/20" />
              <p className="text-sm text-white/55">لسه ماسجلتش في أي كورس.</p>
              <Link to="/courses" className="btn-primary mt-5">تصفح الكورسات</Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {enrollments.map((c) => {
                const pct = c.lessons_count ? Math.round((c.watched_count / c.lessons_count) * 100) : 0;
                return (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-ink-900 p-4">
                    <div className="flex items-center gap-2 text-2xl">
                      <span>{c.icon}</span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold text-neon-300">{c.grade}</span>
                    </div>
                    <div className="mt-2 line-clamp-1 font-extrabold">{c.title}</div>
                    <div className="mt-1 text-xs text-white/45">{c.watched_count} / {c.lessons_count} درس</div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-neon-400" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-end text-xs font-bold text-brand-300">{pct}%</div>
                    <Link to={`/student/course/${c.id}`} className="btn-primary mt-3 w-full !py-2 text-xs">كمل الكورس</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 shadow-glow">
                <UserRound size={24} className="text-pure" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-black">{customer.name}</div>
                <div className="truncate text-sm text-white/50" dir="ltr">{customer.email}</div>
              </div>
            </div>
          </div>

          <div className="card p-7">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-black">
              <KeyRound size={20} className="text-brand-400" /> تغيير كلمة السر
            </h2>

            {status && (
              <div className={`mb-5 flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
                status.type === 'ok' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}>
                {status.type === 'ok' ? 'تم بنجاح' : ''}
                {status.text}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">كلمة السر الحالية</label>
                <input
                  type="password"
                  className="input"
                  value={form.current_password}
                  onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="label">كلمة السر الجديدة</label>
                <input
                  type="password"
                  className="input"
                  value={form.new_password}
                  onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="label">تأكيد كلمة السر</label>
                <input
                  type="password"
                  className="input"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? 'جاري الحفظ...' : 'حفظ كلمة السر'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

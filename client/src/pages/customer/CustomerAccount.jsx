import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRound, Mail, KeyRound, LogOut, Package, CheckCircle2, AlertCircle, CalendarClock } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../store/AppContext';

export default function CustomerAccount() {
  const { customer, customerLogout } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const doLogout = async () => {
    await customerLogout();
    navigate('/customer/login');
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (form.new_password.length < 8) {
      setStatus({ type: 'error', text: 'كلمة السر الجديدة لازم تكون 8 أحرف على الأقل' });
      return;
    }
    if (form.new_password !== form.confirm) {
      setStatus({ type: 'error', text: 'كلمتي السر مش متطابقتين' });
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

  useEffect(() => {
    if (!customer) navigate('/customer/login', { replace: true });
  }, [customer, navigate]);

  if (!customer) return null;

  return (
    <div className="container-x pt-28 pb-16">
      <h1 className="text-3xl font-black">حسابي</h1>
      <p className="mt-1 text-sm text-white/50">إدارة حسابك وطلباتك في مكان واحد.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 shadow-glow">
                <UserRound size={24} className="text-pure" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-black">{customer.name}</div>
                <div className="truncate text-sm text-white/50" dir="ltr">{customer.email}</div>
              </div>
            </div>
          </div>

          <div className="card p-3">
            <Link to="/customer/orders" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/5">
              <Package size={18} className="text-brand-400" /> طلباتي
            </Link>
            <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10">
              <LogOut size={18} /> تسجيل الخروج
            </button>
          </div>
        </div>

        <div className="card p-7 lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black">
            <KeyRound size={20} className="text-brand-400" /> تغيير كلمة السر
          </h2>

          {status && (
            <div className={`mb-5 flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
              status.type === 'ok' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}>
              {status.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {status.text}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
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
            <div className="grid gap-5 sm:grid-cols-2">
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
            </div>
            <button type="submit" disabled={busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'جاري الحفظ...' : 'حفظ كلمة السر الجديدة'}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-ink-900 p-4 text-xs leading-6 text-white/45">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-brand-400" />
            ملاحظة: لو سجّلت دخولك بـ Google أو Facebook، ممكن تبقى مفيش كلمة سر لحسابك — وفي الحالة دي جرّب "إعادة تعيين كلمة السر" من صفحة الدخول علشان تضع واحد.
          </div>
        </div>
      </div>
    </div>
  );
}

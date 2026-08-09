import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserRoundPlus, Mail, Lock, User, ShieldCheck } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { AuthShell } from './AuthShell';
import SocialButtons from './SocialButtons';

export default function CustomerRegister() {
  const { customer, customerRegister } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (customer) navigate('/customer/account', { replace: true });
  }, [customer, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('كلمة السر لازم تكون 8 أحرف على الأقل');
      return;
    }
    if (form.password !== form.confirm) {
      setError('كلمتي السر مش متطابقتين');
      return;
    }
    setBusy(true);
    try {
      await customerRegister(form.name, form.email, form.password);
      navigate('/customer/account');
    } catch (err) {
      setError(err.message || 'حصل خطأ في التسجيل');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon={<UserRoundPlus size={26} className="text-pure" />}
      title="إنشاء حساب عميل"
      subtitle="ابعت طلبات مونتاج وتابع حالتها من حساب واحد."
      error={error}
      footer={
        <>
          عندك حساب بالفعل؟{' '}
          <Link to="/customer/login" className="font-bold text-brand-400 hover:text-brand-300">سجّل دخول</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">الاسم</label>
          <div className="relative">
            <User size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              className="input pr-11"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoComplete="name"
              placeholder="اسمك الكريم"
            />
          </div>
        </div>
        <div>
          <label className="label">البريد الإلكتروني</label>
          <div className="relative">
            <Mail size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="email"
              dir="ltr"
              className="input pr-11 text-right"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              placeholder="you@email.com"
            />
          </div>
        </div>
        <div>
          <label className="label">كلمة السر (8 أحرف على الأقل)</label>
          <div className="relative">
            <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="password"
              className="input pr-11"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
        </div>
        <div>
          <label className="label">تأكيد كلمة السر</label>
          <div className="relative">
            <ShieldCheck size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="password"
              className="input pr-11"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
        </button>
      </form>

      <div className="mt-5">
        <SocialButtons />
      </div>
    </AuthShell>
  );
}

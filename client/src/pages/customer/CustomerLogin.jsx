import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogIn, Mail, Lock, UserRound } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { AuthShell } from './AuthShell';
import SocialButtons from './SocialButtons';

const ERROR_TEXT = {
  state: 'انتهت صلاحية محاولة الدخول الاجتماعية، جرب تاني.',
  denied: 'ألغيت تسجيل الدخول الاجتماعي.',
  token: 'مشكلة في الاتصال بخدمة الدخول، جرب تاني.',
  profile: 'مش عرفين نجيب بيانات حسابك الاجتماعي.',
  server: 'حصل خطأ في السيرفر، جرب تاني بعد شوية.'
};

export default function CustomerLogin() {
  const { customer, customerLogin } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (customer) navigate('/customer/account', { replace: true });
  }, [customer, navigate]);

  useEffect(() => {
    const e = params.get('error');
    if (e) setError(ERROR_TEXT[e] || 'حصل خطأ في تسجيل الدخول الاجتماعي.');
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await customerLogin(form.email, form.password);
      navigate('/customer/account');
    } catch (err) {
      setError(err.message || 'خطأ في الدخول');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon={<UserRound size={26} className="text-pure" />}
      title="تسجيل دخول العملاء"
      subtitle="سجّل دخولك علشان تبعت طلبات مونتاج وتتابع حالتها."
      error={error}
      footer={
        <>
          لسه مفيش حساب؟{' '}
          <Link to="/customer/register" className="font-bold text-brand-400 hover:text-brand-300">أنشئ حساب جديد</Link>
          {' '}— أو{' '}
          <Link to="/customer/forgot" className="font-bold text-brand-400 hover:text-brand-300">نسيت كلمة السر؟</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
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
          <label className="label">كلمة السر</label>
          <div className="relative">
            <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="password"
              className="input pr-11"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
          <LogIn size={18} /> {busy ? 'جاري الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>

      <div className="mt-5">
        <SocialButtons />
      </div>
    </AuthShell>
  );
}

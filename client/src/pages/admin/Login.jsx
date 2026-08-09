import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Atom, Lock, User, LogIn, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { ADMIN_PATH } from '../../config';

export default function AdminLogin() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await login(credentials.username, credentials.password);
      if (data.requires2fa) {
        setStep(2);
        return;
      }
      navigate(`${ADMIN_PATH}`);
    } catch (err) {
      setError(err.message || 'خطأ في الدخول');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(credentials.username, credentials.password, code);
      navigate(`${ADMIN_PATH}`);
    } catch (err) {
      setError(err.message || 'كود غير صحيح');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center bg-ink-950 p-4">
      <div className="pointer-events-none fixed -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 h-96 w-96 rounded-full bg-neon-400/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowRight size={16} /> العودة للموقع
        </Link>
        <div className="card p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 shadow-glow">
              <Atom size={26} className="text-pure" />
            </span>
            <h1 className="text-2xl font-black">دخول لوحة التحكم</h1>
            <p className="mt-1 text-sm text-white/50">
              {step === 1 ? 'مساحة مستر أحمد الخاصة بس' : 'الخطوة 2 — كود المصادقة الثنائية'}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              <AlertCircle size={17} /> {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={submitPassword} className="space-y-4">
              <div>
                <label className="label">اسم المستخدم</label>
                <div className="relative">
                  <User size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
                  <input
                    className="input pr-11"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    required
                    autoComplete="username"
                    placeholder="ادخل اسم المستخدم"
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
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                <LogIn size={18} /> {busy ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-neon-400/20 bg-neon-400/5 p-4">
                <ShieldCheck size={22} className="mt-0.5 shrink-0 text-neon-400" />
                <p className="text-sm leading-6 text-white/70">
                  حسابك محمي بالمصادقة الثنائية. افتح تطبيق <strong>Google Authenticator</strong> أو <strong>Microsoft Authenticator</strong> واكتب الكود.
                </p>
              </div>
              <div>
                <label className="label">الكود المكوّن من 6 أرقام</label>
                <input
                  className="input text-center text-2xl font-black tracking-[.5em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoFocus
                  dir="ltr"
                  placeholder="••••••"
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                <ShieldCheck size={18} /> {busy ? 'جاري التحقق...' : 'تأكيد الدخول'}
              </button>
              <button type="button" onClick={() => { setStep(1); setError(''); }} className="w-full text-center text-xs text-white/40 hover:text-white">
                رجوع
              </button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-white/35">
          الحماية: قفل تلقائي بعد 5 محاولات فاشلة + مصادقة ثنائية اختيارية + جلسات قابلة للإلغاء.
        </p>
      </div>
    </div>
  );
}

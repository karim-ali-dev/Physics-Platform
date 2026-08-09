import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react';
import { api } from '../../api';
import { AuthShell } from '../customer/AuthShell';

export default function StudentForgot() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [devLink, setDevLink] = useState('');
  const [devCode, setDevCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setDevLink('');
    setDevCode('');
    try {
      const data = await api('/api/customer/forgot', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage(data.message || 'لو الإيميل موجود، هتوصلك رسالة فيها الكود');
      if (data.devLink) setDevLink(data.devLink);
      if (data.devCode) setDevCode(data.devCode);
      setStep('code');
    } catch (err) {
      setError(err.message || 'حصل خطأ، جرب تاني.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/api/customer/verify-code', { method: 'POST', body: JSON.stringify({ email, code: code.trim() }) });
      setMessage('الكود صحيح — اكتب كلمة سر جديدة');
      setStep('password');
    } catch (err) {
      setError(err.message || 'الكود غير صحيح، جرب تاني.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirm) {
      setError('كلمتا السر مش متطابقتين');
      return;
    }
    setBusy(true);
    try {
      const data = await api('/api/customer/reset', { method: 'POST', body: JSON.stringify({ email, code: code.trim(), password }) });
      setMessage(data.message || 'تم تعيين كلمة السر الجديدة');
      setTimeout(() => navigate('/student/login'), 2000);
    } catch (err) {
      setError(err.message || 'حصل خطأ، جرب تاني.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon={step === 'email' ? <KeyRound size={26} className="text-pure" /> : <ShieldCheck size={26} className="text-pure" />}
      title={step === 'email' ? 'نسيت كلمة السر؟' : step === 'code' ? 'اكتب الكود' : 'كلمة سر جديدة'}
      subtitle={step === 'email' ? 'اكتب إيميلك وهنبعتلك كود لإعادة التعيين.' : step === 'code' ? `هوصلك كود من 6 أرقام على الإيميل${email ? ` (${email})` : ''}.` : 'اكتب كلمة سر جديدة ليك.'}
      error={error}
      footer={
        step === 'password' ? (
          <button type="button" onClick={() => setStep('code')} className="font-bold text-brand-400 hover:text-brand-300">
            رجوع لكتابة الكود
          </button>
        ) : (
          <>
            افتكرتها؟{' '}
            <Link to="/student/login" className="font-bold text-brand-400 hover:text-brand-300">سجّل دخول</Link>
          </>
        )
      }
    >
      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm font-semibold text-green-300">
          <CheckCircle2 size={17} /> {message}
        </div>
      )}
      {import.meta.env.DEV && devLink && (
        <div className="mb-5 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
          <div className="mb-1 text-xs font-bold text-brand-300">الكود والرابط (يظهران في وضع التطوير فقط ولا يظهران للزوار):</div>
          {devCode && <div className="mb-1 font-mono text-xl font-bold text-brand-100" dir="ltr">{devCode}</div>}
          <a href={devLink} className="break-all text-sm text-brand-200 underline" dir="ltr">{devLink}</a>
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <div className="relative">
              <Mail size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                type="email"
                dir="ltr"
                className="input pr-11 text-right"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@email.com"
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
            <GraduationCap size={18} /> {busy ? 'جاري الإرسال...' : 'ابعت كود التعيين'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode} className="space-y-4">
          <div>
            <label className="label">الكود (6 أرقام)</label>
            <div className="relative">
              <ShieldCheck size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                type="text"
                dir="ltr"
                inputMode="numeric"
                className="input pr-11 text-center font-mono text-xl tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                required
                autoComplete="one-time-code"
                placeholder="••••••"
              />
            </div>
          </div>
          <button type="submit" disabled={busy || code.length < 6} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
            <ShieldCheck size={18} /> {busy ? 'جاري التحقق...' : 'تحقق من الكود'}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => setStep('email')} className="text-sm text-brand-400 hover:text-brand-300">
              غيّر الإيميل أو أعد الإرسال
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={resetPassword} className="space-y-4">
          <div>
            <label className="label">كلمة السر الجديدة *</label>
            <div className="relative">
              <KeyRound size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                type="password"
                className="input pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8 أحرف على الأقل"
              />
            </div>
          </div>
          <div>
            <label className="label">تأكيد كلمة السر *</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
            <KeyRound size={18} /> {busy ? 'جاري الحفظ...' : 'احفظ كلمة السر الجديدة'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

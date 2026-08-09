import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, CheckCircle2, GraduationCap } from 'lucide-react';
import { api } from '../../api';
import { AuthShell } from '../customer/AuthShell';

export default function StudentForgot() {
  const [email, setEmail] = useState('');
  const [devLink, setDevLink] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setDevLink('');
    try {
      const data = await api('/api/customer/forgot', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage(data.message || 'لو الإيميل موجود، هتوصلك رسالة فيها الرابط');
      if (data.devLink) setDevLink(data.devLink);
    } catch (err) {
      setError(err.message || 'حصل خطأ، جرب تاني.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon={<KeyRound size={26} className="text-pure" />}
      title="نسيت كلمة السر؟"
      subtitle="اكتب إيميلك وهنبعتلك رابط لإعادة التعيين."
      error={error}
      footer={
        <>
          افتكرتها؟{' '}
          <Link to="/student/login" className="font-bold text-brand-400 hover:text-brand-300">سجّل دخول</Link>
        </>
      }
    >
      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm font-semibold text-green-300">
          <CheckCircle2 size={17} /> {message}
        </div>
      )}
      {devLink && (
        <div className="mb-5 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
          <div className="mb-1 text-xs font-bold text-brand-300">وضع التطوير — الرابط:</div>
          <a href={devLink} className="break-all text-sm text-brand-200 underline" dir="ltr">{devLink}</a>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
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
          <GraduationCap size={18} /> {busy ? 'جاري الإرسال...' : 'ابعت رابط التعيين'}
        </button>
      </form>
    </AuthShell>
  );
}

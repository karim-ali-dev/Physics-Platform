import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Send, Copy, CheckCircle2, Check } from 'lucide-react';
import { api } from '../../api';
import { AuthShell } from './AuthShell';

export default function CustomerForgot() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setStatus(null);
    try {
      const data = await api('/api/customer/forgot', { method: 'POST', body: JSON.stringify({ email }) });
      setStatus(data);
    } catch (err) {
      setError(err.message || 'حصل خطأ، جرب تاني');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!status?.devLink) return;
    try {
      await navigator.clipboard.writeText(status.devLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* ignore */ }
  };

  return (
    <AuthShell
      icon={<KeyRound size={26} className="text-pure" />}
      title="نسيت كلمة السر"
      subtitle="اكتب إيميلك وهنبعتلك رابط إعادة التعيين."
      error={error}
      footer={
        <>
          تذكرت كلمة السر؟{' '}
          <Link to="/customer/login" className="font-bold text-brand-400 hover:text-brand-300">سجّل دخول</Link>
        </>
      }
    >
      {status ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm leading-6 text-green-300">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <span>{status.message}</span>
          </div>

          {status.devLink && (
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
              <div className="mb-2 text-xs font-bold text-brand-400">الرابط (وضع التطوير — مش موجود في الرابط إلا لما يتفعّل الإيميل):</div>
              <div className="flex items-center gap-2">
                <code dir="ltr" className="min-w-0 flex-1 truncate rounded-lg bg-ink-950 px-3 py-2 text-xs text-white/80">{status.devLink}</code>
                <button onClick={copy} className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/20" title="نسخ الرابط">
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  {copied ? 'تم' : 'نسخ'}
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-white/40">
                الرابط صالح لمدة 30 دقيقة. افتحه في نفس المتصفح علشان تكمل إعادة التعيين.
              </p>
            </div>
          )}

          <Link to="/customer/login" className="btn-primary w-full">الرجوع لتسجيل الدخول</Link>
        </div>
      ) : (
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
            <Send size={18} /> {busy ? 'جاري الإرسال...' : 'ابعت رابط إعادة التعيين'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

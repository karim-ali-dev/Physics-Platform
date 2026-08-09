import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, KeyRound, Loader2, Smartphone, LogOut, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, Field, TextInput, Alert } from '../../components/admin/ui';

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..5
}

const strengthLabels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية', 'قوية جداً'];
const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-lime-500', 'bg-emerald-500'];

export default function SecurityAdmin() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const [twofa, setTwofa] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [qrUrl, setQrUrl] = useState('');
  const [qrSecret, setQrSecret] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const score = passwordStrength(form.new_password);

  const loadStatus = useCallback(async () => {
    try {
      const d = await api('/api/auth/me');
      setTwofa(Boolean(d.user.twofa));
      setSessions(d.user.sessions || 0);
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const changePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg(null);
    if (form.new_password !== form.confirm_password) {
      setError('كلمتا السر غير متطابقتين');
      setBusy(false);
      return;
    }
    if (form.new_password.length < 8) {
      setError('كلمة السر الجديدة لازم تكون 8 أحرف على الأقل');
      setBusy(false);
      return;
    }
    try {
      const data = await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password })
      });
      setMsg(data.message);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const start2fa = async () => {
    setQrBusy(true);
    setError('');
    try {
      const d = await api('/api/auth/2fa/generate', { method: 'POST' });
      setQrSecret(d.base32);
      const url = await QRCode.toDataURL(d.otpauth_url, { margin: 1, width: 220 });
      setQrUrl(url);
    } catch (err) {
      setError(err.message || 'حصل خطأ في إنشاء الكود');
    } finally {
      setQrBusy(false);
    }
  };

  const confirm2fa = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ base32: qrSecret, otpauth_url: '', code: totpCode })
      });
      setQrUrl('');
      setQrSecret('');
      setTotpCode('');
      setTwofa(true);
      setMsg('تم تفعيل المصادقة الثنائية بنجاح');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'الكود غير صحيح');
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code: disableCode }) });
      setDisableCode('');
      setTwofa(false);
      setMsg('تم إيقاف المصادقة الثنائية');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'الكود غير صحيح');
    } finally {
      setBusy(false);
    }
  };

  const logoutAll = async () => {
    await api('/api/auth/logout-all', { method: 'POST' });
    window.location.href = `${ADMIN_PATH}/login`;
  };

  const tips = [
    'فعّل المصادقة الثنائية 2FA — أمان إضافي قوي ضد محاولات الدخول.',
    'استخدم كلمة سر قوية مختلفة عن أي موقع تاني.',
    'الحساب بيتقفل تلقائياً 15 دقيقة بعد 5 محاولات فاشلة.',
    'كل إجراء بتعمله بيُسجل في سجل التدقيق (راجع "لوحة التحكم").',
    'الملفات المرفوعة بتتفحص بالتوقيع الرقمي لمنع الملفات الضارة.',
    'الجلسة بتسجل من الجهاز المحدد وبتنتهي تلقائياً بعد 7 أيام.'
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الحماية وكلمة السر" subtitle="أمان حساب المدير" />

      <div className="card mb-6 flex items-start gap-4 border-neon-400/20 bg-neon-400/5 p-5">
        <ShieldCheck size={26} className="shrink-0 text-neon-400" />
        <div>
          <h3 className="font-extrabold">حماية موقعك</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-white/60">
            {tips.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      </div>

      {/* 2FA */}
      <div className="card mb-6 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          <Smartphone size={19} className="text-brand-400" /> المصادقة الثنائية (2FA)
        </h3>

        {twofa ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle2 size={22} className="text-emerald-400" />
              <div>
                <div className="font-extrabold text-emerald-300">المصادقة الثنائية مفعلة</div>
                <div className="text-sm text-white/55">كل تسجيل دخول هيطلب كود من تطبيق Authenticator.</div>
              </div>
            </div>
            <Field label="لإيقافها — اكتب الكود الحالي من التطبيق">
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextInput value={disableCode} onChange={(e) => setDisableCode(e.target.value)} inputMode="numeric" dir="ltr" placeholder="6 أرقام" className="sm:flex-1" />
                <button onClick={disable2fa} disabled={busy || disableCode.length < 6} className="shrink-0 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : 'إيقاف 2FA'}
                </button>
              </div>
            </Field>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm leading-7 text-white/60">
              المصادقة الثنائية بتضيف طبقة أمان إضافية: بعد كلمة السر، هتحتاج كود من تطبيق <strong>Google Authenticator</strong> أو <strong>Microsoft Authenticator</strong>.
            </p>
            {!qrUrl ? (
              <button onClick={start2fa} disabled={qrBusy} className="btn-primary disabled:opacity-60">
                {qrBusy ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
                تفعيل المصادقة الثنائية
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-white p-4 sm:flex-row">
                  <img src={qrUrl} alt="QR كود 2FA" className="h-40 w-40 rounded-lg" />
                  <div className="flex-1 space-y-2 text-center sm:text-right">
                    <p className="text-sm text-white/60">1️⃣ صوّر الكود بتطبيق Authenticator</p>
                    <p className="text-sm text-white/60">أو اكتب المفتاح يدوياً:</p>
                    <code dir="ltr" className="block break-all rounded-lg bg-ink-900 p-2 text-xs text-neon-300">{qrSecret}</code>
                    <p className="text-sm text-white/60">2️⃣ اكتب الكود اللي ظهر في التطبيق</p>
                  </div>
                </div>
                <Field label="كود التحقق">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <TextInput value={totpCode} onChange={(e) => setTotpCode(e.target.value)} inputMode="numeric" dir="ltr" placeholder="6 أرقام" className="sm:flex-1" />
                    <button onClick={confirm2fa} disabled={busy || totpCode.length < 6} className="btn-primary shrink-0 !py-3 text-sm disabled:opacity-50">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : 'تأكيد التفعيل'}
                    </button>
                  </div>
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="card mb-6 p-6">
        <h3 className="mb-5 flex items-center gap-2 text-lg font-extrabold">
          <KeyRound size={19} className="text-brand-400" /> تغيير كلمة السر
        </h3>

        {msg && <Alert type="ok">{msg}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={changePassword} className="space-y-5">
          <Field label="كلمة السر الحالية" required>
            <TextInput type="password" value={form.current_password} onChange={set('current_password')} required autoComplete="current-password" />
          </Field>
          <Field label="كلمة السر الجديدة" required hint="8 أحرف على الأقل + أرقام + رموز" >
            <TextInput type="password" value={form.new_password} onChange={set('new_password')} required autoComplete="new-password" />
            {form.new_password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? strengthColors[score] : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="mt-1 text-xs font-bold text-white/45">{strengthLabels[score]}</p>
              </div>
            )}
          </Field>
          <Field label="تأكيد كلمة السر الجديدة" required>
            <TextInput type="password" value={form.confirm_password} onChange={set('confirm_password')} required autoComplete="new-password" />
          </Field>
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {busy ? 'جاري التغيير...' : 'تغيير كلمة السر'}
          </button>
        </form>
      </div>

      {/* Sessions */}
      <div className="card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          <LogOut size={19} className="text-brand-400" /> الجلسات النشطة
        </h3>
        <p className="mb-4 text-sm text-white/60">
          عدد الأجهزة المسجل دخولك منها حالياً: <strong className="text-brand-300">{sessions}</strong>. لو شكيت في حد دخّل على حسابك، سجل خروج من كل الأجهزة فوراً.
        </p>
        <button onClick={logoutAll} className="w-full rounded-xl border border-red-500/30 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">
          تسجيل الخروج من كل الأجهزة
        </button>
      </div>
    </div>
  );
}

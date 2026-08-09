import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { api } from '../../api';
import { AuthShell } from './AuthShell';

export default function CustomerReset() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

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
      await api('/api/customer/reset', { method: 'POST', body: JSON.stringify({ token, password: form.password }) });
      setDone(true);
    } catch (err) {
      setError(err.message || 'حصل خطأ، جرب تاني');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        icon={<CheckCircle2 size={26} className="text-pure" />}
        title="تم بنجاح"
        subtitle="كلمة السر اتغيرت."
        footer={
          <Link to="/customer/login" className="font-bold text-brand-400 hover:text-brand-300">سجّل دخول بكلمة السر الجديدة</Link>
        }
      />
    );
  }

  if (!token) {
    return (
      <AuthShell
        icon={<ShieldCheck size={26} className="text-pure" />}
        title="الرابط غير صالح"
        subtitle="الرابط ده ناقص أو اتستخدم قبل كده."
        footer={
          <Link to="/customer/forgot" className="font-bold text-brand-400 hover:text-brand-300">اطلب رابط جديد</Link>
        }
      />
    );
  }

  return (
    <AuthShell
      icon={<Lock size={26} className="text-pure" />}
      title="إعادة تعيين كلمة السر"
      subtitle="اكتب كلمة سر جديدة لحسابك."
      error={error}
      footer={
        <>
          تذكرت كلمة السر؟{' '}
          <Link to="/customer/login" className="font-bold text-brand-400 hover:text-brand-300">سجّل دخول</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">كلمة السر الجديدة (8 أحرف على الأقل)</label>
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
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
          {busy ? 'جاري الحفظ...' : 'حفظ كلمة السر الجديدة'}
        </button>
      </form>
    </AuthShell>
  );
}

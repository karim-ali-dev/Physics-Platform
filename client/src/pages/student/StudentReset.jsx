import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, GraduationCap } from 'lucide-react';
import { api } from '../../api';
import { AuthShell } from '../customer/AuthShell';

export default function StudentReset() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (form.password !== form.confirm) {
      setError('كلمتا السر مش متطابقتين');
      return;
    }
    if (!token) {
      setError('الرابط غير صالح — ارجع لصفحة نسيت كلمة السر واطلب رابط جديد');
      return;
    }
    setBusy(true);
    try {
      const data = await api('/api/customer/reset', { method: 'POST', body: JSON.stringify({ token, password: form.password }) });
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
      icon={<GraduationCap size={26} className="text-pure" />}
      title="إعادة تعيين كلمة السر"
      subtitle="اكتب كلمة سر جديدة ليك."
      error={error}
      footer={
        <>
          <Link to="/student/login" className="font-bold text-brand-400 hover:text-brand-300">رجوع لتسجيل الدخول</Link>
        </>
      }
    >
      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm font-semibold text-green-300">
          <CheckCircle2 size={17} /> {message}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">كلمة السر الجديدة *</label>
          <div className="relative">
            <KeyRound size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="password"
              className="input pr-11"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
          <KeyRound size={18} /> {busy ? 'جاري الحفظ...' : 'احفظ كلمة السر الجديدة'}
        </button>
      </form>
    </AuthShell>
  );
}

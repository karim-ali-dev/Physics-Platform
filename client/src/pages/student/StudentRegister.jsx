import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, GraduationCap, Phone, UserRound, MapPin, School } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { AuthShell } from '../customer/AuthShell';

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الأسكندرية', 'الدقهلية', 'الشرقية', 'الغربية', 'المنوفية', 'القليوبية',
  'كفر الشيخ', 'دمياط', 'البحيرة', 'الإسماعيلية', 'بورسعيد', 'السويس', 'شمال سيناء', 'جنوب سيناء',
  'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد'
];

const ACADEMIC_YEARS = ['2025/2026', '2026/2027', '2027/2028'];

export default function StudentRegister() {
  const { customerRegister } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    phone: '', parent_phone: '', governorate: '', academic_year: ''
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('كلمتا السر مش متطابقتين');
      return;
    }
    setBusy(true);
    try {
      await customerRegister(form.name, form.email, form.password, {
        phone: form.phone,
        parent_phone: form.parent_phone,
        governorate: form.governorate,
        academic_year: form.academic_year
      });
      navigate('/student/account');
    } catch (err) {
      setError(err.message || 'خطأ في إنشاء الحساب');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon={<GraduationCap size={26} className="text-pure" />}
      title="أنشئ حسابك مجاناً"
      subtitle="حسابك بيتيح لك تسجيل الكورسات وتتبع تقدمك."
      error={error}
      footer={
        <>
          عندك حساب بالفعل؟{' '}
          <Link to="/student/login" className="font-bold text-brand-400 hover:text-brand-300">سجّل دخول</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">الاسم *</label>
          <div className="relative">
            <UserPlus size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              className="input pr-11"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={100}
              autoComplete="name"
              placeholder="اكتب اسمك الكامل"
            />
          </div>
        </div>
        <div>
          <label className="label">رقم موبايل الطالب</label>
          <div className="relative">
            <Phone size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="tel"
              dir="ltr"
              className="input pr-11 text-right"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={30}
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
            />
          </div>
        </div>
        <div>
          <label className="label">رقم موبايل ولي الأمر</label>
          <div className="relative">
            <UserRound size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="tel"
              dir="ltr"
              className="input pr-11 text-right"
              value={form.parent_phone}
              onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
              maxLength={30}
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">المحافظة</label>
            <div className="relative">
              <MapPin size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
              <select
                className="input pr-11"
                value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
              >
                <option value="">اختار المحافظة</option>
                {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">السنة الدراسية</label>
            <div className="relative">
              <School size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
              <select
                className="input pr-11"
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              >
                <option value="">اختار السنة</option>
                {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                <option value="أخرى">أخرى</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="label">البريد الإلكتروني *</label>
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
          <label className="label">كلمة السر *</label>
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
              placeholder="8 أحرف على الأقل"
            />
          </div>
        </div>
        <div>
          <label className="label">تأكيد كلمة السر *</label>
          <div className="relative">
            <Lock size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35" />
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
          <UserPlus size={18} /> {busy ? 'جاري إنشاء الحساب...' : 'أنشئ حسابي'}
        </button>
      </form>
    </AuthShell>
  );
}

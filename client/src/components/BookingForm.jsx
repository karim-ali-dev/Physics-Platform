import { useState } from 'react';
import {
  ClipboardList, UserRound, Phone, MapPin, School, GraduationCap, Send, Loader2, CheckCircle2
} from 'lucide-react';
import { api } from '../api';
import { GRADES } from '../config';

export const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الأسكندرية', 'الدقهلية', 'الشرقية', 'الغربية', 'المنوفية', 'القليوبية',
  'كفر الشيخ', 'دمياط', 'البحيرة', 'الإسماعيلية', 'بورسعيد', 'السويس', 'شمال سيناء', 'جنوب سيناء',
  'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد'
];

export const ACADEMIC_YEARS = ['2025/2026', '2026/2027', '2027/2028'];

const BOOKING_BLANK = {
  student_name: '', phone: '', parent_name: '', parent_phone: '',
  governorate: '', academic_year: '', grade: '', note: ''
};

export default function BookingForm({ compact = false, className = '' }) {
  const [form, setForm] = useState({ ...BOOKING_BLANK });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/bookings', { method: 'POST', body: JSON.stringify(form) });
      setDone(true);
      setForm({ ...BOOKING_BLANK });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="border-b border-white/10 bg-gradient-to-l from-brand-600/15 to-neon-400/10 p-6">
        <h2 className="flex items-center gap-2 text-xl font-black sm:text-2xl">
          <ClipboardList size={22} className="text-brand-400" /> عايز تحجز مكانك في السنتر؟
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          اكتب بياناتك وبيانات ولي الأمر، وهيتواصل معاك مستر أحمد على الرقم اللي هتكتبه لتأكيد الحجز والموعد.
        </p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </span>
          <h3 className="text-xl font-black">وصل طلب الحجز 🎉</h3>
          <p className="max-w-md text-sm leading-7 text-white/60">
            مستر أحمد هيشوف بياناتك وهيتواصل معاك في أقرب وقت لتأكيد الحجز. لو عايز تحجز لطالب تاني، اضغط تحت.
          </p>
          <button onClick={() => setDone(false)} className="btn-ghost !py-2.5 text-sm">
            حجز جديد
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="p-6">
          <div className={`grid gap-5 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
            <div>
              <label className="label flex items-center gap-1.5"><UserRound size={14} className="text-brand-400" /> اسم الطالب *</label>
              <input className="input" value={form.student_name} onChange={set('student_name')} required maxLength={100} placeholder="اسم الطالب بالكامل" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Phone size={14} className="text-brand-400" /> رقم موبايل الطالب</label>
              <input type="tel" dir="ltr" className="input text-right" value={form.phone} onChange={set('phone')} maxLength={30} placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><UserRound size={14} className="text-brand-400" /> اسم ولي الأمر</label>
              <input className="input" value={form.parent_name} onChange={set('parent_name')} maxLength={100} placeholder="اسم ولي الأمر" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Phone size={14} className="text-brand-400" /> رقم موبايل ولي الأمر</label>
              <input type="tel" dir="ltr" className="input text-right" value={form.parent_phone} onChange={set('parent_phone')} maxLength={30} placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><MapPin size={14} className="text-brand-400" /> المحافظة</label>
              <select className="input" value={form.governorate} onChange={set('governorate')}>
                <option value="">اختار المحافظة</option>
                {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><School size={14} className="text-brand-400" /> السنة الدراسية</label>
              <select className="input" value={form.academic_year} onChange={set('academic_year')}>
                <option value="">اختار السنة</option>
                {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5"><GraduationCap size={14} className="text-brand-400" /> الصف الدراسي</label>
              <select className="input" value={form.grade} onChange={set('grade')}>
                <option value="">اختار الصف</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">أي ملاحظات للمدرس؟</label>
              <textarea className="input min-h-[90px] resize-y" value={form.note} onChange={set('note')} maxLength={1000} placeholder="مثال: حابب الحصة تبقى يوم السبت بعد العصر" />
            </div>
          </div>

          {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !py-4 disabled:opacity-60">
            {busy ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
            {busy ? 'جاري إرسال طلب الحجز...' : 'أرسل طلب الحجز'}
          </button>
        </form>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, Field, TextInput, TextArea, Toggle, Alert, ImageUploader } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { GRADES } from '../../config';

const TERMS = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني', 'المراجعة النهائية'];
const ICONS = ['⚛️', '🔬', '⚡', '🌊', '💡', '⚙️', '🧲', '📐', '🚀', '🧪'];

const blank = {
  title: '',
  grade: GRADES[0],
  term: TERMS[0],
  description: '',
  icon: ICONS[0],
  cover: '',
  price: '',
  price_amount: '',
  featured: false,
  active: true,
  sort_order: 0
};

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ ...blank });
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api(`/api/admin/courses/${id}`)
      .then((d) => {
        const c = d.course;
        setForm({
          title: c.title, grade: c.grade, term: c.term, description: c.description || '',
          icon: c.icon || ICONS[0], cover: c.cover || '', price: c.price || '',
          price_amount: c.price_amount || '',
          featured: Boolean(c.featured), active: c.active !== 0, sort_order: c.sort_order || 0
        });
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 0, price_amount: Number(form.price_amount) || 0 };
      const path = isEdit ? `/api/admin/courses/${id}` : '/api/admin/courses';
      const method = isEdit ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(payload) });
      setMsg(isEdit ? 'تم تحديث الكورس' : 'تم إضافة الكورس');
      setTimeout(() => navigate(`${ADMIN_PATH}/courses`), 900);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="جاري تحميل الكورس..." />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={isEdit ? 'تعديل الكورس' : 'إضافة كورس جديد'} subtitle="بيانات الكورس بتظهر في صفحة الكورسات للطلاب" />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-5 p-6">
          <Field label="عنوان الكورس" required>
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} placeholder="مثال: فيزياء الصف الثالث الثانوي (الجزء الأول)" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="الصف الدراسي" required>
              <select className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="الفصل الدراسي" required>
              <select className="input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="الوصف" hint="وصف مختصر للكورس يظهر في صفحة التفاصيل">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={5000} />
          </Field>
        </div>

        <div className="card space-y-5 p-6">
          <Field label="الأيقونة">
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm({ ...form, icon: ic })}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-colors ${form.icon === ic ? 'bg-brand-600 shadow-glow' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </Field>
          <Field label="صورة الغلاف">
            <ImageUploader value={form.cover} onChange={(v) => setForm({ ...form, cover: v })} label="صورة الغلاف" />
          </Field>
          <Field label="السعر" hint="مثال: مجاني / 200 جنيه">
            <TextInput value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} maxLength={200} placeholder="مجاني" />
          </Field>
          <Field label="قيمة الاشتراك بالجنيه" hint="لو الكورس مدفوع اكتب السعر بالجنيه (مثال: 300) — لو فاضي الكورس يبقى مجاني ويتسجل فوراً">
            <TextInput type="number" min="0" step="0.01" value={form.price_amount} onChange={(e) => setForm({ ...form, price_amount: e.target.value })} placeholder="0 = مجاني" />
          </Field>
        </div>

        <div className="card space-y-5 p-6">
          <div className="flex flex-wrap gap-4">
            <Toggle checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} label="كورس مميز في الرئيسية" />
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="ظاهر للطلاب" />
          </div>
          <Field label="الترتيب">
            <TextInput type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={busy} className="btn-primary flex-1 !py-4 disabled:opacity-60">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {busy ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الكورس'}
          </button>
          <button type="button" onClick={() => navigate(`${ADMIN_PATH}/courses`)} className="btn-ghost">
            <ArrowRight size={18} /> إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

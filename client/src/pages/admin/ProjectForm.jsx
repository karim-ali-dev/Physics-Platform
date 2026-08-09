import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { Field, TextInput, TextArea, Toggle, ImageUploader, VideoUploader, Alert } from '../../components/admin/ui';

export default function ProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState(['مونتاج', 'إعلانات', 'ريلز', 'موشن جرافيك', 'يوتيوب']);
  const [form, setForm] = useState({
    title: '',
    category: 'مونتاج',
    description: '',
    cover: '',
    video_url: '',
    client_name: '',
    date: '',
    duration: '',
    tools: '',
    featured: false,
    active: true,
    sort_order: 0
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api('/api/admin/projects')
      .then((d) => {
        const p = d.projects.find((x) => String(x.id) === String(id));
        if (p && !cancelled) {
          setForm({
            title: p.title || '',
            category: p.category || 'مونتاج',
            description: p.description || '',
            cover: p.cover || '',
            video_url: p.video_url || '',
            client_name: p.client_name || '',
            date: p.date || '',
            duration: p.duration || '',
            tools: p.tools || '',
            featured: Boolean(p.featured),
            active: p.active !== 0,
            sort_order: p.sort_order || 0
          });
          const all = d.projects.map((x) => x.category);
          setCategories((prev) => Array.from(new Set([...prev, ...all])));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const path = isEdit ? `/api/admin/projects/${id}` : '/api/admin/projects';
      const method = isEdit ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(form) });
      setSaved(true);
      setTimeout(() => navigate('/admin/projects'), 1200);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const addCategory = (name) => {
    const c = String(name || '').trim();
    if (!c) return;
    setCategories((prev) => (prev.includes(c) ? prev : [...prev, c]));
    setForm((f) => ({ ...f, category: c }));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/admin/projects" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white">
          <ArrowRight size={18} />
        </Link>
        <h2 className="text-2xl font-black">{isEdit ? 'تعديل المشروع' : 'إضافة مشروع جديد'}</h2>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {saved && <Alert type="ok">تم الحفظ بنجاح! جاري التحويل...</Alert>}

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-5 p-6">
          <Field label="عنوان المشروع" required>
            <TextInput value={form.title} onChange={set('title')} required maxLength={200} placeholder="مثال: إعلان ماركة ملابس — حملة رمضان" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="التصنيف">
              <div className="flex gap-2">
                <select className="input flex-1" value={form.category} onChange={set('category')}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt('اسم التصنيف الجديد:');
                    addCategory(name);
                  }}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/60 hover:text-white"
                  title="تصنيف جديد"
                >
                  +
                </button>
              </div>
            </Field>
            <Field label="مدة الفيديو">
              <TextInput value={form.duration} onChange={set('duration')} maxLength={50} placeholder="مثال: 45 ثانية" />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="اسم العميل">
              <TextInput value={form.client_name} onChange={set('client_name')} maxLength={200} placeholder="اسم العميل أو الماركة" />
            </Field>
            <Field label="تاريخ التنفيذ">
              <TextInput value={form.date} onChange={set('date')} maxLength={50} placeholder="مثال: 2026" />
            </Field>
          </div>

          <Field label="وصف المشروع">
            <TextArea value={form.description} onChange={set('description')} maxLength={5000} placeholder="وصف قصير للمشروع والفكرة" />
          </Field>

          <Field label="أدوات البرمج المستخدمة">
            <TextInput value={form.tools} onChange={set('tools')} maxLength={500} placeholder="مثال: Premiere Pro, After Effects, DaVinci" />
          </Field>
        </div>

        <div className="card space-y-5 p-6">
          <Field label="صورة الغلاف" required hint="أفضل مقاس: 16:9 (يُفضل ما لا يقل عن 1280×720)">
            <ImageUploader value={form.cover} onChange={(v) => setForm((f) => ({ ...f, cover: v }))} label="الغلاف" />
          </Field>
          <Field label="رابط الفيديو (يوتيوب / فيميو / رابط مباشر)" hint="لو مش حاطط فيديو، الكارتينت شغال بضغطة على الغلاف">
            <TextInput value={form.video_url} onChange={set('video_url')} dir="ltr" maxLength={500} placeholder="https://youtube.com/..." />
          </Field>
          <Field label="رفع فيديو من جهازك" hint="فيديو جاهز على جهازك (أقصى 250 ميجا)">
            <VideoUploader value={form.video_url} onChange={(v) => setForm((f) => ({ ...f, video_url: v }))} />
          </Field>
        </div>

        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap gap-4">
            <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="ظاهر على الموقع" />
            <Toggle checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} label="مميز في الرئيسية" />
          </div>
          <Field label="ترتيب العرض" hint="الأصغر يظهر الأول">
            <TextInput type="number" value={form.sort_order} onChange={set('sort_order')} />
          </Field>
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full !py-4 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {busy ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المشروع'}
        </button>
      </form>
    </div>
  );
}

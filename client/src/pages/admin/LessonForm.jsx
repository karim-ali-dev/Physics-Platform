import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, Field, TextInput, TextArea, Toggle, Alert, VideoUploader } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

const blank = {
  course_id: '',
  title: '',
  video_url: '',
  duration: '',
  summary: '',
  sort_order: 0,
  active: true
};

export default function LessonForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ ...blank });
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/courses')
      .then((d) => setCourses(d.courses))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api(`/api/admin/lessons/${id}`)
      .then((d) => {
        const l = d.lesson;
        setForm({
          course_id: l.course_id, title: l.title, video_url: l.video_url || '',
          duration: l.duration || '', summary: l.summary || '',
          sort_order: l.sort_order || 0, active: l.active !== 0
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
      const payload = {
        ...form,
        course_id: Number(form.course_id),
        sort_order: Number(form.sort_order) || 0
      };
      const path = isEdit ? `/api/admin/lessons/${id}` : '/api/admin/lessons';
      const method = isEdit ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(payload) });
      setMsg(isEdit ? 'تم تحديث الدرس' : 'تم إضافة الدرس');
      setTimeout(() => navigate(`${ADMIN_PATH}/lessons`), 900);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="جاري تحميل الدرس..." />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={isEdit ? 'تعديل الدرس' : 'إضافة درس جديد'} subtitle="فيديو الشرح وبعض التفاصيل الخاصة بالدرس" />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={submit} className="space-y-6">
        <div className="card space-y-5 p-6">
          <Field label="الكورس" required>
            <select
              className="input"
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              required
            >
              <option value="">اختر الكورس...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="عنوان الدرس" required>
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} placeholder="مثال: قوانين نيوتن للحركة" />
          </Field>
          <Field label="مدة الدرس" hint="مثال: 45 دقيقة">
            <TextInput value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} maxLength={50} placeholder="45 دقيقة" />
          </Field>
        </div>

        <div className="card space-y-5 p-6">
          <Field label="رابط الفيديو" hint="رابط يوتيوب / فيميو / رابط مباشر mp4">
            <TextInput
              dir="ltr"
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              maxLength={500}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </Field>
          <Field label="أو ارفع فيديو">
            <VideoUploader value={form.video_url} onChange={(v) => setForm({ ...form, video_url: v })} />
          </Field>
        </div>

        <div className="card space-y-5 p-6">
          <Field label="ملخص الدرس">
            <TextArea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} maxLength={5000} placeholder="نقاط مهمة أو خلاصة للدرس..." />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="ظاهر للطلاب" />
          </div>
          <Field label="الترتيب داخل الكورس">
            <TextInput type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={busy} className="btn-primary flex-1 !py-4 disabled:opacity-60">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {busy ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الدرس'}
          </button>
          <button type="button" onClick={() => navigate(`${ADMIN_PATH}/lessons`)} className="btn-ghost">
            <ArrowRight size={18} /> إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

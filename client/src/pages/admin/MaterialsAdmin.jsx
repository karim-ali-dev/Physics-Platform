import { useEffect, useState } from 'react';
import { Plus, Pencil, Loader2, FileText } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, Field, TextInput, TextArea, Toggle, ConfirmDelete, Empty, Alert, Select, FileUploader } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

const blank = { title: '', description: '', grade: 'الكل', course_id: 0, file_url: '', file_name: '', file_size: 0, is_optional: false, active: true, sort_order: 0 };

export default function MaterialsAdmin() {
  const [items, setItems] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/api/admin/materials')
      .then((d) => { setItems(d.materials); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api('/api/admin/materials/grades')
      .then((d) => setGrades(d.grades || []))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        grade: form.grade,
        course_id: form.course_id || 0,
        file_url: form.file_url,
        file_name: form.file_name,
        file_size: form.file_size || 0,
        is_optional: form.is_optional,
        active: form.active,
        sort_order: Number(form.sort_order) || 0
      };
      const path = editing ? `/api/admin/materials/${editing.id}` : '/api/admin/materials';
      const method = editing ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(payload) });
      setMsg(editing ? 'تم تحديث الملف' : 'تمت إضافة الملف');
      setForm({ ...blank });
      setEditing(null);
      load();
      api('/api/admin/materials/grades').then((d) => setGrades(d.grades || [])).catch(() => {});
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    await api(`/api/admin/materials/${id}`, { method: 'DELETE' });
    load();
  };

  const gradeOptions = [
    { value: 'الكل', label: 'الكل (كل الصفوف)' },
    ...grades.map((g) => ({ value: g, label: g }))
  ];

  return (
    <div>
      <PageHeader title="ملفات المذاكرة" subtitle="ارفع ملفات PDF (مذكرات / مراجعات) لكل صف — الطلاب هيشوفوها في حسابهم" />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="card mb-8 p-6">
        <h3 className="mb-5 text-lg font-extrabold">{editing ? 'تعديل الملف' : 'إضافة ملف جديد'}</h3>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="عنوان الملف" required hint="مثال: مذكرة الوحدة الأولى — الصف الأول الثانوي">
              <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
            </Field>
            <Field label="الصف" required hint="هيتشاف لطلاب الصف ده بس، أو كل الطلاب">
              <Select options={gradeOptions} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            </Field>
          </div>
          <Field label="وصف قصير">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} />
          </Field>
          <Field label="الملف" required hint="اضغط لرفع ملف PDF من جهازك">
            <FileUploader
              value={form.file_url}
              fileName={form.file_name}
              fileSize={form.file_size}
              onChange={(url) => setForm({ ...form, file_url: url })}
              onFileName={(name) => setForm({ ...form, file_name: name })}
              onFileSize={(size) => setForm({ ...form, file_size: size })}
            />
            {form.file_url && (
              <p className="mt-2 text-xs font-semibold text-emerald-300">
                ✓ اتخزّن الملف على السيرفر — لسه اضغط زر <span className="font-black">(إضافة الملف)</span> تحت علشان يظهر للطلاب
              </p>
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="الترتيب">
              <TextInput type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="ظاهر للطلاب" />
            <Toggle checked={form.is_optional} onChange={(v) => setForm({ ...form, is_optional: v })} label="ملف اختياري (مش مطلوب)" />
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ ...blank }); }} className="btn-ghost">إلغاء</button>}
          </div>
          <button type="submit" disabled={busy || !form.file_url} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            {busy ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الملف'}
          </button>
        </form>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty text="مفيش ملفات مذاكرة لحد دلوقتي — ابدأ برفع أول ملف." />
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className={`card p-5 ${m.active ? '' : 'opacity-50'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
                    <FileText size={20} className="text-red-400" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold">{m.title}</span>
                      <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-300">{m.grade}</span>
                      {m.is_optional ? (
                        <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">اختياري</span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">مطلوب</span>
                      )}
                      {!m.active && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/50">مخفي</span>}
                    </div>
                    <div className="mt-1 truncate text-xs text-white/45" dir="ltr">{m.file_name || m.file_url}</div>
                    <div className="mt-1 text-xs text-white/45">
                      {m.course_title ? `${m.course_title} • ` : ''}{m.file_size > 0 ? `${(m.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => { setEditing(m); setForm({ title: m.title, description: m.description, grade: m.grade, course_id: m.course_id, file_url: m.file_url, file_name: m.file_name, file_size: m.file_size, is_optional: m.is_optional !== 0, active: m.active !== 0, sort_order: m.sort_order }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                    <Pencil size={13} /> تعديل
                  </button>
                  <ConfirmDelete onConfirm={() => del(m.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Plus, Pencil, Loader2, Check, X, Inbox } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, Field, TextInput, TextArea, Toggle, ConfirmDelete, Empty, Alert, Select, ImageUploader } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

const blank = { client_name: '', client_role: '', content: '', rating: 5, active: true, image_url: '', status: 'approved' };

const STATUS_META = {
  pending: { label: 'قيد المراجعة', cls: 'bg-amber-400/15 text-amber-300' },
  approved: { label: 'مقبول', cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { label: 'مرفوض', cls: 'bg-red-500/15 text-red-300' }
};

const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' }
];

export default function TestimonialsAdmin() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    api('/api/admin/testimonials' + q)
      .then((d) => { setItems(d.testimonials); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const path = editing ? `/api/admin/testimonials/${editing.id}` : '/api/admin/testimonials';
      const method = editing ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(form) });
      setMsg(editing ? 'تم التحديث' : 'تمت الإضافة');
      setForm({ ...blank });
      setEditing(null);
      load();
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (t, status) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/testimonials/${t.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setMsg(status === 'approved' ? `تمت الموافقة على رأي ${t.client_name}` : `تم رفض رأي ${t.client_name}`);
      load();
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    await api(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    load();
  };

  const startEdit = (t) => {
    setEditing(t);
    setForm({
      client_name: t.client_name,
      client_role: t.client_role,
      content: t.content,
      rating: t.rating,
      active: t.active !== 0,
      image_url: t.image_url || '',
      status: t.status || 'approved'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <PageHeader title="آراء الطلاب" subtitle="تقييمات الطلاب بتوصل هنا — وافق عليها عشان تظهر في الرئيسية" />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
              filter === f.value ? 'bg-brand-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="mr-1 rounded-full bg-white/10 px-1.5 text-[11px]">
                {items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card mb-8 p-6">
        <h3 className="mb-5 text-lg font-extrabold">{editing ? 'تعديل الرأي' : 'إضافة رأي جديد'}</h3>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="اسم الطالب" required>
              <TextInput value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required maxLength={200} />
            </Field>
            <Field label="صفة الطالب">
              <TextInput value={form.client_role} onChange={(e) => setForm({ ...form, client_role: e.target.value })} maxLength={200} placeholder="طالب / ولي أمر..." />
            </Field>
            <Field label="التقييم (1-5)">
              <TextInput type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
            </Field>
          </div>
          <Field label="الرأي" required>
            <TextArea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="الحالة">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={[
                  { value: 'approved', label: 'مقبول — ظاهر في الرئيسية' },
                  { value: 'pending', label: 'قيد المراجعة' },
                  { value: 'rejected', label: 'مرفوض' }
                ]}
              />
            </Field>
            <Field label="صورة (اختياري)">
              <ImageUploader value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} label="صورة الرأي" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="ظاهر على الموقع" />
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ ...blank }); }} className="btn-ghost">إلغاء</button>}
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            {busy ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الرأي'}
          </button>
        </form>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty text={filter === 'pending' ? 'مفيش تقييمات بانتظار الموافقة — تمام! 🎉' : 'مفيش آراء هنا.'} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <div key={t.id} className={`card p-5 ${t.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400 font-black">
                    {t.client_name?.charAt(0) || 'ك'}
                  </span>
                  <div>
                    <div className="font-extrabold">{t.client_name}</div>
                    <div className="text-xs text-white/45">{t.client_role}</div>
                    {t.source === 'student' && t.student_email && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-brand-300" dir="ltr">
                        <Inbox size={11} /> {t.student_email}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="text-amber-400">{"★".repeat(t.rating)}<span className="text-white/20">{"★".repeat(5 - t.rating)}</span></div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_META[t.status]?.cls || 'bg-white/10 text-white/60'}`}>
                    {STATUS_META[t.status]?.label || t.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.source === 'student' ? 'bg-brand-500/15 text-brand-300' : 'bg-white/10 text-white/50'}`}>
                    {t.source === 'student' ? 'من طالب' : 'إضافة يدوية'}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/65">"{t.content}"</p>
              {t.image_url && <img src={t.image_url} alt="" className="mt-3 h-28 w-full rounded-xl object-cover" />}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <span className={`text-xs font-bold ${t.active ? 'text-emerald-300' : 'text-white/40'}`}>
                  {t.status === 'approved' ? 'ظاهر في الرئيسية' : t.status === 'rejected' ? 'غير ظاهر (مرفوض)' : 'بإنتظار الموافقة'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {t.status === 'pending' && (
                    <>
                      <button onClick={() => setStatus(t, 'approved')} className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25">
                        <Check size={13} /> موافقة
                      </button>
                      <button onClick={() => setStatus(t, 'rejected')} className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/25">
                        <X size={13} /> رفض
                      </button>
                    </>
                  )}
                  <button onClick={() => startEdit(t)} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                    <Pencil size={13} /> تعديل
                  </button>
                  <ConfirmDelete onConfirm={() => del(t.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

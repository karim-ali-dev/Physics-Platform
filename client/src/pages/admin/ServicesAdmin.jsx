import { useEffect, useState } from 'react';
import { Plus, Pencil, X, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, Field, TextInput, TextArea, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

const blank = { title: '', description: '', icon: '🎬', price: '', features: [], sort_order: 0 };

export default function ServicesAdmin() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [featureInput, setFeatureInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/api/admin/services')
      .then((d) => { setServices(d.services); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const startEdit = (s) => {
    let features = [];
    try { features = JSON.parse(s.features || '[]'); } catch (_) { features = []; }
    setForm({ ...s, features });
    setFeatureInput('');
    setEditing(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setForm({ ...blank });
    setFeatureInput('');
    setEditing(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const path = editing ? `/api/admin/services/${editing.id}` : '/api/admin/services';
      const method = editing ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(form) });
      setMsg(editing ? 'تم تحديث الخدمة' : 'تم إضافة الخدمة');
      reset();
      load();
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    await api(`/api/admin/services/${id}`, { method: 'DELETE' });
    load();
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return;
    setForm((prev) => ({ ...prev, features: [...prev.features, f] }));
    setFeatureInput('');
  };

  return (
    <div>
      <PageHeader title="الخدمات" subtitle="الخدمات اللي بتظهر في صفحة خدماتي" />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="card mb-8 p-6">
        <h3 className="mb-5 text-lg font-extrabold">{editing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</h3>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="العنوان" required>
              <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
            </Field>
            <Field label="الأيقونة (إيموجي)">
              <TextInput value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={20} />
            </Field>
            <Field label="السعر">
              <TextInput value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} maxLength={200} placeholder="يبدأ من 500 ج.م" />
            </Field>
          </div>
          <Field label="الوصف">
            <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="المميزات (Feature)" hint="اكتب مميزة واضغط Enter">
            <div className="flex gap-2">
              <TextInput value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} />
              <button type="button" onClick={addFeature} className="btn-ghost shrink-0 !py-2.5 text-sm">إضافة</button>
            </div>
            {form.features.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-300">
                    {f}
                    <button type="button" onClick={() => setForm({ ...form, features: form.features.filter((_, j) => j !== i) })} aria-label="حذف">
                      <X size={13} className="hover:text-red-400" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
          <div className="flex items-center gap-3">
            <Field label="ترتيب">
              <TextInput type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
            {editing && (
              <button type="button" onClick={reset} className="btn-ghost mt-5">إلغاء</button>
            )}
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            {busy ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الخدمة'}
          </button>
        </form>
      </div>

      {loading ? (
        <Spinner />
      ) : services.length === 0 ? (
        <Empty text="مفيش خدمات. أضف أول خدمة." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-right">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="p-4">الخدمة</th>
                <th className="p-4">السعر</th>
                <th className="p-4">الترتيب</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[.03]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.icon}</span>
                      <div>
                        <div className="font-bold">{s.title}</div>
                        <div className="line-clamp-1 text-xs text-white/40">{s.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-brand-300">{s.price}</td>
                  <td className="p-4 text-sm text-white/50">{s.sort_order}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(s)} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                        <Pencil size={13} /> تعديل
                      </button>
                      <ConfirmDelete onConfirm={() => del(s.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

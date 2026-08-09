import { useEffect, useState } from 'react';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, Field, TextInput, TextArea, Toggle, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

const blank = { question: '', answer: '', sort_order: 0, active: true };

export default function FaqsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/api/admin/faqs')
      .then((d) => { setItems(d.faqs); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const path = editing ? `/api/admin/faqs/${editing.id}` : '/api/admin/faqs';
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

  const del = async (id) => {
    await api(`/api/admin/faqs/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="الأسئلة الشائعة" subtitle="أسئلة وأجوبة صفحة FAQ" />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="card mb-8 p-6">
        <h3 className="mb-5 text-lg font-extrabold">{editing ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="السؤال" required>
              <TextInput value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required maxLength={300} />
            </Field>
            <Field label="الترتيب">
              <TextInput type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
          </div>
          <Field label="الإجابة" required>
            <TextArea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
          </Field>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="ظاهر على الموقع" />
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ ...blank }); }} className="btn-ghost">إلغاء</button>}
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            {busy ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة السؤال'}
          </button>
        </form>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty text="مفيش أسئلة لحد دلوقتي." />
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className={`card p-5 ${f.active ? '' : 'opacity-50'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{f.active ? '📌' : '🔒'}</span>
                  <div>
                    <div className="font-extrabold">{f.question}</div>
                    <div className="mt-1 text-sm leading-6 text-white/55">{f.answer}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => { setEditing(f); setForm({ question: f.question, answer: f.answer, sort_order: f.sort_order, active: f.active !== 0 }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                    <Pencil size={13} /> تعديل
                  </button>
                  <ConfirmDelete onConfirm={() => del(f.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

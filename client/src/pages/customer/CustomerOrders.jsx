import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package, Plus, X, Send, Loader2, Trash2, FileVideo, Paperclip,
  CheckCircle2, AlertCircle, Info
} from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../store/AppContext';
import { fmtDateTime } from '../../utils/time';

const STATUS = {
  pending: { label: 'في الانتظار', cls: 'border-amber-500/30 bg-amber-500/15 text-amber-300' },
  accepted: { label: 'مقبول', cls: 'border-blue-500/30 bg-blue-500/15 text-blue-400' },
  working: { label: 'قيد التنفيذ', cls: 'border-brand-500/30 bg-brand-500/15 text-brand-400' },
  done: { label: 'تم التسليم', cls: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' },
  cancelled: { label: 'ملغي', cls: 'border-red-500/30 bg-red-500/15 text-red-400' }
};

export default function CustomerOrders() {
  const { customer } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', service: '', budget: '', deadline: '', details: '' });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api('/api/customer/orders')
      .then((d) => { setOrders(d.orders); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!customer) navigate('/customer/login', { replace: true });
  }, [customer, navigate]);

  useEffect(() => {
    if (customer) load();
    api('/api/services').then((d) => setServices(d.services)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const uploadFiles = async (list) => {
    setUploading(true);
    try {
      for (const file of list) {
        const kind = String(file.type || '').startsWith('video/') ? 'video' : 'image';
        const fd = new FormData();
        fd.append('kind', kind);
        fd.append('file', file);
        const data = await api('/api/customer/upload', { method: 'POST', body: fd });
        setFiles((prev) => [...prev, { url: data.url, name: file.name, kind }]);
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'فشل رفع ملف' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      await api('/api/customer/orders', {
        method: 'POST',
        body: JSON.stringify({ ...form, files: files.map((f) => f.url) })
      });
      setStatus({ type: 'ok', text: 'اتسجل طلبك بنجاح — هوصلك رد في أقرب وقت.' });
      setForm({ name: '', service: '', budget: '', deadline: '', details: '' });
      setFiles([]);
      setShowForm(false);
      load();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (id) => {
    try {
      await api(`/api/customer/orders/${id}/cancel`, { method: 'PATCH' });
      load();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  if (!customer) return null;

  return (
    <div className="container-x pt-28 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">طلباتي</h1>
          <p className="mt-1 text-sm text-white/50">سجّل طلب مونتاج جديد وتابع حالة طلباتك هنا.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setStatus(null); }} className="btn-primary">
          <Plus size={18} /> {showForm ? 'إغلاق النموذج' : 'طلب مونتاج جديد'}
        </button>
      </div>

      {status && (
        <div className={`mt-6 flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
          status.type === 'ok' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>
          {status.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="card mt-6 space-y-5 p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">اسم المشروع *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={200}
                placeholder="مثال: ريلز ترويجي للحملة الجديدة"
              />
            </div>
            <div>
              <label className="label">الخدمة المطلوبة *</label>
              <select className="input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required>
                <option value="">اختار الخدمة</option>
                {services.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">الميزانية التقريبية</label>
              <input
                className="input"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                maxLength={200}
                placeholder="مثال: من 500 لـ 800 جنيه"
              />
            </div>
            <div>
              <label className="label">الموعد المطلوب</label>
              <input
                className="input"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                maxLength={200}
                placeholder="مثال: قبل الجمعة القادمة"
              />
            </div>
          </div>

          <div>
            <label className="label">تفاصيل المشروع *</label>
            <textarea
              className="input min-h-[140px] resize-y"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              required
              maxLength={5000}
              placeholder="احكيلي عن المشروع: الفكرة، المدة المتوقعة، الأسلوب المطلوب، أي تعليمات خاصة..."
            />
          </div>

          <div>
            <label className="label">ملفات (لقطات / صور / سكريبت)</label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-ink-900 py-8 text-white/50 transition-colors hover:border-brand-500/50 hover:text-brand-400">
              {uploading ? <Loader2 size={24} className="animate-spin" /> : <Paperclip size={24} />}
              <span className="text-sm font-bold">{uploading ? 'جاري الرفع...' : 'اضغط لاختيار الملفات (صورة أو فيديو)'}</span>
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && uploadFiles([...e.target.files])} />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li key={f.url} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900 px-4 py-2.5">
                    {f.kind === 'video' ? <FileVideo size={18} className="shrink-0 text-brand-400" /> : (
                      <img src={f.url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-white/75">{f.name}</span>
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300" title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" disabled={busy || uploading} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
            <Send size={18} /> {busy ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </form>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-black">الطلبات السابقة</h2>
        {loading ? (
          <div className="py-16 text-center text-white/45">جاري التحميل...</div>
        ) : orders.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-12 text-center">
            <Package size={40} className="text-white/25" />
            <p className="text-white/50">مفيش طلبات لسه — اضغط "طلب مونتاج جديد" علشان تبدأ.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const st = STATUS[o.status] || STATUS.pending;
              return (
                <div key={o.id} className="card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                        <Package size={20} />
                      </span>
                      <div>
                        <div className="font-extrabold">{o.name}</div>
                        <div className="text-xs text-white/45">{o.service}</div>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap rounded-xl bg-ink-900 p-4 text-sm leading-7 text-white/75">{o.details}</p>

                  {(o.budget || o.deadline) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/55">
                      {o.budget && <span>الميزانية: <strong>{o.budget}</strong></span>}
                      {o.deadline && <span>الموعد: <strong>{o.deadline}</strong></span>}
                    </div>
                  )}

                  {o.files && o.files.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {o.files.map((f) => (
                        <a
                          key={f}
                          href={f}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-bold text-brand-400 hover:bg-white/5"
                        >
                          فتح ملف مرفق
                        </a>
                      ))}
                    </div>
                  )}

                  {o.admin_note && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-500/25 bg-brand-500/10 p-4 text-sm leading-6 text-white/80">
                      <Info size={17} className="mt-0.5 shrink-0 text-brand-400" />
                      <span><strong className="text-brand-300">رسالة من كريم:</strong> {o.admin_note}</span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-white/40">
                    <span>{fmtDateTime(o.created_at)}</span>
                    {o.status === 'pending' && (
                      <button onClick={() => cancelOrder(o.id)} className="rounded-lg border border-red-500/30 px-3 py-1.5 font-bold text-red-300 hover:bg-red-500/10">
                        إلغاء الطلب
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

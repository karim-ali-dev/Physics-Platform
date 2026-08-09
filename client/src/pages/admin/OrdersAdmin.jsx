import { useEffect, useState } from 'react';
import { Package, User, Mail, Check, Info, Paperclip } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty, Select, TextArea } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'في الانتظار' },
  { value: 'accepted', label: 'مقبول' },
  { value: 'working', label: 'قيد التنفيذ' },
  { value: 'done', label: 'تم التسليم' },
  { value: 'cancelled', label: 'ملغي' }
];

const STATUS_CLS = {
  pending: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  accepted: 'border-blue-500/30 bg-blue-500/15 text-blue-400',
  working: 'border-brand-500/30 bg-brand-500/15 text-brand-400',
  done: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  cancelled: 'border-red-500/30 bg-red-500/15 text-red-400'
};

export default function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [note, setNote] = useState('');

  const load = () => {
    api('/api/admin/orders')
      .then((d) => { setOrders(d.orders); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const updateStatus = async (id, status) => {
    await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  };

  const saveNote = async (id) => {
    await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: undefined, admin_note: note }) });
    setEditing(null);
    setNote('');
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/orders/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="طلبات العملاء" subtitle={`${orders.length} طلب`} />

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Empty text="مفيش طلبات وصلت لسه." />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const st = STATUS_CLS[o.status] || STATUS_CLS.pending;
            return (
              <div key={o.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                      <Package size={20} />
                    </span>
                    <div>
                      <div className="font-extrabold">{o.name}</div>
                      <div className="text-xs text-white/45">{o.service} — <span dir="ltr">{o.customer_email}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      options={STATUS_OPTIONS}
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    />
                    <ConfirmDelete onConfirm={() => del(o.id)} title="حذف الطلب" />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
                  <span className="flex items-center gap-1.5"><User size={14} className="text-brand-400" />{o.customer_name}</span>
                  <span className="flex items-center gap-1.5"><Mail size={14} className="text-brand-400" /><span dir="ltr">{o.customer_email}</span></span>
                  {o.budget && <span>الميزانية: <strong className="text-white/70">{o.budget}</strong></span>}
                  {o.deadline && <span>الموعد: <strong className="text-white/70">{o.deadline}</strong></span>}
                </div>

                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-ink-900 p-4 text-sm leading-7 text-white/75">{o.details}</p>

                {o.files && o.files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.files.map((f) => (
                      <a
                        key={f}
                        href={f}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-bold text-brand-400 hover:bg-white/5"
                      >
                        <Paperclip size={13} /> ملف مرفق
                      </a>
                    ))}
                  </div>
                )}

                {editing === o.id ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-brand-500/25 bg-brand-500/10 p-4">
                    <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب رسالتك للعميل هنا..." />
                    <div className="flex gap-2">
                      <button onClick={() => saveNote(o.id)} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-pure hover:bg-brand-500">
                        <Check size={14} /> حفظ الرسالة
                      </button>
                      <button onClick={() => setEditing(null)} className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/20">إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditing(o.id); setNote(o.admin_note || ''); }}
                    className="mt-4 flex items-center gap-1.5 rounded-lg border border-brand-500/30 px-3 py-1.5 text-xs font-bold text-brand-400 hover:bg-brand-500/10"
                  >
                    <Info size={13} /> {o.admin_note ? 'تعديل رسالتك للعميل' : 'إضافة رسالة للعميل'}
                  </button>
                )}

                {o.admin_note && (
                  <div className="mt-3 rounded-xl bg-ink-900 p-4 text-sm leading-6 text-white/80">
                    <strong className="text-brand-300">رسالتك للعميل:</strong> {o.admin_note}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-white/40">
                  <span className={`rounded-full border px-3 py-1 font-bold ${st}`}>{STATUS_OPTIONS.find((s) => s.value === o.status)?.label}</span>
                  <span>{fmtDateTime(o.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

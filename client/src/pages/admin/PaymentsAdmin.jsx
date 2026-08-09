import { useEffect, useState } from 'react';
import { Check, X, Loader2, Wallet } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const filters = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'تحت المراجعة' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'rejected', label: 'مرفوض' }
];

const statusBadge = {
  pending: 'bg-amber-400/15 text-amber-300',
  paid: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300'
};

const statusLabel = {
  pending: 'تحت المراجعة',
  paid: 'مدفوع',
  rejected: 'مرفوض'
};

export default function PaymentsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState(null);

  const load = () => {
    api(`/api/admin/payments${filter === 'all' ? '' : `?status=${filter}`}`)
      .then((d) => { setItems(d.payments); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const setStatus = async (id, status, noteText = '') => {
    setBusyId(id);
    await api(`/api/admin/payments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, note: noteText }) });
    setBusyId(null);
    setRejectId(null);
    setNote('');
    setMsg(status === 'paid' ? 'تم تأكيد الدفع وتفعيل الكورس' : 'تم رفض الدفعة');
    setTimeout(() => setMsg(null), 3000);
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/payments/${id}`, { method: 'DELETE' });
    setMsg('تم حذف الدفعة');
    setTimeout(() => setMsg(null), 2500);
    load();
  };

  const totalPending = items.filter((p) => p.status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="مدفوعات الكورسات (Vodafone Cash)"
        subtitle={totalPending > 0 ? `${totalPending} دفعة مستنية مراجعتك` : 'طلبات اشتراك الكورسات المدفوعة من الطلاب'}
      />

      {msg && <Alert type="ok">{msg}</Alert>}

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${filter === f.value ? 'bg-brand-600 text-pure shadow-glow' : 'border border-white/15 text-white/60 hover:border-brand-400 hover:text-brand-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty text="مفيش مدفوعات لحد دلوقتي." />
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-lg bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-300">
                      <Wallet size={13} /> {p.course_icon} {p.course_title}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadge[p.status]}`}>
                      {statusLabel[p.status]}
                    </span>
                    <span className="text-xs text-white/40" dir="ltr">{fmtDateTime(p.created_at)}</span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-white/40">الطالب: </span>
                      <span className="font-semibold">{p.student_name}</span>
                      <span className="block text-xs text-white/40" dir="ltr">{p.student_email}</span>
                    </div>
                    <div>
                      <span className="text-xs text-white/40">المبلغ: </span>
                      <span className="font-black text-neon-300">{p.amount} ج.م</span>
                    </div>
                    {p.reference && (
                      <div>
                        <span className="text-xs text-white/40">رقم العملية: </span>
                        <span className="font-semibold" dir="ltr">{p.reference}</span>
                      </div>
                    )}
                    {p.payer_phone && (
                      <div>
                        <span className="text-xs text-white/40">رقم الحوالة: </span>
                        <span className="font-semibold" dir="ltr">{p.payer_phone}</span>
                      </div>
                    )}
                    {p.admin_note && (
                      <div className="sm:col-span-2">
                        <span className="text-xs text-white/40">ملاحظة: </span>
                        <span className="text-white/60">{p.admin_note}</span>
                      </div>
                    )}
                    {p.paid_at && (
                      <div>
                        <span className="text-xs text-white/40">اتأكد في: </span>
                        <span className="text-xs text-white/60" dir="ltr">{fmtDateTime(p.paid_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {p.status === 'pending' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setStatus(p.id, 'paid')}
                        disabled={busyId === p.id}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-pure hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        تأكيد الدفع وتفعيل الكورس
                      </button>
                      <button
                        onClick={() => { setRejectId(rejectId === p.id ? null : p.id); setNote(''); }}
                        className="flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
                      >
                        <X size={13} /> رفض
                      </button>
                    </div>
                  )}
                  {p.status !== 'pending' && <ConfirmDelete onConfirm={() => del(p.id)} />}
                </div>
              </div>

              {rejectId === p.id && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="سبب الرفض (اختياري) — هيظهر للطالب"
                    className="input min-w-[220px] flex-1"
                    maxLength={300}
                  />
                  <button
                    onClick={() => setStatus(p.id, 'rejected', note)}
                    disabled={busyId === p.id}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-pure hover:bg-red-500 disabled:opacity-50"
                  >
                    {busyId === p.id ? 'جاري...' : 'تأكيد الرفض'}
                  </button>
                  <button onClick={() => setRejectId(null)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/20">
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

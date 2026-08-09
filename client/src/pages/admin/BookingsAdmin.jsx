import { useEffect, useState } from 'react';
import { CheckCheck, Loader2, ClipboardList, Phone, UserRound, MapPin, School, GraduationCap } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const statusFilter = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'جديدة' },
  { value: 'done', label: 'تم التواصل' }
];

export default function BookingsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => {
    api(`/api/admin/bookings${filter === 'all' ? '' : `?status=${filter}`}`)
      .then((d) => { setItems(d.bookings); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const toggle = async (id, status) => {
    setBusyId(id);
    await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setBusyId(null);
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/bookings/${id}`, { method: 'DELETE' });
    setMsg('تم حذف الحجز');
    setTimeout(() => setMsg(null), 2500);
    load();
  };

  const pendingCount = items.filter((b) => b.status === 'new').length;

  return (
    <div>
      <PageHeader
        title="حجوزات السنتر"
        subtitle={pendingCount > 0 ? `${pendingCount} حجز مستني تواصلك مع الطالب/ولي الأمر` : 'طلبات حجز الحصص الحضورية اللي بتبعت من صفحة مواعيد الدروس'}
      />

      {msg && <Alert type="ok">{msg}</Alert>}

      <div className="mb-6 flex flex-wrap gap-2">
        {statusFilter.map((f) => (
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
        <Empty text="مفيش حجوزات لحد دلوقتي." />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className={`card p-5 ${b.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-lg bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-300">
                      <ClipboardList size={13} /> حجز السنتر
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${b.status === 'done' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                      {b.status === 'done' ? 'تم التواصل' : 'جديدة'}
                    </span>
                    <span className="text-xs text-white/40" dir="ltr">{fmtDateTime(b.created_at)}</span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
                    <div className="flex items-center gap-1.5"><UserRound size={14} className="shrink-0 text-brand-400" /><span className="font-semibold">{b.student_name}</span></div>
                    {b.phone && <div className="flex items-center gap-1.5"><Phone size={14} className="shrink-0 text-emerald-400" /><span dir="ltr">{b.phone}</span></div>}
                    {b.parent_name && <div className="flex items-center gap-1.5"><UserRound size={14} className="shrink-0 text-neon-300" /><span>{b.parent_name} {b.parent_phone ? <span dir="ltr" className="text-white/50">({b.parent_phone})</span> : null}</span></div>}
                    {b.governorate && <div className="flex items-center gap-1.5"><MapPin size={14} className="shrink-0 text-rose-300" /><span>{b.governorate}</span></div>}
                    {b.academic_year && <div className="flex items-center gap-1.5"><School size={14} className="shrink-0 text-amber-300" /><span>{b.academic_year}</span></div>}
                    {b.grade && <div className="flex items-center gap-1.5"><GraduationCap size={14} className="shrink-0 text-violet-300" /><span>{b.grade}</span></div>}
                  </div>

                  {b.note && (
                    <p className="mt-3 whitespace-pre-line rounded-xl bg-white/5 p-3 text-sm leading-6 text-white/70">
                      💬 {b.note}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggle(b.id, b.status === 'done' ? 'new' : 'done')}
                    disabled={busyId === b.id}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    {busyId === b.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                    {b.status === 'done' ? 'إعادة فتح' : 'تم التواصل'}
                  </button>
                  <ConfirmDelete onConfirm={() => del(b.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

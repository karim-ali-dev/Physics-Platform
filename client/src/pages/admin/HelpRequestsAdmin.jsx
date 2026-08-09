import { useEffect, useState } from 'react';
import { Image as ImageIcon, CheckCheck, Loader2, MailQuestion } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const statusFilter = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'جديدة' },
  { value: 'done', label: 'تمت' }
];

export default function HelpRequestsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => {
    api(`/api/admin/help-requests${filter === 'all' ? '' : `?status=${filter}`}`)
      .then((d) => { setItems(d.requests); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const toggle = async (id, status) => {
    setBusyId(id);
    await api(`/api/admin/help-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setBusyId(null);
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/help-requests/${id}`, { method: 'DELETE' });
    setMsg('تم حذف الطلب');
    setTimeout(() => setMsg(null), 2500);
    load();
  };

  return (
    <div>
      <PageHeader
        title="طلبات المساعدة (من المساعد الذكي)"
        subtitle="صورة مسألة أو سؤال أرسله الطلاب من الشات — صور المسائل وصلتك هنا تحلها بنفسك"
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
        <Empty text="مفيش طلبات مساعدة لحد دلوقتي." />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className={`card p-5 ${r.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.type === 'image' ? (
                      <span className="flex items-center gap-1 rounded-lg bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-300"><ImageIcon size={13} /> صورة مسألة</span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-lg bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-300"><MailQuestion size={13} /> سؤال نصي</span>
                    )}
                    <span className="text-xs text-white/40" dir="ltr">{fmtDateTime(r.created_at)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${r.status === 'done' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>
                      {r.status === 'done' ? 'تمت' : 'جديدة'}
                    </span>
                  </div>

                  {r.image_url && (
                    <a href={r.image_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-white/10">
                      <img src={r.image_url} alt="صورة المسألة" className="max-h-64 w-auto max-w-full object-contain" />
                    </a>
                  )}
                  {r.content && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/75">{r.content}</p>}

                  {(r.student_name || r.contact) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/45">
                      {r.student_name && <span>👤 {r.student_name}</span>}
                      {r.contact && <span>📞 {r.contact}</span>}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggle(r.id, r.status === 'done' ? 'new' : 'done')}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                    {r.status === 'done' ? 'إعادة فتح' : 'تم الرد'}
                  </button>
                  <ConfirmDelete onConfirm={() => del(r.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

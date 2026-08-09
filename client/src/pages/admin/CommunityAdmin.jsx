import { useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, Trash2, MessageSquare, ChevronDown } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const statusFilter = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'منشورة' },
  { value: 'hidden', label: 'مخفية' }
];

export default function CommunityAdmin() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [openComments, setOpenComments] = useState({});

  const load = () => {
    api(`/api/admin/community${filter === 'all' ? '' : `?status=${filter}`}`)
      .then((d) => { setPosts(d.posts); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const toggleStatus = async (id, status) => {
    setBusyId(id);
    await api(`/api/admin/community/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setBusyId(null);
    setMsg(status === 'hidden' ? 'تم إخفاء البوست' : 'تم نشر البوست');
    setTimeout(() => setMsg(null), 2500);
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/community/${id}`, { method: 'DELETE' });
    setMsg('تم حذف البوست وتعليقاته');
    setTimeout(() => setMsg(null), 2500);
    load();
  };

  const delComment = async (postId, commentId) => {
    await api(`/api/admin/community/${postId}/comments/${commentId}`, { method: 'DELETE' });
    setMsg('تم حذف التعليق');
    setTimeout(() => setMsg(null), 2500);
    load();
  };

  return (
    <div>
      <PageHeader
        title="الكوميونتي"
        subtitle="راجع بوستات وتعليقات الطلاب — اخفي أي محتوى غير مناسب وامسحه"
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
      ) : posts.length === 0 ? (
        <Empty text="مفيش بوستات في الكوميونتي لحد دلوقتي." />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className={`card p-5 ${p.status === 'hidden' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                    <span className="rounded-lg bg-brand-500/15 px-2.5 py-1 font-bold text-brand-300">{p.category}</span>
                    <span>👤 {p.author_name}</span>
                    <span dir="ltr">{fmtDateTime(p.created_at)}</span>
                    {p.status === 'hidden' && <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">مخفية</span>}
                  </div>
                  <h3 className="mt-2 font-extrabold leading-7">{p.title}</h3>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-white/65">{p.content}</p>
                  {p.image_url && (
                    <a href={p.image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block overflow-hidden rounded-xl border border-white/10">
                      <img src={p.image_url} alt="ملحق بالبوست" className="max-h-48 w-auto max-w-full" />
                    </a>
                  )}
                  <div className="mt-2 text-xs text-white/40">
                    ❤️ {p.likes || 0} — 👁 {p.views || 0} — 💬 {(p.comments || []).length}
                  </div>

                  {(p.comments || []).length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setOpenComments((s) => ({ ...s, [p.id]: !s[p.id] }))}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-300 hover:text-brand-200"
                      >
                        <MessageSquare size={13} /> التعليقات ({p.comments.length})
                        <ChevronDown size={14} className={`transition-transform ${openComments[p.id] ? 'rotate-180' : ''}`} />
                      </button>
                      {openComments[p.id] && (
                        <div className="mt-2 space-y-2">
                          {p.comments.map((c) => (
                            <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl bg-ink-900/60 p-3">
                              <div>
                                <div className="text-xs font-bold text-brand-300">{c.author_name}</div>
                                <p className="mt-0.5 text-sm leading-6 text-white/70">{c.content}</p>
                                <div className="mt-1 text-[11px] text-white/35" dir="ltr">{fmtDateTime(c.created_at)}</div>
                              </div>
                              <ConfirmDelete
                                title="حذف تعليق"
                                onConfirm={() => delComment(p.id, c.id)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleStatus(p.id, p.status === 'hidden' ? 'active' : 'hidden')}
                    disabled={busyId === p.id}
                    className="flex items-center gap-1 rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
                  >
                    {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : p.status === 'hidden' ? <Eye size={13} /> : <EyeOff size={13} />}
                    {p.status === 'hidden' ? 'نشر' : 'إخفاء'}
                  </button>
                  <ConfirmDelete title="حذف البوست" onConfirm={() => del(p.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

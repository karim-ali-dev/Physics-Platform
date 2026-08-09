import { useEffect, useState } from 'react';
import {
  ArrowRight, ArrowLeft, Heart, MessageCircle, PenLine, Send, Eye, Loader2, Users, Search
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';
import SectionHeading from '../components/SectionHeading';
import Spinner from '../components/Spinner';
import { timeAgo } from '../utils/time';

const CATEGORIES = ['عام', 'مذاكرة', 'سؤال فيزياء', 'ملخصات', 'نصائح', 'أمنية 🎯'];
const REACTIONS = ['👍', '🔥', '❤️', '😂', '🎯', '💡'];
const SORTS = [
  { value: 'new', label: 'الأحدث' },
  { value: 'hot', label: 'الأكثر تفاعلًا' },
  { value: 'active', label: 'الأكثر نقاشًا' }
];

export default function Community() {
  const { customer } = useApp();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('new');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'عام', ask_teacher: false });
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const per = 10;
  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per: String(per), sort });
    if (q) params.set('q', q);
    api(`/api/community/posts?${params.toString()}`)
      .then((d) => { setPosts(d.posts); setTotal(d.total); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [page, sort, q]);

  const doSearch = (e) => {
    e.preventDefault();
    setQ(qInput.trim().slice(0, 100));
    setPage(1);
  };

  const openPost = async (id) => {
    const d = await api(`/api/community/posts/${id}`);
    setSelected(d.post);
    setComments(d.comments);
  };

  const submitPost = async (e) => {
    e.preventDefault();
    if (!customer) { setErr('سجل دخولك الأول عشان تنشر بوست.'); return; }
    if (!form.title.trim() || !form.content.trim()) { setErr('اكتب عنوان ونص البوست.'); return; }
    setBusy(true);
    setErr('');
    try {
      await api('/api/community/posts', {
        method: 'POST',
        body: JSON.stringify({ title: form.title.trim(), content: form.content.trim(), category: form.category, ask_teacher: form.ask_teacher })
      });
      setForm({ title: '', content: '', category: 'عام', ask_teacher: false });
      setShowForm(false);
      setMsg2('تم نشر بوستك في الكوميونتي 🎉');
      load();
    } catch (ex) {
      setErr(ex.message || 'حصلت مشكلة');
    } finally {
      setBusy(false);
    }
  };

  const [msg2, setMsg2] = useState('');
  useEffect(() => {
    if (!msg2) return;
    const t = setTimeout(() => setMsg2(''), 3000);
    return () => clearTimeout(t);
  }, [msg2]);

  const addComment = async (e) => {
    e.preventDefault();
    if (!customer) { setErr('سجل دخولك الأول عشان تعلق.'); return; }
    if (!commentText.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await api(`/api/community/posts/${selected.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() })
      });
      setCommentText('');
      await openPost(selected.id);
      load();
    } catch (ex) {
      setErr(ex.message || 'حصلت مشكلة');
    } finally {
      setBusy(false);
    }
  };

  const like = async (id) => {
    try {
      await api(`/api/community/posts/${id}/like`, { method: 'POST' });
      if (selected && selected.id === id) setSelected((p) => ({ ...p, likes: (p.likes || 0) + 1 }));
      setPosts((arr) => arr.map((p) => (p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p)));
    } catch (_) { /* ignore */ }
  };

  const react = async (post, emoji) => {
    try {
      const d = await api(`/api/community/posts/${post.id}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
      if (selected && selected.id === post.id) {
        setSelected((p) => ({ ...p, reactions: d.reactions, my_reactions: d.my_reactions, reactions_count: d.reactions_count }));
      }
      setPosts((arr) => arr.map((p) => (p.id === post.id ? { ...p, reactions: d.reactions, my_reactions: d.my_reactions, reactions_count: d.reactions_count } : p)));
    } catch (_) { /* ignore */ }
  };

  const likeComment = async (c) => {
    try {
      const d = await api(`/api/community/comments/${c.id}/like`, { method: 'POST' });
      setComments((arr) => arr.map((x) => (x.id === c.id ? { ...x, liked: d.liked, likes: Math.max(0, (x.likes || 0) + (d.liked ? 1 : -1)) } : x)));
    } catch (_) { /* ignore */ }
  };

  const ReactionRow = ({ post, compact = false }) => (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-3'}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((em) => {
          const active = (post.my_reactions || []).includes(em);
          const count = (post.reactions && post.reactions[em]) || 0;
          if (!active && count === 0 && !customer) return null;
          return (
            <button
              key={em}
              onClick={() => customer && react(post, em)}
              disabled={!customer}
              title={customer ? 'اختار إيموجي واحد بس لكل بوست' : 'سجل دخولك عشان تتفاعل'}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                active ? 'border-brand-400 bg-brand-500/15 text-brand-200' : 'border-white/10 text-white/60 hover:border-brand-400/50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="text-sm">{em}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>
      {!compact && customer && (
        <span className="text-xs text-white/35">📌 تفاعل واحد بس لكل بوست — اضغط الإيموجي نفسه تاني عشان تلغيه</span>
      )}
      {(post.reactions_count || 0) > 0 && !compact && (
        <span className="text-xs text-white/40">إجمالي التفاعلات: {post.reactions_count}</span>
      )}
    </div>
  );

  return (
    <div className="container-x pt-28 pb-20">
      <SectionHeading
        badge="الكوميونتي"
        title="مجتمع طلاب منصة الفيزياء"
        subtitle="اسأل، شارك، ناقش، وعبر عن نفسك — والتفاعل بيكون بإيموجي واحد لكل بوست."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/50">
              <Users size={16} className="text-brand-400" />
              {total} بوست في الكوميونتي
            </div>
            <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
              <PenLine size={16} /> {showForm ? 'إغلاق' : 'انشر بوست جديد'}
            </button>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <form onSubmit={doSearch} className="relative min-w-56 flex-1">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="دوّر على بوست..."
                className="input !pr-10"
              />
            </form>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setSort(s.value); setPage(1); }}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${sort === s.value ? 'bg-brand-600 text-pure' : 'border border-white/15 text-white/60 hover:border-brand-400'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {err && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</div>}
          {msg2 && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{msg2}</div>}

          {showForm && (
            <form onSubmit={submitPost} className="card mb-8 space-y-4 p-6">
              {!customer && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                  عشان تنشر لازم تسجل دخولك الأول — <a href="/student/login" className="font-bold underline">دخول الطلاب</a>
                </div>
              )}
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان البوست..."
                className="input"
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="اكتب بوستك هنا — سؤال فيزياء، ملخص، أمنية، أو نقاش..."
                rows={4}
                className="input resize-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${form.category === c ? 'bg-brand-600 text-pure' : 'border border-white/15 text-white/60'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {form.category === 'سؤال فيزياء' && (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ask_teacher}
                    onChange={(e) => setForm({ ...form, ask_teacher: e.target.checked })}
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span>
                    <b>محتاج رد من مستر أحمد نفسه</b>
                    <span className="block text-xs text-white/45">هيوصلك سؤالك كمطلب مساعدة للوحة المدرس ويحلهولك هو</span>
                  </span>
                </label>
              )}
              <button type="submit" disabled={busy || !customer} className="btn-primary disabled:opacity-50">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} انشر البوست
              </button>
            </form>
          )}

          {selected ? (
            <div>
              <button onClick={() => setSelected(null)} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-brand-300 hover:text-brand-200">
                <ArrowRight size={16} /> رجوع للكوميونتي
              </button>

              <div className="card p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                  <span className="rounded-full bg-brand-500/15 px-2.5 py-1 font-bold text-brand-300">{selected.category}</span>
                  <span>👤 {selected.author_name}</span>
                  <span>{timeAgo(selected.created_at)}</span>
                </div>
                <h2 className="mt-3 text-xl font-extrabold leading-8">{selected.title}</h2>
                {selected.image_url && (
                  <img src={selected.image_url} alt="ملحق بالبوست" className="mt-4 max-h-72 w-auto max-w-full rounded-xl border border-white/10" />
                )}
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/70">{selected.content}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/45">
                  <span className="flex items-center gap-1"><Eye size={14} /> {selected.views || 0}</span>
                  <button onClick={() => like(selected.id)} className="flex items-center gap-1 text-rose-300 hover:text-rose-200">
                    <Heart size={14} /> {selected.likes || 0}
                  </button>
                </div>
                <ReactionRow post={selected} compact />
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="font-extrabold text-white/80">التعليقات ({comments.length})</h3>
                {comments.length === 0 && <p className="text-sm text-white/40">مفيش تعليقات لسه — كن أول من يرد.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold text-brand-300">
                        {c.author_name} <span className="font-normal text-white/35">• {timeAgo(c.created_at)}</span>
                      </div>
                      <button
                        onClick={() => customer && likeComment(c)}
                        disabled={!customer}
                        className={`flex items-center gap-1 text-xs font-bold transition-colors ${c.liked ? 'text-rose-300' : 'text-white/40 hover:text-rose-300'} disabled:opacity-50`}
                      >
                        <Heart size={13} className={c.liked ? 'fill-rose-300' : ''} /> {c.likes || 0}
                      </button>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-white/70">{c.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={addComment} className="mt-5 flex items-end gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={customer ? 'اكتب تعليقك...' : 'سجل دخولك الأول عشان تعلق'}
                  rows={2}
                  className="input flex-1 resize-none"
                />
                <button type="submit" disabled={busy || !customer || !commentText.trim()} className="btn-primary disabled:opacity-50">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          ) : loading ? (
            <Spinner label="جاري تحميل البوستات..." />
          ) : posts.length === 0 ? (
            <div className="card p-10 text-center text-white/50">
              {q ? `مفيش نتايج عن "${q}"` : 'مفيش بوستات لسه — ابدأ أول بوست! 🚀'}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <article key={p.id} className="card hover-lift cursor-pointer p-5 transition-colors hover:border-brand-500/40">
                  <button onClick={() => openPost(p.id)} className="block w-full text-right">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
                      <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 font-bold text-brand-300">{p.category}</span>
                      <span>👤 {p.author_name}</span>
                      <span>{timeAgo(p.created_at)}</span>
                    </div>
                    <h3 className="mt-2 font-extrabold leading-7 hover:text-brand-300">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-white/60" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.content}</p>
                  </button>
                  <ReactionRow post={p} />
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/45">
                    <span className="flex items-center gap-1"><MessageCircle size={14} /> {p.comments_count || 0}</span>
                    <span className="flex items-center gap-1"><Eye size={14} /> {p.views || 0}</span>
                    <button onClick={() => like(p.id)} className="flex items-center gap-1 text-rose-300 hover:text-rose-200">
                      <Heart size={14} /> {p.likes || 0}
                    </button>
                    <button onClick={() => openPost(p.id)} className="mr-auto inline-flex items-center gap-1 text-xs font-bold text-brand-300 hover:text-brand-200">
                      قراءة وتعليق <ArrowLeft size={14} />
                    </button>
                  </div>
                </article>
              ))}

              {total > per && (
                <div className="flex justify-center gap-2 pt-4">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost disabled:opacity-40">
                    <ArrowRight size={15} /> السابق
                  </button>
                  <span className="px-4 text-sm text-white/50">صفحة {page} من {Math.ceil(total / per)}</span>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / per)} className="btn-ghost disabled:opacity-40">
                    التالي <ArrowLeft size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
    </div>
  );
}

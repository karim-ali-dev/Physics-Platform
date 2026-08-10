import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Loader2, X, ListChecks, CalendarDays, Clock, AlertTriangle,
  ChevronRight, ChevronLeft, CheckCircle2, Search, Grid2x2, List, Flag,
  RotateCcw, GripVertical, Zap
} from 'lucide-react';
import { api } from '../../api';
import { GRADES } from '../../config';
import { PageHeader, Field, TextInput, TextArea, Select, ConfirmDelete, Empty, Alert, TimePicker12 } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmt12Time, cairoClock, parseTime24, humanMinutes } from '../../utils/schedule';

const STATUS = ['pending', 'in_progress', 'done'];
const STATUS_META = {
  pending: { label: 'جديدة', icon: '🕐', color: 'bg-sky-500/15 text-sky-300', border: 'border-sky-500/25' },
  in_progress: { label: 'قيد التنفيذ', icon: '⚡', color: 'bg-amber-400/15 text-amber-200', border: 'border-amber-400/25' },
  done: { label: 'تمت', icon: '✅', color: 'bg-emerald-500/15 text-emerald-300', border: 'border-emerald-500/25' }
};
const PRIORITY_META = {
  high: { label: 'عاجل', color: 'bg-red-500/15 text-red-300', edge: 'bg-red-400' },
  medium: { label: 'متوسط', color: 'bg-brand-500/15 text-brand-300', edge: 'bg-brand-400' },
  low: { label: 'منخفض', color: 'bg-white/10 text-white/55', edge: 'bg-white/30' }
};
const BOARD_ORDER = ['pending', 'in_progress', 'done'];

const blank = { title: '', description: '', category: '', grade: '', priority: 'medium', status: 'pending', due_date: '', due_time: '' };

function cairoToday() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

const prioRank = (p) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2);

const sortCards = (arr) =>
  [...arr].sort(
    (a, b) =>
      prioRank(a.priority) - prioRank(b.priority) ||
      (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99') ||
      (a.due_time || '99:99').localeCompare(b.due_time || '99:99')
  );

export default function TasksAdmin() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, done: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [view, setView] = useState('board');
  const [sort, setSort] = useState('priority');
  const [dragId, setDragId] = useState(null);
  const [dropCol, setDropCol] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [now, setNow] = useState(() => cairoClock());

  const load = () => {
    api('/api/admin/tasks').then((d) => { setItems(d.tasks || []); setLoading(false); }).catch(() => setLoading(false));
    api('/api/admin/tasks/stats').then((d) => setStats(d)).catch(() => {});
  };
  useEffect(load, []);
  useEffect(() => {
    const t = setInterval(() => setNow(cairoClock()), 30000);
    return () => clearInterval(t);
  }, []);

  const today = cairoToday();
  const nowHm = `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;

  const isOver = (t) =>
    t.status !== 'done' && t.due_date && (t.due_date < today || (t.due_date === today && t.due_time && t.due_time < nowHm));

  const relDue = (t) => {
    if (!t.due_date) return null;
    const d0 = new Date(today + 'T00:00:00Z').getTime();
    const d1 = new Date(t.due_date + 'T00:00:00Z').getTime();
    const days = Math.round((d1 - d0) / 86400000);
    if (isOver(t)) return { text: 'فات موعدها', cls: 'bg-red-500/15 text-red-300' };
    if (days === 0) {
      let extra = '';
      if (t.due_time) {
        const rem = parseTime24(t.due_time) - (now.hour * 60 + now.minute);
        extra = rem > 0 ? ` • بعد ${humanMinutes(rem)}` : '';
      }
      return { text: `النهارده${t.due_time ? ' ' + fmt12Time(t.due_time) : ''}${extra}`, cls: 'bg-amber-400/15 text-amber-200' };
    }
    if (days === 1) return { text: 'بكرا', cls: 'bg-orange-400/15 text-orange-300' };
    if (days === 2) return { text: 'بعد يومين', cls: 'bg-white/10 text-white/60' };
    if (days < 7) return { text: `بعد ${days} أيام`, cls: 'bg-white/10 text-white/60' };
    return { text: `بعد ${Math.round(days / 7)} أسبوع`, cls: 'bg-white/10 text-white/60' };
  };

  const categories = useMemo(() => [...new Set(items.map((t) => t.category).filter(Boolean))], [items]);

  const filtered = useMemo(() => items.filter((t) => {
    const byStatus = statusFilter === 'all' ? true : statusFilter === 'overdue' ? isOver(t) : t.status === statusFilter;
    const byPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const byGrade = gradeFilter === 'all' || t.grade === gradeFilter;
    const byCat = catFilter === 'all' || t.category === catFilter;
    const byQ = !q.trim() || (t.title + ' ' + t.description + ' ' + t.category).toLowerCase().includes(q.trim().toLowerCase());
    return byStatus && byPriority && byGrade && byCat && byQ;
  }), [items, statusFilter, priorityFilter, gradeFilter, catFilter, q, now]);

  const donePct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const openAdd = () => { setEditing(null); setForm({ ...blank }); setError(''); setModal(true); };
  const openEdit = (t) => { setEditing(t); setForm({ ...t }); setError(''); setModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form };
      const path = editing ? `/api/admin/tasks/${editing.id}` : '/api/admin/tasks';
      const method = editing ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(payload) });
      setMsg(editing ? 'تم تحديث المهمة' : 'تم إضافة المهمة');
      setModal(false);
      load();
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (t, status) => {
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, status, completed_at: status === 'done' ? new Date().toISOString() : '' } : x)));
    try {
      await api(`/api/admin/tasks/${t.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setMsg(status === 'done' ? 'تمام، اتنفذت المهمة 🎉' : 'تم تحديث الحالة');
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === t.id ? { ...t } : x)));
      setError('تعذر تحديث الحالة');
    } finally {
      load();
      setTimeout(() => { setMsg(null); setError(''); }, 2500);
    }
  };

  const handleDrop = (targetStatus) => {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    setDropCol(null);
    const src = items.find((t) => t.id === id);
    if (!src || src.status === targetStatus) return;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: targetStatus, completed_at: targetStatus === 'done' ? new Date().toISOString() : '' } : x)));
    api(`/api/admin/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: targetStatus }) })
      .then(() => { setMsg(targetStatus === 'done' ? 'تمام، اتنفذت المهمة 🎉' : 'تم نقل المهمة'); })
      .catch(() => { setItems((prev) => prev.map((x) => (x.id === id ? { ...src } : x))); setError('تعذر نقل المهمة — جرب تاني'); })
      .finally(() => { load(); setTimeout(() => { setMsg(null); setError(''); }, 2500); });
  };

  const del = async (id) => {
    const t = items.find((x) => x.id === id);
    try {
      await api(`/api/admin/tasks/${id}`, { method: 'DELETE' });
      setLastDeleted(t || null);
      load();
    } catch (e) {
      setError('تعذر الحذف');
      setTimeout(() => setError(''), 3000);
    }
  };

  const undoDelete = async () => {
    const t = lastDeleted;
    setLastDeleted(null);
    if (!t) return;
    try {
      await api('/api/admin/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: t.title, description: t.description || '', category: t.category || '',
          grade: t.grade || '', priority: t.priority || 'medium', status: t.status || 'pending',
          due_date: t.due_date || '', due_time: t.due_time || ''
        })
      });
      setMsg('تمت استعادة المهمة');
      load();
    } catch (e) {
      setError('تعذر الاستعادة');
    } finally {
      setTimeout(() => { setMsg(null); setError(''); }, 2500);
    }
  };

  const quickAdd = async (e) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    try {
      await api('/api/admin/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description: '', category: '', grade: '', priority: quickPriority, status: 'pending', due_date: '', due_time: '' })
      });
      setQuickTitle('');
      setMsg('تمت إضافة المهمة');
      load();
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setTimeout(() => { setMsg(null); setError(''); }, 2500);
    }
  };

  const statCards = [
    { label: 'إجمالي المهام', value: stats.total, icon: ListChecks, color: 'bg-brand-500/15 text-brand-300' },
    { label: 'قيد التنفيذ', value: stats.in_progress, icon: Clock, color: 'bg-amber-400/15 text-amber-200' },
    { label: 'جديدة', value: stats.pending, icon: Flag, color: 'bg-sky-500/15 text-sky-300' },
    { label: 'تمت', value: stats.done, icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-300' },
    { label: 'متأخرة', value: stats.overdue, icon: AlertTriangle, color: stats.overdue > 0 ? 'bg-red-500/15 text-red-300' : 'bg-white/10 text-white/50' }
  ];

  const listItems = useMemo(() => {
    const arr = [...filtered];
    if (sort === 'priority') arr.sort((a, b) => prioRank(a.priority) - prioRank(b.priority) || (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99'));
    else if (sort === 'due') arr.sort((a, b) => (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99') || (a.due_time || '99:99').localeCompare(b.due_time || '99:99'));
    else arr.sort((a, b) => b.id - a.id);
    return arr;
  }, [filtered, sort]);

  const TaskCard = ({ t }) => {
    const overdue = isOver(t);
    const meta = STATUS_META[t.status];
    const rel = relDue(t);
    const dragging = dragId === t.id;
    return (
      <div
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(t.id)); e.dataTransfer.effectAllowed = 'move'; setDragId(t.id); }}
        onDragEnd={() => { setDragId(null); setDropCol(null); }}
        title="اضغط للتعديل • اسحب لنقل المهمة بين الأعمدة"
        className={`group relative cursor-grab overflow-hidden rounded-xl border bg-ink-900/70 p-4 pr-3 transition-all select-none active:cursor-grabbing hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(5,5,15,0.6)] ${dragging ? 'opacity-40' : ''} ${overdue ? 'border-red-500/40' : 'border-white/10 hover:border-brand-500/40'}`}
      >
        <span className={`absolute right-0 top-3 bottom-3 w-1 rounded-full ${PRIORITY_META[t.priority].edge}`} />
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-extrabold leading-6">{t.title}</h4>
          {overdue && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-300">
              <AlertTriangle size={11} /> متأخرة
            </span>
          )}
        </div>
        {t.description && <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-white/55">{t.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${PRIORITY_META[t.priority].color}`}>{PRIORITY_META[t.priority].label}</span>
          {t.grade && <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-[10px] font-black text-violet-300">{t.grade}</span>}
          {t.category && <span className="rounded-lg bg-teal-500/15 px-2 py-0.5 text-[10px] font-black text-teal-300"># {t.category}</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {(t.due_date || t.due_time) && (
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black ${rel ? rel.cls : 'text-white/50'}`}>
              <CalendarDays size={11} />
              {rel ? rel.text : (t.due_date ? t.due_date.split('-').reverse().join('/') : '')}
            </span>
          )}
          {t.status === 'in_progress' && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-200">
              <Zap size={11} className="animate-pulse" /> شغال عليها
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {t.status === 'pending' && (
              <button onClick={() => setStatus(t, 'in_progress')} title="ابدأها" className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/30 bg-ink-950 text-amber-300 hover:bg-amber-400/15">
                <ChevronLeft size={12} />
              </button>
            )}
            {t.status === 'in_progress' && (
              <button onClick={() => setStatus(t, 'done')} title="إنهاء" className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-500/30 bg-ink-950 text-emerald-300 hover:bg-emerald-500/15">
                <CheckCircle2 size={12} />
              </button>
            )}
            {t.status === 'done' && (
              <button onClick={() => setStatus(t, 'in_progress')} title="إعادة فتح" className="flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-ink-950 text-white/50 hover:bg-white/10">
                <ChevronRight size={12} />
              </button>
            )}
            <button onClick={() => openEdit(t)} title="تعديل" className="flex h-6 w-6 items-center justify-center rounded-md border border-brand-500/30 bg-ink-950 text-brand-300 hover:bg-brand-500/15">
              <Pencil size={11} />
            </button>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.color}`}>{meta.icon} {meta.label}</span>
        </div>
        <div className="absolute -top-2 left-2 z-10 hidden group-hover:block">
          <ConfirmDelete small onConfirm={() => del(t.id)} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="مهام المدرس"
        subtitle="نظّم شغلك: مهام مراجعات، تصحيح، تصوير دروس — مع متابعة المواعيد والتأخير."
        action={
          <button onClick={openAdd} className="btn-primary !py-2.5 text-sm">
            <Plus size={16} /> إضافة مهمة جديدة
          </button>
        }
      />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* شريط التراجع عن الحذف */}
      {lastDeleted && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-ink-900/80 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <RotateCcw size={16} />
            </span>
            <div>
              <div className="text-sm font-black">اتحذفت مهمة: {lastDeleted.title}</div>
              <div className="text-[11px] text-white/50">تقدر ترجعها في أي وقت</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={undoDelete} className="btn-primary !py-2 text-sm"><RotateCcw size={15} /> تراجع</button>
            <button onClick={() => setLastDeleted(null)} className="btn-ghost !py-2 text-sm"><X size={15} /> تجاهل</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-3 p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon size={20} />
            </span>
            <div>
              <div className="text-xl font-black leading-none tabular-nums">{s.value}</div>
              <div className="mt-1 truncate text-[11px] font-semibold text-white/50">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card mt-4 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-extrabold"><CheckCircle2 size={16} className="text-emerald-400" /> نسبة الإنجاز</span>
          <span className="font-black tabular-nums text-emerald-300">{donePct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-1000"
            style={{ width: `${donePct}%` }}
          />
        </div>
        <div className="mt-2 text-[11px] text-white/40">{stats.done} من {stats.total} مهمة خلصت — {stats.overdue > 0 ? `${stats.overdue} مهمة متأخرة محتاجة تركيزك!` : 'مفيش مهام متأخرة، ممتاز 👏'}</div>
      </div>

      {/* Quick add */}
      <form onSubmit={quickAdd} className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-brand-500/30 bg-ink-900/40 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
          <Zap size={17} />
        </span>
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="اكتب مهمة سريعة واضغط Enter..."
          className="input min-w-[180px] flex-1 !py-2.5 text-sm"
        />
        <Select
          value={quickPriority}
          onChange={(e) => setQuickPriority(e.target.value)}
          options={[
            { value: 'high', label: '🔴 عاجل' },
            { value: 'medium', label: '🟣 متوسط' },
            { value: 'low', label: '⚪ منخفض' }
          ]}
          className="!w-auto"
        />
        <button type="submit" disabled={!quickTitle.trim()} className="btn-primary !py-2.5 text-sm disabled:opacity-40">
          <Plus size={15} /> إضافة
        </button>
      </form>

      {/* Filters */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في المهام..." className="input !py-2.5 pr-9 text-sm" />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'pending', label: '🕐 جديدة' },
              { value: 'in_progress', label: '⚡ قيد التنفيذ' },
              { value: 'done', label: '✅ تمت' },
              { value: 'overdue', label: '⏰ متأخرة' }
            ]}
            className="!w-auto"
          />
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'كل الأولويات' },
              { value: 'high', label: '🔴 عاجل' },
              { value: 'medium', label: '🟣 متوسط' },
              { value: 'low', label: '⚪ منخفض' }
            ]}
            className="!w-auto"
          />
          <Select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            options={[{ value: 'all', label: 'كل الصفوف' }, ...GRADES.map((g) => ({ value: g, label: g }))]}
            className="!w-auto"
          />
          {categories.length > 0 && (
            <Select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              options={[{ value: 'all', label: 'كل التصنيفات' }, ...categories.map((c) => ({ value: c, label: `# ${c}` }))]}
              className="!w-auto"
            />
          )}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950 p-1">
            <button onClick={() => setView('board')} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${view === 'board' ? 'bg-brand-600 text-pure' : 'text-white/50 hover:text-white'}`}>
              <Grid2x2 size={14} /> لوحة
            </button>
            <button onClick={() => setView('list')} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${view === 'list' ? 'bg-brand-600 text-pure' : 'text-white/50 hover:text-white'}`}>
              <List size={14} /> قائمة
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      {view === 'board' && (
        loading ? <div className="mt-8"><Spinner /></div>
        : items.length === 0 ? <div className="mt-8"><Empty text="مفيش مهام لسه — اضغط «إضافة مهمة جديدة» فوق أو استخدم خانة الإضافة السريعة." /></div>
        : (
          <>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-white/35">
              <GripVertical size={13} /> اسحب أي مهمة بين الأعمدة لتغيير حالتها فوراً — الأعمدة: جديدة ← قيد التنفيذ ← تمت
            </p>
            <div className="mt-2 grid gap-4 lg:grid-cols-3">
              {BOARD_ORDER.map((st) => {
                const meta = STATUS_META[st];
                const cols = sortCards(filtered.filter((t) => t.status === st));
                const over = dragId != null && dropCol === st;
                return (
                  <div
                    key={st}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropCol(st); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropCol((c) => (c === st ? null : c)); }}
                    onDrop={(e) => { e.preventDefault(); handleDrop(st); }}
                    className={`rounded-2xl border p-3 transition-all ${over ? 'border-brand-400/60 bg-brand-500/[0.06] ring-2 ring-brand-400/50' : meta.border}`}
                  >
                    <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-black ${meta.color}`}>
                      <span className="flex items-center gap-2">{meta.icon} {meta.label}</span>
                      <span className="rounded-full bg-ink-950/50 px-2 py-0.5 text-xs tabular-nums">{cols.length}</span>
                    </div>
                    <div className="space-y-3">
                      {cols.length === 0 && (
                        <div className={`flex h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-white/30 ${over ? 'border-brand-400/60 text-brand-300' : 'border-white/10'}`}>
                          {over ? 'اسحب هنا 👇' : 'مفيش مهام هنا.'}
                        </div>
                      )}
                      {cols.map((t) => <TaskCard key={t.id} t={t} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      )}

      {/* List */}
      {view === 'list' && (
        loading ? <div className="mt-8"><Spinner /></div>
        : items.length === 0 ? <div className="mt-8"><Empty text="مفيش مهام لسه." /></div>
        : filtered.length === 0 ? <div className="mt-8"><Empty text="مفيش مهام مطابقة للفلاتر دي." /></div>
        : (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white/40">{filtered.length} مهمة</span>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                options={[
                  { value: 'priority', label: 'ترتيب: الأولوية' },
                  { value: 'due', label: 'ترتيب: الموعد النهائي' },
                  { value: 'newest', label: 'ترتيب: الأحدث' }
                ]}
                className="!w-auto"
              />
            </div>
            <div className="space-y-2">
              {listItems.map((t) => {
                const overdue = isOver(t);
                const meta = STATUS_META[t.status];
                const rel = relDue(t);
                return (
                  <div key={t.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-ink-900/60 px-4 py-3 ${overdue ? 'border-red-500/40' : 'border-white/10'}`}>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${meta.color}`}>{meta.icon} {meta.label}</span>
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${PRIORITY_META[t.priority].color}`}>{PRIORITY_META[t.priority].label}</span>
                      {t.grade && <span className="rounded-lg bg-violet-500/15 px-2 py-1 text-[10px] font-black text-violet-300">{t.grade}</span>}
                      <span className="min-w-0 truncate text-sm font-bold">{t.title}</span>
                      {overdue && <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-300"><AlertTriangle size={11} /> متأخرة</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {(t.due_date || t.due_time) && (
                        <span className={`flex items-center gap-1 text-xs font-bold tabular-nums ${overdue ? 'text-red-300' : 'text-white/50'}`}>
                          <CalendarDays size={13} /> {rel ? rel.text : (t.due_date ? t.due_date.split('-').reverse().join('/') : '')}
                        </span>
                      )}
                      {t.status === 'pending' && <button onClick={() => setStatus(t, 'in_progress')} className="rounded-lg bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-300 hover:bg-amber-400/25">ابدأ</button>}
                      {t.status === 'in_progress' && <button onClick={() => setStatus(t, 'done')} className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-300 hover:bg-emerald-500/25">إنهاء</button>}
                      {t.status === 'done' && <button onClick={() => setStatus(t, 'in_progress')} className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/50 hover:bg-white/20">إعادة فتح</button>}
                      <button onClick={() => openEdit(t)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-500/30 text-brand-300 hover:bg-brand-500/15"><Pencil size={13} /></button>
                      <ConfirmDelete small onConfirm={() => del(t.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-extrabold"><ListChecks size={20} className="text-brand-400" /> {editing ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
              <button onClick={() => setModal(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-brand-400 hover:text-brand-300" aria-label="إغلاق"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="space-y-5">
              <Field label="عنوان المهمة" required>
                <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: تصحيح اختبارات الصف الثالث الثانوي" maxLength={200} required />
              </Field>
              <Field label="تفاصيل المهمة">
                <TextArea className="!min-h-[90px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} placeholder="اكتب أي تفاصيل إضافية..." />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="الأولوية" required>
                  <Select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    options={[
                      { value: 'high', label: '🔴 عاجل' },
                      { value: 'medium', label: '🟣 متوسط' },
                      { value: 'low', label: '⚪ منخفض' }
                    ]}
                    required
                  />
                </Field>
                <Field label="الحالة" required>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    options={STATUS.map((s) => ({ value: s, label: `${STATUS_META[s].icon} ${STATUS_META[s].label}` }))}
                    required
                  />
                </Field>
                <Field label="الصف (اختياري)">
                  <Select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    options={[{ value: '', label: '— بدون صف —' }, ...GRADES.map((g) => ({ value: g, label: g }))]}
                  />
                </Field>
                <Field label="التصنيف (اختياري)">
                  <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: مراجعة، تصحيح، محتوى" maxLength={100} />
                </Field>
                <Field label="الموعد النهائي (تاريخ)">
                  <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </Field>
                <Field label="الموعد النهائي (وقت)" hint="بنظام 12 ساعة — بتوقيت القاهرة">
                  <TimePicker12 value={form.due_time} onChange={(v) => setForm({ ...form, due_time: v })} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                  {busy ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المهمة'}
                </button>
                <button type="button" onClick={() => setModal(false)} className="btn-ghost">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

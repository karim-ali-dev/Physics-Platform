import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Loader2, CalendarDays, Clock, X, Eye, EyeOff, Layers, Hash, Copy, Grid2x2, List, Zap, FileDown, AlertTriangle, Scale } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { api } from '../../api';
import { GRADES, DAYS } from '../../config';
import { PageHeader, Field, TextInput, TextArea, Select, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { cairoClock, fmtClock12, fmt12m, fmt12Time, fmt24m, parseTime24, nextSession, humanMinutes, dayLabel, DAY_ORDER } from '../../utils/schedule';
import { TimePicker12 } from '../../components/admin/ui';

const blank = { grade: GRADES[0], day: DAYS[0], start_time: '', end_time: '', note: '', period: 'الليل', tag: '', tag_active: true, sort_order: 0, active: true };

const PERIODS = ['النهار', 'الليل'];

const periodStyle = (p) =>
  p === 'الليل' ? 'bg-indigo-500/15 text-indigo-300' : p === 'النهار' ? 'bg-amber-400/15 text-amber-200' : 'bg-white/10 text-white/60';

const periodIcon = (p) => (p === 'الليل' ? '🌙' : p === 'النهار' ? '☀️' : '');

const dayStyle = (day) => {
  const styles = {
    'السبت': 'bg-teal-500/15 text-teal-300',
    'الأحد': 'bg-amber-400/15 text-amber-200',
    'الاثنين': 'bg-emerald-500/15 text-emerald-300',
    'الثلاثاء': 'bg-sky-500/15 text-sky-300',
    'الأربعاء': 'bg-rose-400/15 text-rose-300',
    'الخميس': 'bg-violet-500/15 text-violet-300',
    'الجمعة': 'bg-neon-400/15 text-neon-300'
  };
  return styles[day] || 'bg-white/10 text-white/70';
};

const gradeStyle = (grade) => {
  const palette = [
    'bg-teal-500/15 text-teal-300',
    'bg-amber-400/15 text-amber-200',
    'bg-emerald-500/15 text-emerald-300',
    'bg-sky-500/15 text-sky-300',
    'bg-rose-400/15 text-rose-300',
    'bg-violet-500/15 text-violet-300',
    'bg-cyan-400/15 text-cyan-300',
    'bg-lime-500/15 text-lime-300',
    'bg-orange-400/15 text-orange-300'
  ];
  const idx = GRADES.indexOf(grade);
  return palette[idx >= 0 ? idx % palette.length : 5];
};

const toInputTime = (str) => {
  const m = parseTime24(str);
  return m == null ? '' : fmt24m(m);
};

function MiniSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      title={checked ? 'ظاهر على الموقع' : 'مخفي عن الموقع'}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-white/15'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-pure transition-all ${checked ? 'left-0.5' : 'left-[18px]'}`} />
    </button>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-black leading-none">{value}</div>
        <div className="mt-1 truncate text-xs text-white/50">{label}</div>
      </div>
    </div>
  );
}

function MiniBtn({ onClick, title, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded-md border ${danger ? 'border-red-500/30 bg-ink-950 text-red-300 hover:bg-red-500/15' : 'border-brand-500/40 bg-ink-950 text-brand-300 hover:bg-brand-500/15'}`}
    >
      {children}
    </button>
  );
}

function Chip({ s, onEdit, onDuplicate, onDelete, onToggle, conflict }) {
  return (
    <div className={`group relative rounded-lg border px-2 py-1.5 text-right text-[11px] font-bold ${conflict ? 'border-red-500/50 bg-red-500/10 text-red-100' : s.active !== 0 ? 'border-brand-500/30 bg-brand-500/10 text-brand-100' : 'border-white/10 bg-white/5 text-white/40 line-through'}`}>
      <button onClick={onEdit} className="block w-full" title="تعديل">
        <span className="flex items-center justify-between gap-1">
          {conflict && <AlertTriangle size={11} className="text-red-300" />}
          <span className="text-neon-300">{fmt12Time(s.start_time)}{s.end_time ? ` - ${fmt12Time(s.end_time)}` : ''}</span>
          <span>{periodIcon(s.period)}</span>
        </span>
        {s.tag && <span className="mt-0.5 block truncate text-[10px] text-orange-300/80">🔖 {s.tag}</span>}
        {s.note && <span className="mt-0.5 block truncate text-[10px] text-white/40">{s.note}</span>}
      </button>
      <div className="absolute -top-2 left-1 hidden items-center gap-1 group-hover:flex">
        <MiniBtn onClick={onToggle} title={s.active !== 0 ? 'إخفاء عن الموقع' : 'إظهار على الموقع'}>
          {s.active !== 0 ? <EyeOff size={11} /> : <Eye size={11} />}
        </MiniBtn>
        <MiniBtn onClick={onDuplicate} title="تكرار الموعد"><Copy size={11} /></MiniBtn>
        <ConfirmDelete small onConfirm={onDelete} />
      </div>
    </div>
  );
}

export default function ScheduleAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const [gradeFilter, setGradeFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [now, setNow] = useState(() => cairoClock());
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);

  const load = () => {
    api('/api/admin/schedule')
      .then((d) => { setItems(d.schedule || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  /* تحديث لحظي: الجدول كل 30 ثانية والساعة كل ثانية */
  useEffect(() => {
    const t1 = setInterval(load, 30000);
    const t2 = setInterval(() => setNow(cairoClock()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const today = DAYS[DAY_ORDER.indexOf(DAY_ORDER[cairoClock().weekdayIndex === 0 ? 6 : cairoClock().weekdayIndex - 1])] ?? DAY_ORDER[cairoClock().weekdayIndex === 0 ? 6 : cairoClock().weekdayIndex - 1];

  const openAdd = (overrides = {}) => {
    setEditing(null);
    setForm({ ...blank, grade: overrides.grade || (gradeFilter !== 'الكل' ? gradeFilter : GRADES[0]), day: overrides.day || DAYS[0] });
    setError('');
    setModal(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      grade: f.grade, day: f.day,
      start_time: toInputTime(f.start_time), end_time: toInputTime(f.end_time),
      note: f.note, period: f.period || 'الليل', tag: f.tag || '', tag_active: f.tag_active !== 0,
      sort_order: f.sort_order, active: f.active !== 0
    });
    setError('');
    setModal(true);
  };

  const duplicate = (f) => {
    setEditing(null);
    setForm({
      grade: f.grade, day: f.day,
      start_time: toInputTime(f.start_time), end_time: toInputTime(f.end_time),
      note: f.note, period: f.period || 'الليل', tag: f.tag || '', tag_active: f.tag_active !== 0,
      sort_order: (f.sort_order || 0) + 1, active: true
    });
    setError('');
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...form, sort_order: parseInt(form.sort_order, 10) || 0 };
      const path = editing ? `/api/admin/schedule/${editing.id}` : '/api/admin/schedule';
      const method = editing ? 'PUT' : 'POST';
      await api(path, { method, body: JSON.stringify(payload) });
      setMsg(editing ? 'تم تحديث الموعد' : 'تم إضافة الموعد');
      setModal(false);
      load();
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (f) => {
    await api(`/api/admin/schedule/${f.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...f, active: f.active === 0 ? true : false })
    });
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/schedule/${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = items.filter((f) =>
    (gradeFilter === 'الكل' || f.grade === gradeFilter) &&
    (statusFilter === 'all' || (statusFilter === 'active' ? f.active !== 0 : f.active === 0))
  );

  const total = items.length;
  const activeCount = items.filter((f) => f.active !== 0).length;
  const gradesWith = new Set(items.map((f) => f.grade)).size;

  const byCell = useMemo(() => {
    const map = {};
    items.forEach((f) => { const k = `${f.grade}||${f.day}`; (map[k] = map[k] || []).push(f); });
    Object.values(map).forEach((arr) => arr.sort((a, b) =>
      ((a.sort_order || 0) - (b.sort_order || 0)) || ((parseTime24(a.start_time) ?? 1440) - (parseTime24(b.start_time) ?? 1440))
    ));
    return map;
  }, [items]);

  /* كشف التعارضات: مواعيد بتتداخل لنفس الصف ونفس اليوم */
  const conflicts = useMemo(() => {
    const per = {};
    items.forEach((f) => { const k = `${f.grade}||${f.day}`; (per[k] = per[k] || []).push(f); });
    const out = [];
    Object.values(per).forEach((arr) => {
      const act = arr.filter((x) => x.active !== 0);
      for (let i = 0; i < act.length; i++) {
        for (let j = i + 1; j < act.length; j++) {
          const a = act[i], b = act[j];
          const as = parseTime24(a.start_time), bs = parseTime24(b.start_time);
          if (as == null || bs == null) continue;
          const ae = parseTime24(a.end_time) ?? as + 60;
          const be = parseTime24(b.end_time) ?? bs + 60;
          if (as < be && bs < ae) out.push({ grade: a.grade, day: a.day, a, b });
        }
      }
    });
    return out;
  }, [items]);

  const conflictIds = useMemo(() => new Set(conflicts.flatMap((c) => [c.a.id, c.b.id])), [conflicts]);

  const weekly = useMemo(() => {
    const act = items.filter((f) => f.active !== 0);
    const hours = act.reduce((sum, f) => {
      const s = parseTime24(f.start_time);
      if (s == null) return sum;
      const e = parseTime24(f.end_time);
      return sum + (e == null ? 60 : Math.max(0, e - s)) / 60;
    }, 0);
    return {
      hours: Math.round(hours * 10) / 10,
      days: new Set(act.map((f) => f.day)).size,
      grades: new Set(act.map((f) => f.grade)).size
    };
  }, [items]);

  const nxt = useMemo(() => nextSession(items, now, null), [items, now]);

  const exportPDF = () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    setTimeout(() => {
      const gradePart = gradeFilter === 'الكل' ? 'كل-الصفوف' : gradeFilter;
      html2pdf()
        .set({
          margin: 8,
          filename: `جدول-مواعيد-الدروس-${gradePart}-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true }
        })
        .from(exportRef.current)
        .save()
        .then(() => setExporting(false))
        .catch(() => setExporting(false));
    }, 60);
  };

  return (
    <div>
      <PageHeader
        title="مواعيد الدروس (أوفلاين)"
        subtitle="جدول الحصص الحضورية لكل المراحل — بيتعرض لحظياً في صفحة «مواعيد الدروس» والمساعد الذكي"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportPDF} disabled={exporting || items.length === 0} className="btn-ghost !py-2.5 text-sm disabled:opacity-50">
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              {exporting ? 'جاري إنشاء PDF...' : 'تصدير الجدول PDF'}
            </button>
            <button onClick={() => openAdd()} className="btn-primary !py-2.5 text-sm">
              <Plus size={16} /> إضافة موعد جديد
            </button>
          </div>
        }
      />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      {/* الحصة اللي جاية + الساعة الحية */}
      {nxt && (
        <div className={`mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${nxt.status === 'ongoing' ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-brand-500/40 bg-gradient-to-l from-brand-600/20 to-neon-400/10'}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${nxt.status === 'ongoing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-brand-500/20 text-brand-300'}`}>
              <Zap size={18} className="animate-pulse" />
            </span>
            <div>
              <div className="text-xs font-bold text-white/50">{nxt.status === 'ongoing' ? 'الحصة الجارية دلوقتي' : 'الحصة اللي جاية'}</div>
              <div className="text-sm font-black">{nxt.item.grade} • يوم {nxt.item.day} • <span className="text-neon-300">{fmt12m(nxt.startMin)}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white/55 sm:block">
              {nxt.status === 'ongoing' ? `بتخلص ${nxt.item.end_time ? fmt12Time(nxt.item.end_time) : 'بعد شوية'}` : `${dayLabel(nxt.dayOffset)} — بعد ${humanMinutes(nxt.minutesUntil)}`}
            </span>
            <div className="text-left">
              <div className="text-[10px] font-bold text-white/45">القاهرة (12 ساعة)</div>
              <div className="font-mono text-xl font-black text-neon-300" dir="ltr">{fmtClock12(now)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={CalendarDays} label="إجمالي المواعيد" value={total} accent="bg-brand-500/15 text-brand-300" />
        <Stat icon={Layers} label="صفوف عندها مواعيد" value={gradesWith} accent="bg-violet-500/15 text-violet-300" />
        <Stat icon={Eye} label="ظاهرة على الموقع" value={activeCount} accent="bg-emerald-500/15 text-emerald-300" />
        <Stat icon={AlertTriangle} label="تعارضات مواعيد" value={conflicts.length} accent={conflicts.length ? 'bg-red-500/15 text-red-300' : 'bg-white/10 text-white/50'} />
      </div>

      {/* ملخص الأسبوع */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/60 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white/55">
          <span className="flex items-center gap-1.5"><Scale size={14} className="text-brand-300" /> أسبوع شغال: <b className="text-white/85">{weekly.days} يوم</b></span>
          <span className="text-white/25">•</span>
          <span>إجمالي <b className="text-white/85">{weekly.hours} ساعة</b> / أسبوع</span>
          <span className="text-white/25">•</span>
          <span><b className="text-white/85">{weekly.grades} صف</b> نشط</span>
        </div>
        <span className="text-[11px] text-white/40">التصدير بيتعمل بالفلاتر اللي فاتحها دلوقتي</span>
      </div>

      {conflicts.length > 0 && (
        <Alert type="error">
          <div className="font-black">فيه تعارض في مواعيد: {conflicts.slice(0, 3).map((c) => `${c.grade} يوم ${c.day} (${fmt12Time(c.a.start_time)} و ${fmt12Time(c.b.start_time)})`).join(' • ')}{conflicts.length > 3 ? ' ...' : ''}</div>
          <div className="mt-1 text-xs text-red-300/70">التعارضات متظللة بالأحمر في الشبكة — عدل المواعيد المتداخلة</div>
        </Alert>
      )}

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white/45">الصف:</span>
          <button
            onClick={() => setGradeFilter('الكل')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${gradeFilter === 'الكل' ? 'bg-brand-600 text-pure shadow-glow' : 'border border-white/15 text-white/60 hover:border-brand-400 hover:text-brand-300'}`}
          >
            الكل ({total})
          </button>
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${gradeFilter === g ? 'bg-brand-600 text-pure shadow-glow' : 'border border-white/15 text-white/60 hover:border-brand-400 hover:text-brand-300'}`}
            >
              {g} ({items.filter((f) => f.grade === g).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/45">الحالة:</span>
            {[
              { value: 'all', label: 'الكل' },
              { value: 'active', label: 'ظاهر' },
              { value: 'hidden', label: 'مخفي' }
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setStatusFilter(o.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${statusFilter === o.value ? 'bg-brand-600 text-pure shadow-glow' : 'border border-white/15 text-white/60 hover:border-brand-400 hover:text-brand-300'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950 p-1">
            <button
              onClick={() => setView('grid')}
              title="شبكة الأسبوع"
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${view === 'grid' ? 'bg-brand-600 text-pure' : 'text-white/50 hover:text-white'}`}
            >
              <Grid2x2 size={14} /> الشبكة
            </button>
            <button
              onClick={() => setView('list')}
              title="عرض القائمة"
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${view === 'list' ? 'bg-brand-600 text-pure' : 'text-white/50 hover:text-white'}`}
            >
              <List size={14} /> القائمة
            </button>
          </div>
        </div>
      </div>

      {/* ===== الشبكة الأسبوعية (بضغطة زرار) ===== */}
      {view === 'grid' && (
        loading ? (
          <div className="mt-8"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="mt-8"><Empty text="مفيش مواعيد لحد دلوقتي — اضغط «إضافة موعد جديد» أو استخدم زر + في الخلايا." /></div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-ink-900/40">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 border-b border-l border-white/10 bg-ink-900 p-3 text-right text-xs font-black text-white/55">الصف</th>
                  {DAYS.map((d) => (
                    <th key={d} className={`border-b border-white/10 p-2.5 text-center text-xs font-black ${d === today ? 'text-neon-300' : 'text-white/55'}`}>
                      {d}
                      {d === today && <span className="mr-1.5 rounded-full bg-neon-400/15 px-1.5 py-0.5 text-[9px] font-black text-neon-300">اليوم</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRADES.map((g) => (
                  <tr key={g}>
                    <td className={`sticky right-0 z-10 border-b border-l border-white/10 bg-ink-900 p-2.5 text-xs font-extrabold ${gradeStyle(g)}`}>
                      {g} <span className="text-white/35">({items.filter((f) => f.grade === g).length})</span>
                    </td>
                    {DAYS.map((d) => {
                      const cells = byCell[`${g}||${d}`] || [];
                      return (
                        <td key={d} className="border-b border-white/10 p-1.5 align-top">
                          <div className="flex min-h-[68px] flex-col gap-1">
                            {cells.map((s) => (
                              <Chip
                                key={s.id}
                                s={s}
                                conflict={conflictIds.has(s.id)}
                                onEdit={() => openEdit(s)}
                                onDuplicate={() => duplicate(s)}
                                onDelete={() => del(s.id)}
                                onToggle={() => toggleActive(s)}
                              />
                            ))}
                            <button
                              onClick={() => openAdd({ grade: g, day: d })}
                              title={`إضافة موعد لـ ${g} يوم ${d}`}
                              className="flex h-6 w-full items-center justify-center rounded-lg border border-dashed border-white/15 text-white/30 transition-colors hover:border-brand-400/60 hover:bg-brand-500/10 hover:text-brand-300"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ===== القائمة ===== */}
      {view === 'list' && (
        loading ? (
          <div className="mt-8"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="mt-8"><Empty text="مفيش مواعيد لحد دلوقتي — اضغط «إضافة موعد جديد» فوق." /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-8"><Empty text="مفيش مواعيد مطابقة للفلاتر دي." /></div>
        ) : (
          <div className="mt-8 space-y-3">
            {DAYS.map((day) => {
              const rows = filtered.filter((f) => f.day === day);
              if (!rows.length) return null;
              return (
                <div key={day} className="card overflow-hidden">
                  <div className={`flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3 font-extrabold ${dayStyle(day)}`}>
                    <span className="flex items-center gap-2"><Clock size={15} /> {day}</span>
                    <span className="rounded-full bg-ink-950/40 px-2.5 py-0.5 text-xs font-black">{rows.length} حصة</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {rows.map((f) => (
                      <div key={f.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${f.active ? '' : 'opacity-50'}`}>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className={`rounded-lg border px-2.5 py-1 text-xs font-extrabold ${gradeStyle(f.grade)}`}>{f.grade}</span>
                          {f.period && (
                            <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold ${periodStyle(f.period)}`}>
                              {periodIcon(f.period)} {f.period}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-sm font-bold text-neon-300">
                            <Clock size={13} /> {fmt12Time(f.start_time)}{f.end_time ? ` - ${fmt12Time(f.end_time)}` : ''}
                          </span>
                          {f.tag && (
                            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${f.tag_active !== 0 ? 'bg-orange-400/15 text-orange-300' : 'bg-white/10 text-white/40'}`}>
                              🔖 {f.tag}{f.tag_active === 0 ? ' (مخفي)' : ''}
                            </span>
                          )}
                          {f.note && <span className="truncate text-xs text-white/45">{f.note}</span>}
                          <span className="flex items-center gap-1 text-[11px] text-white/35"><Hash size={11} /> ترتيب {f.sort_order}</span>
                          {!f.active && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">مخفي</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-white/45">
                            {f.active ? 'ظاهر' : 'مخفي'} <MiniSwitch checked={f.active !== 0} onChange={() => toggleActive(f)} />
                          </span>
                          <button onClick={() => openEdit(f)} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                            <Pencil size={13} /> تعديل
                          </button>
                          <ConfirmDelete onConfirm={() => del(f.id)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="card max-h-[92vh] w-full max-w-xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-extrabold"><CalendarDays size={20} className="text-brand-400" /> {editing ? 'تعديل الموعد' : 'إضافة موعد'}</h3>
              <button onClick={() => setModal(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-brand-400 hover:text-brand-300" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="الصف" required>
                  <Select options={GRADES.map((g) => ({ value: g, label: g }))} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required />
                </Field>
                <Field label="اليوم" required>
                  <Select options={DAYS.map((d) => ({ value: d, label: d }))} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} required />
                </Field>
                <Field label="وقت البداية" required hint="بنظام 12 ساعة — بتوقيت القاهرة">
                  <TimePicker12 value={form.start_time} onChange={(v) => setForm({ ...form, start_time: v })} />
                </Field>
                <Field label="وقت النهاية" hint="اختياري — بنظام 12 ساعة">
                  <TimePicker12 value={form.end_time} onChange={(v) => setForm({ ...form, end_time: v })} />
                </Field>
                <Field label="فترة الحصة" required>
                  <Select
                    options={PERIODS.map((p) => ({ value: p, label: `${periodIcon(p)} ${p}` }))}
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    required
                  />
                </Field>
                <Field label="الترتيب (الأصغر أولاً)">
                  <TextInput type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
                </Field>
                <Field label="ملاحظة قصيرة تظهر جنب المعاد" hint="مثال: فيه امتحان، مراجعة">
                  <div className="flex flex-col gap-2">
                    <TextInput value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="مثال: فيه امتحان" maxLength={60} />
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5">
                      <MiniSwitch checked={form.tag_active} onChange={(v) => setForm({ ...form, tag_active: v })} />
                      <span className="text-xs font-semibold text-white/70">{form.tag_active ? 'الملاحظة ظاهرة للطلاب' : 'الملاحظة مخفية عن الطلاب'}</span>
                    </label>
                  </div>
                </Field>
                <div className="flex items-end">
                  <label className="mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-ink-900 px-4 py-3">
                    <MiniSwitch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
                    <span className="text-sm font-semibold text-white/80">{form.active ? 'ظاهر على الموقع' : 'مخفي عن الموقع'}</span>
                  </label>
                </div>
              </div>
              <Field label="ملاحظة تفصيلية (اختياري)">
                <TextArea className="!min-h-[70px]" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} placeholder="مثال: حصة إضافية للمراجعة" />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                  {busy ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الموعد'}
                </button>
                <button type="button" onClick={() => setModal(false)} className="btn-ghost">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ورقة التصدير PDF — خارج الشاشة (شريط التمرير الأفقي للجدول الكامل) */}
      <div aria-hidden="true" className="pointer-events-none fixed top-0 z-[-1] w-max" style={{ left: '-10000px' }} ref={exportRef}>
        <div style={{ width: 1060, background: '#ffffff', color: '#1f2937', fontFamily: "'Cairo', sans-serif", direction: 'rtl', padding: 28 }}>
          <div style={{ textAlign: 'center', borderBottom: '3px solid #0d9488', paddingBottom: 14 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0d9488' }}>جدول مواعيد الدروس</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>منصة الفيزياء — مستر أحمد علي الديب</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {gradeFilter === 'الكل' ? 'كل الصفوف' : gradeFilter} • تم التصدير: {new Date().toLocaleDateString('ar-EG')}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #d1d5db', background: '#0d9488', color: '#ffffff', padding: '8px 6px', textAlign: 'right' }}>الصف</th>
                {DAYS.map((d) => (
                  <th key={d} style={{ border: '1px solid #d1d5db', background: '#0d9488', color: '#ffffff', padding: '8px 4px', textAlign: 'center' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRADES.filter((g) => gradeFilter === 'الكل' || g === gradeFilter).filter((g) => items.some((f) => f.grade === g)).map((g) => (
                <tr key={g}>
                  <td style={{ border: '1px solid #d1d5db', padding: 8, fontWeight: 800, background: '#f9fafb', color: '#0d9488' }}>{g}</td>
                  {DAYS.map((d) => {
                    const cells = (byCell[`${g}||${d}`] || []);
                    return (
                      <td key={d} style={{ border: '1px solid #d1d5db', padding: 6, verticalAlign: 'top', minHeight: 40 }}>
                        {cells.length === 0 ? (
                          <span style={{ color: '#e5e7eb' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {cells.map((s) => (
                              <div
                                key={s.id}
                                style={{
                                  borderRadius: 6,
                                  border: s.active !== 0 ? '1px solid #0d9488' : '1px dashed #d1d5db',
                                  background: s.active !== 0 ? '#ecfdf5' : '#f9fafb',
                                  color: s.active !== 0 ? '#065f46' : '#9ca3af',
                                  padding: '4px 6px',
                                  fontSize: 11,
                                  fontWeight: 700
                                }}
                              >
                                <div>{fmt12Time(s.start_time)}{s.end_time ? ` - ${fmt12Time(s.end_time)}` : ''} {periodIcon(s.period)}</div>
                                {s.tag && <div style={{ color: '#ea580c', fontSize: 10, fontWeight: 600 }}>🔖 {s.tag}</div>}
                                {s.active === 0 && <div style={{ fontSize: 9, color: '#9ca3af' }}>(مخفي عن الموقع)</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 18, fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>
            جدول الحصص الحضورية (أوفلاين) — المواعيد المخفية مش بتظهر للطلاب • منصة الفيزياء
          </div>
        </div>
      </div>
    </div>
  );
}

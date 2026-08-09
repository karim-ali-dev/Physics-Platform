import { useEffect, useState } from 'react';
import { CheckCheck, Loader2, ClipboardList, Phone, UserRound, MapPin, School, GraduationCap, Download, Search, Filter, FileSpreadsheet } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty, Alert, Select, TextInput } from '../../components/admin/ui';
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
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [opts, setOpts] = useState({ governorates: [], academicYears: [], grades: [] });

  const [status, setStatus] = useState('all');
  const [governorate, setGovernorate] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [grade, setGrade] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const qs = () => {
    const p = new URLSearchParams();
    if (status !== 'all') p.set('status', status);
    if (governorate) p.set('governorate', governorate);
    if (academicYear) p.set('academic_year', academicYear);
    if (grade) p.set('grade', grade);
    if (search) p.set('search', search);
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  const load = () => {
    setLoading(true);
    api(`/api/admin/bookings${qs()}`)
      .then((d) => { setItems(d.bookings); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [status, governorate, academicYear, grade, search]);

  useEffect(() => {
    api('/api/admin/bookings/filters')
      .then((d) => setOpts({ governorates: d.governorates || [], academicYears: d.academicYears || [], grades: d.grades || [] }))
      .catch(() => {});
  }, []);

  const toggle = async (id, next) => {
    setBusyId(id);
    await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    setBusyId(null);
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/bookings/${id}`, { method: 'DELETE' });
    setMsg('تم حذف الحجز');
    setTimeout(() => setMsg(null), 2500);
    load();
  };

  const hasFilters = Boolean(status !== 'all' || governorate || academicYear || grade || search);
  const clearFilters = () => {
    setStatus('all');
    setGovernorate('');
    setAcademicYear('');
    setGrade('');
    setSearch('');
    setSearchInput('');
  };

  const pendingCount = items.filter((b) => b.status === 'new').length;

  return (
    <div>
      <PageHeader
        title="حجوزات السنتر"
        subtitle={pendingCount > 0 ? `${pendingCount} حجز مستني تواصلك مع الطالب/ولي الأمر` : 'طلبات حجز الحصص الحضورية اللي بتبعت من صفحة مواعيد الدروس ومن حساب الطالب'}
        action={
          <div className="flex gap-2">
            <a href={`/api/admin/bookings/export?format=xlsx${qs()}`} className="btn-primary !py-2.5 text-sm">
              <FileSpreadsheet size={16} /> تحميل إكسل
            </a>
            <a href={`/api/admin/bookings/export?format=csv${qs()}`} className="btn-ghost !py-2.5 text-sm">
              <Download size={16} /> CSV
            </a>
          </div>
        }
      />

      {msg && <Alert type="ok">{msg}</Alert>}

      <div className="card mb-6 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white/70">
          <Filter size={15} className="text-brand-400" /> الفلاتر
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">الحالة</label>
            <Select
              options={statusFilter.map((f) => ({ value: f.value, label: f.label }))}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
          <div>
            <label className="label">المحافظة</label>
            <Select
              options={[{ value: '', label: 'كل المحافظات' }, ...opts.governorates.map((g) => ({ value: g, label: g }))]}
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">السنة الدراسية</label>
            <Select
              options={[{ value: '', label: 'كل السنوات' }, ...opts.academicYears.map((y) => ({ value: y, label: y }))]}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>
          <div>
            <label className="label">الصف الدراسي</label>
            <Select
              options={[{ value: '', label: 'كل الصفوف' }, ...opts.grades.map((g) => ({ value: g, label: g }))]}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35" />
            <TextInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالاسم أو رقم الموبايل..."
              className="pr-9"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setSearch(searchInput.trim()); } }}
            />
          </div>
          <button onClick={() => setSearch(searchInput.trim())} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white/75 hover:bg-white/20">
            بحث
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20">
              مسح الفلاتر
            </button>
          )}
          <span className="text-xs font-bold text-white/45">
            {items.length} حجز في الشاشة دي
          </span>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty text="مفيش حجوزات مطابقة للفلاتر دي." />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <div key={b.id} className={`card p-5 ${b.status === 'done' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-lg bg-brand-500/15 px-2.5 py-1 text-xs font-bold text-brand-300">
                      <ClipboardList size={13} /> حجز #{b.id}
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

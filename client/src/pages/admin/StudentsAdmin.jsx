import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, BookOpen, PlaySquare, ClipboardCheck, Download, CheckCircle2, Ban } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, ConfirmDelete, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const STATUS_META = {
  active: { label: 'نشط', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  pending: { label: 'قيد المراجعة', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  blocked: { label: 'موقوف', cls: 'bg-red-500/15 text-red-300 border-red-500/30' }
};

export default function StudentsAdmin() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    api('/api/admin/students')
      .then((d) => { setStudents(d.students); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (id) => {
    await api(`/api/admin/students/${id}`, { method: 'DELETE' });
    load();
  };

  const setStatus = async (id, status) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await api(`/api/admin/students/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    } catch (_) { /* ignore */ }
    setBusyId(null);
    load();
  };

  const listed = students.filter((s) => filter === 'all' || s.status === filter);
  const pendingCount = students.filter((s) => s.status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="الطلاب"
        subtitle={pendingCount > 0 ? `${pendingCount} حساب جديد مستني موافقتك` : `${students.length} طالب مسجل في المنصة`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-white/15 bg-ink-900 px-3 py-2.5 text-sm font-bold text-white/80"
            >
              <option value="all">كل الطلاب</option>
              <option value="pending">قيد المراجعة ({pendingCount})</option>
              <option value="active">نشط</option>
              <option value="blocked">موقوف</option>
            </select>
            <a href="/api/admin/export/students?format=csv" className="btn-ghost !py-2.5 text-sm">
              <Download size={16} /> CSV
            </a>
            <a href="/api/admin/export/students?format=xlsx" className="btn-primary !py-2.5 text-sm">
              <Download size={16} /> تصدير Excel
            </a>
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : students.length === 0 ? (
        <Empty text="مفيش طلاب مسجلين لحد دلوقتي." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="p-4 font-bold">الطالب</th>
                <th className="p-4 font-bold">كورسات</th>
                <th className="p-4 font-bold">دروس شاهدها</th>
                <th className="p-4 font-bold">اختبارات</th>
                <th className="p-4 font-bold">آخر نشاط</th>
                <th className="p-4 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {listed.map((s) => {
                const meta = STATUS_META[s.status] || STATUS_META.pending;
                return (
                  <tr key={s.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400 text-sm font-black text-pure">
                          {s.name?.charAt(0) || 'ط'}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-extrabold">{s.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs text-white/45" dir="ltr">{s.email}</span>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-bold text-white/70"><BookOpen size={14} className="text-brand-400" /> {s.courses_count}</span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-bold text-white/70"><PlaySquare size={14} className="text-neon-300" /> {s.watched_count}</span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-bold text-white/70"><ClipboardCheck size={14} className="text-emerald-300" /> {s.attempts_count}</span>
                    </td>
                    <td className="p-4 text-xs text-white/45">{s.last_login ? fmtDateTime(s.last_login) : '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link to={`${ADMIN_PATH}/students/${s.id}`} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                          <Eye size={13} /> تفاصيل
                        </Link>
                        {s.status !== 'active' && (
                          <button
                            onClick={() => setStatus(s.id, 'active')}
                            disabled={busyId === s.id}
                            title="تفعيل الحساب"
                            className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            <CheckCircle2 size={13} /> تفعيل
                          </button>
                        )}
                        {s.status === 'active' && (
                          <button
                            onClick={() => { if (window.confirm('متأكد إنك توقف حساب الطالب ده؟')) setStatus(s.id, 'blocked'); }}
                            disabled={busyId === s.id}
                            title="إيقاف الحساب"
                            className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                          >
                            <Ban size={13} /> إيقاف
                          </button>
                        )}
                        <ConfirmDelete onConfirm={() => del(s.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
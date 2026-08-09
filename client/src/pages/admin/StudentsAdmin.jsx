import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, BookOpen, PlaySquare, ClipboardCheck, Download } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, ConfirmDelete, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

export default function StudentsAdmin() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <PageHeader
        title="الطلاب"
        subtitle={`${students.length} طالب مسجل في المنصة`}
        action={
          <div className="flex flex-wrap gap-2">
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
          <table className="w-full min-w-[640px] text-right text-sm">
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
              {students.map((s) => (
                <tr key={s.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400 text-sm font-black text-pure">
                        {s.name?.charAt(0) || 'ط'}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-extrabold">{s.name}</div>
                        <div className="truncate text-xs text-white/45" dir="ltr">{s.email}</div>
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
                      <ConfirmDelete onConfirm={() => del(s.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Clock, Play } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, ConfirmDelete, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

export default function LessonsAdmin() {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (cid = courseFilter) => {
    const q = cid ? `?course_id=${cid}` : '';
    api(`/api/admin/lessons${q}`)
      .then((d) => { setLessons(d.lessons); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    api('/api/admin/courses').then((d) => setCourses(d.courses)).catch(() => {});
  }, []);

  const onFilter = (cid) => {
    setCourseFilter(cid);
    setLoading(true);
    load(cid);
  };

  const del = async (id) => {
    await api(`/api/admin/lessons/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="الدروس"
        subtitle="فيديوهات الشرح لكل كورس."
        action={
          <Link to={`${ADMIN_PATH}/lessons/new`} className="btn-primary !py-2.5 text-sm">
            <Plus size={17} /> إضافة درس
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-white/60">فلترة:</span>
        <select className="input max-w-xs" value={courseFilter} onChange={(e) => onFilter(e.target.value)}>
          <option value="">كل الكورسات</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : lessons.length === 0 ? (
        <Empty text="مفيش دروس لحد دلوقتي." />
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => (
            <div key={l.id} className={`card p-4 sm:p-5 ${l.active ? '' : 'opacity-50'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                    <Play size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{l.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/45">
                      <span className="text-brand-300">{l.course_title}</span>
                      {l.duration && <span className="flex items-center gap-1"><Clock size={12} /> {l.duration}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`hidden text-xs font-bold sm:block ${l.active ? 'text-emerald-300' : 'text-white/40'}`}>
                    {l.active ? 'ظاهر' : 'مخفي'}
                  </span>
                  <Link to={`${ADMIN_PATH}/lessons/${l.id}`} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                    <Pencil size={13} /> تعديل
                  </Link>
                  <ConfirmDelete onConfirm={() => del(l.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

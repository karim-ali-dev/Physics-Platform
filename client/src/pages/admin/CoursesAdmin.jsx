import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Users, PlaySquare, Star } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, ConfirmDelete, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

export default function CoursesAdmin() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api('/api/admin/courses')
      .then((d) => { setCourses(d.courses); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (id) => {
    await api(`/api/admin/courses/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="الكورسات"
        subtitle="إدارة الكورسات والدروس والاختبارات الخاصة بكل صف."
        action={
          <Link to={`${ADMIN_PATH}/courses/new`} className="btn-primary !py-2.5 text-sm">
            <Plus size={17} /> إضافة كورس
          </Link>
        }
      />

      {loading ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <Empty text="مفيش كورسات لحد دلوقتي." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className={`card overflow-hidden ${c.active ? '' : 'opacity-60'}`}>
              {c.cover ? (
                <img src={c.cover} alt={c.title} className="aspect-video w-full object-cover" />
              ) : (
                <div className="grid-bg flex aspect-video w-full items-center justify-center text-6xl">{c.icon}</div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 font-bold text-neon-300">{c.grade}</span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 font-bold text-brand-300">{c.term}</span>
                  {c.featured ? <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300">مميز</span> : null}
                </div>
                <h3 className="mt-3 font-extrabold">{c.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/45">
                  <span className="flex items-center gap-1"><PlaySquare size={13} /> {c.lessons_count} درس</span>
                  <span className="flex items-center gap-1"><Users size={13} /> {c.students_count} طالب</span>
                  {c.price && <span className="font-bold text-emerald-300">{c.price}</span>}
                  {Number(c.price_amount) > 0 && <span className="font-bold text-amber-300">{Number(c.price_amount).toLocaleString('ar-EG')} ج.م</span>}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className={`text-xs font-bold ${c.active ? 'text-emerald-300' : 'text-white/40'}`}>
                    {c.active ? 'ظاهر' : 'مخفي'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link to={`${ADMIN_PATH}/courses/${c.id}`} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                      <Pencil size={13} /> تعديل
                    </Link>
                    <ConfirmDelete onConfirm={() => del(c.id)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

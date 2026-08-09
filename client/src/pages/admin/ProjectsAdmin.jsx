import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Play } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api('/api/admin/projects')
      .then((d) => { setProjects(d.projects); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const del = async (id) => {
    await api(`/api/admin/projects/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="المشاريع"
        subtitle={`${projects.length} مشروع`}
        action={
          <Link to="/admin/projects/new" className="btn-primary !py-2.5 text-sm">
            <Plus size={17} /> مشروع جديد
          </Link>
        }
      />

      {loading ? (
        <Spinner />
      ) : projects.length === 0 ? (
        <Empty text="مفيش مشاريع. اضغط (مشروع جديد) عشان تضيف أول شغل." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-right">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/45">
                <th className="p-4">الغلاف</th>
                <th className="p-4">العنوان</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">مميز</th>
                <th className="p-4">الترتيب</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-white/5 transition-colors hover:bg-white/[.03]">
                  <td className="p-3">
                    {p.cover ? (
                      <img src={p.cover} alt={p.title} className="h-14 w-24 rounded-lg object-cover" />
                    ) : (
                      <span className="block h-14 w-24 rounded-lg bg-ink-700" />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-bold">{p.title}</div>
                    {p.video_url && <div className="mt-0.5 flex items-center gap-1 text-xs text-white/40"><Play size={11} /> فيه فيديو</div>}
                  </td>
                  <td className="p-3 text-sm text-white/60">{p.category}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                      {p.active ? 'ظاهر' : 'مخفي'}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {p.featured ? <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">مميز</span> : <span className="text-white/30">—</span>}
                  </td>
                  <td className="p-3 text-sm text-white/50">{p.sort_order}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/projects/${p.id}`}
                        className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20"
                      >
                        <Pencil size={13} /> تعديل
                      </Link>
                      <ConfirmDelete onConfirm={() => del(p.id)} />
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

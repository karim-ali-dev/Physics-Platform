import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import SectionHeading from '../components/SectionHeading';
import ProjectCard from '../components/ProjectCard';
import VideoModal from '../components/VideoModal';
import Spinner from '../components/Spinner';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('الكل');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api('/api/projects'), api('/api/categories')])
      .then(([p, c]) => {
        if (cancelled) return;
        setProjects(p.projects);
        setCategories(c.categories);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => (activeCat === 'الكل' ? projects : projects.filter((p) => p.category === activeCat)),
    [projects, activeCat]
  );

  return (
    <div className="container-x pt-28 pb-20">
      <SectionHeading
        badge="معرض الأعمال"
        title="مشاريعي"
        subtitle="كل شغل اتقدم فيه بكل حب — اختار تصنيف ومشاهدة اللي يهمك."
      />

      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setActiveCat('الكل')}
          className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
            activeCat === 'الكل' ? 'bg-brand-600 text-pure shadow-glow' : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCat(c)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
              activeCat === c ? 'bg-brand-600 text-pure shadow-glow' : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="جاري تحميل الأعمال..." />
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-white/50">مفيش مشاريع في التصنيف ده حالياً.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onPlay={setSelected} />
          ))}
        </div>
      )}

      <VideoModal project={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

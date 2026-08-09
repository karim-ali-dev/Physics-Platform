import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { api } from '../api';
import SectionHeading from '../components/SectionHeading';
import Spinner from '../components/Spinner';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [grade, setGrade] = useState('الكل');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/courses/grades')
      .then((d) => setGrades(['الكل', ...d.grades]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api(`/api/courses${grade !== 'الكل' ? `?grade=${encodeURIComponent(grade)}` : ''}`)
      .then((d) => { setCourses(d.courses); setLoading(false); })
      .catch(() => setLoading(false));
  }, [grade]);

  return (
    <div className="container-x pt-28 pb-16">
      <SectionHeading
        badge="الكورسات"
        title="كل كورسات الفيزياء"
        subtitle="كورسات كاملة لكل الصفوف — اختار صفك وابدأ المذاكرة فوراً."
      />

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {grades.map((g) => (
          <button
            key={g}
            onClick={() => setGrade(g)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
              grade === g ? 'bg-brand-600 text-pure shadow-glow' : 'border border-white/10 bg-white/5 text-white/70 hover:border-brand-500/40 hover:text-white'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="جاري تحميل الكورسات..." />
      ) : courses.length === 0 ? (
        <p className="py-20 text-center text-white/50">مفيش كورسات في الصف ده لسه.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => (
            <div key={c.id} className="card flex flex-col p-6 hover:border-brand-500/40">
              <div className="flex items-center justify-between">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-3xl">
                  <span className="animate-float" style={{ animationDelay: `${(i % 4) * 0.4}s` }}>{c.icon}</span>
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neon-300">{c.term}</span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{c.title}</h3>
              <p className="mt-1 text-xs font-semibold text-brand-300">{c.grade}</p>
              <p className="mt-2 flex-1 text-sm leading-6 text-white/55">{c.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-white/45">
                <span>{c.lessons_count} درس</span>
                <span className={`font-bold ${Number(c.price_amount) > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {Number(c.price_amount) > 0 ? `${Number(c.price_amount).toLocaleString('ar-EG')} ج.م` : (c.price || 'مجاني')}
                </span>
              </div>
              <Link to={`/courses/${c.id}`} className="btn-ghost mt-5 w-full !py-2.5 text-sm">
                شوف الكورس <ArrowLeft size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-12 flex flex-col items-center justify-between gap-4 p-8 text-center sm:flex-row sm:text-right">
        <div>
          <h3 className="text-xl font-black">محتار تبدأ منين؟</h3>
          <p className="mt-1 text-sm text-white/55">كلم مستر أحمد على الواتساب وهيوجهك للخطة المناسبة ليك.</p>
        </div>
        <Link to="/contact" className="btn-primary shrink-0">
          <GraduationCap size={18} /> تواصل معنا
        </Link>
      </div>
    </div>
  );
}

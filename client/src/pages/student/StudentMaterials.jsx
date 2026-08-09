import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, ArrowRight, BookMarked } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../store/AppContext';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

export default function StudentMaterials() {
  const { customer } = useApp();
  const [materials, setMaterials] = useState(null);

  useEffect(() => {
    api('/api/customer/materials')
      .then((d) => setMaterials(d.materials || []))
      .catch(() => setMaterials([]));
  }, []);

  const required = (materials || []).filter((m) => !m.is_optional);
  const optional = (materials || []).filter((m) => m.is_optional);

  const renderGroup = (list, badge) => (
    <div className="space-y-3">
      {list.map((m) => (
        <div key={m.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15">
              <FileText size={22} className="text-red-400" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold">{m.title}</span>
                {badge}
                {m.grade !== 'الكل' && (
                  <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[11px] font-bold text-brand-300">{m.grade}</span>
                )}
              </div>
              {m.description && <p className="mt-1 text-sm text-white/55">{m.description}</p>}
              <div className="mt-1 text-xs text-white/45">
                {m.file_name || m.file_url.split('/').pop()}
                {m.file_size > 0 ? ` • ${(m.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                {m.created_at ? ` • ${fmtDateTime(m.created_at)}` : ''}
              </div>
            </div>
          </div>
          <a
            href={m.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary shrink-0 !py-2.5 text-sm"
          >
            <Download size={16} /> تحميل
          </a>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container-x pt-28 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">ملفات المذاكرة</h1>
          <p className="mt-1 text-sm text-white/50">مذكرات ومراجعات PDF من مستر أحمد — لصفك الدراسي.</p>
        </div>
        <Link to="/student/account" className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/5">
          <ArrowRight size={16} /> حسابي
        </Link>
      </div>

      {!customer ? (
        <div className="card mt-8 p-10 text-center">
          <BookMarked size={40} className="mx-auto mb-4 text-white/20" />
          <p className="text-white/60">سجّل دخولك عشان تشوف ملفات مذاكرة صفك.</p>
          <Link to="/student/login" className="btn-primary mt-5">تسجيل الدخول</Link>
        </div>
      ) : materials === null ? (
        <div className="mt-10"><Spinner label="جاري تحميل الملفات..." /></div>
      ) : materials.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <BookMarked size={40} className="mx-auto mb-4 text-white/20" />
          <p className="text-white/60">لسه مفيش ملفات مذاكرة لصفك — المستر بيضيفها وهتظهر هنا تلقائياً.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-emerald-300">
              <Download size={18} /> الملفات المطلوبة
            </h2>
            {required.length === 0 ? (
              <p className="text-sm text-white/45">مفيش ملفات مطلوبة حالياً.</p>
            ) : renderGroup(required, <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">مطلوب</span>)}
          </section>
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-amber-300">
              <BookMarked size={18} /> ملفات اختيارية (للي محبين الزيادة)
            </h2>
            {optional.length === 0 ? (
              <p className="text-sm text-white/45">مفيش ملفات اختيارية حالياً.</p>
            ) : renderGroup(optional, <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">اختياري</span>)}
          </section>
        </div>
      )}
    </div>
  );
}

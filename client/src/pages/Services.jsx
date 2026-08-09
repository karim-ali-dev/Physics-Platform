import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';
import SectionHeading from '../components/SectionHeading';
import Spinner from '../components/Spinner';

export default function Services() {
  const { settings } = useApp();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const whatsapp = settings.whatsapp || '201099724825';

  useEffect(() => {
    api('/api/services')
      .then((d) => { setServices(d.services); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="pt-28 pb-20">
      <div className="container-x">
        <SectionHeading
          badge="خدماتي"
          title="كل اللي محتاجه للفيديو المثالي"
          subtitle="أسعار واضحة من غير مفاجآت، وجودة بنضمنها في كل مشروع."
        />
      </div>

      {loading ? (
        <Spinner label="جاري التحميل..." />
      ) : (
        <div className="container-x grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            let features = [];
            try { features = JSON.parse(s.features || '[]'); } catch (_) { features = []; }
            return (
              <div key={s.id} className="card flex flex-col p-7 transition-all hover:-translate-y-1 hover:border-brand-500/50">
                <div className="flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-neon-400/10 text-3xl">
                    {s.icon}
                  </span>
                  <span className="rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-black text-brand-300">{s.price}</span>
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/55">{s.description}</p>
                {features.length > 0 && (
                  <ul className="mt-5 space-y-2.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                        <Check size={15} className="shrink-0 text-neon-400" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`عايز أطلب خدمة: ${s.title}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary mt-7 w-full"
                >
                  <MessageCircle size={17} /> اطلب الخدمة
                </a>
              </div>
            );
          })}
        </div>
      )}

      <div className="container-x mt-16">
        <div className="card flex flex-col items-center justify-between gap-6 p-10 text-center sm:flex-row sm:text-right">
          <div>
            <h3 className="text-2xl font-black">محتار تحدد احتياجك؟</h3>
            <p className="mt-2 text-sm text-white/60">كلمني هساعدك تعرف الخدمة الأنسب لمشروعك.</p>
          </div>
          <Link to="/contact" className="btn-primary shrink-0">راسلني دلوقتي</Link>
        </div>
      </div>
    </div>
  );
}

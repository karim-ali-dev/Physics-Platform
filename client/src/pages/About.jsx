import { Link } from 'react-router-dom';
import { Quote, MessageCircle, Award, Users, Clock3, TrendingUp } from 'lucide-react';
import { useApp } from '../store/AppContext';
import Atom3D from '../components/Atom3D';

export default function About() {
  const { settings } = useApp();
  const whatsapp = settings.whatsapp || '201099724825';

  const values = [
    { icon: Award, title: 'شرح مبسط', text: 'بنوصّل أصعب المفاهيم في الفيزياء بطريقة سهلة وواضحة.' },
    { icon: Users, title: 'متابعة حقيقية', text: 'كل طالب ليه حساب وبيانات تقدمه محفوظة خطوة بخطوة.' },
    { icon: Clock3, title: 'الالتزام بالوقت', text: 'الدروس والاختبارات متاحة على مدار اليوم من أي مكان.' },
    { icon: TrendingUp, title: 'تحديث مستمر', text: 'المناهج والشرح بيتطور باستمرار حسب التعديلات الجديدة.' }
  ];

  return (
    <div className="pt-28 pb-20">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="mb-4 inline-block rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-300">
            عن المدرس
          </span>
          <h1 className="text-4xl font-black leading-tight">{settings.about_title || 'مستر أحمد علي الديب'}</h1>
          <p className="mt-6 text-base leading-9 text-white/65">{settings.about_text || ''}</p>
          <blockquote className="mt-6 border-r-4 border-brand-500 bg-brand-500/5 p-5 text-lg font-bold text-brand-300">
            "{settings.about_quote || 'الفيزياء مش حفظ، الفيزياء فهم.'}"
          </blockquote>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn-primary">
              <MessageCircle size={18} /> خلينا نتكلم
            </a>
            <Link to="/courses" className="btn-ghost">شوف الكورسات</Link>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-brand-600/20 to-neon-400/10 blur-2xl" />
          <div className="grid-bg relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-ink-800">
            <div className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
              <div className="pointer-events-none absolute -inset-8 rounded-full bg-brand-600/20 blur-3xl" />
              <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-brand-500/30" />
              <div className="absolute inset-9 rounded-full border border-neon-400/20" />
              <Atom3D className="relative h-40 w-40 sm:h-52 sm:w-52" />
              <span className="absolute -inset-2 animate-pingSoft rounded-full border border-brand-400/30" />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink-950/90 to-transparent p-6 text-center">
              <div className="text-lg font-extrabold">أحمد علي الديب</div>
              <div className="text-sm text-brand-300">مدرس فيزياء - من رابعة ابتدائي لتالتة ثانوي</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-x mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((v, i) => (
          <div key={v.title} className="card hover-lift p-6 text-center hover:border-brand-500/40">
            <span
              className="mx-auto mb-4 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400"
              style={{ animationDelay: `${i * 0.25}s` }}
            >
              <v.icon size={24} />
            </span>
            <h3 className="text-lg font-extrabold">{v.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">{v.text}</p>
          </div>
        ))}
      </div>

      <div className="container-x mt-16">
        <div className="card flex flex-col items-center justify-between gap-6 p-10 text-center sm:flex-row sm:text-right">
          <div className="flex items-center gap-4">
            <Quote size={40} className="shrink-0 text-brand-500" />
            <p className="text-lg font-bold text-white/80">جاهز تحل معايا سؤال فيزياء أي وقت.</p>
          </div>
          <Link to="/contact" className="btn-primary shrink-0">اسأل سؤال</Link>
        </div>
      </div>
    </div>
  );
}

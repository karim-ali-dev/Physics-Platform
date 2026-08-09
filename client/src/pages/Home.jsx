import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowLeft, CheckCircle2, MessageCircle, GraduationCap, Gamepad2, CalendarDays } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';
import Scene3D from '../components/Scene3D';
import Atom3D from '../components/Atom3D';
import PhysicsIcon from '../components/PhysicsIcon';
import SectionHeading from '../components/SectionHeading';
import Testimonials3D from '../components/Testimonials3D';

export default function Home() {
  const { settings } = useApp();
  const [courses, setCourses] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    Promise.all([api('/api/courses'), api('/api/testimonials')])
      .then(([c, t]) => {
        setCourses(c.courses.slice(0, 6));
        setTestimonials(t.testimonials.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const stats = [
    { value: settings.stats_students || '8500', label: 'طالب استفاد' },
    { value: settings.stats_courses || '12', label: 'كورس كامل' },
    { value: settings.stats_years || '15', label: 'سنة خبرة' },
    { value: settings.stats_lessons || '300', label: 'درس فيديو' }
  ];

  const highlights = [
    { kind: 'atom', title: 'شرح مبسط', text: 'أصعب قوانين الفيزياء بتتشرح بأسلوب بسيط يوصلك الفكرة من أول مرة.' },
    { kind: 'gravity', title: 'مسائل محلولة', text: 'مسائل خطوة بخطوة على نمط امتحانات السنوات السابقة.' },
    { kind: 'bolt', title: 'اختبارات تفاعلية', text: 'اختبارات على كل باب بتتصحح فوراً مع شرح الإجابة.' },
    { kind: 'planet', title: 'متابعة تقدمك', text: 'علامات تقدمك ونتائجك محفوظة في حسابك في أي وقت.' }
  ];

  const whatsapp = settings.whatsapp || '201099724825';

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <Scene3D />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          <span className="absolute right-[8%] top-[24%] animate-float text-brand-400/60"><PhysicsIcon kind="atom" size={42} /></span>
          <span className="absolute left-[7%] top-[32%] animate-floatSlow text-neon-400/50" style={{ animationDelay: '.6s' }}><PhysicsIcon kind="bolt" size={36} /></span>
          <span className="absolute bottom-[26%] right-[14%] animate-float text-emerald-400/50" style={{ animationDelay: '1.2s' }}><PhysicsIcon kind="planet" size={32} /></span>
          <span className="absolute bottom-[22%] left-[12%] animate-floatSlow text-amber-400/50" style={{ animationDelay: '1.8s' }}><PhysicsIcon kind="wave" size={30} /></span>
        </div>

        <div className="container-x relative z-10 py-20 text-center">
          <span className="animate-fadeUp mb-6 inline-block rounded-full border border-brand-500/40 bg-brand-500/10 px-5 py-2 text-sm font-bold text-brand-300 backdrop-blur">
            {settings.hero_badge || 'مستر أحمد علي الديب • فيزياء الثانوية العامة'}
          </span>
          <h1 className="animate-fadeUp mx-auto max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl" style={{ animationDelay: '.1s' }}>
            <span className="grad-text">{settings.hero_title || 'افهم الفيزياء مرة واحدة وإلى الأبد'}</span>
          </h1>
          <p className="animate-fadeUp mx-auto mt-6 max-w-xl text-base leading-8 text-white/65 sm:text-lg" style={{ animationDelay: '.2s' }}>
            {settings.hero_subtitle || 'شرح مبسط، مسائل محلولة خطوة بخطوة، واختبارات تحاكي الامتحان الفعلي.'}
          </p>
          <div className="animate-fadeUp mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: '.3s' }}>
            <Link to="/courses" className="btn-primary w-full sm:w-auto">
              <Play size={18} fill="currentColor" /> ابدأ المذاكرة
            </Link>
            <Link to="/student/register" className="btn-ghost w-full sm:w-auto">
              <GraduationCap size={18} /> اعمل حساب مجاني
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-x -mt-10 relative z-10">
        <div className="card grid grid-cols-2 gap-6 p-8 sm:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="grad-text text-3xl font-black sm:text-4xl">{s.value}+</div>
              <div className="mt-1 text-sm font-semibold text-white/55">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Offline schedule CTA */}
      <section className="container-x mt-10">
        <div className="grid-bg relative flex flex-col items-center justify-between gap-5 overflow-hidden rounded-[2rem] border border-brand-500/30 bg-brand-500/5 p-7 sm:p-8 lg:flex-row">
          <div className="pointer-events-none absolute -inset-10 bg-gradient-to-br from-brand-600/15 to-neon-400/10 blur-2xl" />
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-right">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 shadow-glow">
              <CalendarDays size={30} className="text-pure" />
            </span>
            <div>
              <div className="text-lg font-black sm:text-xl">مواعيد الدروس الحضورية <span className="grad-text">(أوفلاين)</span></div>
              <p className="mt-1 max-w-xl text-sm leading-6 text-white/55">جدول الحصص لكل المراحل — من رابعة ابتدائي لحد تالتة ثانوي، بيتحدث باستمرار من المدرس.</p>
            </div>
          </div>
          <Link to="/schedule" className="btn-primary shrink-0">شوف المواعيد <ArrowLeft size={18} /></Link>
        </div>
      </section>

      {/* Courses */}
      <section className="container-x py-24">
        <SectionHeading
          badge="الكورسات"
          title="اختار كورسك وابدأ"
          subtitle="كورسات كاملة من رابعة ابتدائي لحد تالتة ثانوي — شرح، مسائل، واختبارات في مكان واحد."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => (
            <div key={c.id} className="card flex flex-col p-6 hover:border-brand-500/40">
              <div className="flex items-center justify-between">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-3xl">
                  <span className="animate-float" style={{ animationDelay: `${(i % 4) * 0.4}s` }}>{c.icon}</span>
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neon-300">{c.grade}</span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{c.title}</h3>
              <p className="mt-1 text-xs font-semibold text-brand-300">{c.term}</p>
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
        <div className="mt-10 text-center">
          <Link to="/courses" className="btn-primary">
            كل الكورسات <ArrowLeft size={18} />
          </Link>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-y border-white/5 bg-ink-900/50 py-20">
        <div className="container-x grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h, i) => (
            <div key={h.title} className="card p-6 text-center hover:border-brand-500/40">
              <span
                className="relative mx-auto mb-4 flex h-14 w-14 animate-float items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400"
                style={{ animationDelay: `${i * 0.25}s` }}
              >
                <span className="absolute -inset-1 animate-pingSoft rounded-2xl border border-brand-400/25" />
                <PhysicsIcon kind={h.kind} size={26} />
              </span>
              <h3 className="text-lg font-extrabold">{h.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Games promo */}
      <section className="container-x py-16">
        <div className="card relative overflow-hidden p-8 sm:p-10">
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-neon-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <span className="flex h-16 w-16 shrink-0 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 text-pure shadow-glow">
                <Gamepad2 size={30} />
              </span>
              <div className="text-center sm:text-right">
                <h3 className="text-xl font-black sm:text-2xl">اختبر قوانين الفيزياء باللعب 🎮</h3>
                <p className="mt-1 text-sm text-white/55">ألعاب تفاعلية على حركة المقذوفات، كمية الحركة، الجاذبية، وقانون أوم.</p>
              </div>
            </div>
            <Link to="/games" className="btn-primary shrink-0">
              العب دلوقتي <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* About preview */}
      <section className="container-x py-24">
        <div className="card grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-300">
              عن المدرس
            </span>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">{settings.about_title || 'أنا أحمد علي الديب'}</h2>
            <p className="mt-5 text-sm leading-8 text-white/65">{settings.about_text}</p>
            <blockquote className="mt-6 border-r-4 border-brand-500 pr-4 text-lg font-bold text-brand-300">
              "{settings.about_quote || 'الفيزياء مش حفظ قوانين.. الفيزياء فهم'}"
            </blockquote>
            <Link to="/about" className="btn-ghost mt-8">
              اعرف أكثر <ArrowLeft size={18} />
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
              <div className="pointer-events-none absolute -inset-8 rounded-full bg-brand-600/20 blur-3xl" />
              <div className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-brand-500/30" />
              <div className="absolute inset-10 rounded-full border border-neon-400/20" />
              <Atom3D className="h-40 w-40 sm:h-52 sm:w-52" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="container-x pb-24">
        <div className="card relative overflow-hidden p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-neon-400/15 blur-3xl" />
          <h2 className="relative text-3xl font-black sm:text-4xl">مستعد تفهم الفيزياء صح؟</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-sm leading-7 text-white/60">
            اعمل حساب مجاني وسجّل في كورسك فوراً — كل الدروس والاختبارات متاحة لك من أول يوم.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/student/register" className="btn-primary w-full sm:w-auto">
              <GraduationCap size={18} /> أنشئ حسابك الآن
            </Link>
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost w-full sm:w-auto">
              <MessageCircle size={18} /> واتساب مباشر
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials preview */}
      <section className="border-t border-white/5 bg-ink-900/50 py-24">
        <div className="container-x">
          <SectionHeading badge="آراء الطلاب" title="إيه اللي بيقولوه عن مستر أحمد؟" />
          {testimonials.length > 0 ? (
            <Testimonials3D items={testimonials} />
          ) : (
            <p className="py-16 text-center text-white/45">مفيش تقييمات معتمدة لحد دلوقتي.</p>
          )}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-white/50">
            <CheckCircle2 size={16} className="text-brand-400" /> كل الكورسات مجانية
            <CheckCircle2 size={16} className="text-brand-400" /> تقدمك محفوظ تلقائياً
            <CheckCircle2 size={16} className="text-brand-400" /> اختبارات على نمط الامتحان
          </div>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Atom, Menu, X, Phone, MessageCircle, UserRound, GraduationCap } from 'lucide-react';
import { useApp } from '../store/AppContext';
import ThemeToggle from './ThemeToggle';
import LiveClock from './LiveClock';

const links = [
  { to: '/', label: 'الرئيسية' },
  { to: '/courses', label: 'الكورسات' },
  { to: '/schedule', label: 'مواعيد الدروس' },
  { to: '/games', label: 'ألعاب فيزيائية' },
  { to: '/about', label: 'عن المدرس' },
  { to: '/contact', label: 'تواصل معنا' }
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { settings, customer } = useApp();
  const location = useLocation();
  const whatsapp = settings.whatsapp || '201099724825';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-ink-950/90 shadow-card backdrop-blur-xl' : 'bg-transparent'}`}>
      <div className="hidden border-b border-white/5 md:block">
        <div className="container-x flex h-8 items-center justify-between">
          <LiveClock />
          <p className="text-xs text-white/35">منصة الفيزياء • مستر أحمد علي الديب</p>
        </div>
      </div>
      <div className="container-x flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-neon-400 shadow-glow">
            <span className="absolute -inset-1 animate-pingSoft rounded-xl border border-brand-400/40" />
            <Atom size={22} className="animate-spin-slow text-pure" />
          </span>
          <span className="hidden sm:block"><span className="grad-text">منصة الفيزياء</span> <span className="text-sm font-bold text-white/55">مستر أحمد علي الديب</span></span>
          <span className="grad-text sm:hidden">منصة الفيزياء</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'text-brand-400' : 'text-white/70 hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {customer ? (
            <Link to="/student/account" className="btn-primary !px-4 !py-2 text-sm">
              <GraduationCap size={18} />
              منصتي
            </Link>
          ) : (
            <Link to="/student/login" className="btn-ghost !px-4 !py-2 text-sm">
              <UserRound size={18} />
              دخول الطلاب
            </Link>
          )}
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost !px-4 !py-2 text-sm">
            <MessageCircle size={18} />
            واتساب
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10"
            aria-label="القائمة"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink-950/95 backdrop-blur-xl lg:hidden">
          <nav className="container-x flex flex-col gap-1 py-4">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-white/5 text-brand-400' : 'text-white/75 hover:text-white'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {customer ? (
              <Link to="/student/account" className="btn-primary mt-2">
                <GraduationCap size={18} />
                منصتي
              </Link>
            ) : (
              <Link to="/student/login" className="btn-ghost mt-2">
                <UserRound size={18} />
                دخول الطلاب
              </Link>
            )}
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost mt-2">
              <MessageCircle size={18} />
              واتساب
            </a>
            <Link to="/contact" className="btn-ghost mt-2">
              <Phone size={18} />
              تواصل معنا
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PlaySquare, ClipboardCheck, Users, Star, HelpCircle,
  Inbox, Settings, ShieldCheck, LogOut, Menu, X, Atom, ExternalLink, CalendarDays, MailQuestion, Wallet, Building2, FileText
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { ADMIN_PATH } from '../../config';
import ThemeToggle from '../ThemeToggle';
import LiveClock from '../LiveClock';

const items = [
  { to: `${ADMIN_PATH}`, end: true, icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: `${ADMIN_PATH}/courses`, icon: BookOpen, label: 'الكورسات' },
  { to: `${ADMIN_PATH}/lessons`, icon: PlaySquare, label: 'الدروس' },
  { to: `${ADMIN_PATH}/quizzes`, icon: ClipboardCheck, label: 'الاختبارات' },
  { to: `${ADMIN_PATH}/schedule`, icon: CalendarDays, label: 'مواعيد الدروس' },
  { to: `${ADMIN_PATH}/help-requests`, icon: MailQuestion, label: 'طلبات المساعدة' },
  { to: `${ADMIN_PATH}/payments`, icon: Wallet, label: 'مدفوعات الكورسات' },
  { to: `${ADMIN_PATH}/bookings`, icon: Building2, label: 'حجوزات السنتر' },
  { to: `${ADMIN_PATH}/students`, icon: Users, label: 'الطلاب' },
  { to: `${ADMIN_PATH}/materials`, icon: FileText, label: 'ملفات المذاكرة' },
  { to: `${ADMIN_PATH}/testimonials`, icon: Star, label: 'آراء الطلاب' },
  { to: `${ADMIN_PATH}/faqs`, icon: HelpCircle, label: 'الأسئلة الشائعة' },
  { to: `${ADMIN_PATH}/messages`, icon: Inbox, label: 'الرسائل' },
  { to: `${ADMIN_PATH}/settings`, icon: Settings, label: 'إعدادات الموقع' },
  { to: `${ADMIN_PATH}/security`, icon: ShieldCheck, label: 'الحماية وكلمة السر' }
];

export default function AdminLayout() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout();
    navigate(`${ADMIN_PATH}/login`);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-neon-400">
          <Atom size={22} className="text-pure" />
        </span>
        <div>
          <div className="font-black">منصة الفيزياء</div>
          <div className="text-xs text-white/45">لوحة تحكم المدرس</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand-600 text-pure shadow-glow' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <it.icon size={18} /> {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link to="/" target="_blank" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white">
          <ExternalLink size={18} /> فتح الموقع
        </Link>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-sm font-bold">{user?.username || 'مدرس الفيزياء'}</div>
          <div className="text-xs text-white/40">مدرس المنصة</div>
        </div>
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10">
          <LogOut size={18} /> تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ink-950">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 border-l border-white/10 bg-ink-900 lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/80" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 border-l border-white/10 bg-ink-900">
            <button onClick={() => setOpen(false)} className="absolute left-3 top-3 rounded-lg border border-white/10 p-2" aria-label="إغلاق">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:mr-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-ink-950/90 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg border border-white/10 p-2 lg:hidden" aria-label="القائمة">
            <Menu size={20} />
          </button>
          <h1 className="flex-1 font-extrabold">لوحة تحكم المدرس</h1>
          <div className="hidden xl:block"><LiveClock /></div>
          <ThemeToggle />
          <span className="hidden rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-300 sm:block">
            {user?.username || 'مدرس الفيزياء'}
          </span>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

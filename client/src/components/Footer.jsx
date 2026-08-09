import { Link } from 'react-router-dom';
import { Atom, Phone, Mail, MapPin, Instagram, Facebook, Youtube, Music2, Gamepad2 } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function Footer() {
  const { settings } = useApp();
  const socials = [
    { href: settings.instagram, icon: Instagram, label: 'Instagram' },
    { href: settings.tiktok, icon: Music2, label: 'TikTok' },
    { href: settings.youtube, icon: Youtube, label: 'YouTube' },
    { href: settings.facebook, icon: Facebook, label: 'Facebook' }
  ].filter((s) => s.href && settings.show_social !== '0');

  return (
    <footer className="mt-20 border-t border-white/10 bg-ink-900/60">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-neon-400">
              <Atom size={22} className="text-pure" />
            </span>
            <span className="grad-text">منصة الفيزياء</span>
          </Link>
          <p className="mt-4 text-sm leading-7 text-white/60">{settings.footer_tagline || 'علّمهم تفكير الفيزياء، والنتائج هتيجي لوحدها.'}</p>
          <div className="mt-4 flex gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-brand-400 hover:text-brand-400"
                aria-label={s.label}
              >
                <s.icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-extrabold">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li><Link to="/courses" className="transition-colors hover:text-brand-400">الكورسات</Link></li>
            <li><Link to="/schedule" className="transition-colors hover:text-brand-400">مواعيد الدروس</Link></li>
            <li><Link to="/games" className="transition-colors hover:text-brand-400">ألعاب فيزيائية</Link></li>
            <li><Link to="/about" className="transition-colors hover:text-brand-400">عن المدرس</Link></li>
            <li><Link to="/faq" className="transition-colors hover:text-brand-400">الأسئلة الشائعة</Link></li>
            <li><Link to="/contact" className="transition-colors hover:text-brand-400">تواصل معنا</Link></li>
            <li><Link to="/student/login" className="transition-colors hover:text-brand-400">حساب الطلاب</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-extrabold">تواصل معانا</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-center gap-2"><Phone size={16} className="text-brand-400" /><span dir="ltr">{settings.phone}</span></li>
            {settings.email && settings.show_email === '1' && (
              <li className="flex items-center gap-2"><Mail size={16} className="text-brand-400" /><span dir="ltr">{settings.email}</span></li>
            )}
            <li className="flex items-center gap-2"><MapPin size={16} className="text-brand-400" />{settings.city || 'مصر'}</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-extrabold">ابدأ المذاكرة</h4>
          <p className="text-sm leading-7 text-white/60">اعمل حساب مجاني وسجّل في الكورس اللي بتذاكره دلوقتي، وشوف الدروس والاختبارات فوراً.</p>
          <Link to="/student/register" className="btn-primary mt-4 w-full">أنشئ حسابك الآن</Link>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <div className="container-x flex flex-col items-center justify-between gap-3 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} منصة مستر أحمد علي الديب للفيزياء — جميع الحقوق محفوظة</p>
          <Link to="/games" className="flex items-center gap-1.5 transition-colors hover:text-brand-400" title="ألعاب فيزيائية">
            <Gamepad2 size={13} /> ألعاب فيزيائية
          </Link>
        </div>
      </div>
    </footer>
  );
}

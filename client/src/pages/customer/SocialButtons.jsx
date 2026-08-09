import { useEffect, useState } from 'react';
import { api } from '../../api';

const SOCIALS = [
  { key: 'google', label: 'Google', text: 'G', href: '/api/customer/auth/google' },
  { key: 'facebook', label: 'Facebook', text: 'f', href: '/api/customer/auth/facebook' }
];

export default function SocialButtons() {
  const [cfg, setCfg] = useState({ google: false, facebook: false });

  useEffect(() => {
    api('/api/customer/social-status').then(setCfg).catch(() => {});
  }, []);

  const enabled = SOCIALS.filter((s) => cfg[s.key]);

  if (enabled.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-bold text-white/40">أو سجّل دخول بـ</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {enabled.map((s) => (
          <a
            key={s.key}
            href={s.href}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-ink-900 px-4 py-3 text-sm font-bold text-white/80 transition-colors hover:border-brand-500/40 hover:text-white"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">{s.text}</span>
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}
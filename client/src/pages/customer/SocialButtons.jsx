import { useEffect, useState } from 'react';
import { api } from '../../api';

const SOCIALS = [
  { key: 'google', label: 'Google', text: 'G', href: '/api/customer/auth/google', hint: 'هيشتغل أول ما تضيف Client ID و Client Secret في ملف .env' },
  { key: 'facebook', label: 'Facebook', text: 'f', href: '/api/customer/auth/facebook', hint: 'هيشتغل أول ما تضيف App ID و App Secret في ملف .env' }
];

export default function SocialButtons() {
  const [cfg, setCfg] = useState({ google: false, facebook: false });

  useEffect(() => {
    api('/api/customer/social-status').then(setCfg).catch(() => {});
  }, []);

  const enabledCount = SOCIALS.filter((s) => cfg[s.key]).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-bold text-white/40">أو سجّل دخول بـ</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SOCIALS.map((s) => {
          const enabled = Boolean(cfg[s.key]);
          return (
            <a
              key={s.key}
              href={enabled ? s.href : undefined}
              onClick={(e) => { if (!enabled) e.preventDefault(); }}
              aria-disabled={!enabled}
              title={enabled ? '' : s.hint}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-ink-900 px-4 py-3 text-sm font-bold text-white/80 transition-colors hover:border-brand-500/40 hover:text-white"
              style={{ opacity: enabled ? 1 : 0.55 }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">{s.text}</span>
              {s.label}
            </a>
          );
        })}
      </div>
      {enabledCount < SOCIALS.length && (
        <p className="text-center text-[11px] leading-5 text-white/35">
          أزرار التسجيل الاجتماعي هتشتغل أول ما تضيف مفاتيح OAuth في ملف <span dir="ltr">.env</span> — ضيف
          {!cfg.google && !cfg.facebook ? ' Google و Facebook' : !cfg.google ? ' Google' : ' Facebook'} وهيتم تفعيلها تلقائيًا.
        </p>
      )}
    </div>
  );
}

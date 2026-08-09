import { useEffect, useState } from 'react';
import { api } from '../../api';

export default function SocialButtons() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    api('/api/customer/social-status').then((d) => setEnabled(Boolean(d.google))).catch(() => {});
  }, []);

  if (!enabled) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-bold text-white/40">أو سجّل دخول بـ</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <a
        href="/api/customer/auth/google"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-ink-900 px-4 py-3 text-sm font-bold text-white/80 transition-colors hover:border-brand-500/40 hover:text-white"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">G</span>
        Google
      </a>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { api } from '../api';

const KEY = 'phys_sub_prompt_ts';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function SubscribePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const last = Number(localStorage.getItem(KEY) || 0);
        if (last && Date.now() - last < WEEK_MS) return;
        const d = await api('/api/courses');
        const hasPaid = (d.courses || []).some((c) => Number(c.price_amount) > 0);
        if (!hasPaid || cancelled) return;
        setShow(true);
      } catch (_) {
        /* ignore */
      }
    }, 4000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (_) { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-lg sm:bottom-28">
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-ink-900/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -inset-10 bg-gradient-to-l from-amber-500/10 to-neon-400/10 blur-2xl" />
        <button
          onClick={dismiss}
          className="absolute left-3 top-3 rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/10"
          aria-label="إغلاق"
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-neon-400">
            <Sparkles size={20} className="text-pure" />
          </span>
          <div className="min-w-0">
            <div className="font-black">كورسات مميزة باشتراك شهري 💳</div>
            <p className="mt-1 text-xs leading-6 text-white/60">
              في كورسات مدفوعة بأولوية الشرح وحل الامتحانات — ادفع بـ Vodafone Cash وشوف التفاصيل.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link to="/courses" onClick={dismiss} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-pure hover:bg-brand-500">
                شوف الكورسات
              </Link>
              <button onClick={dismiss} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/20">
                مش دلوقتي
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

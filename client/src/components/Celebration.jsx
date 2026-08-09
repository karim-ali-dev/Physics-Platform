import { useMemo } from 'react';
import { PartyPopper, X, Sparkles } from 'lucide-react';

const CONFETTI_COLORS = ['#f59e0b', '#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fb7185', '#facc15'];

export default function Celebration({ open, onClose }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.2,
        dur: 3 + Math.random() * 2.5,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.5,
        emoji: Math.random() > 0.7 ? ['🎉', '⭐', '✨', '🎊'][i % 4] : null
      })),
    []
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4">
      <style>{`
        .celebrate-confetti { position: absolute; top: -20px; animation: celebrate-fall linear infinite; pointer-events: none; }
        @keyframes celebrate-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .celebrate-box { animation: celebrate-pop .6s cubic-bezier(.2,1.4,.4,1) both; }
        @keyframes celebrate-pop {
          0% { transform: scale(.3) translateY(40px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .celebrate-gift { animation: celebrate-float 2.4s ease-in-out infinite; display: inline-block; }
        @keyframes celebrate-float {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-10px) rotate(4deg); }
        }
        .celebrate-rays { animation: celebrate-spin 14s linear infinite; }
        @keyframes celebrate-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        {pieces.map((p) =>
          p.emoji ? (
            <span key={p.id} className="celebrate-confetti text-lg" style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
              {p.emoji}
            </span>
          ) : (
            <span
              key={p.id}
              className="celebrate-confetti"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size * 1.6,
                background: p.color,
                borderRadius: p.round ? '50%' : '2px',
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`
              }}
            />
          )
        )}
      </div>

      <div
        className="celebrate-box relative w-full max-w-md rounded-3xl border border-brand-400/40 bg-gradient-to-b from-ink-800 to-ink-950 p-8 text-center shadow-[0_0_80px_rgba(139,92,246,0.35)]"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <span className="celebrate-rays absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
            style={{ background: 'conic-gradient(from 0deg, #22d3ee, #a78bfa, #f59e0b, #34d399, #22d3ee)' }} />
        </div>

        <div className="relative">
          <span className="celebrate-gift text-7xl">🎁</span>
          <div className="mt-3 flex items-center justify-center gap-2 text-amber-300">
            <Sparkles size={18} />
            <PartyPopper size={26} />
            <Sparkles size={18} />
          </div>
          <h2 className="mt-2 text-3xl font-black leading-tight text-pure">مبروك يا بطل! 🎉</h2>
          <p className="mt-3 text-base font-semibold leading-7 text-white/75">
            انت كده اشتركت في منصة <span className="font-black text-brand-300">مستر أحمد علي الديب</span>
            <br />
            كورسات، اختبارات، وملفات مذاكرة — كله في مكان واحد.
          </p>
          <div className="mt-5 grid gap-2 text-start text-sm font-bold text-white/85">
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5">✅ ابدأ دروسك من حسابك مباشرة</div>
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5">✅ حلّ الاختبارات واتابع تقدمك</div>
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5">✅ اسأل مستر أحمد في أي وقت</div>
          </div>
          <button onClick={onClose} className="btn-primary mt-6 w-full text-base">
            يلا نبدأ 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

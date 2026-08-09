import { useEffect, useRef, useState } from 'react';
import { Star, ChevronRight, ChevronLeft, Quote } from 'lucide-react';

function Stars({ n }) {
  return (
    <div className="flex gap-0.5 text-amber-400" dir="ltr">
      {Array.from({ length: Math.max(1, Math.min(5, Number(n) || 5)) }).map((_, i) => (
        <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
      ))}
    </div>
  );
}

export default function Testimonials3D({ items = [] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const max = Math.min(items.length, 5);

  useEffect(() => {
    setActive(0);
  }, [items.length]);

  useEffect(() => {
    if (max < 2 || paused) return;
    timer.current = setInterval(() => setActive((a) => (a + 1) % max), 5000);
    return () => clearInterval(timer.current);
  }, [max, paused]);

  const go = (dir) => setActive((a) => (a + dir + max) % max);

  return (
    <div
      className="relative py-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto flex h-[330px] max-w-4xl items-center justify-center overflow-hidden" style={{ perspective: '1400px' }}>
        {items.slice(0, 5).map((t, i) => {
          const off = i - active;
          const abs = Math.abs(off);
          const visible = abs <= 2;
          return (
            <div
              key={t.id}
              aria-hidden={!visible}
              className={`absolute w-[290px] transition-all duration-700 ease-out sm:w-[380px] ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
              style={{
                opacity: visible ? (abs === 0 ? 1 : 0.45 - abs * 0.12) : 0,
                transform: `translateX(${off * 68}%) translateZ(${-abs * 90}px) rotateY(${-off * 16}deg) scale(${abs === 0 ? 1 : 0.92 - abs * 0.04})`,
                zIndex: 10 - abs,
                filter: abs === 0 ? 'none' : 'blur(1.5px)',
                transformStyle: 'preserve-3d'
              }}
            >
              <div className="card relative h-[300px] overflow-hidden p-6 sm:p-7">
                <Quote className="absolute left-4 top-4 text-brand-500/20" size={44} />
                <div className="flex items-center justify-between">
                  <Stars n={t.rating} />
                  <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-black text-brand-300">
                    منصة فيزياء
                  </span>
                </div>
                <p className="mt-4 line-clamp-5 text-sm leading-7 text-white/80 sm:text-[15px]">
                  "{t.content}"
                </p>
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-white/10 bg-ink-900/60 px-6 py-4 backdrop-blur">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400 text-sm font-black text-pure">
                    {t.client_name?.charAt(0) || 'ط'}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold">{t.client_name}</div>
                    {t.client_role && <div className="truncate text-xs text-white/45">{t.client_role}</div>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          onClick={() => go(-1)}
          aria-label="السابق"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/60 transition-all hover:border-brand-400 hover:text-brand-300 hover:shadow-glow"
        >
          <ChevronRight size={20} />
        </button>
        <div className="flex items-center gap-2">
          {items.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`تقييم ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${i === active ? 'w-7 bg-brand-500 shadow-glow' : 'w-2 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
        <button
          onClick={() => go(1)}
          aria-label="التالي"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/60 transition-all hover:border-brand-400 hover:text-brand-300 hover:shadow-glow"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
    </div>
  );
}

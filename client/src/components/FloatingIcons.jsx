import { useEffect, useState } from 'react';
import { Atom, Magnet, Zap, FlaskConical, Rocket, Telescope, Waves, Sun } from 'lucide-react';

const ICONS = [Atom, Magnet, Zap, FlaskConical, Rocket, Telescope, Waves, Sun];
const COLORS = ['text-brand-400', 'text-neon-400', 'text-brand-300', 'text-neon-300', 'text-brand-500', 'text-neon-500'];

function randomIcons() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  return ICONS.map((Icon, i) => ({
    id: i,
    Icon,
    color: COLORS[i % COLORS.length],
    size: 26 + (i % 3) * 9,
    x: 12 + Math.random() * (w - 140),
    y: 96 + Math.random() * (h - 260),
    delay: (i * 0.7) % 5,
    dur: 5 + (i % 4) * 1.2
  }));
}

export default function FloatingIcons() {
  const [icons, setIcons] = useState(randomIcons);
  const [activeId, setActiveId] = useState(null);
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    if (!activeId || !drag) return;
    const onMove = (e) => {
      const maxX = window.innerWidth - 76;
      const maxY = window.innerHeight - 76;
      setIcons((prev) => prev.map((ic) =>
        ic.id === drag.id
          ? { ...ic, x: Math.min(Math.max(0, e.clientX - drag.offX), maxX), y: Math.min(Math.max(0, e.clientY - drag.offY), maxY) }
          : ic
      ));
    };
    const onUp = () => { setDrag(null); setActiveId(null); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [activeId, drag]);

  const startDrag = (e, id) => {
    if (e.target.closest('a, button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({ id, offX: e.clientX - rect.left, offY: e.clientY - rect.top });
    setActiveId(id);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden md:block" aria-hidden="true">
      {icons.map(({ id, Icon, color, size, x, y, delay, dur }) => (
        <span
          key={id}
          onPointerDown={(e) => startDrag(e, id)}
          title="اسحبني لأي مكان"
          className={`pointer-events-auto absolute flex items-center justify-center rounded-full opacity-50 transition-opacity hover:opacity-100 ${activeId === id ? 'cursor-grabbing opacity-100' : 'cursor-grab'}`}
          style={{
            left: x,
            top: y,
            width: size + 16,
            height: size + 16,
            animation: activeId === id ? 'none' : `float ${dur}s ease-in-out ${delay}s infinite`
          }}
        >
          <Icon size={size} className={color} strokeWidth={1.8} />
        </span>
      ))}
    </div>
  );
}

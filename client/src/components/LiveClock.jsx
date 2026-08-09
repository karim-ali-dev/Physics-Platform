import { useEffect, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { CAIRO_TZ } from '../utils/time';

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = now.toLocaleDateString('ar-EG', { timeZone: CAIRO_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('ar-EG', { timeZone: CAIRO_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-white/65">
        <CalendarDays size={13} className="text-brand-400" />
        {date}
      </span>
      <span className="text-white/25">|</span>
      <span className="flex items-center gap-1.5 tabular-nums font-bold text-neon-300">
        <Clock size={13} />
        {time}
      </span>
    </div>
  );
}

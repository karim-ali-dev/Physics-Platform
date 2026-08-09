import { Zap, Magnet, Waves, Rocket, Lightbulb, ArrowDown, Scale, Globe2 } from 'lucide-react';

const dotStyle = (size, pct, delay) => ({
  width: size * pct,
  height: size * pct,
  marginLeft: -size * pct / 2,
  top: -size * pct / 2,
  animationDelay: delay || '0s'
});

function AtomMark({ size }) {
  return (
    <span className="relative inline-block text-current" style={{ width: size, height: size }}>
      <span className="orbit-electron absolute inset-0">
        <span className="electron-dot absolute bg-current" style={dotStyle(size, 0.16, '0s')} />
      </span>
      <span className="orbit-electron-rev absolute inset-0 rotate-[60deg]">
        <span className="electron-dot absolute bg-current" style={dotStyle(size, 0.14, '0.4s')} />
      </span>
      <span className="orbit-electron absolute inset-0 -rotate-[60deg]">
        <span className="electron-dot absolute bg-current" style={dotStyle(size, 0.18, '0.8s')} />
      </span>
      <span className="absolute rounded-full bg-current" style={{ inset: '40%', animation: 'pulseSoft 1.8s ease-in-out infinite' }} />
    </span>
  );
}

export default function PhysicsIcon({ kind = 'atom', size = 28, className = '' }) {
  const box = { width: size, height: size };
  const base = `relative inline-block text-current ${className}`;

  switch (kind) {
    case 'atom':
      return <AtomMark size={size} />;

    case 'bolt':
      return (
        <span className={base} style={box}>
          <Zap size={size} fill="currentColor" className="absolute inset-0 animate-pulseSoft" />
          <span className="beam absolute -top-1 right-1/2 h-1.5 w-0.5 rounded-full bg-current" />
          <span className="beam absolute -top-1 right-[22%] h-1 w-0.5 rounded-full bg-current" style={{ animationDelay: '.45s' }} />
          <span className="beam absolute -top-1 right-[78%] h-2 w-0.5 rounded-full bg-current" style={{ animationDelay: '.9s' }} />
        </span>
      );

    case 'magnet':
      return (
        <span className={base} style={box}>
          <Magnet size={size} className="absolute inset-0 animate-float" />
          <span className="absolute -bottom-1 right-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-current/70 animate-pulseSoft" />
          <span className="absolute -bottom-2 right-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current/40 animate-pulseSoft" style={{ animationDelay: '.6s' }} />
        </span>
      );

    case 'wave':
      return (
        <span className={base} style={box}>
          <Waves size={size} className="absolute inset-0 animate-pulseSoft" />
          <span className="absolute inset-x-0 top-full h-px bg-current/40" />
          <span className="absolute inset-x-[10%] top-[125%] h-px bg-current/25" />
          <span className="absolute inset-x-[22%] top-[150%] h-px bg-current/15" />
        </span>
      );

    case 'rocket':
      return (
        <span className={base} style={box}>
          <Rocket size={size} className="absolute inset-0 animate-float" />
          <span className="beam absolute top-full right-1/2 h-2 w-1 translate-x-1/2 rounded-full bg-current" />
        </span>
      );

    case 'light':
      return (
        <span className={base} style={box}>
          <Lightbulb size={size} fill="currentColor" className="absolute inset-0 animate-pulseSoft" />
          <span className="beam absolute -top-2 right-1/2 h-2 w-0.5 translate-x-1/2 rounded-full bg-current" />
        </span>
      );

    case 'gravity':
      return (
        <span className={base} style={box}>
          <ArrowDown size={size} className="absolute inset-0 animate-float" strokeWidth={2.6} />
          <span className="absolute inset-x-[15%] top-full h-px bg-current/40" />
          <span className="absolute inset-x-[28%] top-[130%] h-px bg-current/20" />
        </span>
      );

    case 'scale':
      return (
        <span className={base} style={box}>
          <Scale size={size} className="absolute inset-0 animate-float" />
          <span className="absolute bottom-0 right-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current/60 animate-pulseSoft" />
        </span>
      );

    case 'planet':
      return (
        <span className={base} style={box}>
          <Globe2 size={size} className="absolute inset-0" />
          <span className="orbit-electron absolute inset-[12%]">
            <span className="electron-dot absolute bg-current" style={dotStyle(size, 0.14, '0s')} />
          </span>
          <span className="absolute rounded-full bg-current/30 blur-[1px]" style={{ inset: '24%' }} />
        </span>
      );

    default:
      return <AtomMark size={size} />;
  }
}

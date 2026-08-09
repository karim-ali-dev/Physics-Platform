export default function Spinner({ size = 40, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin text-brand-500" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <p className="text-sm text-white/50">{label}</p>}
    </div>
  );
}

export default function SectionHeading({ badge, title, subtitle }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      {badge && (
        <span className="mb-4 inline-block rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-300">
          {badge}
        </span>
      )}
      <h2 className="text-3xl font-extrabold sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">{subtitle}</p>}
    </div>
  );
}

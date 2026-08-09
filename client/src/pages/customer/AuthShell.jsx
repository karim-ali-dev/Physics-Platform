import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';

export function AuthShell({ icon, title, subtitle, error, children, footer }) {
  return (
    <div className="container-x pt-28 pb-16">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-4 flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowRight size={16} /> العودة للموقع
        </Link>
        <div className="card p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 shadow-glow">
              {icon}
            </span>
            <h1 className="text-2xl font-black">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              <AlertCircle size={17} /> {error}
            </div>
          )}

          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-white/50">{footer}</div>}
      </div>
    </div>
  );
}

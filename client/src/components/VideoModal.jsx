import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getEmbedType } from '../api';

export default function VideoModal({ project, onClose }) {
  const embed = project ? getEmbedType(project.video_url) : null;
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl" ref={closeRef}>
        <button
          onClick={onClose}
          className="absolute -top-12 left-0 flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-brand-600 hover:text-pure"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="truncate text-lg font-extrabold">{project.title}</h3>
          <span className="shrink-0 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">{project.category}</span>
        </div>
        {embed.kind === 'file' ? (
          <video key={embed.src} src={embed.src} controls autoPlay className="aspect-video w-full rounded-2xl bg-black" />
        ) : (
          <iframe
            key={embed.src}
            src={embed.src}
            title={project.title}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-2xl border-0"
          />
        )}
      </div>
    </div>
  );
}

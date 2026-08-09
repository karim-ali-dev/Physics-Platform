import { Play, Clock } from 'lucide-react';
import { getEmbedType } from '../api';

export default function ProjectCard({ project, onPlay }) {
  const embed = getEmbedType(project.video_url);
  const canPlay = Boolean(embed.src);

  return (
    <div className="card group overflow-hidden">
      <button
        onClick={() => canPlay && onPlay(project)}
        className="relative block aspect-video w-full overflow-hidden"
        aria-label={canPlay ? `تشغيل ${project.title}` : project.title}
      >
        {project.cover ? (
          <img
            src={project.cover}
            alt={project.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid-bg flex h-full w-full items-center justify-center bg-ink-800">
            <span className="text-5xl font-black text-white/15">{project.title?.charAt(0) || 'ك'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
        {canPlay && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600/90 text-pure opacity-0 shadow-glow transition-all duration-300 group-hover:opacity-100">
              <Play size={22} fill="currentColor" />
            </span>
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-ink-950/80 px-3 py-1 text-xs font-bold text-brand-300 backdrop-blur">
          {project.category}
        </span>
        {project.duration && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-ink-950/80 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
            <Clock size={12} />
            {project.duration}
          </span>
        )}
      </button>

      <div className="p-5">
        <h3 className="text-lg font-extrabold">{project.title}</h3>
        {project.client_name && <p className="mt-1 text-sm text-white/50">عميل: {project.client_name}</p>}
        {project.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/60">{project.description}</p>}
      </div>
    </div>
  );
}

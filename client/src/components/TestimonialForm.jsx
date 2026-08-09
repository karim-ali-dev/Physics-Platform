import { useState } from 'react';
import { Loader2, Star, MessageSquareHeart, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function TestimonialForm() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/testimonials/public', {
        method: 'POST',
        body: JSON.stringify({ client_name: name, client_role: role, content, rating, website })
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'حصل خطأ، جرب تاني');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card relative overflow-hidden p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/15 to-neon-400/10" />
        <div className="relative">
          <CheckCircle2 size={44} className="mx-auto text-emerald-400" />
          <h3 className="mt-4 text-xl font-black">وصل تقييمك! 🌟</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-white/60">
            تقييمك هيظهر على الموقع بعد موافقة مستر أحمد.
          </p>
          <button
            onClick={() => { setDone(false); setName(''); setRole(''); setContent(''); setRating(5); }}
            className="btn-ghost mt-5 !py-2 text-sm"
          >
            اكتب تقييم تاني
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card relative overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-neon-400/5" />
      <div className="relative">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
            <MessageSquareHeart size={20} />
          </span>
          <div>
            <h3 className="text-lg font-black">اترك تقييمك</h3>
            <p className="text-xs text-white/50">تقييمك بيوصل لمستر أحمد مباشرة وبيظهر بعد موافقته</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">اسمك <span className="text-red-400">*</span></label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" maxLength={200} required />
          </div>
          <div>
            <label className="label">أنت إيه؟ (اختياري)</label>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="طالب / ولي أمر..." maxLength={200} />
          </div>
        </div>

        <div className="mt-5">
          <label className="label">تقييمك للمستر أحمد</label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} نجوم`}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={30}
                  fill={(hover || rating) >= n ? '#fbbf24' : 'none'}
                  stroke={(hover || rating) >= n ? '#fbbf24' : '#ffffff55'}
                  className="transition-colors"
                />
              </button>
            ))}
            <span className="mr-2 text-sm font-black text-amber-300">{rating}/5</span>
          </div>
        </div>

        <div className="mt-5">
          <label className="label">اكتب تقييمك <span className="text-red-400">*</span></label>
          <textarea
            className="input !min-h-[110px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="قول رأيك في الشرح والمستر أحمد..."
            maxLength={5000}
            required
          />
        </div>

        {/* Honeypot — مخفي عن الناس، بيلم سبام البوتات */}
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300">{error}</p>}

        <button type="submit" disabled={busy || !name.trim() || !content.trim()} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Star size={17} fill="currentColor" />}
          {busy ? 'جاري الإرسال...' : 'إرسال التقييم'}
        </button>
      </div>
    </form>
  );
}

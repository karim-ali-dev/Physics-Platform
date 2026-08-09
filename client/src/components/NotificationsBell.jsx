import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { api } from '../api';
import { timeAgo } from '../utils/time';

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = async (silent = true) => {
    if (!silent) setLoading(true);
    try {
      const d = await api('/api/customer/notifications');
      setNotifs(d.notifications || []);
      setUnread(d.unread || 0);
    } catch (_) { /* ignore */ }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    if (!ref.current) return;
    const t = setInterval(() => load(true), 45000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markRead = async (n) => {
    setNotifs((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: 1 } : x)));
    setUnread((u) => Math.max(0, u - (n.read ? 0 : 1)));
    if (!n.read) api(`/api/customer/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    setNotifs((arr) => arr.map((x) => ({ ...x, read: 1 })));
    setUnread(0);
    api('/api/customer/notifications/read-all', { method: 'POST' }).catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) load(false); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/75 transition-colors hover:border-brand-400 hover:text-brand-300"
        aria-label="الإشعارات"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-pure">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card backdrop-blur-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="font-extrabold">الإشعارات {unread > 0 && <span className="mr-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-pure">{unread}</span>}</div>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs font-bold text-brand-300 hover:text-brand-200">
                <CheckCheck size={14} /> قراءة الكل
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && !notifs.length ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-white/45">
                <Loader2 size={16} className="animate-spin" /> جاري التحميل...
              </div>
            ) : notifs.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/45">مفيش إشعارات لسه 🔔</div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`block w-full border-b border-white/5 px-4 py-3 text-right transition-colors hover:bg-white/5 ${n.read ? 'opacity-55' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold">{n.title}</div>
                      <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs leading-5 text-white/60">{n.body}</p>
                      <div className="mt-1 text-[10px] text-white/35">{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-white/10 p-2">
            <button onClick={() => { setOpen(false); navigate('/student/account#notifications'); }} className="w-full rounded-xl bg-white/5 py-2 text-xs font-bold text-white/70 hover:bg-white/10">
              عرض كل الإشعارات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

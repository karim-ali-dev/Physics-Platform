import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (localStorage.getItem('phys_notif_prompted')) return;
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    localStorage.setItem('phys_notif_prompted', '1');
    setShow(false);
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        new Notification('منصة الفيزياء ✅', {
          body: 'تمام، الإشعارات شغالة — هتوصل رسايل مستر أحمد أول بأول.'
        });
      }
    } catch (_) {
      /* ignore */
    }
  };

  const dismiss = () => {
    localStorage.setItem('phys_notif_prompted', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-brand-500/30 bg-ink-900/95 p-4 shadow-card backdrop-blur-xl">
      <button
        onClick={dismiss}
        aria-label="إغلاق التنبيه"
        className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
      >
        <X size={15} />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
          <BellRing size={19} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-extrabold">إشعارات مستر أحمد 🔔</div>
          <p className="mt-1 text-xs leading-5 text-white/60">
            توافق إنه يبعتلك إشعارات بالحصص والتنبيهات وتعديلات المواعيد أول بأول؟
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={enable}
              className="flex-1 rounded-xl bg-brand-600 px-3 py-2 text-xs font-extrabold text-pure transition-colors hover:bg-brand-500"
            >
              ماشي، فعّلها
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70 transition-colors hover:bg-white/5"
            >
              مش دلوقتي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

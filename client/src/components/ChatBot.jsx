import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, Paperclip, Loader2, Mic, Camera } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';

const WELCOME =
  'أهلاً بيك في منصة الفيزياء 👋\nأنا مساعد المنصة الذكي، متخصص في الفيزياء ومنصة مستر أحمد بس.\nأقدر:\n• أوريك مواعيد الحصص الحضورية لكل الصفوف\n• أشرحلك قوانين الفيزياء وأحللك مسائل\n• أحوللك الوحدات وأحسبلك النتائج\n• استلم صورة مسألة وأوصلها للمدرس\n\nاكتب سؤالك أو اختار من الاقتراحات 👇';

const DEFAULT_QUICK = ['مواعيد الصف الثالث الثانوي', 'لو سمحت اشرح قانون أوم', 'أبعت صورة مسألة', 'إيه الكورسات؟'];

export default function ChatBot() {
  const { customer } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: WELCOME }]);
  const [quick, setQuick] = useState(DEFAULT_QUICK);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const recRef = useRef(null);
  const transcriptRef = useRef('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, uploading, open]);

  const send = async (text, imageUrl) => {
    const trimmed = String(text || '').trim();
    if ((!trimmed && !imageUrl) || typing) return;
    setMessages((m) => [...m, { role: 'user', text: trimmed, image: imageUrl }]);
    setInput('');
    setQuick([]);
    setTyping(true);
    try {
      const data = await api('/api/bot/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed || 'صورة مسألة',
          image_url: imageUrl || '',
          name: customer?.name || '',
          contact: customer?.email || ''
        })
      });
      setMessages((m) => [...m, { role: 'bot', text: data.reply }]);
      setQuick(Array.isArray(data.quick) && data.quick.length ? data.quick : DEFAULT_QUICK);
    } catch (_) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: 'آسف، حصلت مشكلة مؤقتة. كلم مستر أحمد مباشرة على الواتساب من صفحة تواصل معنا، وهيرد عليك بسرعة.' }
      ]);
      setQuick(['رقم التواصل', 'مواعيد الحصص؟']);
    } finally {
      setTyping(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !/^image\//.test(file.type)) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('kind', 'image');
      fd.append('file', file);
      const data = await api('/api/bot/upload', { method: 'POST', body: fd });
      await send('', data.url);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: 'مش عارف أرفع الصورة — اتأكد إنها jpg أو png وجرب تاني، أو ابعت صورة المسألة على واتساب المدرس.' }]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages((m) => [...m, { role: 'bot', text: 'المتصفح ده مش بيدعم التسجيل الصوتي 🎙️\nاستخدم Chrome أو Edge من آخر إصدار، أو اكتب سؤالك عادي.' }]);
      return;
    }
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'ar-EG';
    rec.interimResults = true;
    rec.continuous = false;
    recRef.current = rec;
    transcriptRef.current = '';
    const watchdog = setTimeout(() => {
      try { rec.stop(); } catch (_) { /* ignore */ }
    }, 20000);
    rec.onstart = () => setRecording(true);
    rec.onresult = (e) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      transcriptRef.current = t;
      setInput(t);
    };
    rec.onerror = () => {
      clearTimeout(watchdog);
      setRecording(false);
    };
    rec.onend = () => {
      clearTimeout(watchdog);
      setRecording(false);
      const t = transcriptRef.current.trim();
      transcriptRef.current = '';
      if (t) send(t);
    };
    try {
      rec.start();
    } catch (_) {
      clearTimeout(watchdog);
      setRecording(false);
    }
  };

  const onCamera = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('kind', 'image');
      fd.append('file', file);
      const data = await api('/api/bot/upload', { method: 'POST', body: fd });
      await send('', data.url);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: 'مش عارف أستقبل الصورة — جرب تاني أو ابعت صورة المسألة على واتساب المدرس.' }]);
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 left-4 z-50 flex w-[370px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card backdrop-blur-xl sm:left-5">
          <div className="flex items-center gap-3 border-b border-white/10 bg-brand-600/10 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400">
              <Bot size={20} className="text-pure" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-extrabold">مساعد الفيزياء الذكي</div>
              <div className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                متاح دلوقتي — مواعيد + شرح قوانين + حل مسائل
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-brand-400 hover:text-brand-300"
              aria-label="إغلاق الدردشة"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex h-[400px] flex-col gap-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    m.role === 'user'
                      ? 'rounded-bl-md bg-brand-600 text-pure'
                      : 'rounded-br-md border border-white/10 bg-ink-800 text-white'
                  }`}
                >
                  {m.image && (
                    <a href={m.image} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl">
                      <img src={m.image} alt="صورة المسألة" className="max-h-44 w-auto max-w-full" />
                    </a>
                  )}
                  <span className="whitespace-pre-line">{m.text}</span>
                </div>
              </div>
            ))}
            {uploading && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-brand-600/80 px-4 py-3 text-sm text-pure">
                  <Loader2 size={16} className="animate-spin" /> جاري رفع صورة المسألة...
                </div>
              </div>
            )}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-br-md border border-white/10 bg-ink-800 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:.3s]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {quick.length > 0 && (
            <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto border-t border-white/10 px-4 py-2.5">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-300 transition-colors hover:bg-brand-500/20"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {recording && (
            <div className="flex items-center justify-center gap-2 border-t border-red-500/20 bg-red-500/10 py-2 text-xs font-bold text-red-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              بسمعك دلوقتي... اتكلم وكل حاجة بتتحول لنص
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onCamera} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-brand-400 hover:text-brand-300 disabled:opacity-50"
              title="ارفع صورة مسألة"
              aria-label="رفع صورة"
            >
              {uploading ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading || typing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-brand-400 hover:text-brand-300 disabled:opacity-50"
              title="صور المسألة بالكاميرا"
              aria-label="تصوير بالكاميرا"
            >
              <Camera size={17} />
            </button>
            <button
              type="button"
              onClick={toggleMic}
              disabled={uploading || typing}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${
                recording
                  ? 'animate-pulse border-red-400/60 bg-red-500/20 text-red-300'
                  : 'border-white/10 text-white/60 hover:border-red-400/40 hover:text-red-300'
              }`}
              title={recording ? 'وقف التسجيل' : 'اسأل بصوتك بدل الكتابة'}
              aria-label="تسجيل صوتي"
            >
              <Mic size={17} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? '🎙️ تكلّم دلوقتي...' : 'اسأل عن موعد أو قانون أو مسألة...'}
              className="flex-1 rounded-xl border border-white/10 bg-ink-950 px-4 py-2.5 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-brand-500"
            />
            <button
              type="submit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-pure transition-colors hover:bg-brand-500 disabled:opacity-50"
              disabled={(!input.trim() && !uploading) || typing || recording}
              aria-label="إرسال"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'إغلاق الدردشة' : 'فتح الدردشة مع مساعد المنصة'}
        className="fixed bottom-5 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400 text-pure shadow-glow transition-transform duration-300 hover:scale-105 sm:left-5"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}

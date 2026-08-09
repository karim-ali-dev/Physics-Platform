import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, Paperclip, Loader2, Mic, Camera } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';

const WELCOME =
  'أهلاً بيك في منصة الفيزياء 👋\nأنا المساعد الذكي لمستر أحمد علي الديب — بجاوبك باسمه وبأسلوبه.\nأقدر:\n• أشرحلك أي قانون في الفيزياء وأحللك مسائل\n• أوريك مواعيد الحصص والكورسات المتاحة\n• أحوللك الوحدات وأحسبلك النتائج\n• أحل مسائل الصور فوراً (صوّر المسألة أو ارفعها 📷)\n\nالمحادثة دي بتتحفظ على جهازك، وردود مستر أحمد هتيجيك هنا مباشرة 👇';

const DEFAULT_QUICK = ['مواعيد الصف الثالث الثانوي', 'لو سمحت اشرح قانون أوم', 'أبعت صورة مسألة', 'إيه الكورسات؟'];

const CHAT_KEY = 'physics_chat_messages_v1';
const CLIENT_KEY = 'physics_client_id';
const REPLY_SINCE_KEY = 'physics_reply_since';

function loadChat() {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr.filter((m) => m && typeof m.text === 'string').slice(-200);
    }
  } catch (_) { /* ignore */ }
  return [{ role: 'bot', text: WELCOME }];
}

function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  } catch (_) {
    return '';
  }
}

function getReplySince() {
  try { return localStorage.getItem(REPLY_SINCE_KEY) || ''; } catch (_) { return ''; }
}

function setReplySince(v) {
  try { localStorage.setItem(REPLY_SINCE_KEY, v); } catch (_) { /* ignore */ }
}

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ChatBot() {
  const { customer, settings } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadChat);
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
  const clientId = useRef(getClientId());
  const seenReplies = useRef(new Set());

  useEffect(() => {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-200))); } catch (_) { /* ignore */ }
  }, [messages]);

  const waNum = String(settings.whatsapp || '201016651095').replace(/[^\d]/g, '').replace(/^0/, '');
  const waLink = (text) => `https://wa.me/${waNum}?text=${encodeURIComponent(String(text || ''))}`;
  const trackWa = (text) => {
    try {
      api('/api/bot/whatsapp-track', { method: 'POST', body: JSON.stringify({ message: String(text || '').slice(0, 200) }) }).catch(() => {});
    } catch (_) { /* ignore */ }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, uploading, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const checkReplies = async () => {
      if (!clientId.current || cancelled) return;
      try {
        const since = getReplySince();
        const data = await api(`/api/bot/help?client_id=${encodeURIComponent(clientId.current)}&since=${encodeURIComponent(since)}`, { method: 'GET' });
        const replies = Array.isArray(data.replies) ? data.replies : [];
        const fresh = replies.filter((r) => r && r.reply && !seenReplies.current.has(`${r.help_id}-${r.replied_at}`));
        if (fresh.length) {
          fresh.forEach((r) => seenReplies.current.add(`${r.help_id}-${r.replied_at}`));
          setMessages((m) => [...m, ...fresh.map((r) => ({ role: 'bot', teacher: true, text: `👨‍🏫 رد مستر أحمد على سؤالك:\n\n${r.reply}` }))]);
          setQuick((q) => (q.length ? q : ['تمام شكراً', 'عندي سؤال تاني']));
        }
        if (replies.length) setReplySince(new Date().toISOString());
      } catch (_) { /* ignore */ }
    };
    checkReplies();
    const timer = setInterval(checkReplies, 25000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [open]);

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
          client_id: clientId.current,
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
              <div className="text-sm font-extrabold">مساعد مستر أحمد الذكي</div>
              <div className="flex items-center gap-1.5 text-xs text-white/60">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                متاح دلوقتي — رد فوري من الذكاء الاصطناعي
              </div>
            </div>
            <a
              href={waLink('السلام عليكم مستر أحمد 👋 أتصلت بيك من مساعد المنصة')}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackWa('فتح واتساب المدرس من الهيدر')}
              title="كلم مستر أحمد على واتساب"
              aria-label="واتساب مستر أحمد"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-emerald-400 hover:text-emerald-300"
            >
              <WhatsAppIcon size={18} />
            </a>
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
                      : m.teacher
                        ? 'rounded-br-md border border-emerald-400/40 bg-emerald-500/10 text-white'
                        : 'rounded-br-md border border-white/10 bg-ink-800 text-white'
                  }`}
                >
                  {m.teacher && (
                    <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300">
                      👨‍🏫 رد من مستر أحمد
                    </div>
                  )}
                  {m.image && (
                    <a href={m.image} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl">
                      <img src={m.image} alt="صورة المسألة" className="max-h-44 w-auto max-w-full" />
                    </a>
                  )}
                  <span className="whitespace-pre-line">{m.text}</span>
                  {m.role === 'user' && m.text && (
                    <a
                      href={waLink(m.text)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackWa(m.text)}
                      title="حول سؤالك ده لمدرسك على واتساب"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30"
                    >
                      <WhatsAppIcon size={14} />
                      كلم المدرس على واتساب
                    </a>
                  )}
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

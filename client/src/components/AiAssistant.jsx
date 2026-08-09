import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { api } from '../api';

const QUICK = [
  'اشرح لي قانون نيوتن التاني فيزياء',
  'عايز أفهم التيار الكهربي بطريقة سهلة',
  'حل مسألة على قانون أوم',
  'إزاي أذاكر الفيزياء بسرعة للثانوية العامة؟'
];

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: 'أهلاً! أنا مساعد الفيزياء بالذكاء الاصطناعي 🤖 اسألني أي سؤال في الفيزياء أو المذاكرة.' }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    api('/api/ai/config')
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(true));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, open]);

  const send = async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || typing) return;
    setMessages((m) => [...m, { role: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);
    try {
      const data = await api('/api/ai/ask', { method: 'POST', body: JSON.stringify({ message: trimmed }) });
      setMessages((m) => [...m, { role: 'bot', text: data.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: err.message || 'حصلت مشكلة، جرب تاني.' }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex w-[370px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card backdrop-blur-xl sm:right-5">
          <div className="flex items-center justify-between bg-gradient-to-l from-brand-600/30 to-neon-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-neon-400 text-pure">
                <Sparkles size={18} />
              </span>
              <div>
                <div className="text-sm font-black">مساعد الفيزياء AI</div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {enabled ? 'متصل بذكاء Gemini' : 'غير مُفعّل'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-7 ${m.role === 'user' ? 'self-start rounded-tr-sm bg-brand-500/20 text-white' : 'self-end rounded-tl-sm bg-white/10 text-white/85'}`}>
                {m.text}
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2 self-end rounded-tl-sm rounded-2xl bg-white/10 px-3.5 py-2.5 text-sm text-white/60">
                <Loader2 size={15} className="animate-spin" /> بيذاكر دلوقتي...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {QUICK.map((q) => (
                <button key={q} onClick={() => send(q)} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/70 hover:bg-white/20">
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك في الفيزياء..."
              className="flex-1 rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-brand-500"
            />
            <button type="submit" disabled={typing || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-neon-400 text-pure transition-transform hover:scale-105 disabled:opacity-40">
              <Send size={17} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-neon-400 text-pure shadow-glow transition-transform duration-300 hover:scale-105 sm:right-5"
        aria-label="مساعد الذكاء الاصطناعي"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </>
  );
}

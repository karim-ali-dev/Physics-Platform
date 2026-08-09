import { useEffect, useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';
import SectionHeading from '../components/SectionHeading';
import Spinner from '../components/Spinner';

export default function FAQPage() {
  const { settings } = useApp();
  const [faqs, setFaqs] = useState([]);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const whatsapp = settings.whatsapp || '201099724825';

  useEffect(() => {
    api('/api/faqs')
      .then((d) => { setFaqs(d.faqs); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container-x pt-28 pb-20">
      <SectionHeading
        badge="الأسئلة الشائعة"
        title="إجابات لأسئلة بتتكرر"
        subtitle="لو عندك أي سؤال تاني، ابعتلي في أي وقت."
      />

      {loading ? (
        <Spinner label="جاري التحميل..." />
      ) : (
        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((f, i) => (
            <div key={f.id} className={`card overflow-hidden transition-colors ${open === i ? 'border-brand-500/40' : ''}`}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-right"
                aria-expanded={open === i}
              >
                <span className="font-extrabold">{f.question}</span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-brand-400 transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="border-t border-white/10 px-5 py-4">
                  <p className="text-sm leading-7 text-white/65">{f.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-14 text-center">
        <p className="text-white/60">لسه عندك سؤال؟</p>
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary mt-4"
        >
          <MessageCircle size={18} /> اسألني على الواتساب
        </a>
      </div>
    </div>
  );
}

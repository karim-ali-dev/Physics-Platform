import { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';
import SectionHeading from '../components/SectionHeading';

export default function Contact() {
  const { settings } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const whatsapp = settings.whatsapp || '201099724825';

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify(form) });
      setStatus({ type: 'ok', text: 'وصلت رسالتك بنجاح، مستر أحمد هيرد عليك في أقرب وقت.' });
      setForm({ name: '', phone: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'حصل خطأ، جرب تاني.' });
    } finally {
      setBusy(false);
    }
  };

  const info = [
    { icon: Phone, label: 'اتصل بينا', value: settings.phone, dir: 'ltr' },
    { icon: MessageCircle, label: 'واتساب', value: settings.phone, dir: 'ltr' },
    { icon: Mail, label: 'البريد', value: settings.email, dir: 'ltr' },
    { icon: MapPin, label: 'الموقع', value: settings.city || 'مصر', dir: 'rtl' }
  ];

  return (
    <div className="container-x pt-28 pb-20">
      <SectionHeading
        badge="تواصل معنا"
        title="اسأل مستر أحمد على أي حاجة"
        subtitle="ابعت سؤالك أو استفسارك، ومستر أحمد بيرد عليك بنفسه."
      />

      <div className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {info.map((item) => (
            <div key={item.label} className="card flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                <item.icon size={20} />
              </span>
              <div>
                <div className="text-xs font-bold text-white/45">{item.label}</div>
                <div className="font-extrabold" dir={item.dir}>{item.value}</div>
              </div>
            </div>
          ))}

          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('مرحباً مستر أحمد، عندي سؤال في الفيزياء')}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full"
          >
            <MessageCircle size={18} /> كلمنا مباشرة على واتساب
          </a>

          <div className="card border-neon-400/20 bg-neon-400/5 p-5 text-sm leading-7 text-white/70">
            <strong className="text-neon-300">نصيحة:</strong> كل ما توضح سؤالك وتذكر الصف الدراسي، كل ما الرد يبقى أدق وأسرع.
          </div>
        </div>

        <div className="card p-7 lg:col-span-3">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label">الاسم *</label>
                <input className="input" name="name" value={form.name} onChange={onChange} required maxLength={100} placeholder="اسمك الكريم" />
              </div>
              <div>
                <label className="label">رقم الموبايل</label>
                <input className="input" name="phone" value={form.phone} onChange={onChange} dir="ltr" maxLength={30} placeholder="01xxxxxxxxx" />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label">البريد الإلكتروني</label>
                <input className="input" name="email" value={form.email} onChange={onChange} dir="ltr" type="email" maxLength={120} placeholder="you@email.com" />
              </div>
              <div>
                <label className="label">الموضوع</label>
                <input className="input" name="subject" value={form.subject} onChange={onChange} maxLength={100} placeholder="مثال: سؤال في المغناطيسية" />
              </div>
            </div>
            <div>
              <label className="label">رسالتك *</label>
              <textarea
                className="input min-h-[140px] resize-y"
                name="message"
                value={form.message}
                onChange={onChange}
                required
                maxLength={2000}
                placeholder="اكتب سؤالك بالتفصيل..."
              />
            </div>

            {status && (
              <div
                className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${
                  status.type === 'ok' ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {status.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {status.text}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
              <Send size={18} /> {busy ? 'جاري الإرسال...' : 'ابعت الرسالة'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

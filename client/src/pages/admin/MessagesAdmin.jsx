import { useEffect, useState } from 'react';
import { Mail, Phone, MailOpen, MailCheck, Trash2, User, Tag } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, ConfirmDelete, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

export default function MessagesAdmin() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api('/api/admin/messages')
      .then((d) => { setMessages(d.messages); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleRead = async (m) => {
    await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', body: JSON.stringify({ is_read: !m.is_read }) });
    load();
  };

  const del = async (id) => {
    await api(`/api/admin/messages/${id}`, { method: 'DELETE' });
    load();
  };

  const unread = messages.filter((m) => !m.is_read).length;

  return (
    <div>
      <PageHeader title="الرسائل" subtitle={`${messages.length} رسالة — ${unread} غير مقروءة`} />

      {loading ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <Empty text="مفيش رسائل وصلت لسه." />
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`card p-6 transition-colors ${m.is_read ? '' : 'border-brand-500/50'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${m.is_read ? 'bg-white/10 text-white/50' : 'bg-brand-600 text-pure'}`}>
                    <User size={20} />
                  </span>
                  <div>
                    <div className="font-extrabold">{m.name} {!m.is_read && <span className="mr-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-black">جديد</span>}</div>
                    <div className="text-xs text-white/45">{fmtDateTime(m.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleRead(m)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${m.is_read ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-brand-600 text-pure hover:bg-brand-500'}`}>
                    {m.is_read ? <MailOpen size={14} /> : <MailCheck size={14} />}
                    {m.is_read ? 'مقروءة' : 'اقرأها'}
                  </button>
                  <ConfirmDelete onConfirm={() => del(m.id)} />
                </div>
              </div>

              {m.message && (
                <p className="mt-4 rounded-xl bg-ink-900 p-4 text-sm leading-7 text-white/75">{m.message}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/55">
                {m.phone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-brand-400" /><span dir="ltr">{m.phone}</span></span>}
                {m.email && <span className="flex items-center gap-1.5"><Mail size={14} className="text-brand-400" /><span dir="ltr">{m.email}</span></span>}
                {m.subject && <span className="flex items-center gap-1.5"><Tag size={14} className="text-brand-400" />{m.subject}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Loader2, Send, Trash2, Bell, Users } from 'lucide-react';
import { api } from '../../api';
import { PageHeader, Field, TextInput, TextArea, ConfirmDelete, Empty, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

export default function NotificationsAdmin() {
  const [items, setItems] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', link: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/api/admin/notifications')
      .then((d) => { setItems(d.notifications || []); setTotalCustomers(d.totalCustomers || 0); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setError('اكتب عنوان ونص الإشعار الأول');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/notifications', { method: 'POST', body: JSON.stringify(form) });
      setMsg('اتبعث الإشعار — هيظهر في جرس كل الطلاب المسجلين 🔔');
      setForm({ title: '', body: '', link: '' });
      load();
      setTimeout(() => setMsg(null), 3500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    await api(`/api/admin/notifications/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="إشعارات الطلاب"
        subtitle="اكتب إشعار وهيظهر في جرس كل الطلاب المسجلين في المنصة"
      />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="card mb-8 p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15">
            <Bell size={20} className="text-brand-300" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold">إشعار جديد</h3>
            <div className="flex items-center gap-1.5 text-xs text-white/45">
              <Users size={13} /> هيوصلك لـ {totalCustomers} طالب مسجل
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <Field label="عنوان الإشعار" required>
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
              placeholder="مثال: مراجعة ليلة الامتحان 🎯"
            />
          </Field>
          <Field label="نص الإشعار" required>
            <TextArea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
              maxLength={2000}
              rows={4}
              placeholder="اكتب اللي محتاج توصله للطلبة: موعد جديد، مراجعة، تنبيه، خبر... إنت حر"
            />
          </Field>
          <Field label="رابط (اختياري)" hint="لو عايز الإشعار يفتح صفحة في الموقع — مثال: /community أو /schedule">
            <TextInput
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              maxLength={500}
              placeholder="/courses"
            />
          </Field>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            {busy ? 'جاري الإرسال...' : 'إرسال الإشعار للطلاب'}
          </button>
        </form>
      </div>

      <h3 className="mb-3 font-extrabold text-white/80">الإشعارات المرسلة ({items.length})</h3>
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty text="مفيش إشعارات اتُبعت لسه — اكتب أول إشعار للطلاب من فوق." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="card flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-extrabold">{n.title}</h4>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/55" dir="ltr">{fmtDateTime(n.created_at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-white/65">{n.body}</p>
                {n.link && <div className="mt-2 inline-block rounded-lg bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-300" dir="ltr">{n.link}</div>}
                <div className="mt-2 text-xs text-white/40">
                  👁 اتقرأ بواسطة {n.reads} من أصل {totalCustomers} طالب
                </div>
              </div>
              <ConfirmDelete title="حذف الإشعار" onConfirm={() => del(n.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

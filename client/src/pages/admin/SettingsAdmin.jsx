import { useEffect, useState } from 'react';
import { Save, Loader2, Copy, Check, Link2 } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, Field, TextInput, TextArea, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

const groups = [
  {
    title: 'الواجهة الرئيسية',
    fields: [
      ['hero_badge', 'شارة البانر', 'text'],
      ['hero_title', 'العنوان الرئيسي', 'text'],
      ['hero_subtitle', 'الوصف الرئيسي', 'textarea']
    ]
  },
  {
    title: 'صفحة عني',
    fields: [
      ['about_title', 'عنوان الصفحة', 'text'],
      ['about_text', 'نبذة عنك', 'textarea'],
      ['about_quote', 'اقتباس مميز', 'text']
    ]
  },
  {
    title: 'صفحة مواعيد الدروس',
    fields: [
      ['schedule_note', 'جملة تظهر فوق جدول المواعيد', 'textarea'],
      ['schedule_address', 'مكان الحصص الحضورية', 'text']
    ]
  },
  {
    title: 'معلومات التواصل',
    fields: [
      ['phone', 'رقم الموبايل', 'text'],
      ['whatsapp', 'رقم الواتساب (بالكود الدولي بدون صفر)', 'text'],
      ['email', 'البريد الإلكتروني', 'text'],
      ['city', 'المدينة / الدولة', 'text']
    ]
  },
  {
    title: 'الدفع (Vodafone Cash)',
    fields: [
      ['vodafone_cash', 'رقم محفظة فودافون كاش', 'text'],
      ['vodafone_cash_name', 'اسم صاحب المحفظة', 'text']
    ]
  },
  {
    title: 'روابط السوشيال ميديا',
    fields: [
      ['instagram', 'Instagram', 'text'],
      ['tiktok', 'TikTok', 'text'],
      ['youtube', 'YouTube', 'text'],
      ['facebook', 'Facebook', 'text']
    ]
  },
  {
    title: 'أرقام الإحصائيات',
    fields: [
      ['stats_students', 'عدد الطلاب', 'number'],
      ['stats_courses', 'عدد الكورسات', 'number'],
      ['stats_years', 'سنوات الخبرة', 'number'],
      ['stats_lessons', 'عدد الدروس', 'number']
    ]
  },
  {
    title: 'الفوتر',
    fields: [
      ['footer_tagline', 'جملة الفوتر', 'text']
    ]
  }
];

export default function SettingsAdmin() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api('/api/admin/settings')
      .then((d) => { setSettings(d.settings || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setSettings({ ...settings, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg(null);
    try {
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
      setMsg('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + ADMIN_PATH);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* ignore */ }
  };

  if (loading) return <Spinner label="جاري تحميل الإعدادات..." />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="إعدادات الموقع" subtitle="كل الكلام اللي بيظهر في الموقع من مكان واحد" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300"><Link2 size={18} /></span>
          <div>
            <div className="text-sm font-extrabold">رابط لوحة التحكم الخاص بيك</div>
            <div className="text-xs text-white/50" dir="ltr">{window.location.origin}{ADMIN_PATH}</div>
          </div>
        </div>
        <button onClick={copyLink} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-pure hover:bg-brand-500">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'اتنسخ' : 'نسخ الرابط'}
        </button>
      </div>

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={submit} className="space-y-6">
        {groups.map((g) => (
          <div key={g.title} className="card space-y-5 p-6">
            <h3 className="border-b border-white/10 pb-3 text-lg font-extrabold">{g.title}</h3>
            {g.fields.map(([key, label, type]) => (
              <Field key={key} label={label}>
                {type === 'textarea' ? (
                  <TextArea value={settings[key] || ''} onChange={set(key)} />
                ) : (
                  <TextInput
                    type={type === 'number' ? 'number' : 'text'}
                    value={settings[key] || ''}
                    onChange={set(key)}
                    dir={type === 'text' && (key === 'phone' || key === 'whatsapp' || key === 'email' || key.includes('.') ) ? 'ltr' : 'rtl'}
                  />
                )}
              </Field>
            ))}
          </div>
        ))}

        <button type="submit" disabled={busy} className="btn-primary w-full !py-4 disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {busy ? 'جاري الحفظ...' : 'حفظ كل الإعدادات'}
        </button>
      </form>
    </div>
  );
}

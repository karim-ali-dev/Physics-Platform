import { useRef, useState } from 'react';
import { Upload, Trash2, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { api } from '../../api';
import { split12, join24 } from '../../utils/schedule';

export function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export function TextInput({ className = '', ...props }) {
  return <input {...props} className={`input ${className}`} />;
}

export function TextArea({ className = '', ...props }) {
  return <textarea {...props} className={`input min-h-[120px] resize-y ${className}`} />;
}

export function Select({ options, ...props }) {
  return (
    <select {...props} className="input">
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* اختيار وقت بنظام 12 ساعة (ص/م) — القيمة داخلياً "HH:MM" بنظام 24 ساعة */
export function TimePicker12({ value, onChange, className = '' }) {
  const { h, min, pm } = split12(value);
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);
  if (!minuteOptions.includes(min)) minuteOptions.push(min);
  const btn = (sel, on) =>
    `rounded-md px-3 py-2 text-xs font-black transition-colors ${sel ? 'bg-brand-600 text-pure' : 'text-white/55 hover:text-white'}`;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select className="input w-20" value={h} onChange={(e) => onChange(join24(e.target.value, min, pm))}>
        {hourOptions.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="font-black text-white/35">:</span>
      <select className="input w-24" value={min} onChange={(e) => onChange(join24(h, e.target.value, pm))}>
        {minuteOptions.sort((a, b) => a - b).map((x) => <option key={x} value={x}>{String(x).padStart(2, '0')}</option>)}
      </select>
      <div className="flex overflow-hidden rounded-xl border border-white/10">
        <button type="button" className={btn(!pm, false)} onClick={() => onChange(join24(h, min, false))}>
          ص
        </button>
        <button type="button" className={btn(pm, false)} onClick={() => onChange(join24(h, min, true))}>
          م
        </button>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 transition-colors hover:border-brand-500/40"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-pure transition-all ${checked ? 'left-0.5' : 'left-[22px]'}`} />
      </span>
      <span className="text-sm font-semibold text-white/80">{label}</span>
    </button>
  );
}

export function ImageUploader({ value, onChange, label = 'الصورة' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('kind', 'image');
      fd.append('file', file);
      const data = await api('/api/admin/upload', { method: 'POST', body: fd });
      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10">
          <img src={value} alt={label} className="aspect-video w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-ink-950/70 p-2 backdrop-blur">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20">
              تغيير
            </button>
            <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30">
              <Trash2 size={13} /> حذف
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-ink-900 text-white/50 transition-colors hover:border-brand-500/50 hover:text-brand-400"
        >
          {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
          <span className="text-sm font-bold">{uploading ? 'جاري الرفع...' : `اضغط لرفع ${label}`}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="mt-1 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}

export function VideoUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('kind', 'video');
      fd.append('file', file);
      const data = await api('/api/admin/upload', { method: 'POST', body: fd });
      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <video src={value} controls className="aspect-video w-full rounded-xl border border-white/10 bg-black" />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-ghost flex-1 !py-2.5 text-sm"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'جاري الرفع...' : value ? 'تغيير الفيديو المرفوع' : 'رفع فيديو'}
        </button>
        {value && value.startsWith('/uploads/') && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/10"
          >
            <Trash2 size={15} /> حذف الملف
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
      <p className="text-xs text-white/40">أو حط رابط يوتيوب / فيميو / رابط مباشر في حقل "رابط الفيديو". لو رفعت فيديو هنا، الرابط ملغى.</p>
    </div>
  );
}

export function FileUploader({ value, fileName = '', fileSize = 0, onChange, onFileName, onFileSize, label = 'الملف (PDF)' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('kind', 'pdf');
      fd.append('file', file);
      const data = await api('/api/admin/upload', { method: 'POST', body: fd });
      onChange(data.url);
      if (onFileName) onFileName(file.name);
      if (onFileSize) onFileSize(file.size);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
              <FileText size={20} className="text-red-400" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{fileName || value.split('/').pop()}</div>
              {fileSize > 0 && <div className="text-xs text-white/40">{(fileSize / 1024 / 1024).toFixed(2)} MB</div>}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20">
              تغيير
            </button>
            <button type="button" onClick={() => { onChange(''); onFileName?.(''); onFileSize?.(0); }} className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30">
              <Trash2 size={13} /> حذف
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-ink-900 px-4 py-8 text-white/50 transition-colors hover:border-brand-500/50 hover:text-brand-400"
        >
          {uploading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
          <span className="text-sm font-bold">{uploading ? 'جاري الرفع...' : `اضغط لرفع ${label}`}</span>
          <span className="text-xs text-white/35">صيغة PDF فقط — حتى 250 ميجا</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFile} />
      {error && <p className="mt-1 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}

export function Alert({ type = 'ok', children }) {
  const styles = type === 'ok'
    ? 'border-green-500/30 bg-green-500/10 text-green-300'
    : 'border-red-500/30 bg-red-500/10 text-red-300';
  return (
    <div className={`mb-5 flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${styles}`}>
      {type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      {children}
    </div>
  );
}

export function ConfirmDelete({ onConfirm, title = 'حذف' }) {
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60">متأكد؟</span>
      <button
        onClick={() => { onConfirm(); setConfirming(false); }}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-pure hover:bg-red-500"
      >
        نعم احذف
      </button>
      <button onClick={() => setConfirming(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/20">
        لا
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
      title={title}
    >
      <Trash2 size={13} /> حذف
    </button>
  );
}

export function Empty({ text = 'مفيش بيانات لحد دلوقتي.' }) {
  return <p className="py-16 text-center text-white/45">{text}</p>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

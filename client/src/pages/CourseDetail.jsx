import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Play, Clock, ClipboardCheck, GraduationCap, CheckCircle2, Lock,
  Wallet, X, Loader2, Copy, Check, Hourglass
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store/AppContext';
import Spinner from '../components/Spinner';

export default function CourseDetail() {
  const { id } = useParams();
  const { customer, settings } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollments, setEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showPay, setShowPay] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api(`/api/courses/${id}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!customer) return;
    api('/api/customer/enrollments').then((d) => setEnrollments(d.enrollments || [])).catch(() => {});
    api('/api/customer/payments').then((d) => setPayments(d.payments || [])).catch(() => {});
  }, [customer]);

  const enroll = async () => {
    if (!customer) {
      window.location.href = '/student/login';
      return;
    }
    setEnrolling(true);
    setError('');
    try {
      await api('/api/customer/enroll', { method: 'POST', body: JSON.stringify({ course_id: Number(id) }) });
      window.location.href = `/student/course/${id}`;
    } catch (e) {
      setError(e.message);
      setEnrolling(false);
    }
  };

  const submitPayment = async () => {
    setPayBusy(true);
    setError('');
    try {
      const res = await api('/api/customer/checkout', { method: 'POST', body: JSON.stringify({ course_id: Number(id), reference: payRef, payer_phone: payPhone }) });
      setPayBusy(false);
      setShowPay(false);
      setMsg(res.message);
      setTimeout(() => setMsg(''), 6000);
      api('/api/customer/payments').then((d) => setPayments(d.payments || [])).catch(() => {});
    } catch (e) {
      setError(e.message);
      setPayBusy(false);
    }
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(settings.vodafone_cash || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) { /* ignore */ }
  };

  if (loading) return <Spinner label="جاري تحميل الكورس..." />;
  if (error && !data) return (
    <div className="container-x flex min-h-[50vh] flex-col items-center justify-center pt-28 text-center">
      <p className="text-white/60">{error}</p>
      <Link to="/courses" className="btn-primary mt-6">ارجع للكورسات</Link>
    </div>
  );
  if (!data) return null;

  const { course, lessons, quizzes } = data;
  const paid = Number(course.price_amount) > 0;
  const isEnrolled = enrollments.some((e) => e.id === course.id);
  const myPayment = payments.find((p) => p.course_id === course.id);
  const pendingPay = Boolean(myPayment && myPayment.status === 'pending');
  const vodafoneNumber = settings.vodafone_cash || '01099724825';
  const vodafoneName = settings.vodafone_cash_name || 'أحمد علي الديب';

  const actionBtn = paid ? (
    isEnrolled ? (
      <a href={`/student/course/${course.id}`} className="btn-primary !px-8 !py-4">
        <Play size={20} /> شاهد الكورس
      </a>
    ) : pendingPay ? (
      <button disabled className="btn-primary !px-8 !py-4 opacity-70">
        <Hourglass size={20} /> الدفع تحت المراجعة
      </button>
    ) : (
      <button onClick={() => { if (!customer) { window.location.href = '/student/login'; return; } setError(''); setShowPay(true); }} className="btn-primary !px-8 !py-4">
        <Wallet size={20} /> اشترك الآن بـ {Number(course.price_amount).toLocaleString('ar-EG')} ج.م
      </button>
    )
  ) : (
    <button onClick={enroll} disabled={enrolling} className="btn-primary !px-8 !py-4 disabled:opacity-60">
      <GraduationCap size={20} />
      {enrolling ? 'جاري التسجيل...' : customer ? 'سجّل في الكورس' : 'سجّل دلوقتي مجاناً'}
    </button>
  );

  return (
    <div className="pt-24 pb-16">
      {/* Header */}
      <section className="border-b border-white/5 bg-ink-900/50">
        <div className="container-x py-10">
          <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <ArrowLeft size={16} /> كل الكورسات
          </Link>
          <div className="mt-5 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="animate-float text-4xl">{course.icon}</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neon-300">{course.grade}</span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-brand-300">{course.term}</span>
                {paid && <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">كورس مدفوع 💳</span>}
              </div>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">{course.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">{course.description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-white/55">
                <span className="flex items-center gap-1.5"><Play size={16} className="text-brand-400" /> {lessons.length} درس فيديو</span>
                <span className="flex items-center gap-1.5"><ClipboardCheck size={16} className="text-brand-400" /> {quizzes.length} اختبار</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-300">
                  {paid ? `${Number(course.price_amount).toLocaleString('ar-EG')} ج.م` : (course.price || 'مجاني')}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              {actionBtn}
              {customer && (
                <span className="flex items-center justify-center gap-1.5 text-xs text-white/45">
                  <CheckCircle2 size={14} className="text-emerald-400" /> تقدمك بيتسجل تلقائياً
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {msg && (
        <div className="container-x mt-5">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300">
            <CheckCircle2 size={18} /> {msg}
          </div>
        </div>
      )}

      <div className="container-x mt-10 grid gap-8 lg:grid-cols-2">
        {/* Lessons */}
        <div className="card p-6 sm:p-7">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-black">
            <Play size={20} className="text-brand-400" /> دروس الكورس
          </h2>
          {lessons.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">الدروس هتتضاف قريباً.</p>
          ) : (
            <ul className="space-y-3">
              {lessons.map((l, i) => (
                <li key={l.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-ink-900 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-black text-brand-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold">{l.title}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-white/40">
                      {l.duration && <span className="flex items-center gap-1"><Clock size={12} /> {l.duration}</span>}
                    </div>
                  </div>
                  {customer && isEnrolled ? (
                    <a href={`/student/course/${course.id}`} className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-pure hover:bg-brand-500">
                      <Play size={13} /> شاهد
                    </a>
                  ) : (
                    <Lock size={15} className="text-white/30" />
                  )}
                </li>
              ))}
            </ul>
          )}
          {!customer && (
            <p className="mt-4 rounded-xl bg-white/5 p-3 text-center text-xs text-white/50">
              سجّل في الكورس عشان تشوف الدروس وتتبع تقدمك.
            </p>
          )}
        </div>

        {/* Quizzes */}
        <div className="card p-6 sm:p-7">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-black">
            <ClipboardCheck size={20} className="text-brand-400" /> اختبارات الكورس
          </h2>
          {quizzes.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">اختبارات الكورس هتتضاف قريباً.</p>
          ) : (
            <ul className="space-y-3">
              {quizzes.map((q) => (
                <li key={q.id} className="rounded-xl border border-white/10 bg-ink-900 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold">{q.title}</div>
                      <div className="mt-1 text-xs text-white/45">{q.duration_minutes} دقيقة</div>
                    </div>
                    <a href={customer && isEnrolled ? `/student/course/${course.id}` : '/student/login'} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/20">
                      حل الاختبار
                    </a>
                  </div>
                  {q.description && <p className="mt-2 text-sm leading-6 text-white/55">{q.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <div className="absolute inset-0 bg-ink-950/90 backdrop-blur-sm" onClick={() => setShowPay(false)} />
          <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-black">
                <Wallet size={20} className="text-neon-300" /> الدفع بـ Vodafone Cash
              </h3>
              <button onClick={() => setShowPay(false)} className="rounded-lg border border-white/10 p-2 text-white/60 hover:bg-white/5" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">الكورس</span>
                <span className="font-bold">{course.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">المبلغ المطلوب</span>
                <span className="text-xl font-black text-neon-300">{Number(course.price_amount).toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

            <ol className="mt-5 space-y-3 text-sm leading-7 text-white/75">
              <li className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-pure">1</span>
                افتح تطبيق <b>فودافون كاش</b> واعمل تحويل للمبلغ ده على الرقم ده:</li>
            </ol>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950 p-4">
              <div>
                <div className="text-sm text-white/60">رقم المحفظة</div>
                <div className="text-lg font-black text-neon-300" dir="ltr">{vodafoneNumber}</div>
                <div className="text-xs text-white/40">صاحب المحفظة: {vodafoneName}</div>
              </div>
              <button onClick={copyNumber} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/20">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>

            <ol className="mt-4 space-y-2 text-sm leading-7 text-white/75" start={2}>
              <li className="flex gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-pure">2</span>
                بعد نجاح التحويل هتحصل على <b>رقم العملية</b> — اكتبه في الخانة دي عشان نتأكد من الدفع.</li>
            </ol>

            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              dir="ltr"
              className="input mt-3 text-right"
              placeholder="اكتب رقم العملية (مثال: 23857121)"
              maxLength={100}
            />
            <input
              value={payPhone}
              onChange={(e) => setPayPhone(e.target.value)}
              dir="ltr"
              className="input mt-3 text-right"
              placeholder="رقم المحفظة اللي حولت منها (اختياري)"
              maxLength={30}
            />

            {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

            <button onClick={submitPayment} disabled={payBusy || payRef.trim().length < 4} className="btn-primary mt-5 w-full disabled:opacity-60">
              {payBusy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {payBusy ? 'جاري إرسال طلب الدفع...' : 'أرسل طلب الدفع'}
            </button>
            <p className="mt-3 text-center text-xs text-white/40">
              هيتم تفعيل الكورس عندك فور تأكيد مستر أحمد للتحويل (غالباً خلال ساعات).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

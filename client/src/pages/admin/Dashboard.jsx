import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, PlaySquare, ClipboardCheck, Users, Star, HelpCircle, Inbox, Plus,
  MailOpen, Activity, ShieldCheck, GraduationCap, Trophy, Eye, Wallet, Building2
} from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime } from '../../utils/time';

const actionLabels = {
  login_ok: 'تسجيل دخول',
  login_fail: 'محاولة دخول فاشلة',
  login_fail_2fa: 'كود 2FA خاطئ',
  logout_all: 'خروج من كل الأجهزة',
  password_change: 'تغيير كلمة السر',
  '2fa_enabled': 'تفعيل المصادقة الثنائية',
  '2fa_disabled': 'إيقاف المصادقة الثنائية',
  course_create: 'إضافة كورس',
  course_update: 'تعديل كورس',
  course_delete: 'حذف كورس',
  lesson_create: 'إضافة درس',
  lesson_update: 'تعديل درس',
  lesson_delete: 'حذف درس',
  quiz_create: 'إنشاء اختبار',
  quiz_update: 'تعديل اختبار',
  quiz_delete: 'حذف اختبار',
  question_create: 'إضافة سؤال',
  question_update: 'تعديل سؤال',
  question_delete: 'حذف سؤال',
  testimonial_create: 'إضافة رأي',
  testimonial_update: 'تعديل رأي',
  testimonial_delete: 'حذف رأي',
  testimonial_approve: 'موافقة على تقييم طالب',
  testimonial_reject: 'رفض تقييم طالب',
  testimonial_submit: 'تقييم جديد من طالب',
  faq_create: 'إضافة سؤال شائع',
  faq_update: 'تعديل سؤال شائع',
  faq_delete: 'حذف سؤال شائع',
  message_read: 'قراءة رسالة',
  message_delete: 'حذف رسالة',
  settings_update: 'تعديل إعدادات',
  contact_message: 'رسالة جديدة من الزوار',
  upload: 'رفع ملف',
  student_enroll: 'تسجيل طالب',
  student_quiz: 'حل اختبار',
  student_password_change: 'تغيير كلمة سر طالب',
  student_password_reset: 'إعادة تعيين كلمة سر طالب',
  student_upload: 'رفع ملف طالب',
  student_delete: 'حذف طالب'
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/admin/dashboard')
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="جاري تحميل البيانات..." />;

  const { stats, recentMessages, recentEnrollments, recentStudents, recentAttempts, recentActivity, grades } = data;
  const cards = [
    { icon: Users, label: 'الطلاب', value: stats.students, to: `${ADMIN_PATH}/students`, color: 'text-brand-400' },
    { icon: BookOpen, label: 'الكورسات', value: stats.courses, to: `${ADMIN_PATH}/courses`, color: 'text-neon-400' },
    { icon: PlaySquare, label: 'الدروس', value: stats.lessons, to: `${ADMIN_PATH}/lessons`, color: 'text-emerald-400' },
    { icon: ClipboardCheck, label: 'الاختبارات', value: stats.quizzes, to: `${ADMIN_PATH}/quizzes`, color: 'text-amber-400' },
    { icon: Inbox, label: 'الرسائل', value: stats.messages, to: `${ADMIN_PATH}/messages`, color: 'text-rose-400', badge: stats.unread }
  ];
  const miniCards = [
    { icon: GraduationCap, label: 'تسجيلات كورسات', value: stats.enrolled, color: 'text-brand-300' },
    { icon: Eye, label: 'مشاهدات دروس', value: stats.watched, color: 'text-neon-300' },
    { icon: Trophy, label: 'محاولات اختبارات', value: stats.attempts, color: 'text-emerald-300' },
    { icon: Star, label: 'متوسط الدرجات', value: `${stats.avgScore}%`, color: 'text-amber-300' },
    { icon: Wallet, label: 'مدفوعات تحت المراجعة', value: stats.pendingPayments, color: 'text-neon-300', to: `${ADMIN_PATH}/payments` },
    { icon: Building2, label: 'حجوزات جديدة', value: stats.pendingBookings, color: 'text-brand-300', to: `${ADMIN_PATH}/bookings` }
  ];

  return (
    <div>
      <PageHeader
        title="مرحباً بيك مستر أحمد"
        subtitle="ملخص سريع لأداء المنصة وطلابك."
        action={
          <Link to={`${ADMIN_PATH}/courses/new`} className="btn-primary !py-2.5 text-sm">
            <Plus size={17} /> إضافة كورس جديد
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card relative p-5 hover:border-brand-500/40">
            {c.badge > 0 && (
              <span className="absolute left-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-black text-white">
                {c.badge}
              </span>
            )}
            <c.icon size={24} className={c.color} />
            <div className="mt-3 text-3xl font-black">{c.value}</div>
            <div className="mt-1 text-xs font-semibold text-white/50">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {miniCards.map((c) =>
          c.to ? (
            <Link key={c.label} to={c.to} className="card flex items-center gap-3 p-4 hover:border-brand-500/40">
              <c.icon size={20} className={c.color} />
              <div>
                <div className="text-xl font-black">{c.value}</div>
                <div className="text-[11px] font-semibold text-white/50">{c.label}</div>
              </div>
            </Link>
          ) : (
            <div key={c.label} className="card flex items-center gap-3 p-4">
              <c.icon size={20} className={c.color} />
              <div>
                <div className="text-xl font-black">{c.value}</div>
                <div className="text-[11px] font-semibold text-white/50">{c.label}</div>
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Inbox size={18} className="text-brand-400" /> أحدث الرسائل
          </h3>
          {recentMessages.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش رسائل وصلت لسه.</p>
          ) : (
            <ul className="space-y-3">
              {recentMessages.map((m) => (
                <li key={m.id} className={`rounded-xl border border-white/10 bg-ink-900 p-4 ${m.is_read ? '' : 'border-brand-500/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold">{m.name}</span>
                    {!m.is_read && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-black text-pure">جديد</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-white/55">{m.message}</p>
                  <div className="mt-2 text-xs text-white/35">{fmtDateTime(m.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${ADMIN_PATH}/messages`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <MailOpen size={16} /> كل الرسائل
          </Link>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <GraduationCap size={18} className="text-brand-400" /> أحدث تسجيلات الكورسات
          </h3>
          {recentEnrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش تسجيلات لسه.</p>
          ) : (
            <ul className="space-y-3">
              {recentEnrollments.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
                  <div>
                    <div className="font-extrabold">{e.student_name}</div>
                    <div className="mt-1 text-xs text-white/40">{e.course_title}</div>
                  </div>
                  <span className="shrink-0 text-xs text-white/35">{fmtDateTime(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${ADMIN_PATH}/students`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <Users size={16} /> كل الطلاب
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Trophy size={18} className="text-brand-400" /> أحدث نتائج الاختبارات
          </h3>
          {recentAttempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش اختبارات متحلّة لسه.</p>
          ) : (
            <ul className="space-y-3">
              {recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
                  <div>
                    <div className="font-extrabold">{a.student_name}</div>
                    <div className="mt-1 text-xs text-white/40">{a.quiz_title}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${a.total && a.score / a.total >= 0.7 ? 'bg-emerald-500/15 text-emerald-300' : a.total && a.score / a.total >= 0.5 ? 'bg-brand-500/15 text-brand-300' : 'bg-white/10 text-white/50'}`}>
                    {a.score} / {a.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to={`${ADMIN_PATH}/quizzes`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <ClipboardCheck size={16} /> كل الاختبارات
          </Link>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Activity size={18} className="text-brand-400" /> توزيع الطلاب على الصفوف
          </h3>
          {grades.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">مفيش بيانات توزيع لسه.</p>
          ) : (
            <ul className="space-y-3">
              {grades.map((g) => (
                <li key={g.grade} className="rounded-xl border border-white/10 bg-ink-900 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">{g.grade}</span>
                    <span className="font-black text-brand-300">{g.students_count} طالب</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h3 className="mb-4 flex items-center gap-2 font-extrabold">
          <Activity size={18} className="text-brand-400" /> سجل النشاط الأخير
        </h3>
        {recentActivity.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">مفيش نشاط مسجل لحد دلوقتي.</p>
        ) : (
          <ul className="space-y-2">
            {recentActivity.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-ink-900/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <ShieldCheck size={15} />
                  </span>
                  <div>
                    <div className="text-sm font-bold">{actionLabels[a.action] || a.action}</div>
                    {a.detail && <div className="text-xs text-white/40">{a.detail}</div>}
                  </div>
                </div>
                <span className="text-xs text-white/35">{fmtDateTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

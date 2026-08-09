import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Mail, CalendarClock, BookOpen, ClipboardCheck, Trophy } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';
import { fmtDateTime, fmtDate } from '../../utils/time';

export default function StudentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/admin/students/${id}`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) return <Spinner label="جاري تحميل بيانات الطالب..." />;
  if (error) return (
    <div className="card p-10 text-center">
      <p className="text-white/60">{error}</p>
      <Link to={`${ADMIN_PATH}/students`} className="btn-primary mt-5">رجوع للطلاب</Link>
    </div>
  );

  const { student, enrollments, attempts } = data;
  const totalWatched = enrollments.reduce((s, e) => s + e.watched_count, 0);

  return (
    <div>
      <PageHeader
        title="ملف الطالب"
        action={
          <Link to={`${ADMIN_PATH}/students`} className="btn-ghost !py-2.5 text-sm">
            <ArrowRight size={16} /> كل الطلاب
          </Link>
        }
      />

      <div className="card mb-6 flex flex-wrap items-center gap-4 p-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-neon-400 text-2xl font-black text-pure shadow-glow">
          {student.name?.charAt(0) || 'ط'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-black">{student.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-white/55" dir="ltr">
            <Mail size={15} className="shrink-0 text-brand-400" /> {student.email}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
            <CalendarClock size={13} /> مسجل من {fmtDate(student.created_at)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <div className="text-xl font-black text-brand-300">{enrollments.length}</div>
            <div className="text-[11px] font-bold text-white/45">كورسات</div>
          </div>
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <div className="text-xl font-black text-neon-300">{totalWatched}</div>
            <div className="text-[11px] font-bold text-white/45">دروس شاهدها</div>
          </div>
          <div className="rounded-xl bg-white/5 px-4 py-3">
            <div className="text-xl font-black text-emerald-300">{attempts.length}</div>
            <div className="text-[11px] font-bold text-white/45">اختبارات</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <BookOpen size={18} className="text-brand-400" /> كورسات الطالب
          </h3>
          {enrollments.length === 0 ? (
            <Empty text="الطالب ده مش مسجل في أي كورس." />
          ) : (
            <ul className="space-y-3">
              {enrollments.map((c) => {
                const pct = c.lessons_count ? Math.round((c.watched_count / c.lessons_count) * 100) : 0;
                return (
                  <li key={c.id} className="rounded-xl border border-white/10 bg-ink-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-xl">{c.icon}</span>
                        <div className="min-w-0">
                          <div className="truncate font-extrabold">{c.title}</div>
                          <div className="text-xs text-white/40">{c.grade}</div>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-black text-brand-300">{pct}%</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-neon-400" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-extrabold">
            <Trophy size={18} className="text-brand-400" /> نتائج الاختبارات
          </h3>
          {attempts.length === 0 ? (
            <Empty text="الطالب ده محلش أي اختبار لسه." />
          ) : (
            <ul className="space-y-3">
              {attempts.map((a) => {
                const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 p-4">
                    <div>
                      <div className="font-extrabold">{a.quiz_title}</div>
                      <div className="mt-1 text-xs text-white/40">{fmtDateTime(a.created_at)}</div>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${pct >= 70 ? 'bg-emerald-500/15 text-emerald-300' : pct >= 50 ? 'bg-brand-500/15 text-brand-300' : 'bg-white/10 text-white/50'}`}>
                      <ClipboardCheck size={13} /> {a.score} / {a.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

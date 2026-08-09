import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Clock, HelpCircle, Download } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, ConfirmDelete, Empty } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

export default function QuizzesAdmin() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    api('/api/admin/quizzes')
      .then((d) => { setQuizzes(d.quizzes); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (id) => {
    await api(`/api/admin/quizzes/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="الاختبارات"
        subtitle="اختبارات تفاعلية على كل كورس مع الأسئلة."
        action={
          <Link to={`${ADMIN_PATH}/quizzes/new`} className="btn-primary !py-2.5 text-sm">
            <Plus size={17} /> إنشاء اختبار
          </Link>
        }
      />

      {loading ? (
        <Spinner />
      ) : quizzes.length === 0 ? (
        <Empty text="مفيش اختبارات لحد دلوقتي." />
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className={`card overflow-hidden ${q.active ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                    <HelpCircle size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{q.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/45">
                      <span className="text-brand-300">{q.course_title}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {q.duration_minutes} دقيقة</span>
                      <span>{q.questions_count} سؤال</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/api/admin/export/quiz/${q.id}?format=xlsx`}
                    className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20"
                    title="تصدير نتائج الاختبار"
                  >
                    <Download size={13} /> تصدير
                  </a>
                  <button
                    onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20"
                  >
                    {expanded === q.id ? 'إخفاء الأسئلة' : 'الأسئلة'}
                  </button>
                  <Link to={`${ADMIN_PATH}/quizzes/${q.id}`} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                    <Pencil size={13} /> تعديل
                  </Link>
                  <ConfirmDelete onConfirm={() => del(q.id)} />
                </div>
              </div>

              {expanded === q.id && (
                <div className="border-t border-white/10 bg-ink-900/50 p-4">
                  {q.questions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-white/40">مفيش أسئلة لسه — عدّل الاختبار وضيف أسئلة.</p>
                  ) : (
                    <ul className="space-y-2">
                      {q.questions.map((question, i) => {
                        let opts = [];
                        try { opts = JSON.parse(question.options || '[]'); } catch (_) { opts = []; }
                        return (
                          <li key={question.id} className="rounded-xl border border-white/5 bg-ink-950/50 p-3">
                            <div className="text-sm font-bold">{i + 1}. {question.question}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {opts.map((opt, oi) => (
                                <span key={oi} className={`rounded-lg px-2 py-0.5 text-[11px] ${oi === question.correct_index ? 'bg-emerald-500/15 font-bold text-emerald-300' : 'bg-white/5 text-white/45'}`}>
                                  {opt}
                                </span>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

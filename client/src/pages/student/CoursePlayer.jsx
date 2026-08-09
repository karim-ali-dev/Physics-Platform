import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, CheckCircle2, Circle, ArrowLeft, ClipboardCheck, Check, X, Clock, Award, RotateCcw } from 'lucide-react';
import { api, getEmbedType } from '../../api';
import { useApp } from '../../store/AppContext';
import Spinner from '../../components/Spinner';

export default function CoursePlayer() {
  const { id } = useParams();
  const { customer } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [activeLesson, setActiveLesson] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/api/customer/course/${id}`)
      .then((d) => {
        setData(d);
        setActiveLesson(d.lessons[0] || null);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error && !data) {
    return (
      <div className="container-x flex min-h-[50vh] flex-col items-center justify-center pt-28 text-center">
        <p className="text-white/60">{error}</p>
        <Link to={customer ? '/student/account' : '/courses'} className="btn-primary mt-6">رجوع</Link>
      </div>
    );
  }
  if (!data) return <Spinner label="جاري تحميل الكورس..." />;

  const { course, lessons, quizzes } = data;

  const markWatched = async (lesson) => {
    try {
      await api(`/api/customer/lesson/${lesson.id}/watch`, { method: 'POST', body: JSON.stringify({}) });
      setData((d) => ({
        ...d,
        lessons: d.lessons.map((l) => (l.id === lesson.id ? { ...l, watched: 1 } : l))
      }));
    } catch (_) {
      /* ignore */
    }
  };

  const openQuiz = async (q) => {
    setResult(null);
    setAnswers({});
    setQuiz(null);
    setBusy(true);
    try {
      const d = await api(`/api/customer/quiz/${q.id}`);
      setQuiz(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    setBusy(true);
    try {
      const res = await api('/api/customer/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ quiz_id: quiz.quiz.id, answers })
      });
      setResult(res);
      const fresh = await api(`/api/customer/quiz/${quiz.quiz.id}`);
      setQuiz(fresh);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const watchedCount = lessons.filter((l) => l.watched).length;
  const pct = lessons.length ? Math.round((watchedCount / lessons.length) * 100) : 0;

  return (
    <div className="pt-24 pb-16">
      {/* Header */}
      <section className="border-b border-white/5 bg-ink-900/50">
        <div className="container-x py-8">
          <Link to="/student/account" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300">
            <ArrowLeft size={16} /> رجوع لمنصتي
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl">{course.icon}</span>
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">{course.title}</h1>
              <p className="mt-1 text-sm text-white/50">{course.grade} — {course.term}</p>
            </div>
          </div>
          <div className="mt-5 max-w-md">
            <div className="flex items-center justify-between text-xs font-bold text-white/55">
              <span>{watchedCount} من {lessons.length} دروس</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-neon-400" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="container-x mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Main content: video / quiz */}
        <div>
          {quiz ? (
            <div className="card p-6 sm:p-8">
                  {result ? (
                    <ResultPanel result={result} quiz={quiz.quiz} questions={quiz.questions} onRetry={() => { setResult(null); setAnswers({}); }} onBack={() => setQuiz(null)} />
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-xl font-black">
                      <ClipboardCheck size={20} className="text-brand-400" /> {quiz.quiz.title}
                    </h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/60">
                      <Clock size={14} /> {quiz.quiz.duration_minutes} دقيقة
                    </span>
                  </div>

                  <div className="space-y-6">
                    {quiz.questions.map((q, qi) => {
                      let opts = [];
                      try { opts = JSON.parse(q.options || '[]'); } catch (_) { opts = []; }
                      return (
                        <div key={q.id} className="rounded-xl border border-white/10 bg-ink-900 p-5">
                          <div className="font-extrabold">{qi + 1}. {q.question}</div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {opts.map((opt, oi) => {
                              const selected = answers[q.id] === oi;
                              return (
                                <button
                                  key={oi}
                                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                                  className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-right text-sm font-bold transition-colors ${
                                    selected
                                      ? 'border-brand-500/60 bg-brand-500/15 text-brand-200'
                                      : 'border-white/10 bg-white/5 text-white/75 hover:border-white/25'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${selected ? 'bg-brand-500 text-pure' : 'bg-white/10'}`}>
                                      {String.fromCharCode(65 + oi)}
                                    </span>
                                    {opt}
                                  </span>
                                  {selected && <Check size={15} className="shrink-0 text-brand-300" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <button onClick={submitQuiz} disabled={busy} className="btn-primary flex-1 disabled:opacity-60">
                      <Check size={18} /> {busy ? 'جاري التصحيح...' : 'سلّم إجاباتي'}
                    </button>
                    <button onClick={() => setQuiz(null)} className="btn-ghost">إلغاء</button>
                  </div>
                </>
              )}
            </div>
          ) : activeLesson ? (
            <div className="card overflow-hidden p-0">
              <div className="aspect-video w-full bg-ink-950">
                <LessonVideo url={activeLesson.video_url} />
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black">{activeLesson.title}</h2>
                  <button
                    onClick={() => markWatched(activeLesson)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                      activeLesson.watched
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-brand-600 text-pure hover:bg-brand-500'
                    }`}
                  >
                    {activeLesson.watched ? <CheckCircle2 size={15} /> : <Check size={15} />}
                    {activeLesson.watched ? 'تم الحفظ' : 'علّمني إني شفت الدرس'}
                  </button>
                </div>
                {activeLesson.duration && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-white/45">
                    <Clock size={13} /> {activeLesson.duration}
                  </div>
                )}
                {activeLesson.summary && (
                  <p className="mt-4 whitespace-pre-line text-sm leading-8 text-white/65">{activeLesson.summary}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex min-h-[300px] flex-col items-center justify-center p-10 text-center">
              <ClipboardCheck size={40} className="mb-3 text-white/20" />
              <p className="text-sm text-white/55">اختار درس من القائمة، أو اختار اختبار تبدأ به.</p>
            </div>
          )}
        </div>

        {/* Sidebar: lessons + quizzes */}
        <aside className="space-y-6">
          <div className="card p-4">
            <h3 className="mb-3 flex items-center gap-2 px-2 text-sm font-black text-white/70">
              <Play size={15} className="text-brand-400" /> الدروس
            </h3>
            <ul className="space-y-1.5">
              {lessons.map((l, i) => (
                <li key={l.id}>
                  <button
                    onClick={() => setActiveLesson(l)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-bold transition-colors ${
                      activeLesson?.id === l.id ? 'bg-brand-500/15 text-brand-200' : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs">
                      {l.watched ? <CheckCircle2 size={15} className="text-emerald-400" /> : i + 1}
                    </span>
                    <span className="flex-1 truncate">{l.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 flex items-center gap-2 px-2 text-sm font-black text-white/70">
              <ClipboardCheck size={15} className="text-brand-400" /> الاختبارات
            </h3>
            <ul className="space-y-1.5">
              {quizzes.map((q) => (
                <li key={q.id}>
                  <button
                    onClick={() => openQuiz(q)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-bold text-white/70 transition-colors hover:bg-white/5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-xs text-brand-300">
                      <ClipboardCheck size={14} />
                    </span>
                    <span className="flex-1 truncate">{q.title}</span>
                    {q.best_pct != null && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-300">
                        {q.best_pct}%
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LessonVideo({ url }) {
  if (!url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-ink-950 text-center">
        <Play size={44} className="text-white/15" />
        <p className="mt-3 text-xs text-white/40">فيديو الدرس هيظهر هنا قريباً</p>
      </div>
    );
  }
  const { kind, src } = getEmbedType(url);
  if (kind === 'file') {
    return (
      <video className="h-full w-full" controls src={url} style={{ background: '#000' }}>
        متصفحك مش بيدعم تشغيل الفيديو.
      </video>
    );
  }
  return (
    <iframe
      className="h-full w-full"
      src={src}
      title="فيديو الدرس"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

function ResultPanel({ result, quiz, questions, onRetry, onBack }) {
  const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
  const perfect = pct === 100;
  const pass = pct >= 50;
  const details = result.details || [];
  return (
    <div>
      <div className="text-center">
        <span className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full text-4xl font-black shadow-glow ${perfect ? 'bg-gradient-to-br from-emerald-500 to-teal-400' : pass ? 'bg-gradient-to-br from-brand-500 to-neon-400' : 'bg-gradient-to-br from-amber-500 to-orange-400'}`}>
          {pct}%
        </span>
        <h2 className="text-2xl font-black">نتيجتك في {quiz.title}</h2>
        <p className="mt-2 text-white/60">{result.score} من {result.total} — {result.message}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={onRetry} className="btn-primary">
            <RotateCcw size={17} /> حاول تاني
          </button>
          <button onClick={onBack} className="btn-ghost">اختار اختبار تاني</button>
        </div>
        {!pass && !perfect && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-white/45">
            <X size={15} className="text-red-400" /> راجع الدرس الأول وحاول كمان مرة — النجاح بييجي بالمحاولة.
          </p>
        )}
      </div>

      {details.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-black">
            <Award size={18} className="text-brand-400" /> مراجعة إجاباتك
          </h3>
          <div className="space-y-4">
            {details.map((d, i) => {
              let opts = [];
              const q = questions.find((x) => x.id === d.question_id);
              try { opts = JSON.parse(q?.options || '[]'); } catch (_) { opts = []; }
              return (
                <div key={d.question_id} className={`rounded-xl border p-5 ${d.is_correct ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/25 bg-red-500/5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-extrabold">{i + 1}. {d.question}</div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${d.is_correct ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                      {d.is_correct ? <Check size={13} /> : <X size={13} />} {d.is_correct ? 'صحيحة' : 'خطأ'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className={`font-bold ${d.is_correct ? 'text-emerald-300' : 'text-red-300'}`}>
                      إجابتك: {d.chosen >= 0 ? (opts[d.chosen] || `الاختيار ${String.fromCharCode(65 + d.chosen)}`) : 'لم تجب'}
                    </div>
                    {!d.is_correct && (
                      <div className="font-bold text-emerald-300">
                        الإجابة الصحيحة: {opts[d.correct] || `الاختيار ${String.fromCharCode(65 + d.correct)}`}
                      </div>
                    )}
                    {d.explanation && <div className="leading-7 text-white/60">💡 {d.explanation}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

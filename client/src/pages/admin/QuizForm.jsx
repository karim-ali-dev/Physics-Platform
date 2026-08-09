import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, ArrowRight, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { api } from '../../api';
import { ADMIN_PATH } from '../../config';
import { PageHeader, Field, TextInput, TextArea, Toggle, Alert } from '../../components/admin/ui';
import Spinner from '../../components/Spinner';

const blankQuiz = { course_id: '', title: '', description: '', duration_minutes: 20, active: true };
const blankQuestion = { question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', sort_order: 0 };

export default function QuizForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [courses, setCourses] = useState([]);
  const [quiz, setQuiz] = useState({ ...blankQuiz });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const [qIndex, setQIndex] = useState(null);
  const [qForm, setQForm] = useState({ ...blankQuestion });
  const [removedIds, setRemovedIds] = useState([]);

  useEffect(() => {
    api('/api/admin/courses').then((d) => setCourses(d.courses)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api(`/api/admin/quizzes/${id}`)
      .then((d) => {
        const q = d.quiz;
        setQuiz({ course_id: q.course_id, title: q.title, description: q.description || '', duration_minutes: q.duration_minutes || 20, active: q.active !== 0 });
        setQuestions((q.questions || []).map((x) => ({ id: x.id, question: x.question, options: (() => { try { return JSON.parse(x.options || '[]'); } catch (_) { return []; } })(), correct_index: x.correct_index, explanation: x.explanation || '', sort_order: x.sort_order || 0 })));
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        course_id: Number(quiz.course_id),
        title: quiz.title,
        description: quiz.description,
        duration_minutes: Number(quiz.duration_minutes) || 20,
        active: quiz.active
      };
      const path = isEdit ? `/api/admin/quizzes/${id}` : '/api/admin/quizzes';
      const method = isEdit ? 'PUT' : 'POST';
      const data = await api(path, { method, body: JSON.stringify(payload) });
      const quizId = data.quizId || id;
      await Promise.all(removedIds.map((rid) => api(`/api/admin/questions/${rid}`, { method: 'DELETE' })));
      await Promise.all(questions.map(async (question, i) => {
        const qPayload = { quiz_id: quizId, question: question.question, options: question.options, correct_index: question.correct_index, explanation: question.explanation, sort_order: i };
        if (question.id) {
          await api(`/api/admin/questions/${question.id}`, { method: 'PUT', body: JSON.stringify(qPayload) });
        } else {
          await api('/api/admin/questions', { method: 'POST', body: JSON.stringify(qPayload) });
        }
      }));
      setMsg(isEdit ? 'تم حفظ الاختبار' : 'تم إنشاء الاختبار');
      setTimeout(() => navigate(`${ADMIN_PATH}/quizzes`), 900);
    } catch (err) {
      setError(err.message || 'حصل خطأ');
      setBusy(false);
    }
  };

  const saveQuestion = (e) => {
    e.preventDefault();
    const opts = qForm.options.filter((o) => String(o).trim() !== '');
    if (qForm.question.trim() === '') { setError('اكتب نص السؤال'); return; }
    if (opts.length < 2) { setError('لازم اختيارين على الأقل'); return; }
    if (qForm.correct_index >= opts.length) { setError('اختار الإجابة الصحيحة'); return; }
    setError('');
    const data = { ...qForm, options: opts, sort_order: qIndex == null ? questions.length : qIndex };
    if (qIndex == null) {
      setQuestions((q) => [...q, data]);
    } else {
      setQuestions((q) => q.map((x, i) => (i === qIndex ? data : x)));
    }
    setQIndex(null);
    setQForm({ ...blankQuestion, options: ['', '', '', ''] });
  };

  const editQuestion = (i) => {
    setQIndex(i);
    setQForm({ ...questions[i], options: [...questions[i].options, ...Array(Math.max(0, 4 - questions[i].options.length)).fill('')] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeQuestion = (i) => {
    const target = questions[i];
    if (target && target.id) setRemovedIds((r) => [...r, target.id]);
    setQuestions((q) => q.filter((_, x) => x !== i));
    if (qIndex === i) { setQIndex(null); setQForm({ ...blankQuestion }); }
  };

  if (loading) return <Spinner label="جاري تحميل الاختبار..." />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={isEdit ? 'تعديل الاختبار' : 'إنشاء اختبار جديد'} subtitle="بيانات الاختبار + إدارة أسئلته" />

      {msg && <Alert type="ok">{msg}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="card mb-8 space-y-5 p-6">
        <h3 className="border-b border-white/10 pb-3 text-lg font-extrabold">بيانات الاختبار</h3>
        <Field label="الكورس" required>
          <select className="input" value={quiz.course_id} onChange={(e) => setQuiz({ ...quiz, course_id: e.target.value })} required>
            <option value="">اختر الكورس...</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="عنوان الاختبار" required>
            <TextInput value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} required maxLength={200} placeholder="مثال: مراجعة القياس" />
          </Field>
          <Field label="المدة (بالدقائق)">
            <TextInput type="number" min={1} max={300} value={quiz.duration_minutes} onChange={(e) => setQuiz({ ...quiz, duration_minutes: e.target.value })} />
          </Field>
        </div>
        <Field label="وصف الاختبار">
          <TextArea value={quiz.description} onChange={(e) => setQuiz({ ...quiz, description: e.target.value })} maxLength={5000} />
        </Field>
        <Toggle checked={quiz.active} onChange={(v) => setQuiz({ ...quiz, active: v })} label="ظاهر للطلاب" />
      </div>

      <div className="card mb-8 space-y-5 p-6">
        <h3 className="border-b border-white/10 pb-3 text-lg font-extrabold">
          {qIndex == null ? 'إضافة سؤال جديد' : 'تعديل السؤال'}
        </h3>
        <form onSubmit={saveQuestion} className="space-y-4">
          <Field label="السؤال" required>
            <TextInput value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} maxLength={1000} placeholder="اكتب السؤال هنا..." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {qForm.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={qForm.correct_index === oi}
                  onChange={() => setQForm({ ...qForm, correct_index: oi })}
                  className="accent-brand-600"
                />
                <TextInput value={opt} onChange={(e) => setQForm((f) => ({ ...f, options: f.options.map((o, x) => (x === oi ? e.target.value : o)) }))} placeholder={`الاختيار ${oi + 1}${qForm.correct_index === oi ? ' (الصحيح)' : ''}`} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-white/45">
            <Star size={13} className="text-amber-400" /> اللي عليه علامة صح هو الإجابة الصحيحة.
          </div>
          <Field label="شرح الإجابة (اختياري)">
            <TextInput value={qForm.explanation} onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })} maxLength={2000} placeholder="توضيح ليه الإجابة دي صح..." />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary !py-2.5 text-sm">
              <Plus size={16} /> {qIndex == null ? 'إضافة السؤال' : 'حفظ التعديل'}
            </button>
            {qIndex != null && (
              <button type="button" onClick={() => { setQIndex(null); setQForm({ ...blankQuestion }); }} className="btn-ghost">إلغاء</button>
            )}
          </div>
        </form>
      </div>

      {questions.length > 0 && (
        <div className="card mb-8 p-6">
          <h3 className="mb-4 border-b border-white/10 pb-3 text-lg font-extrabold">أسئلة الاختبار ({questions.length})</h3>
          <ul className="space-y-3">
            {questions.map((question, i) => (
              <li key={i} className="rounded-xl border border-white/10 bg-ink-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-bold">{i + 1}. {question.question}</div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => editQuestion(i)} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white/75 hover:bg-white/20">
                      <Pencil size={12} /> تعديل
                    </button>
                    <button onClick={() => removeQuestion(i)} className="flex items-center gap-1 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/25">
                      <Trash2 size={12} /> حذف
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {question.options.map((opt, oi) => (
                    <span key={oi} className={`rounded-lg px-2.5 py-1 text-[11px] ${oi === question.correct_index ? 'bg-emerald-500/15 font-bold text-emerald-300' : 'bg-white/5 text-white/50'}`}>
                      {opt}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={submit} disabled={busy} className="btn-primary flex-1 !py-4 disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {busy ? 'جاري الحفظ...' : isEdit ? 'حفظ كل التعديلات' : 'إنشاء الاختبار'}
        </button>
        <button type="button" onClick={() => navigate(`${ADMIN_PATH}/quizzes`)} className="btn-ghost">
          <ArrowRight size={18} /> إلغاء
        </button>
      </div>
    </div>
  );
}

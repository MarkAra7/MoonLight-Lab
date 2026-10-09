import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { quizApi } from "@/api/quiz";
import { useAuth } from "@/context/AuthContext";
import { QuizQuestionTake, type TakeAnswer } from "@/components/quiz/QuizQuestionTake";
import { QuizResultReview } from "@/components/quiz/QuizResultReview";
import { questionTypeMeta } from "@/config/questionTypes";
import type { Question, Quiz, QuizAttemptResult } from "@/api/types";

const primaryButtonClasses =
  "bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300";

const secondaryLinkClasses =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 no-underline transition-colors hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400";

const linkButton =
  "inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300";

const linkFocusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

function SpinnerBlock() {
  return (
    <div className="flex justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );
}

/** Theory questions need no answer, everything else counts once it has one. */
function isAnswered(question: Question, answer: TakeAnswer | undefined): boolean {
  if (question.question_type === "theory") return true;
  if (!answer) return false;

  const meta = questionTypeMeta(question.question_type);

  if (meta.answerMode === "none") return Boolean(answer.text?.trim());
  if (meta.answerMode === "multi") return (answer.answer_ids?.length ?? 0) > 0;

  return Boolean(answer.answer_id);
}

export function QuizPlayPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, TakeAnswer>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);

  const load = useCallback(async () => {
    if (!quizId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const [quizRes, questionsRes] = await Promise.all([
        quizApi.show(quizId),
        quizApi.questions(quizId),
      ]);

      setQuiz(quizRes.data);
      setQuestions(questionsRes.data ?? []);
      setAnswers({});
      setResult(null);
      setStartedAt(new Date().toISOString());
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load this quiz."));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (authLoading || !user || !quizId) return;
    void (async () => {
      await load();
    })();
  }, [authLoading, user, quizId, load]);

  const answeredCount = useMemo(
    () => questions.filter((question) => isAnswered(question, answers[question.question_id])).length,
    [questions, answers],
  );

  const setAnswer = (questionId: string, next: TakeAnswer) =>
    setAnswers((prev) => ({ ...prev, [questionId]: next }));

  const submit = async () => {
    if (!quizId || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data } = await quizApi.submitAttempt(quizId, {
        started_at: startedAt,
        answers: questions.map((question) => {
          const answer = answers[question.question_id] ?? {};

          return {
            question_id: question.question_id,
            answer_id: answer.answer_id ?? null,
            answer_ids: answer.answer_ids ?? [],
            text: answer.text ?? null,
          };
        }),
      });

      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit your answers."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    const unanswered = questions.length - answeredCount;

    if (
      unanswered > 0 &&
      !window.confirm(`You still have ${unanswered} unanswered question(s). Submit anyway?`)
    ) {
      return;
    }

    void submit();
  };

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md justify-center">
        <div className="glass-moon w-full p-10 text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Take this quiz</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in so your answers and score can be saved.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <SpinnerBlock />;

  if (loadError || !quiz) {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Take this quiz</h1>
        <p className="mb-6 text-sm font-medium text-red-600 dark:text-red-400">
          {loadError ?? "This quiz could not be found."}
        </p>
        <Link to="/quizzes" className={linkButton}>
          Browse quizzes
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex w-full flex-col">
        <section className="glass-moon p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Your result
          </p>
          <p className="mt-3 text-5xl font-black text-slate-900 dark:text-white">
            {result.score} / {result.total}
          </p>
          <p className="mt-2 text-lg font-bold text-sky-600 dark:text-sky-400">
            {result.percentage}%
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            {quiz.title} · attempt #{result.attempt_number}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={() => void load()} className={primaryButtonClasses}>
              Try again
            </Button>
            <Link to={`/quizzes/${quizId}`} className={secondaryLinkClasses}>
              Back to quiz
            </Link>
          </div>
        </section>

        <QuizResultReview result={result} questions={questions} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-6">
        <Link
          to={`/quizzes/${quizId}`}
          className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to quiz
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {quiz.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {questions.length} question{questions.length === 1 ? "" : "s"} · {answeredCount} answered
          {quiz.time_limit ? ` · ${quiz.time_limit} minute limit` : ""}
        </p>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-300 dark:bg-sky-400"
            style={{
              width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`,
            }}
          />
        </div>
      </header>

      {error && (
        <Alert color="failure" className="mb-6">
          {error}
        </Alert>
      )}

      {questions.length === 0 ? (
        <section className="glass-moon p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            This quiz does not have any questions yet.
          </p>
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {questions.map((question, index) => (
              <QuizQuestionTake
                key={question.question_id}
                question={question}
                position={index + 1}
                total={questions.length}
                value={answers[question.question_id] ?? {}}
                disabled={submitting}
                onChange={(next) => setAnswer(question.question_id, next)}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={primaryButtonClasses}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Submitting…
                </>
              ) : (
                "Submit answers"
              )}
            </Button>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {answeredCount} of {questions.length} answered
            </span>
          </div>
        </>
      )}
    </div>
  );
}

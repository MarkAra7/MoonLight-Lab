import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { classApi, type GradedAttemptPayload } from "@/api/class";
import { useAuth } from "@/context/AuthContext";
import { questionTypeMeta } from "@/config/questionTypes";
import { formatDate } from "@/utils/helpers";

const dateFormat: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const linkFocusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

const linkButton =
  "inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300";

const inputClasses =
  "w-full rounded-[10px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:focus:border-sky-400";

const labelClasses =
  "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400";

function studentName(student: GradedAttemptPayload["attempt"]["student"]): string {
  const full = [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim();
  return full || student?.email || "Student";
}

export function TeacherAttemptGradingPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const { user, loading } = useAuth();

  const [payload, setPayload] = useState<GradedAttemptPayload | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id || !attemptId) return;
    let active = true;

    (async () => {
      setLoadingAttempt(true);
      setLoadError(null);
      try {
        const { data } = await classApi.assignmentAttempt(id, attemptId);
        if (!active) return;
        setPayload(data);
        setScore(String(data.attempt.teacher_score ?? data.attempt.auto_score));
        setFeedback(data.attempt.teacher_feedback ?? "");
      } catch (err) {
        if (!active) return;
        console.error("Failed to load the attempt:", err);
        setPayload(null);
        setLoadError(getErrorMessage(err, "Could not load this attempt right now."));
      } finally {
        if (active) setLoadingAttempt(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, id, attemptId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !attemptId || !payload) return;

    const value = Number(score.replace(",", "."));

    if (!Number.isFinite(value) || value < 0 || value > payload.attempt.total) {
      setSaveError(`Enter a score between 0 and ${payload.attempt.total}.`);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setNotice(null);

    try {
      const { data } = await classApi.gradeAssignmentAttempt(id, attemptId, {
        teacher_score: value,
        teacher_feedback: feedback.trim() || null,
      });
      setPayload(data);
      setScore(String(data.attempt.teacher_score ?? data.attempt.auto_score));
      setFeedback(data.attempt.teacher_feedback ?? "");
      setNotice("Grade saved.");
    } catch (err) {
      console.error("Failed to save the grade:", err);
      setSaveError(getErrorMessage(err, "Could not save this grade right now."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingAttempt) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md justify-center">
        <div className="glass-moon w-full p-10 text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Grade attempt</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            You need to be signed in to grade an attempt.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const canManage = user.role?.title === "teacher" || user.role?.title === "admin";

  if (!canManage) {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Grade attempt</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          You don&apos;t have access to teacher grading.
        </p>
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <div className="flex w-full flex-col">
        <Link
          to={id ? `/teacher/assignments/${id}` : "/teacher/classes"}
          className={`mb-6 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to results
        </Link>
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {loadError ?? "This attempt is not available."}
          </p>
        </div>
      </div>
    );
  }

  const { attempt, questions } = payload;

  return (
    <div className="flex w-full flex-col">
      <header className="mb-8">
        <Link
          to={`/teacher/assignments/${id}`}
          className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to results
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {studentName(attempt.student)}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Attempt #{attempt.attempt_number}
          {attempt.completed_at ? ` · submitted ${formatDate(attempt.completed_at, dateFormat)}` : ""}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-moon px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Automatic score
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {attempt.auto_score} / {attempt.total}
          </p>
        </div>
        <div className="glass-moon px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Final score
          </p>
          <p className="mt-1 text-2xl font-black text-sky-600 dark:text-sky-400">
            {attempt.final_score} / {attempt.total}
          </p>
        </div>
        <div className="glass-moon px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Percentage
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {attempt.percentage}%
          </p>
        </div>
      </div>

      <section className="glass-moon p-6 sm:p-8">
        <h2 className="mb-5 text-xl font-bold text-slate-900 dark:text-white">Answers</h2>

        <ol className="flex flex-col gap-4">
          {questions.map((question, index) => {
            const meta = questionTypeMeta(question.question_type);
            const given =
              question.question_type === "text_input"
                ? question.given_text
                : question.given_answer;
            const correct =
              question.question_type === "text_input"
                ? question.correct_text
                : question.correct_answer;

            const tone =
              question.is_correct === null
                ? "gray"
                : question.is_correct
                  ? "success"
                  : "failure";
            const label =
              question.is_correct === null
                ? "Not scored"
                : question.is_correct
                  ? "Correct"
                  : "Incorrect";

            return (
              <li
                key={question.question_id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.03]"
              >
                <header className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-black text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                    {index + 1}
                  </span>
                  <Badge color={tone} size="sm">
                    {label}
                  </Badge>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {meta.label}
                  </span>
                </header>

                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {question.question_text}
                </p>

                {question.scorable ? (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Student answer
                      </dt>
                      <dd
                        className={
                          question.is_correct
                            ? "mt-1 font-semibold text-emerald-600 dark:text-emerald-400"
                            : "mt-1 font-semibold text-red-600 dark:text-red-400"
                        }
                      >
                        {given || "No answer"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Correct answer
                      </dt>
                      <dd className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        {correct || "—"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Reading material — this section awards no points.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="glass-moon mt-6 p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Manual grade</h2>
        <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          Override the automatic score if the student deserves a different mark. The original
          automatic score is kept for comparison.
        </p>

        {saveError && (
          <Alert color="failure" className="mb-5">
            {saveError}
          </Alert>
        )}

        {notice && (
          <Alert color="success" className="mb-5">
            {notice}
          </Alert>
        )}

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
          <div className="max-w-xs">
            <label htmlFor="teacher-score" className={labelClasses}>
              Score (0–{attempt.total})
            </label>
            <input
              id="teacher-score"
              type="number"
              min={0}
              max={attempt.total}
              step="0.5"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              disabled={saving}
              className={inputClasses}
              required
            />
          </div>

          <div>
            <label htmlFor="teacher-feedback" className={labelClasses}>
              Feedback for the student (optional)
            </label>
            <textarea
              id="teacher-feedback"
              rows={4}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              disabled={saving}
              maxLength={2000}
              className={inputClasses}
              placeholder="Explain the mark or point out what to improve."
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={saving} className="font-bold">
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving…
                </>
              ) : (
                "Save grade"
              )}
            </Button>
            {attempt.graded_at && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Last graded {formatDate(attempt.graded_at, dateFormat)}
                {attempt.graded_by ? ` by ${attempt.graded_by}` : ""}
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

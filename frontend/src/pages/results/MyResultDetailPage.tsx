import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "flowbite-react";
import { getErrorMessage, miscApi } from "@/api";
import type { MyAttemptDetail } from "@/api/types";
import { QuizResultReview } from "@/components/quiz/QuizResultReview";
import { useAuth } from "@/context/AuthContext";
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
  "inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300";

export function MyResultDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user, loading } = useAuth();

  const [attempt, setAttempt] = useState<MyAttemptDetail | null>(null);
  const [attemptLoading, setAttemptLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !attemptId) return;
    let active = true;

    (async () => {
      setAttemptLoading(true);
      setError(null);
      try {
        const { data } = await miscApi.myAttempt(attemptId);
        if (!active) return;
        setAttempt(data);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load the result:", err);
        setAttempt(null);
        setError(getErrorMessage(err, "Could not load this result right now."));
      } finally {
        if (active) setAttemptLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, attemptId]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md justify-center">
        <div className="glass-moon w-full p-10 text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Result</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to see this result.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (attemptLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Result</h1>
        <p className="mb-6 text-sm font-medium text-red-600 dark:text-red-400">
          {error ?? "This result could not be found."}
        </p>
        <Link to="/my-results" className={linkButton}>
          Back to my results
        </Link>
      </div>
    );
  }

  const graded = attempt.teacher_score !== null;
  const adjusted = graded && attempt.teacher_score !== attempt.score;

  return (
    <div className="flex w-full flex-col">
      <div className="mb-6">
        <Link
          to="/my-results"
          className={`inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to my results
        </Link>
      </div>

      <section className="glass-moon p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {attempt.quiz_title || "Quiz result"}
              </h1>
              {graded && (
                <Badge color="info" size="sm" className="whitespace-nowrap">
                  Graded by teacher
                </Badge>
              )}
            </div>
            {attempt.assignment_title && (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {attempt.assignment_title}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                Attempt #{attempt.attempt_number}
              </span>
              <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                {attempt.completed_at
                  ? formatDate(attempt.completed_at, dateFormat)
                  : "Completed"}
              </span>
              {attempt.graded_at && (
                <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                  Graded {formatDate(attempt.graded_at, dateFormat)}
                </span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-left md:text-right">
            <p className="text-4xl font-black text-slate-900 dark:text-white">
              {attempt.final_score} / {attempt.total}
            </p>
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
              {attempt.percentage}%
            </p>
            {graded && (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Automatic score {attempt.score}/{attempt.total}
              </p>
            )}
          </div>
        </div>

        {graded && (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-500/20 dark:bg-sky-500/10">
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Teacher feedback
              {attempt.graded_by ? ` · ${attempt.graded_by}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm font-medium text-slate-700 dark:text-slate-200">
              {attempt.teacher_feedback?.trim() ||
                (adjusted
                  ? "The teacher adjusted your score but left no written comment."
                  : "The teacher reviewed this attempt and left no written comment.")}
            </p>
          </div>
        )}

        {!graded && (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-medium text-slate-500 dark:border-white/15 dark:text-slate-400">
            Your teacher has not reviewed this attempt yet. You will see the final grade and
            feedback here once it is graded.
          </p>
        )}
      </section>

      <QuizResultReview result={attempt} questions={[]} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "flowbite-react";
import { getErrorMessage, miscApi } from "@/api";
import type { MyAttemptSummary } from "@/api/types";
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

function percentageBadge(percentage: number) {
  if (percentage >= 80) return "success" as const;
  if (percentage >= 50) return "warning" as const;
  return "failure" as const;
}

export function MyResultsPage() {
  const { user, loading } = useAuth();

  const [attempts, setAttempts] = useState<MyAttemptSummary[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      setAttemptsLoading(true);
      setError(null);
      try {
        const { data } = await miscApi.myAttempts();
        if (!active) return;
        setAttempts(data ?? []);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load results:", err);
        setAttempts([]);
        setError(getErrorMessage(err, "Could not load your results right now."));
      } finally {
        if (active) setAttemptsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

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
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">My results</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to see the quizzes you have taken.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          My results
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Every finished attempt, including the teacher&apos;s grade and feedback once it is ready.
        </p>
      </header>

      {attemptsLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="glass-moon w-full p-12 text-center">
          <p className="mb-5 text-sm font-medium text-slate-500 dark:text-slate-400">
            You have not completed a quiz yet.
          </p>
          <Link to="/quizzes" className={linkButton}>
            Browse quizzes
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {attempts.map((attempt) => {
            const graded = attempt.teacher_score !== null;

            return (
              <article
                key={attempt.attempt_id}
                className="glass-moon flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {attempt.quiz_title ?? "Quiz"}
                    </h2>
                    {graded && (
                      <Badge color="info" size="sm" className="whitespace-nowrap">
                        Graded by teacher
                      </Badge>
                    )}
                  </div>
                  {attempt.assignment_title && (
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {attempt.assignment_title}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                      Attempt #{attempt.attempt_number}
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                      {attempt.completed_at
                        ? formatDate(attempt.completed_at, dateFormat)
                        : "Completed"}
                    </span>
                    {graded && (
                      <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                        Automatic {attempt.score}/{attempt.total}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {attempt.final_score}/{attempt.total}
                    </p>
                  </div>
                  <Badge color={percentageBadge(attempt.percentage)} size="sm">
                    {attempt.percentage}%
                  </Badge>
                  <Link
                    to={`/my-results/${attempt.attempt_id}`}
                    className={`inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 no-underline transition-colors hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400 ${linkFocusRing}`}
                  >
                    Open
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

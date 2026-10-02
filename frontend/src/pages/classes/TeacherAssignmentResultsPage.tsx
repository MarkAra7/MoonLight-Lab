import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { classApi } from "@/api/class";
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

interface AttemptRow {
  attempt_number: number;
  score: number;
  total: number;
  percentage: number;
  completed_at?: string | null;
}

interface ResultRow {
  student: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  attempts_count: number;
  best_score: number;
  best_total: number;
  best_percentage: number;
  attempts: AttemptRow[];
}

interface ResultsPayload {
  assignment: {
    id: string;
    title: string;
    max_attempts?: number | null;
    due_at?: string | null;
    quiz?: { quiz_id: string | number; title: string } | null;
  };
  results: ResultRow[];
}

function studentName(student: ResultRow["student"]): string {
  const full = [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim();
  return full || student?.email || "Student";
}

function percentageBadge(percentage: number) {
  if (percentage >= 80) return "success" as const;
  if (percentage >= 50) return "warning" as const;
  return "failure" as const;
}

export function TeacherAssignmentResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [payload, setPayload] = useState<ResultsPayload | null>(null);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;

    (async () => {
      setResultsLoading(true);
      setError(null);
      try {
        const { data } = await classApi.assignmentResults(id);
        if (!active) return;
        setPayload(data);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load assignment results:", err);
        setPayload(null);
        setError(getErrorMessage(err, "Could not load these results right now."));
      } finally {
        if (active) setResultsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, id]);

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
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Results</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            You need to be signed in to see assignment results.
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
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Results</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          You don&apos;t have access to teacher results.
        </p>
      </div>
    );
  }

  const assignment = payload?.assignment;

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10">
        <Link
          to="/teacher/classes"
          className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to class
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {assignment?.title ?? "Assignment results"}
        </h1>
        {assignment?.quiz?.title && (
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {assignment.quiz.title}
            {assignment.due_at
              ? ` — due ${formatDate(assignment.due_at, dateFormat)}`
              : " — no due date"}
          </p>
        )}
      </header>

      {resultsLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : error || !payload ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {error ?? "These results are not available."}
          </p>
        </div>
      ) : payload.results.length === 0 ? (
        <div className="glass-moon w-full p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No attempts have been submitted yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {payload.results.map((row, index) => {
            const isOpen = expanded === index;
            return (
              <article key={index} className="glass-moon p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {studentName(row.student)}
                    </h2>
                    <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                      {row.student?.email ?? ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color="gray" size="sm" className="whitespace-nowrap">
                      {row.attempts_count} attempt{row.attempts_count === 1 ? "" : "s"}
                    </Badge>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Best {row.best_score}/{row.best_total}
                    </span>
                    <Badge color={percentageBadge(row.best_percentage)} size="sm" className="whitespace-nowrap">
                      {row.best_percentage}%
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className={`rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400 ${linkFocusRing}`}
                    >
                      {isOpen ? "Hide attempts" : "View attempts"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-5 overflow-x-auto border-t border-slate-200 pt-5 dark:border-white/10">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <th scope="col" className="pb-2">
                            Attempt
                          </th>
                          <th scope="col" className="pb-2">
                            Score
                          </th>
                          <th scope="col" className="pb-2">
                            Percentage
                          </th>
                          <th scope="col" className="pb-2">
                            Completed
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.attempts.map((attempt) => (
                          <tr
                            key={attempt.attempt_number}
                            className="border-t border-slate-100 dark:border-white/[0.06]"
                          >
                            <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                              #{attempt.attempt_number}
                            </td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-400">
                              {attempt.score}/{attempt.total}
                            </td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-400">
                              {attempt.percentage}%
                            </td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-400">
                              {attempt.completed_at
                                ? formatDate(attempt.completed_at, dateFormat)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
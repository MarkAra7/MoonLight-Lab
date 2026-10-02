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
  "inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

interface StudentAssignment {
  id: string;
  title: string;
  quiz?: { quiz_id: string | number; title: string } | null;
  max_attempts?: number | null;
  attempts_made?: number;
  attempts_remaining?: number;
  best_score?: number | null;
  best_total?: number | null;
  is_open?: boolean;
  opens_at?: string | null;
  due_at?: string | null;
  time_limit_minutes?: number | null;
}

interface MyClassDetail {
  class: { id: string; name: string; description?: string | null };
  assignments: StudentAssignment[];
}

function attemptsLabel(assignment: StudentAssignment): string {
  if (assignment.attempts_remaining === -1) return "Unlimited attempts";
  const remaining = assignment.attempts_remaining ?? 0;
  return `${remaining} attempt${remaining === 1 ? "" : "s"} left`;
}

export function MyClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [detail, setDetail] = useState<MyClassDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;

    (async () => {
      setDetailLoading(true);
      setError(null);
      try {
        const { data } = await classApi.myClassDetail(id);
        if (!active) return;
        setDetail(data);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load class detail:", err);
        setDetail(null);
        setError(getErrorMessage(err, "Could not load this class right now."));
      } finally {
        if (active) setDetailLoading(false);
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
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Class</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            You need to be signed in to see this class.
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
        <Link
          to="/my-classes"
          className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to my classes
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {detail?.class.name ?? "Class"}
        </h1>
        {detail?.class.description && (
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {detail.class.description}
          </p>
        )}
      </header>

      {detailLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : (detail?.assignments.length ?? 0) === 0 ? (
        <div className="glass-moon w-full p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No assignments yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {detail?.assignments.map((assignment) => {
            const isOpen = Boolean(assignment.is_open);
            const dueText = assignment.due_at
              ? formatDate(assignment.due_at, dateFormat)
              : "No due date";

            return (
              <article key={assignment.id} className="glass-moon flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{assignment.title}</h2>
                    <Badge color={isOpen ? "success" : "gray"} size="sm" className="whitespace-nowrap">
                      {isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  {assignment.quiz?.title && (
                    <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {assignment.quiz.title}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                      Due {dueText}
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                      {attemptsLabel(assignment)}
                    </span>
                    {assignment.best_score !== null && assignment.best_score !== undefined && (
                      <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                        Best {assignment.best_score}/{assignment.best_total ?? 0}
                      </span>
                    )}
                    {assignment.time_limit_minutes ? (
                      <span className="rounded-lg border border-slate-200 px-2.5 py-1 dark:border-white/10">
                        {assignment.time_limit_minutes} min limit
                      </span>
                    ) : null}
                  </div>
                </div>

                {isOpen && assignment.quiz?.quiz_id !== undefined ? (
                  <Link
                    to={`/quizzes/${assignment.quiz.quiz_id}`}
                    className={`${linkButton} flex-shrink-0`}
                  >
                    Take quiz
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
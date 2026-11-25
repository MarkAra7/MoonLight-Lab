import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { miscApi } from "@/api/misc";
import type { MyAssignment } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/utils/helpers";
import {
  dateFormat,
  linkButton,
  linkFocusRing,
  secondaryButtonClasses,
  SpinnerBlock,
} from "./assessmentUi";

export function StudentAssessmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await miscApi.myAssignments();
      setAssignments(data.filter((item) => item.kind === "assessment"));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your assessments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      await load();
    })();
  }, [authLoading, user, load]);

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">My assessments</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to see the assessments assigned to you.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <SpinnerBlock />;

  return (
    <div className="flex w-full flex-col">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            My assessments
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Timed programming and written tasks from your active classes.
          </p>
        </div>
        <Link
          to="/my-assessment-attempts"
          className={`inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
        >
          Attempt history
        </Link>
      </header>

      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      {assignments.length === 0 ? (
        <div className="glass-moon p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No assessments have been assigned to you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {assignments.map((assignment) => {
            const assessmentId = assignment.assessment?.assessment_id;
            const remaining =
              assignment.attempts_remaining < 0 ? "unlimited" : assignment.attempts_remaining;

            return (
              <article key={assignment.id} className="glass-moon flex flex-col gap-4 p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {assignment.title}
                    </h2>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {assignment.class?.name ?? "No class"}
                    </p>
                  </div>
                  <Badge color={assignment.is_open ? "success" : "gray"} size="sm">
                    {assignment.is_open ? "Open" : "Closed"}
                  </Badge>
                </header>

                <p className="line-clamp-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {assignment.description?.trim() || "No description provided."}
                </p>

                <dl className="grid grid-cols-3 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <div>
                    <dt>Attempts left</dt>
                    <dd className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-200">
                      {remaining}
                    </dd>
                  </div>
                  <div>
                    <dt>Time limit</dt>
                    <dd className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-200">
                      {assignment.time_limit_minutes ? `${assignment.time_limit_minutes} min` : "None"}
                    </dd>
                  </div>
                  <div>
                    <dt>Best</dt>
                    <dd className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-200">
                      {assignment.best_percentage !== null && assignment.best_percentage !== undefined
                        ? `${assignment.best_percentage}%`
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Due {formatDate(assignment.due_at, dateFormat)}
                </p>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                  {assessmentId ? (
                    <Link
                      to={`/assessments/${assessmentId}/take?assignment=${assignment.id}`}
                      className={`inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white no-underline transition-colors hover:bg-sky-500 ${linkFocusRing}`}
                    >
                      {assignment.attempts_made > 0 ? "Try again" : "Start assessment"}
                    </Link>
                  ) : (
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                      Assessment no longer available
                    </span>
                  )}
                  <Link
                    to={`/my-assessment-attempts?assessment=${assessmentId ?? ""}`}
                    className={`inline-flex items-center rounded-lg border px-4 py-2 text-xs font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
                  >
                    Results
                  </Link>
                  {assignment.is_personal && (
                    <Badge color="purple" size="sm" className="ml-auto">
                      Personal
                    </Badge>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { assessmentApi } from "@/api/assessment";
import type { AssessmentAttemptSummary } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { linkButton, linkFocusRing, secondaryButtonClasses, SpinnerBlock } from "./assessmentUi";

export function MyAssessmentAttemptsPage() {
  const [searchParams] = useSearchParams();
  const assessmentFilter = searchParams.get("assessment") ?? "";
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<AssessmentAttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await assessmentApi.myAttempts();
      setAttempts(
        assessmentFilter
          ? data.filter((attempt) => attempt.assessment_id === assessmentFilter)
          : data,
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your assessment attempts."));
    } finally {
      setLoading(false);
    }
  }, [assessmentFilter]);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, user, load]);

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Attempts</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to see your assessment attempts.
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
            Assessment attempts
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Every submitted attempt, including manual teacher grades.
          </p>
        </div>
        <Link
          to="/my-assessments"
          className={`inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
        >
          My assessments
        </Link>
      </header>

      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      {attempts.length === 0 ? (
        <div className="glass-moon p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No assessment attempts found.
          </p>
        </div>
      ) : (
        <div className="glass-moon overflow-x-auto p-6">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-white/10 dark:text-slate-500">
                <th className="py-3 pr-4">Assessment</th>
                <th className="py-3 pr-4">Attempt</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Submitted</th>
                <th className="py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr
                  key={attempt.attempt_id}
                  className="border-b border-slate-100 last:border-0 dark:border-white/5"
                >
                  <td className="py-4 pr-4">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {attempt.assessment_title ?? "Assessment"}
                    </p>
                    {attempt.assignment_title && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {attempt.assignment_title}
                      </p>
                    )}
                  </td>
                  <td className="py-4 pr-4 font-semibold text-slate-700 dark:text-slate-300">
                    #{attempt.attempt_number}
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-black text-slate-900 dark:text-white">
                      {attempt.final_score} / {attempt.total}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {attempt.percentage}%
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    {attempt.teacher_score !== null && attempt.teacher_score !== undefined ? (
                      <Badge color="purple" size="sm">Graded</Badge>
                    ) : (
                      <Badge color="gray" size="sm">Automatic</Badge>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {attempt.completed_at
                      ? new Date(attempt.completed_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      to={`/assessments/${attempt.assessment_id}/results/${attempt.attempt_id}`}
                      className={`inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white no-underline transition-colors hover:bg-sky-500 ${linkFocusRing}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

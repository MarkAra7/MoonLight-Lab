import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Badge, Button } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { assessmentApi } from "@/api/assessment";
import type { AssessmentResultRow } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import {
  displayName,
  linkButton,
  linkFocusRing,
  secondaryButtonClasses,
} from "./assessmentUi";
import { SpinnerBlock } from "./SpinnerBlock";

export function AssessmentResultsPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("Assessment results");
  const [results, setResults] = useState<AssessmentResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!assessmentId) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await assessmentApi.results(assessmentId);
      setTitle(data.assessment.title ?? "Assessment results");
      setResults(data.results);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load assessment results."));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      await load();
    })();
  }, [authLoading, user, load]);

  const download = async () => {
    if (!assessmentId || exporting) return;

    setExporting(true);
    setError(null);
    try {
      const { data } = await assessmentApi.exportResults(assessmentId);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${assessmentId}-results.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, "Could not export the results."));
    } finally {
      setExporting(false);
    }
  };

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Results</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in as a teacher to review assessment results.
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
          <Link
            to="/teacher/assessments"
            className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
          >
            Back to assessments
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Best attempt per student. Open any attempt to review answers and set a manual score.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {assessmentId && (
            <Link
              to={`/teacher/assessments/${assessmentId}/edit`}
              className={`inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
            >
              Edit assessment
            </Link>
          )}
          <Button
            type="button"
            onClick={() => void download()}
            disabled={exporting}
            className="bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
          >
            {exporting ? "Preparing…" : "Export CSV"}
          </Button>
        </div>
      </header>

      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      {results.length === 0 ? (
        <div className="glass-moon p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No attempts have been submitted yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {results.map((row) => (
            <article key={row.student?.id ?? displayName(row.student)} className="glass-moon p-6">
              <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {displayName(row.student)}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {row.student?.email ?? ""} · {row.attempts_count} attempt(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {row.best_score} / {row.best_total}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {row.best_percentage}% best
                  </p>
                </div>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-white/10 dark:text-slate-500">
                      <th className="py-2 pr-4">Attempt</th>
                      <th className="py-2 pr-4">Automatic</th>
                      <th className="py-2 pr-4">Final</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Completed</th>
                      <th className="py-2 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.attempts.map((attempt) => (
                      <tr
                        key={attempt.id}
                        className="border-b border-slate-100 last:border-0 dark:border-white/5"
                      >
                        <td className="py-3 pr-4 font-bold text-slate-800 dark:text-slate-200">
                          #{attempt.attempt_number}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                          {attempt.score} / {attempt.total}
                        </td>
                        <td className="py-3 pr-4 font-black text-slate-900 dark:text-white">
                          {attempt.final_score} / {attempt.total}
                        </td>
                        <td className="py-3 pr-4">
                          {attempt.teacher_score !== null ? (
                            <Badge color="purple" size="sm">Manually graded</Badge>
                          ) : (
                            <Badge color="gray" size="sm">Automatic</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {attempt.completed_at
                            ? new Date(attempt.completed_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-3 text-right">
                          {assessmentId && (
                            <Link
                              to={`/teacher/assessments/${assessmentId}/attempts/${attempt.id}`}
                              className={`inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white no-underline transition-colors hover:bg-sky-500 ${linkFocusRing}`}
                            >
                              Review & grade
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

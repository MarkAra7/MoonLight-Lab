import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { assessmentApi } from "@/api/assessment";
import type { AssessmentAttemptSummary, AssessmentReviewQuestion } from "@/api/types";
import { AssessmentReview } from "@/components/assessment/AssessmentReview";
import { useAuth } from "@/context/AuthContext";
import { linkButton, linkFocusRing, secondaryButtonClasses } from "./assessmentUi";
import { SpinnerBlock } from "./SpinnerBlock";

export function AssessmentResultPage() {
  const { assessmentId, attemptId } = useParams<{ assessmentId: string; attemptId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState<AssessmentAttemptSummary | null>(null);
  const [questions, setQuestions] = useState<AssessmentReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!attemptId) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await assessmentApi.myAttempt(attemptId);
      setAttempt(data);
      setQuestions(data.questions ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this result."));
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

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
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Result</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to see your result.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <SpinnerBlock />;

  if (!attempt) {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Result</h1>
        <p className="mb-6 text-sm font-medium text-red-600 dark:text-red-400">
          This result could not be loaded.
        </p>
        <Link to="/my-assessment-attempts" className={linkButton}>
          Back to attempt history
        </Link>
      </div>
    );
  }

  const graded = attempt.teacher_score !== null && attempt.teacher_score !== undefined;

  return (
    <div className="flex w-full flex-col">
      <header className="mb-8">
        <Link
          to="/my-assessment-attempts"
          className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to attempt history
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {attempt.assessment_title ?? "Assessment"} · Attempt #{attempt.attempt_number}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Submitted {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : "recently"}
        </p>
      </header>

      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      <section className="glass-moon mb-6 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Final score
            </p>
            <p className="text-4xl font-black text-slate-900 dark:text-white">
              {attempt.final_score} / {attempt.total}
            </p>
          </div>
          <Badge color={attempt.percentage >= 80 ? "success" : attempt.percentage >= 50 ? "warning" : "failure"}>
            {attempt.percentage}%
          </Badge>
          {graded && <Badge color="purple">Manually graded</Badge>}
        </div>

        {graded && attempt.teacher_score !== attempt.score && (
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            Automatic score: {attempt.score} / {attempt.total}
          </p>
        )}

        {attempt.teacher_feedback && (
          <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-50 p-4 dark:bg-sky-400/10">
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
              Teacher feedback
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              {attempt.teacher_feedback}
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Question review
        </h2>
        <AssessmentReview questions={questions} />
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {assessmentId && (
          <Link
            to={`/assessments/${assessmentId}/take`}
            className={`${linkButton} ${linkFocusRing}`}
          >
            Try again
          </Link>
        )}
        <Link
          to="/my-assessments"
          className={`inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
        >
          My assessments
        </Link>
      </div>
    </div>
  );
}

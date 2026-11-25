import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { assessmentApi } from "@/api/assessment";
import type {
  AssessmentReviewQuestion,
  TeacherAssessmentAttemptDetail,
} from "@/api/types";
import { AssessmentReview } from "@/components/assessment/AssessmentReview";
import { useAuth } from "@/context/AuthContext";
import {
  displayName,
  inputClasses,
  linkButton,
  linkFocusRing,
  primaryButtonClasses,
  SpinnerBlock,
} from "./assessmentUi";

const fieldLabelClasses = "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300";

export function AssessmentAttemptGradingPage() {
  const { assessmentId, attemptId } = useParams<{ assessmentId: string; attemptId: string }>();
  const { user, loading: authLoading } = useAuth();

  const [attempt, setAttempt] = useState<TeacherAssessmentAttemptDetail | null>(null);
  const [questions, setQuestions] = useState<AssessmentReviewQuestion[]>([]);
  const [teacherScore, setTeacherScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!assessmentId || !attemptId) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await assessmentApi.attempt(assessmentId, Number(attemptId));
      setAttempt(data.attempt);
      setQuestions(data.questions);
      setTeacherScore(
        data.attempt.teacher_score !== null
          ? String(data.attempt.teacher_score)
          : String(data.attempt.auto_score),
      );
      setFeedback(data.attempt.teacher_feedback ?? "");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this attempt."));
    } finally {
      setLoading(false);
    }
  }, [assessmentId, attemptId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      await load();
    })();
  }, [authLoading, user, load]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assessmentId || !attempt || saving) return;

    const score = Number(teacherScore);
    if (!Number.isFinite(score) || score < 0 || score > attempt.total) {
      setError(`Enter a score between 0 and ${attempt.total}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice("");
    try {
      const { data } = await assessmentApi.gradeAttempt(assessmentId, attempt.id, {
        teacher_score: score,
        teacher_feedback: feedback.trim() || null,
      });
      setAttempt(data.attempt);
      setQuestions(data.questions);
      setNotice("Manual grade saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the manual grade."));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Attempt review</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in as a teacher to review attempts.
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
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Attempt review</h1>
        <p className="mb-6 text-sm font-medium text-red-600 dark:text-red-400">
          This attempt could not be loaded.
        </p>
        {assessmentId && (
          <Link
            to={`/teacher/assessments/${assessmentId}/results`}
            className={`${linkButton} ${linkFocusRing}`}
          >
            Back to results
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-8">
        {assessmentId && (
          <Link
            to={`/teacher/assessments/${assessmentId}/results`}
            className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
          >
            Back to results
          </Link>
        )}
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Attempt #{attempt.attempt_number}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {displayName(attempt.student)} · {attempt.student?.email ?? ""}
        </p>
      </header>

      {notice && <Alert color="success" className="mb-6">{notice}</Alert>}
      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      <section className="glass-moon mb-6 p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge color="info" size="sm">
            Automatic {attempt.auto_score} / {attempt.total}
          </Badge>
          <Badge color={attempt.teacher_score !== null ? "purple" : "gray"} size="sm">
            Final {attempt.final_score} / {attempt.total}
          </Badge>
          {attempt.graded_by && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Graded by {attempt.graded_by}
            </span>
          )}
        </div>

        <form onSubmit={(event) => void save(event)} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="teacher-score" className={fieldLabelClasses}>
                Teacher score (0–{attempt.total})
              </label>
              <input
                id="teacher-score"
                type="number"
                min={0}
                max={attempt.total}
                step="any"
                value={teacherScore}
                disabled={saving}
                onChange={(event) => setTeacherScore(event.target.value)}
                className={inputClasses}
              />
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Replaces the automatic score when the result is shown to the student.
              </p>
            </div>

            <div>
              <label htmlFor="teacher-feedback" className={fieldLabelClasses}>
                Feedback
              </label>
              <textarea
                id="teacher-feedback"
                rows={3}
                value={feedback}
                disabled={saving}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="What went well, and what should change?"
                className={`${inputClasses} resize-y`}
              />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={saving} className={primaryButtonClasses}>
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving…
                </>
              ) : (
                "Save grade"
              )}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Submitted work</h2>
        <AssessmentReview questions={questions} />
      </section>
    </div>
  );
}

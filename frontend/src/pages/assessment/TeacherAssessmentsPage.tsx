import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge, Button } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { assessmentApi } from "@/api/assessment";
import type { Assessment } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/utils/helpers";
import {
  dateFormat,
  linkButton,
  linkFocusRing,
  secondaryButtonClasses,
} from "./assessmentUi";
import { SpinnerBlock } from "./SpinnerBlock";

export function TeacherAssessmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await assessmentApi.list();
      setAssessments(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load assessments."));
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

  const remove = async (assessment: Assessment) => {
    if (!window.confirm(`Delete “${assessment.title}” and its questions?`)) return;

    setRemoving(assessment.assessment_id);
    setError(null);
    try {
      await assessmentApi.remove(assessment.assessment_id);
      setNotice("Assessment deleted.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete this assessment."));
    } finally {
      setRemoving(null);
    }
  };

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Assessments</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in as a teacher to build and grade assessments.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const isTeacher = user.role?.title === "teacher" || user.role?.title === "admin";

  if (!isTeacher) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Assessments</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Only teachers can manage assessments.
          </p>
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
            Assessments
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Build graded tasks, assign them to classes, and review every attempt.
          </p>
        </div>
        <Link to="/teacher/assessments/new" className={`${linkButton} ${linkFocusRing}`}>
          New assessment
        </Link>
      </header>

      {notice && <Alert color="success" className="mb-6">{notice}</Alert>}
      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      {assessments.length === 0 ? (
        <div className="glass-moon p-12 text-center">
          <p className="mb-5 text-sm font-medium text-slate-500 dark:text-slate-400">
            You have not created any assessments yet.
          </p>
          <Link to="/teacher/assessments/new" className={`${linkButton} ${linkFocusRing}`}>
            Create your first assessment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {assessments.map((assessment) => (
            <article
              key={assessment.assessment_id}
              className="glass-moon flex flex-col gap-4 p-6"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {assessment.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {assessment.description?.trim() || "No description."}
                  </p>
                </div>
                <Badge color={assessment.status === "published" ? "success" : "gray"} size="sm">
                  {assessment.status === "published" ? "Published" : "Draft"}
                </Badge>
              </header>

              <dl className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:grid-cols-3">
                <div>
                  <dt>Questions</dt>
                  <dd className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-200">
                    {assessment.questions_count ?? 0}
                  </dd>
                </div>
                <div>
                  <dt>Assignments</dt>
                  <dd className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-200">
                    {assessment.assignments_count ?? 0}
                  </dd>
                </div>
                <div>
                  <dt>Time limit</dt>
                  <dd className="mt-0.5 text-sm font-black text-slate-800 dark:text-slate-200">
                    {assessment.time_limit_minutes ? `${assessment.time_limit_minutes} min` : "None"}
                  </dd>
                </div>
              </dl>

              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Updated {formatDate(assessment.updated_at ?? assessment.created_at, dateFormat)}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                <Link
                  to={`/teacher/assessments/${assessment.assessment_id}/edit`}
                  className={`inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white no-underline transition-colors hover:bg-sky-500 ${linkFocusRing}`}
                >
                  Edit
                </Link>
                <Link
                  to={`/teacher/assessments/${assessment.assessment_id}/assignments?assessment=${assessment.assessment_id}`}
                  className={`inline-flex items-center rounded-lg border px-4 py-2 text-xs font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
                >
                  Assign
                </Link>
                <Link
                  to={`/teacher/assessments/${assessment.assessment_id}/results`}
                  className={`inline-flex items-center rounded-lg border px-4 py-2 text-xs font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
                >
                  Results
                </Link>
                <Button
                  type="button"
                  color="red"
                  outline
                  size="sm"
                  disabled={removing === assessment.assessment_id}
                  className="ml-auto"
                  onClick={() => void remove(assessment)}
                >
                  {removing === assessment.assessment_id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          to="/teacher/classes"
          className={`inline-flex text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to classes
        </Link>
      </div>
    </div>
  );
}

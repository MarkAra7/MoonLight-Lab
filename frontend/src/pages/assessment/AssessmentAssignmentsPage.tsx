import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button } from "flowbite-react";
import { getErrorMessage } from "@/api";
import {
  assessmentApi,
  type AssessmentAssignmentPayload,
} from "@/api/assessment";
import { classApi } from "@/api/class";
import type { Assessment, AssessmentAssignment, User } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import {
  displayName,
  fromIso,
  inputClasses,
  linkButton,
  linkFocusRing,
  primaryButtonClasses,
  secondaryButtonClasses,
  SpinnerBlock,
  toIso,
} from "./assessmentUi";

interface TeacherClassOption {
  id: string;
  name: string;
  students_count?: number;
}

interface AssignmentForm {
  assessment_id: string;
  class_id: string;
  student_id: string;
  title: string;
  description: string;
  max_attempts: string;
  time_limit_minutes: string;
  opens_at: string;
  due_at: string;
}

function emptyForm(assessmentId = ""): AssignmentForm {
  return {
    assessment_id: assessmentId,
    class_id: "",
    student_id: "",
    title: "",
    description: "",
    max_attempts: "1",
    time_limit_minutes: "",
    opens_at: "",
    due_at: "",
  };
}

const fieldLabelClasses = "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300";

export function AssessmentAssignmentsPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [assignments, setAssignments] = useState<AssessmentAssignment[]>([]);
  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [form, setForm] = useState<AssignmentForm>(() =>
    emptyForm(assessmentId ?? searchParams.get("assessment") ?? ""),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentRes, assessmentRes, classRes] = await Promise.all([
        assessmentApi.assignments(),
        assessmentApi.list(),
        classApi.teacherIndex(),
      ]);
      setAssignments(assignmentRes.data);
      setAssessments(assessmentRes.data);
      setClasses(classRes.data as TeacherClassOption[]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load assessment assignments."));
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

  useEffect(() => {
    if (!form.class_id) return;

    let active = true;
    classApi
      .students(form.class_id)
      .then(({ data }) => {
        if (active) setStudents(data as User[]);
      })
      .catch(() => {
        if (active) setStudents([]);
      });
    return () => {
      active = false;
    };
  }, [form.class_id]);

  const update = <K extends keyof AssignmentForm>(key: K, value: AssignmentForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setForm(emptyForm(assessmentId ?? searchParams.get("assessment") ?? ""));
    setEditingId(null);
  };

  const edit = (assignment: AssessmentAssignment) => {
    setEditingId(assignment.id);
    setForm({
      assessment_id: assignment.assessment_id,
      class_id: assignment.class_id,
      student_id: assignment.student_id ? String(assignment.student_id) : "",
      title: assignment.title,
      description: assignment.description ?? "",
      max_attempts: String(assignment.max_attempts ?? 1),
      time_limit_minutes:
        assignment.time_limit_minutes !== null && assignment.time_limit_minutes !== undefined
          ? String(assignment.time_limit_minutes)
          : "",
      opens_at: fromIso(assignment.opens_at),
      due_at: fromIso(assignment.due_at),
    });
    setError(null);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    if (!form.title.trim() || !form.assessment_id || !form.class_id) {
      setError("Pick an assessment, a class, and a title before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice("");

    const payload: AssessmentAssignmentPayload = {
      assessment_id: form.assessment_id,
      class_id: form.class_id,
      student_id: form.student_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      max_attempts: form.max_attempts.trim() === "" ? undefined : Number(form.max_attempts),
      time_limit_minutes: form.time_limit_minutes.trim()
        ? Number(form.time_limit_minutes)
        : null,
      opens_at: toIso(form.opens_at),
      due_at: toIso(form.due_at),
    };

    try {
      if (editingId) {
        await assessmentApi.updateAssignment(editingId, {
          student_id: payload.student_id,
          title: payload.title,
          description: payload.description,
          max_attempts: payload.max_attempts,
          time_limit_minutes: payload.time_limit_minutes,
          opens_at: payload.opens_at,
          due_at: payload.due_at,
        });
        setNotice("Assignment updated.");
      } else {
        await assessmentApi.createAssignment(payload);
        setNotice("Assignment created. Students have been notified.");
      }
      reset();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this assignment."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (assignment: AssessmentAssignment) => {
    if (!window.confirm(`Remove the assignment “${assignment.title}”?`)) return;

    setRemoving(assignment.id);
    setError(null);
    try {
      await assessmentApi.removeAssignment(assignment.id);
      if (editingId === assignment.id) reset();
      setNotice("Assignment removed.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove this assignment."));
    } finally {
      setRemoving(null);
    }
  };

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Assignments</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in as a teacher to assign assessments.
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
      <header className="mb-8">
        <Link
          to="/teacher/assessments"
          className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to assessments
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Assessment assignments
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Assign an assessment to a whole class or one student. Students receive a notification.
        </p>
      </header>

      {notice && <Alert color="success" className="mb-6">{notice}</Alert>}
      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      <section className="glass-moon mb-8 p-8">
        <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
          {editingId ? "Edit assignment" : "New assignment"}
        </h2>

        <form onSubmit={(event) => void save(event)} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="assignment-assessment" className={fieldLabelClasses}>
                Assessment
              </label>
              <select
                id="assignment-assessment"
                value={form.assessment_id}
                disabled={saving || Boolean(editingId)}
                onChange={(event) => update("assessment_id", event.target.value)}
                className={inputClasses}
              >
                <option value="">Choose an assessment</option>
                {assessments.map((item) => (
                  <option key={item.assessment_id} value={item.assessment_id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assignment-class" className={fieldLabelClasses}>
                Class
              </label>
              <select
                id="assignment-class"
                value={form.class_id}
                disabled={saving || Boolean(editingId)}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, class_id: event.target.value, student_id: "" }));
                  setStudents([]);
                }}
                className={inputClasses}
              >
                <option value="">Choose a class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="assignment-student" className={fieldLabelClasses}>
                Student
              </label>
              <select
                id="assignment-student"
                value={form.student_id}
                disabled={saving || !form.class_id}
                onChange={(event) => update("student_id", event.target.value)}
                className={inputClasses}
              >
                <option value="">Whole class</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {displayName(student)} · {student.email ?? ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Leave as “Whole class” to give every active member their own attempt.
              </p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="assignment-title" className={fieldLabelClasses}>
                Title
              </label>
              <input
                id="assignment-title"
                type="text"
                value={form.title}
                disabled={saving}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Weekly code check"
                className={inputClasses}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="assignment-description" className={fieldLabelClasses}>
                Description
              </label>
              <textarea
                id="assignment-description"
                rows={3}
                value={form.description}
                disabled={saving}
                onChange={(event) => update("description", event.target.value)}
                className={`${inputClasses} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="assignment-max-attempts" className={fieldLabelClasses}>
                Maximum attempts
              </label>
              <input
                id="assignment-max-attempts"
                type="number"
                min={0}
                max={100}
                value={form.max_attempts}
                disabled={saving}
                onChange={(event) => update("max_attempts", event.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="assignment-time-limit" className={fieldLabelClasses}>
                Time limit in minutes
              </label>
              <input
                id="assignment-time-limit"
                type="number"
                min={1}
                max={600}
                value={form.time_limit_minutes}
                disabled={saving}
                onChange={(event) => update("time_limit_minutes", event.target.value)}
                placeholder="Use assessment default"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="assignment-opens" className={fieldLabelClasses}>
                Opens at
              </label>
              <input
                id="assignment-opens"
                type="datetime-local"
                value={form.opens_at}
                disabled={saving}
                onChange={(event) => update("opens_at", event.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="assignment-due" className={fieldLabelClasses}>
                Due at
              </label>
              <input
                id="assignment-due"
                type="datetime-local"
                value={form.due_at}
                disabled={saving}
                onChange={(event) => update("due_at", event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving} className={primaryButtonClasses}>
              {saving ? (editingId ? "Updating…" : "Creating…") : editingId ? "Update assignment" : "Create assignment"}
            </Button>
            {editingId && (
              <Button
                type="button"
                color="light"
                disabled={saving}
                onClick={reset}
                className={secondaryButtonClasses}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="glass-moon p-8">
        <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
          Assigned ({assignments.length})
        </h2>

        {assignments.length === 0 ? (
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No assessments assigned yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-white/10 dark:text-slate-500">
                  <th className="py-3 pr-4">Assignment</th>
                  <th className="py-3 pr-4">Assessment</th>
                  <th className="py-3 pr-4">Audience</th>
                  <th className="py-3 pr-4">Attempts</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="border-b border-slate-100 last:border-0 dark:border-white/5"
                  >
                    <td className="py-4 pr-4">
                      <p className="font-bold text-slate-900 dark:text-white">{assignment.title}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {assignment.description?.trim() || "No description."}
                      </p>
                    </td>
                    <td className="py-4 pr-4 font-semibold text-slate-700 dark:text-slate-300">
                      {assignment.assessment?.title ?? "—"}
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {assignment.class?.name ?? "—"}
                      </p>
                      {assignment.student && (
                        <Badge color="purple" size="sm" className="mt-1">
                          {displayName(assignment.student)}
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-slate-700 dark:text-slate-300">
                      {assignment.attempts_count ?? 0}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/teacher/assessments/${assignment.assessment_id}/results`}
                          className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
                        >
                          Results
                        </Link>
                        <Button
                          type="button"
                          color="light"
                          size="sm"
                          onClick={() => edit(assignment)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          color="red"
                          outline
                          size="sm"
                          disabled={removing === assignment.id}
                          onClick={() => void remove(assignment)}
                        >
                          {removing === assignment.id ? "Removing…" : "Remove"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

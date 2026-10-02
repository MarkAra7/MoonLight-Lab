import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Badge, Button, Label, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { classApi } from "@/api/class";
import { quizApi } from "@/api/quiz";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/utils/helpers";
import type { Quiz, User } from "@/api/types";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

const primaryButtonClasses =
  "bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300";

const secondaryButtonClasses =
  "border border-slate-200 bg-white text-slate-700 hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400";

const linkButton =
  "inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300";

const linkFocusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

const dateFormat: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

interface AssignmentRow {
  id: string;
  title: string;
  description?: string | null;
  max_attempts?: number | null;
  time_limit_minutes?: number | null;
  opens_at?: string | null;
  due_at?: string | null;
  quiz?: { quiz_id: string | number; title: string } | null;
  attempts_count?: number;
}

interface TeacherClassDetail {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  code_expires_at?: string | null;
  students: User[];
  pending_students: User[];
  assignments: AssignmentRow[];
}

function avatarLetter(name: string | null | undefined): string {
  return (name ?? "").trim().charAt(0).toUpperCase() || "?";
}

function displayName(person: User): string {
  const full = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return full || person.name || person.username || "Student";
}

function inviteIsValid(item: TeacherClassDetail): boolean {
  if (!item.code) return false;
  if (!item.code_expires_at) return true;
  const expires = new Date(item.code_expires_at).getTime();
  return Number.isFinite(expires) && expires > Date.now();
}

function toIso(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function TeacherClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [detail, setDetail] = useState<TeacherClassDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [busyAction, setBusyAction] = useState("");
  const [codeValid, setCodeValid] = useState(false);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);

  const [quizId, setQuizId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [timeLimit, setTimeLimit] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

  const load = useCallback(async (): Promise<void> => {
    if (!id) return;
    setDetailLoading(true);
    setLoadError(null);
    try {
      const { data } = await classApi.teacherShow(id);
      setDetail(data);
      setCodeValid(inviteIsValid(data));
    } catch (err) {
      console.error("Failed to load class:", err);
      setDetail(null);
      setLoadError(getErrorMessage(err, "Could not load this class right now."));
    } finally {
      setDetailLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;

    (async () => {
      setDetailLoading(true);
      setLoadError(null);
      try {
        const { data } = await classApi.teacherShow(id);
        if (!active) return;
        setDetail(data);
        setCodeValid(inviteIsValid(data));
      } catch (err) {
        if (!active) return;
        console.error("Failed to load class:", err);
        setDetail(null);
        setLoadError(getErrorMessage(err, "Could not load this class right now."));
      } finally {
        if (active) setDetailLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, id]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      try {
        const { data } = await quizApi.myQuizzes(1);
        if (!active) return;
        setQuizzes(data.data);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load quizzes for assignment picker:", err);
        setQuizzes([]);
        setQuizzesError("Could not load your quizzes. You need at least one quiz to create an assignment.");
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const runAction = async (
    key: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> => {
    setBusyAction(key);
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (err) {
      console.error(`Action ${key} failed:`, err);
      setNotice(getErrorMessage(err, "That action could not be completed."));
    } finally {
      setBusyAction("");
    }
  };

  const handleCopyLink = async () => {
    if (!detail?.code) return;
    const link = `${window.location.origin}/join/${detail.code}`;
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Invite link copied to your clipboard.");
    } catch {
      setNotice(link);
    }
  };

  const handleCreateAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    if (!quizId) {
      setAssignmentError("Pick a quiz for this assignment.");
      return;
    }
    if (!assignmentTitle.trim()) {
      setAssignmentError("An assignment title is required.");
      return;
    }
    if (!dueAt.trim()) {
      setAssignmentError("A due date is required.");
      return;
    }

    const opensIso = toIso(opensAt);
    const dueIso = toIso(dueAt);
    if (!dueIso) {
      setAssignmentError("That due date could not be read.");
      return;
    }
    if (opensIso && new Date(opensIso).getTime() >= new Date(dueIso).getTime()) {
      setAssignmentError("The due date must be after the open date.");
      return;
    }

    const attempts = maxAttempts.trim() ? Number(maxAttempts) : 1;
    if (!Number.isFinite(attempts) || attempts < 0) {
      setAssignmentError("Max attempts must be 0 (unlimited) or a positive number.");
      return;
    }

    const limit = timeLimit.trim() ? Number(timeLimit) : null;
    if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) {
      setAssignmentError("Time limit must be a positive number of minutes.");
      return;
    }

    setAssignmentSubmitting(true);
    setAssignmentError("");
    try {
      await classApi.createAssignment({
        class_id: String(id),
        quiz_id: quizId,
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim() || null,
        max_attempts: Math.round(attempts),
        time_limit_minutes: limit === null ? undefined : Math.round(limit),
        opens_at: opensIso,
        due_at: dueIso,
      });
      setAssignmentTitle("");
      setAssignmentDescription("");
      setMaxAttempts("1");
      setTimeLimit("");
      setOpensAt("");
      setDueAt("");
      setQuizId("");
      setNotice("Assignment created.");
      await load();
    } catch (err) {
      console.error("Failed to create assignment:", err);
      setAssignmentError(getErrorMessage(err, "Could not create this assignment."));
    } finally {
      setAssignmentSubmitting(false);
    }
  };

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
            You need to be signed in to manage this class.
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
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Class</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          You don&apos;t have access to teacher classes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10">
        <Link
          to="/teacher/classes"
          className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
        >
          Back to classes
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {detail?.name ?? "Class"}
        </h1>
        {detail?.description && (
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {detail.description}
          </p>
        )}
      </header>

      {notice && (
        <Alert
          color={notice.includes("could not") ? "failure" : "success"}
          className="mb-8"
        >
          {notice}
        </Alert>
      )}

      {detailLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : loadError || !detail ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {loadError ?? "This class is not available."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <section className="glass-moon p-8">
            <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Invite link</h2>
            <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              Share this code or link so students can join.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 font-mono text-2xl font-black tracking-[0.3em] text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white">
                {detail.code ?? "—"}
              </span>
              <Badge color={codeValid ? "success" : "gray"} size="sm" className="whitespace-nowrap">
                {codeValid ? "Open" : "Disabled"}
              </Badge>
              {detail.code_expires_at && (
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {codeValid ? "Expires" : "Expired"}{" "}
                  {formatDate(detail.code_expires_at, dateFormat)}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleCopyLink}
                disabled={!detail.code}
                className={primaryButtonClasses}
              >
                Copy invite link
              </Button>
              <Button
                type="button"
                color="light"
                disabled={!detail.code || busyAction !== ""}
                onClick={() => {
                  if (!id) return;
                  void runAction(
                    "disable",
                    () => classApi.disableCode(id),
                    "Invite link disabled.",
                  );
                }}
                className={secondaryButtonClasses}
              >
                {busyAction === "disable" ? "Disabling…" : "Disable link"}
              </Button>
              <Button
                type="button"
                color="light"
                disabled={busyAction !== ""}
                onClick={() => {
                  if (!id) return;
                  void runAction(
                    "regenerate",
                    () => classApi.regenerateCode(id),
                    "A new invite code is active.",
                  );
                }}
                className={secondaryButtonClasses}
              >
                {busyAction === "regenerate" ? "Generating…" : "Generate new code"}
              </Button>
            </div>
          </section>

          {detail.pending_students.length > 0 && (
            <section className="glass-moon p-8">
              <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Pending requests</h2>
              <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                Students waiting for approval.
              </p>
              <ul className="flex flex-col gap-3">
                {detail.pending_students.map((student) => (
                  <li
                    key={student.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                        {avatarLetter(displayName(student))}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {displayName(student)}
                        </p>
                        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                          @{student.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="xs"
                        onClick={() => {
                          if (!id) return;
                          void runAction(
                            `approve-${student.id}`,
                            () => classApi.approve(id, student.id),
                            `${displayName(student)} approved.`,
                          );
                        }}
                        disabled={busyAction !== ""}
                        className={primaryButtonClasses}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => {
                          if (!id) return;
                          void runAction(
                            `reject-${student.id}`,
                            () => classApi.reject(id, student.id),
                            `${displayName(student)} declined.`,
                          );
                        }}
                        disabled={busyAction !== ""}
                        className={secondaryButtonClasses}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="glass-moon p-8">
            <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Students</h2>
            <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              {detail.students.length} student{detail.students.length === 1 ? "" : "s"} enrolled.
            </p>

            {detail.students.length === 0 ? (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                No students yet. Share the invite link to get started.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {detail.students.map((student) => (
                  <li
                    key={student.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                        {avatarLetter(displayName(student))}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {displayName(student)}
                        </p>
                        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                          @{student.username}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="xs"
                      color="light"
                      disabled={busyAction !== ""}
                      onClick={() => {
                        if (!id) return;
                        const label = displayName(student);
                        if (!window.confirm(`Remove ${label} from this class?`)) return;
                        void runAction(
                          `remove-${student.id}`,
                          () => classApi.removeStudent(id, student.id),
                          `${label} removed.`,
                        );
                      }}
                      className={secondaryButtonClasses}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-moon p-8">
            <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Assignments</h2>
            <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              {detail.assignments.length} assignment{detail.assignments.length === 1 ? "" : "s"}.
            </p>

            {detail.assignments.length === 0 ? (
              <p className="mb-8 text-sm font-medium text-slate-500 dark:text-slate-400">
                No assignments yet.
              </p>
            ) : (
              <ul className="mb-8 flex flex-col gap-3">
                {detail.assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {assignment.title}
                      </p>
                      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {assignment.quiz?.title ?? "Quiz"} — due{" "}
                        {assignment.due_at
                          ? formatDate(assignment.due_at, dateFormat)
                          : "no due date"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="gray" size="sm" className="whitespace-nowrap">
                        {assignment.attempts_count ?? 0} attempts
                      </Badge>
                      <Link
                        to={`/teacher/assignments/${assignment.id}`}
                        className={`rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 no-underline transition-colors hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400 ${linkFocusRing}`}
                      >
                        View results
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleCreateAssignment} className="border-t border-slate-200 pt-8 dark:border-white/10">
              <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Create assignment</h3>

              {assignmentError && (
                <Alert color="failure" className="mb-5">
                  {assignmentError}
                </Alert>
              )}

              {quizzesError && (
                <Alert color="warning" className="mb-5">
                  {quizzesError}
                </Alert>
              )}

              <div className="flex flex-col gap-5">
                <div>
                  <Label htmlFor="assignment-quiz" className="mb-2">
                    Quiz
                  </Label>
                  <select
                    id="assignment-quiz"
                    value={quizId}
                    onChange={(event) => setQuizId(event.target.value)}
                    className={inputClasses}
                  >
                    <option value="">Select a quiz</option>
                    {quizzes.map((quiz) => (
                      <option key={quiz.quiz_id} value={String(quiz.quiz_id)}>
                        {quiz.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="assignment-title" className="mb-2">
                    Title
                  </Label>
                  <input
                    id="assignment-title"
                    type="text"
                    value={assignmentTitle}
                    onChange={(event) => setAssignmentTitle(event.target.value)}
                    placeholder="Chapter 3 review"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <Label htmlFor="assignment-description" className="mb-2">
                    Description
                  </Label>
                  <textarea
                    id="assignment-description"
                    rows={3}
                    value={assignmentDescription}
                    onChange={(event) => setAssignmentDescription(event.target.value)}
                    placeholder="What students should prepare"
                    className={`${inputClasses} resize-y`}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="assignment-attempts" className="mb-2">
                      Max attempts (0 = unlimited)
                    </Label>
                    <input
                      id="assignment-attempts"
                      type="number"
                      min={0}
                      max={100}
                      value={maxAttempts}
                      onChange={(event) => setMaxAttempts(event.target.value)}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignment-time-limit" className="mb-2">
                      Time limit (minutes)
                    </Label>
                    <input
                      id="assignment-time-limit"
                      type="number"
                      min={1}
                      max={600}
                      value={timeLimit}
                      onChange={(event) => setTimeLimit(event.target.value)}
                      placeholder="Optional"
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignment-opens" className="mb-2">
                      Opens at
                    </Label>
                    <input
                      id="assignment-opens"
                      type="datetime-local"
                      value={opensAt}
                      onChange={(event) => setOpensAt(event.target.value)}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignment-due" className="mb-2">
                      Due at
                    </Label>
                    <input
                      id="assignment-due"
                      type="datetime-local"
                      required
                      value={dueAt}
                      onChange={(event) => setDueAt(event.target.value)}
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    disabled={assignmentSubmitting}
                    className={primaryButtonClasses}
                  >
                    {assignmentSubmitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating…
                      </>
                    ) : (
                      "Create assignment"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
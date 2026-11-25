import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import {
  assessmentApi,
  type AssessmentPayload,
  type AssessmentQuestionPayload,
} from "@/api/assessment";
import type { Assessment, Question } from "@/api/types";
import { QuestionEditorCard } from "@/components/quiz/QuestionEditorCard";
import { VerifyEmailNotice } from "@/components/VerifyEmailNotice";
import {
  buildAnswerPayload,
  buildQuestionPayload,
  emptyQuestionDraft,
  questionToDraft,
  questionTypeMeta,
  validateQuestionDraft,
  type QuestionDraft,
} from "@/config/questionTypes";
import { useAuth } from "@/context/AuthContext";
import {
  fromIso,
  inputClasses,
  linkButton,
  linkFocusRing,
  primaryButtonClasses,
  secondaryButtonClasses,
  SpinnerBlock,
  toIso,
} from "./assessmentUi";

const fieldLabelClasses = "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300";

function blankDraft(): QuestionDraft {
  return emptyQuestionDraft();
}

export function AssessmentEditorPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [timeLimit, setTimeLimit] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [opensAt, setOpensAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [initialQuestionIds, setInitialQuestionIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    if (!assessmentId) {
      setAssessment(null);
      setTitle("");
      setDescription("");
      setStatus("draft");
      setTimeLimit("");
      setMaxAttempts("1");
      setOpensAt("");
      setDueAt("");
      setQuestions([]);
      setInitialQuestionIds([]);
      setLoading(false);
      return;
    }

    try {
      const { data } = await assessmentApi.show(assessmentId);
      setAssessment(data.assessment);
      setTitle(data.assessment.title ?? "");
      setDescription(data.assessment.description ?? "");
      setStatus(data.assessment.status ?? "draft");
      setTimeLimit(
        data.assessment.time_limit_minutes ? String(data.assessment.time_limit_minutes) : "",
      );
      setMaxAttempts(String(data.assessment.max_attempts ?? 1));
      setOpensAt(fromIso(data.assessment.opens_at));
      setDueAt(fromIso(data.assessment.due_at));

      const drafts = (data.questions ?? []).map((question) =>
        questionToDraft(question as unknown as Question),
      );
      setQuestions(drafts);
      setInitialQuestionIds(
        drafts
          .map((draft) => draft.question_id)
          .filter((id): id is string => Boolean(id)),
      );
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load this assessment."));
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

  const updateQuestion = (key: string, next: QuestionDraft) => {
    setQuestions((prev) => prev.map((item) => (item.key === key ? next : item)));
  };

  const addQuestion = () => setQuestions((prev) => [...prev, blankDraft()]);

  const removeQuestion = (draft: QuestionDraft) => {
    if (
      draft.question_id ||
      draft.question_text.trim() ||
      draft.tests.length > 0 ||
      draft.answers.some((answer) => answer.answer_text.trim())
    ) {
      if (!window.confirm("Delete this question and its answers?")) return;
    }

    setQuestions((prev) => prev.filter((item) => item.key !== draft.key));
    setQuestionErrors((prev) => {
      if (!(draft.key in prev)) return prev;
      const next = { ...prev };
      delete next[draft.key];
      return next;
    });
  };

  const moveQuestion = (key: string, direction: -1 | 1) => {
    setQuestions((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      const moved = next.splice(index, 1)[0];
      if (!moved) return prev;
      next.splice(target, 0, moved);
      return next;
    });
  };

  const syncAnswers = async (draft: QuestionDraft, questionId: string) => {
    const meta = questionTypeMeta(draft.question_type);
    const desired =
      meta.answerMode === "none"
        ? []
        : draft.answers.filter((answer) => answer.answer_text.trim());
    const keep = new Set(
      desired
        .map((answer) => answer.answer_id)
        .filter((id): id is string => Boolean(id)),
    );

    for (const id of draft.existing_answer_ids) {
      if (!keep.has(id)) await assessmentApi.removeAnswer(id);
    }

    let order = 1;
    for (const answer of desired) {
      const payload = buildAnswerPayload(answer, order);
      order += 1;
      if (answer.answer_id) {
        await assessmentApi.updateAnswer(answer.answer_id, payload);
      } else {
        await assessmentApi.addAnswer(questionId, payload);
      }
    }
  };

  const save = async () => {
    if (saving) return;

    if (!title.trim()) {
      setError("Give your assessment a title before saving.");
      return;
    }

    const errors: Record<string, string> = {};
    questions.forEach((draft, index) => {
      const message = validateQuestionDraft(draft, index + 1);
      if (message) errors[draft.key] = message;
    });
    if (Object.keys(errors).length > 0) {
      setQuestionErrors(errors);
      setError("Fix the highlighted questions before saving.");
      return;
    }
    setQuestionErrors({});

    setSaving(true);
    setError(null);
    setNotice("");

    try {
      const payload: AssessmentPayload = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        time_limit_minutes: timeLimit.trim() ? Number(timeLimit) : null,
        max_attempts: maxAttempts.trim() === "" ? undefined : Number(maxAttempts),
        opens_at: toIso(opensAt),
        due_at: toIso(dueAt),
      };

      const created = !assessmentId;
      let savedId = assessmentId ?? "";

      if (created) {
        const { data } = await assessmentApi.create(payload);
        savedId = data.assessment.assessment_id;
      } else {
        await assessmentApi.update(savedId, payload);
      }

      const keptIds = new Set(
        questions
          .map((draft) => draft.question_id)
          .filter((id): id is string => Boolean(id)),
      );
      for (const id of initialQuestionIds) {
        if (!keptIds.has(id)) await assessmentApi.removeQuestion(id);
      }

      let order = 1;
      for (const draft of questions) {
        const questionPayload: AssessmentQuestionPayload = {
          ...buildQuestionPayload(draft, order),
          points: Math.max(0, Number(draft.points) || 0),
        };
        order += 1;

        let questionId = draft.question_id ?? null;
        if (questionId) {
          const { data } = await assessmentApi.updateQuestion(questionId, questionPayload);
          questionId = data.question_id;
        } else {
          const { data } = await assessmentApi.addQuestion(savedId, questionPayload);
          questionId = data.question_id;
        }
        await syncAnswers(draft, questionId);
      }

      if (created) {
        navigate(`/teacher/assessments/${savedId}/edit`, { replace: true });
        setNotice("Assessment saved. You can keep editing it here.");
      } else {
        await load();
        setNotice("Changes saved.");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this assessment."));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save();
  };

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Assessment editor</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in as a teacher to build an assessment.
          </p>
          <Link to="/login" className={linkButton}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <SpinnerBlock />;

  if (loadError) {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Assessment editor</h1>
        <p className="mb-6 text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
        <Link to="/teacher/assessments" className={linkButton}>
          Back to assessments
        </Link>
      </div>
    );
  }

  const totalPoints = questions.reduce((sum, draft) => sum + (Number(draft.points) || 0), 0);

  return (
    <div className="flex w-full flex-col">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/teacher/assessments"
            className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
          >
            Back to assessments
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {assessment ? "Edit assessment" : "Create assessment"}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {assessment
              ? `Editing “${assessment.title}”.`
              : "Set the rules, add questions, then assign it to a class."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge color={status === "published" ? "success" : "gray"} size="sm">
            {status === "published" ? "Published" : "Draft"}
          </Badge>
          <Badge color="info" size="sm">
            {totalPoints} total points
          </Badge>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={primaryButtonClasses}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save assessment"
            )}
          </Button>
        </div>
      </header>

      <VerifyEmailNotice className="mb-6" />
      {notice && <Alert color="success" className="mb-6">{notice}</Alert>}
      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      <section className="glass-moon mb-6 p-8">
        <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Details</h2>
        <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          Assignments can override the time limit and attempt count set here.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="assessment-title" className={fieldLabelClasses}>
              Title
            </label>
            <input
              id="assessment-title"
              type="text"
              value={title}
              disabled={saving}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Midterm programming check"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="assessment-description" className={fieldLabelClasses}>
              Description
            </label>
            <textarea
              id="assessment-description"
              rows={3}
              value={description}
              disabled={saving}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should students know before starting?"
              className={`${inputClasses} resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="assessment-status" className={fieldLabelClasses}>
                Status
              </label>
              <select
                id="assessment-status"
                value={status}
                disabled={saving}
                onChange={(event) => setStatus(event.target.value)}
                className={inputClasses}
              >
                <option value="draft">Draft — only you can see it</option>
                <option value="published">Published — ready to assign</option>
              </select>
            </div>

            <div>
              <label htmlFor="assessment-time-limit" className={fieldLabelClasses}>
                Time limit in minutes
              </label>
              <input
                id="assessment-time-limit"
                type="number"
                min={1}
                max={600}
                value={timeLimit}
                disabled={saving}
                onChange={(event) => setTimeLimit(event.target.value)}
                placeholder="No limit"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="assessment-attempts" className={fieldLabelClasses}>
                Maximum attempts
              </label>
              <input
                id="assessment-attempts"
                type="number"
                min={0}
                max={100}
                value={maxAttempts}
                disabled={saving}
                onChange={(event) => setMaxAttempts(event.target.value)}
                className={inputClasses}
              />
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Use 0 for unlimited attempts.
              </p>
            </div>

            <div>
              <label htmlFor="assessment-opens" className={fieldLabelClasses}>
                Opens at
              </label>
              <input
                id="assessment-opens"
                type="datetime-local"
                value={opensAt}
                disabled={saving}
                onChange={(event) => setOpensAt(event.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="assessment-due" className={fieldLabelClasses}>
                Due at
              </label>
              <input
                id="assessment-due"
                type="datetime-local"
                value={dueAt}
                disabled={saving}
                onChange={(event) => setDueAt(event.target.value)}
                className={inputClasses}
              />
            </div>
          </div>
        </form>
      </section>

      <section className="glass-moon p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Questions ({questions.length})
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Points are awarded automatically for choice, short answer and code questions.
              Theory questions are reading material only.
            </p>
          </div>
          <Button
            type="button"
            onClick={addQuestion}
            disabled={saving}
            className={primaryButtonClasses}
          >
            Add question
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-white/15">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No questions yet. Add the first one to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {questions.map((draft, index) => (
              <QuestionEditorCard
                key={draft.key}
                question={draft}
                position={index + 1}
                error={questionErrors[draft.key]}
                disabled={saving}
                isFirst={index === 0}
                isLast={index === questions.length - 1}
                points={draft.points}
                onPointsChange={(points) =>
                  updateQuestion(draft.key, {
                    ...draft,
                    points: Math.max(0, Number.isFinite(points) ? points : 0),
                  })
                }
                onChange={(next) => updateQuestion(draft.key, next)}
                onRemove={() => removeQuestion(draft)}
                onMove={(direction) => moveQuestion(draft.key, direction)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6 dark:border-white/10">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className={primaryButtonClasses}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save assessment"
            )}
          </Button>
          {assessment && (
            <Link
              to={`/teacher/assessments/${assessment.assessment_id}/assignments?assessment=${assessment.assessment_id}`}
              className={`inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
            >
              Assign to a class
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { assessmentApi, type SubmitAssessmentPayload } from "@/api/assessment";
import { miscApi } from "@/api/misc";
import type { AssessmentAttemptStart, AssessmentQuestion, Question } from "@/api/types";
import { QuizQuestionTake, type TakeAnswer } from "@/components/quiz/QuizQuestionTake";
import { questionTypeMeta } from "@/config/questionTypes";
import { useAuth } from "@/context/AuthContext";
import {
  formatClock,
  linkButton,
  linkFocusRing,
  primaryButtonClasses,
  secondaryButtonClasses,
  SpinnerBlock,
} from "./assessmentUi";

export function AssessmentTakePage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignment");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("Assessment");
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, TakeAnswer>>({});
  const [start, setStart] = useState<AssessmentAttemptStart | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  const load = useCallback(async () => {
    if (!assessmentId) return;

    setLoading(true);
    setError(null);
    try {
      const [assignmentRes, questionsRes] = await Promise.all([
        miscApi.myAssignments(),
        assessmentApi.studentQuestions(assessmentId, assignmentId),
      ]);
      const assigned = assignmentRes.data.find((item) => item.id === assignmentId);
      setTitle(assigned?.title ?? "Assessment");
      setQuestions(questionsRes.data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this assessment."));
    } finally {
      setLoading(false);
    }
  }, [assessmentId, assignmentId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      await load();
    })();
  }, [authLoading, user, load]);

  useEffect(() => {
    if (!start?.deadline_at) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [start?.deadline_at]);

  const remainingSeconds = useMemo(() => {
    if (!start?.deadline_at) return null;
    return Math.max(
      0,
      Math.ceil((Date.parse(start.deadline_at) - (nowMs + serverOffset)) / 1000),
    );
  }, [start, serverOffset, nowMs]);

  const begin = async () => {
    if (!assessmentId || starting) return;

    setStarting(true);
    setError(null);
    try {
      const { data } = await assessmentApi.startAttempt(assessmentId, assignmentId);
      setStart(data);
      setServerOffset(data.server_now ? Date.parse(data.server_now) - Date.now() : 0);
      setNowMs(Date.now());

      const initial: Record<string, TakeAnswer> = {};
      questions.forEach((question) => {
        initial[question.question_id] =
          question.question_type === "code"
            ? { code: question.code_config?.starter_code ?? "" }
            : {};
      });
      setAnswers(initial);
    } catch (err) {
      setError(getErrorMessage(err, "Could not start this assessment."));
    } finally {
      setStarting(false);
    }
  };

  const submit = useCallback(
    async (automatic = false) => {
      if (!assessmentId || submitting || submitted.current) return;

      const unanswered = questions.filter((question) => {
        const answer = answers[question.question_id] ?? {};
        const meta = questionTypeMeta(question.question_type);

        if (question.question_type === "theory") return false;
        if (question.question_type === "code") return !(answer.code ?? "").trim();
        if (question.question_type === "text_input") return !(answer.text ?? "").trim();

        return (
          (meta.answerMode === "single" || meta.answerMode === "multi" || meta.answerMode === "binary") &&
          !answer.answer_id &&
          (answer.answer_ids?.length ?? 0) === 0
        );
      }).length;

      if (!automatic && unanswered > 0) {
        if (!window.confirm(`You still have ${unanswered} unanswered question(s). Submit anyway?`)) {
          return;
        }
      }

      submitted.current = true;
      setSubmitting(true);
      setError(null);

      const payload: SubmitAssessmentPayload = {
        assignment_id: assignmentId ?? null,
        attempt_token: start?.attempt_token ?? null,
        started_at: start?.started_at ?? null,
        answers: questions.map((question) => {
          const answer = answers[question.question_id] ?? {};
          return {
            question_id: question.question_id,
            answer_id: answer.answer_id ?? null,
            answer_ids: answer.answer_ids ?? [],
            text: answer.text ?? null,
            code:
              question.question_type === "code"
                ? (answer.code ?? question.code_config?.starter_code ?? "")
                : null,
          };
        }),
      };

      try {
        const { data } = await assessmentApi.submitAttempt(assessmentId, payload);
        navigate(`/assessments/${assessmentId}/results/${data.attempt.attempt_id}`, {
          replace: true,
        });
      } catch (err) {
        setError(getErrorMessage(err, "Could not submit this assessment."));
        submitted.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [assessmentId, assignmentId, answers, navigate, questions, start, submitting],
  );

  useEffect(() => {
    if (!start || remainingSeconds !== 0 || submitting) return;
    void (async () => {
      await submit(true);
    })();
  }, [remainingSeconds, start, submit, submitting]);

  if (authLoading) return <SpinnerBlock />;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="glass-moon w-full p-10">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Assessment</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to take this assessment.
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
            to="/my-assessments"
            className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
          >
            Back to my assessments
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {questions.length} question(s) · answers are graded on the server.
          </p>
        </div>
        {start && (
          <div className="text-right">
            {remainingSeconds !== null && (
              <>
                <p
                  className={`text-3xl font-black tabular-nums ${
                    remainingSeconds <= 30
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {formatClock(remainingSeconds)}
                </p>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Time remaining
                </p>
              </>
            )}
          </div>
        )}
      </header>

      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      {!start ? (
        <section className="glass-moon mx-auto w-full max-w-2xl p-10 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">
            Ready to begin?
          </h2>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            {start === null && questions.length === 0
              ? "This assessment has no questions."
              : start === null
                ? "Starting locks in your timer. Submit before the countdown reaches zero."
                : ""}
          </p>
          <Button
            type="button"
            disabled={starting || questions.length === 0}
            onClick={() => void begin()}
            className={primaryButtonClasses}
          >
            {starting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Starting…
              </>
            ) : (
              "Start assessment"
            )}
          </Button>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {remainingSeconds === 0 && (
            <Alert color="warning">Time is up. Your answers are being submitted.</Alert>
          )}

          {questions.map((question, index) => (
            <div key={question.question_id}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {question.points} point{question.points === 1 ? "" : "s"}
              </p>
              <QuizQuestionTake
                question={question as unknown as Question}
                position={index + 1}
                total={questions.length}
                value={answers[question.question_id] ?? {}}
                disabled={submitting || remainingSeconds === 0}
                onChange={(next) =>
                  setAnswers((prev) => ({ ...prev, [question.question_id]: next }))
                }
              />
            </div>
          ))}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className={primaryButtonClasses}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Submitting…
                </>
              ) : (
                "Submit assessment"
              )}
            </Button>
            {remainingSeconds === null && (
              <Badge color="gray" size="sm">
                No time limit
              </Badge>
            )}
            <Link
              to="/my-assessments"
              className={`inline-flex items-center rounded-xl border px-5 py-2.5 text-sm font-bold no-underline transition-colors ${secondaryButtonClasses} ${linkFocusRing}`}
            >
              Leave
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

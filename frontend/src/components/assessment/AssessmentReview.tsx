import { Badge } from "flowbite-react";
import type { AssessmentQuestion, AssessmentReviewQuestion } from "@/api/types";
import { questionTypeMeta } from "@/config/questionTypes";

const checkIcon = "m4.5 12.75 6 6 9-13.5";
const crossIcon = "M6 18 18 6M6 6l12 12";
const infoIcon = "M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z";

function ReviewRow({
  row,
  questions,
  position,
}: {
  row: AssessmentReviewQuestion;
  questions: AssessmentQuestion[];
  position: number;
}) {
  const meta = questionTypeMeta(row.question_type);
  const isTheory = row.is_correct === null || row.question_type === "theory";
  const isCode = row.question_type === "code";
  const question = questions.find((item) => item.question_id === row.question_id);

  const answerText = (id: string) =>
    row.answers?.find((answer) => answer.answer_id === id)?.answer_text ||
    question?.answers?.find((answer) => answer.answer_id === id)?.answer_text ||
    id;

  const givenIds = row.given_answer_ids ?? [];
  const given = isCode
    ? (row.given_code ?? "").trim()
    : row.question_type === "text_input"
      ? (row.given_text ?? "").trim()
      : givenIds.length > 0
        ? givenIds.map(answerText).join(", ")
        : (row.given_text ?? "").trim();

  const correct =
    row.question_type === "text_input"
      ? (row.correct_text ?? "").trim()
      : (row.correct_answers ?? []).join(", ");

  const tone = isTheory ? "gray" : row.is_correct ? "success" : "failure";
  const label = isTheory ? "Not scored" : row.is_correct ? "Correct" : "Incorrect";
  const icon = isTheory ? infoIcon : row.is_correct ? checkIcon : crossIcon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.03]">
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-black text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
          {position}
        </span>
        <Badge color={tone} size="sm">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
            {label}
          </span>
        </Badge>
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {meta.label}
        </span>
        <span className="ml-auto text-sm font-black text-slate-700 dark:text-slate-300">
          {row.earned ?? 0} / {row.points} pts
        </span>
      </header>

      <p className="text-sm font-bold text-slate-900 dark:text-white">{row.question_text}</p>

      {isCode ? (
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            Tests passed: {row.test_summary?.passed ?? 0} / {row.test_summary?.total ?? 0}
          </p>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Submitted code
            </p>
            <pre className="mt-1 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-200 dark:bg-black/40">
              {given || "No code submitted"}
            </pre>
          </div>
          {(row.test_results?.length ?? 0) > 0 && (
            <ul className="flex flex-col gap-1.5">
              {row.test_results?.map((result) => (
                <li
                  key={result.test}
                  className={
                    result.passed
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {result.passed ? "PASS" : "FAIL"} case {result.test}
                  {" · expected "}
                  {JSON.stringify(result.expected_output)}
                  {" · got "}
                  {JSON.stringify(result.actual_output)}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Hidden tests are counted in the score but their cases are not shown.
          </p>
        </div>
      ) : isTheory ? (
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          Reading material — this section awards no points.
        </p>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Your answer
            </dt>
            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
              {given || "No answer"}
            </dd>
          </div>
          {!row.is_correct && (
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Correct answer
              </dt>
              <dd className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {correct || "—"}
              </dd>
            </div>
          )}
        </dl>
      )}
    </article>
  );
}

export interface AssessmentReviewProps {
  questions: AssessmentReviewQuestion[];
  sourceQuestions?: AssessmentQuestion[];
}

export function AssessmentReview({ questions, sourceQuestions = [] }: AssessmentReviewProps) {
  return (
    <ol className="flex flex-col gap-4">
      {questions.map((row, index) => (
        <li key={row.question_id}>
          <ReviewRow row={row} questions={sourceQuestions} position={index + 1} />
        </li>
      ))}
    </ol>
  );
}

import { useMemo, useState } from "react";
import { Badge } from "flowbite-react";
import type { Question, QuizAttemptResult, QuizAttemptReviewQuestion } from "@/api/types";
import { questionTypeMeta } from "@/config/questionTypes";

const checkIcon = "m4.5 12.75 6 6 9-13.5";
const crossIcon = "M6 18 18 6M6 6l12 12";
const infoIcon = "M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z";

function optionTexts(question: Question | undefined, ids: string[]): string[] {
  return ids.map(
    (id) => question?.answers?.find((answer) => answer.answer_id === id)?.answer_text?.trim() || id,
  );
}

function ReviewRow({
  row,
  question,
  position,
}: {
  row: QuizAttemptReviewQuestion;
  question?: Question;
  position: number;
}) {
  const meta = questionTypeMeta(row.question_type);
  const isTheory = row.is_correct === null;

  const given =
    row.question_type === "text_input"
      ? row.given_text.trim()
      : optionTexts(question, row.given_answer_ids).join(", ");

  const correct =
    row.question_type === "text_input"
      ? (row.correct_text ?? "").trim()
      : row.correct_answers
          .map((answer) => answer.answer_text?.trim())
          .filter(Boolean)
          .join(", ");

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
      </header>

      <p className="text-sm font-bold text-slate-900 dark:text-white">{row.question_text}</p>

      {isTheory ? (
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          Reading material — this section awards no points.
        </p>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Your answer
            </dt>
            <dd
              className={
                row.is_correct
                  ? "mt-1 font-semibold text-emerald-600 dark:text-emerald-400"
                  : "mt-1 font-semibold text-red-600 dark:text-red-400"
              }
            >
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

export interface QuizResultReviewProps {
  result: QuizAttemptResult;
  questions: Question[];
}

export function QuizResultReview({ result, questions }: QuizResultReviewProps) {
  const [onlyMistakes, setOnlyMistakes] = useState(false);

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.question_id, question])),
    [questions],
  );

  const positionById = useMemo(
    () =>
      new Map(result.questions.map((row, index) => [row.question_id, index + 1] as const)),
    [result.questions],
  );

  const rows = result.questions.filter((row) => !onlyMistakes || row.is_correct === false);

  return (
    <section className="mt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review your answers</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={onlyMistakes}
            onChange={(event) => setOnlyMistakes(event.target.checked)}
            className="h-4 w-4 accent-sky-600 dark:accent-sky-400"
          />
          Only mistakes
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-medium text-slate-500 dark:border-white/15 dark:text-slate-400">
          {onlyMistakes ? "No mistakes to review — nice work." : "Nothing to review."}
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.question_id}>
              <ReviewRow
                row={row}
                question={questionById.get(row.question_id)}
                position={positionById.get(row.question_id) ?? 0}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

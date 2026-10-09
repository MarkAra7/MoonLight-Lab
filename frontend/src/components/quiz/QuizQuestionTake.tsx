import type { Question } from "@/api/types";
import { questionTypeMeta } from "@/config/questionTypes";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

const optionClasses = [
  "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium",
  "border-slate-200 bg-white text-slate-700 transition-colors",
  "hover:border-sky-500/40",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:border-sky-500/40",
].join(" ");

const optionPickedClasses =
  "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-400/10 dark:text-sky-300";

/** The single answer a student gave to one question. */
export interface TakeAnswer {
  answer_id?: string | null;
  answer_ids?: string[];
  text?: string | null;
}

export interface QuizQuestionTakeProps {
  question: Question;
  position: number;
  total: number;
  value: TakeAnswer;
  disabled?: boolean;
  onChange: (next: TakeAnswer) => void;
}

export function QuizQuestionTake({
  question,
  position,
  total,
  value,
  disabled = false,
  onChange,
}: QuizQuestionTakeProps) {
  const meta = questionTypeMeta(question.question_type);
  const answers = question.answers ?? [];
  const pickedIds = value.answer_ids ?? [];
  const pickedId = value.answer_id ?? null;
  const isMulti = meta.answerMode === "multi";

  const isPicked = (answerId: string) =>
    isMulti ? pickedIds.includes(answerId) : pickedId === answerId;

  const pick = (answerId: string, checked: boolean) => {
    if (isMulti) {
      const next = checked
        ? [...pickedIds, answerId]
        : pickedIds.filter((id) => id !== answerId);
      onChange({ ...value, answer_ids: next });
      return;
    }

    onChange({ ...value, answer_id: checked ? answerId : null });
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.03] md:p-8">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
          {position}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Question {position} of {total}
        </span>
        {meta.answerMode === "multi" && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
            Multiple answers
          </span>
        )}
      </header>

      <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white">
        {question.question_text}
      </h2>

      {question.question_type === "theory" && (
        <div className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-700 dark:bg-white/[0.02] dark:text-slate-300">
          {question.theory_content?.trim() || "No content for this section."}
        </div>
      )}

      {question.question_type === "text_input" && (
        <div className="mt-5">
          <input
            type="text"
            value={value.text ?? ""}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, text: event.target.value })}
            placeholder="Type your answer…"
            aria-label={`Answer for question ${position}`}
            className={inputClasses}
          />
        </div>
      )}

      {(meta.answerMode === "single" || meta.answerMode === "multi" || meta.answerMode === "binary") && (
        <ul className="mt-5 flex flex-col gap-3">
          {answers.map((answer) => {
            const checked = isPicked(answer.answer_id);

            return (
              <li key={answer.answer_id}>
                <label className={`${optionClasses} ${checked ? optionPickedClasses : ""}`}>
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    name={`question-${question.question_id}`}
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => pick(answer.answer_id, event.target.checked)}
                    className="h-5 w-5 flex-shrink-0 accent-sky-600 dark:accent-sky-400"
                  />
                  <span>{answer.answer_text}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

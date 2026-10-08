import {
  MATCH_MODES,
  QUESTION_TYPES,
  makeAnswerDraft,
  questionTypeMeta,
  withQuestionType,
  type AnswerDraft,
  type QuestionDraft,
} from "@/config/questionTypes";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

const iconButtonClasses = [
  "rounded-lg border border-slate-200 bg-white p-2 text-slate-500",
  "transition-colors hover:border-sky-500/30 hover:text-sky-600",
  "disabled:cursor-not-allowed disabled:opacity-40",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400",
  "dark:hover:border-sky-500/30 dark:hover:text-sky-400",
].join(" ");

const optionPickedClasses =
  "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-400/10 dark:text-sky-300";

const optionIdleClasses =
  "border-slate-200 bg-white text-slate-600 hover:border-sky-500/30 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400";

const upIcon = "M4.5 15.75l7.5-7.5 7.5 7.5";
const downIcon = "M19.5 8.25l-7.5 7.5-7.5-7.5";
const trashIcon =
  "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0";
const plusIcon = "M12 4.5v15m7.5-7.5h-15";

export interface QuestionEditorCardProps {
  question: QuestionDraft;
  position: number;
  error?: string;
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: QuestionDraft) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

export function QuestionEditorCard({
  question,
  position,
  error,
  disabled = false,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
}: QuestionEditorCardProps) {
  const meta = questionTypeMeta(question.question_type);
  const isChoice = meta.answerMode === "single" || meta.answerMode === "multi";

  const setAnswers = (answers: AnswerDraft[]) => onChange({ ...question, answers });

  const updateAnswer = (key: string, patch: Partial<AnswerDraft>) =>
    setAnswers(
      question.answers.map((answer) => (answer.key === key ? { ...answer, ...patch } : answer)),
    );

  const pickCorrect = (key: string) =>
    setAnswers(
      question.answers.map((answer) => ({ ...answer, is_correct: answer.key === key })),
    );

  const toggleCorrect = (key: string) =>
    setAnswers(
      question.answers.map((answer) =>
        answer.key === key ? { ...answer, is_correct: !answer.is_correct } : answer,
      ),
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.03]">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-black text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
              {position}
            </span>
            <select
              value={question.question_type}
              disabled={disabled}
              onChange={(event) => onChange(withQuestionType(question, event.target.value))}
              aria-label={`Question ${position} type`}
              className={`${inputClasses} w-auto min-w-[12rem] py-2 font-semibold`}
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{meta.hint}</p>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            aria-label={`Move question ${position} up`}
            disabled={disabled || isFirst}
            onClick={() => onMove(-1)}
            className={iconButtonClasses}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={upIcon} />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Move question ${position} down`}
            disabled={disabled || isLast}
            onClick={() => onMove(1)}
            className={iconButtonClasses}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={downIcon} />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Delete question ${position}`}
            disabled={disabled}
            onClick={onRemove}
            className={`${iconButtonClasses} hover:!border-red-500/30 hover:!text-red-500`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={trashIcon} />
            </svg>
          </button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-5">
        <div>
          <label
            htmlFor={`question-text-${question.key}`}
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            {question.question_type === "theory" ? "Heading" : "Question"}
          </label>
          <textarea
            id={`question-text-${question.key}`}
            rows={2}
            value={question.question_text}
            disabled={disabled}
            onChange={(event) => onChange({ ...question, question_text: event.target.value })}
            placeholder={
              question.question_type === "theory" ? "Song Celebration" : "Type your question…"
            }
            className={`${inputClasses} resize-y`}
          />
        </div>

        {question.question_type === "text_input" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor={`correct-text-${question.key}`}
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Correct answer
              </label>
              <input
                id={`correct-text-${question.key}`}
                type="text"
                value={question.correct_text}
                disabled={disabled}
                onChange={(event) => onChange({ ...question, correct_text: event.target.value })}
                placeholder="Daugava"
                className={inputClasses}
              />
            </div>
            <div>
              <label
                htmlFor={`match-mode-${question.key}`}
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Matching
              </label>
              <select
                id={`match-mode-${question.key}`}
                value={question.match_mode}
                disabled={disabled}
                onChange={(event) => onChange({ ...question, match_mode: event.target.value })}
                className={inputClasses}
              >
                {MATCH_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {question.question_type === "theory" && (
          <div>
            <label
              htmlFor={`theory-content-${question.key}`}
              className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Content
            </label>
            <textarea
              id={`theory-content-${question.key}`}
              rows={5}
              value={question.theory_content}
              disabled={disabled}
              onChange={(event) => onChange({ ...question, theory_content: event.target.value })}
              placeholder="What the student should read before continuing…"
              className={`${inputClasses} resize-y`}
            />
          </div>
        )}

        {meta.answerMode === "binary" && (
          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Correct answer
            </span>
            <div className="flex flex-wrap gap-3">
              {question.answers.map((answer, index) => (
                <button
                  key={answer.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickCorrect(answer.key)}
                  className={`rounded-xl border px-6 py-3 text-sm font-bold transition-colors ${
                    answer.is_correct ? optionPickedClasses : optionIdleClasses
                  }`}
                >
                  {answer.answer_text.trim() || (index === 0 ? "True" : "False")}
                </button>
              ))}
            </div>
          </div>
        )}

        {isChoice && (
          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {meta.answerMode === "single" ? "Answers — pick the correct one" : "Answers — tick the correct ones"}
            </span>

            <ul className="flex flex-col gap-3">
              {question.answers.map((answer) => (
                <li key={answer.key} className="flex items-center gap-3">
                  <input
                    type={meta.answerMode === "single" ? "radio" : "checkbox"}
                    name={`correct-${question.key}`}
                    checked={answer.is_correct}
                    disabled={disabled}
                    aria-label={`Mark "${answer.answer_text || "option"}" as correct`}
                    onChange={() =>
                      meta.answerMode === "single"
                        ? pickCorrect(answer.key)
                        : toggleCorrect(answer.key)
                    }
                    className="h-5 w-5 flex-shrink-0 accent-sky-600 dark:accent-sky-400"
                  />
                  <input
                    type="text"
                    value={answer.answer_text}
                    disabled={disabled}
                    placeholder="Answer option"
                    aria-label="Answer option"
                    onChange={(event) => updateAnswer(answer.key, { answer_text: event.target.value })}
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    aria-label="Remove answer"
                    disabled={disabled || question.answers.length <= 2}
                    onClick={() =>
                      setAnswers(question.answers.filter((item) => item.key !== answer.key))
                    }
                    className={`${iconButtonClasses} hover:!border-red-500/30 hover:!text-red-500`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={trashIcon} />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={disabled}
              onClick={() => setAnswers([...question.answers, makeAnswerDraft("", false)])}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-sky-600 transition-colors hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={plusIcon} />
              </svg>
              Add answer
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

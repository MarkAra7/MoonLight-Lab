import type { PartyQuestion } from "@/api/types";

export interface PartyAnswerFeedback {
  isCorrect: boolean;
  points: number;
}

export interface PartyLiveQuestionProps {
  question: PartyQuestion;
  questionNumber: number;
  totalQuestions: number;
  secondsLeft: number;
  totalSeconds: number;
  selectedAnswerId: string | null;
  correctAnswerId?: string | null;
  feedback: PartyAnswerFeedback | null;
  locked: boolean;
  submitting: boolean;
  error: string | null;
  onSelect: (answerId: string) => void;
}

export function PartyLiveQuestion({
  question,
  questionNumber,
  totalQuestions,
  secondsLeft,
  totalSeconds,
  selectedAnswerId,
  correctAnswerId,
  feedback,
  locked,
  submitting,
  error,
  onSelect,
}: PartyLiveQuestionProps) {
  const options = question.answers ?? [];
  const timeUp = secondsLeft <= 0;
  const urgent = !timeUp && secondsLeft <= 5;
  const disabled = locked || submitting || timeUp || options.length === 0;
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;

  return (
    <section className="glass-moon p-6 md:p-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-black tabular-nums ${
            timeUp
              ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : urgent
                ? "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                : "bg-sky-100 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"
          }`}
        >
          {timeUp ? "Time's up" : `${secondsLeft}s`}
        </span>
      </header>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            urgent ? "bg-amber-500 dark:bg-amber-400" : "bg-sky-500 dark:bg-sky-400"
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <h2 className="text-xl font-bold leading-snug text-slate-900 dark:text-white">
        {question.question_text}
      </h2>

      {options.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm font-medium text-slate-500 dark:bg-white/[0.02] dark:text-slate-400">
          This question type cannot be played live yet — the host can move on.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const selected = selectedAnswerId === option.answer_id;
            const isCorrectOption =
              locked && correctAnswerId != null && option.answer_id === correctAnswerId;

            return (
              <li key={option.answer_id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(option.answer_id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left text-sm font-bold transition-colors ${
                    isCorrectOption
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-400/10 dark:text-emerald-300"
                      : selected
                        ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-400/10 dark:text-sky-300"
                        : "border-slate-200 bg-white text-slate-700 enabled:hover:border-sky-500/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:enabled:hover:border-sky-500/40"
                  } ${disabled && !selected && !isCorrectOption ? "opacity-60" : ""}`}
                >
                  <span className="min-w-0 flex-1">{option.answer_text}</span>
                  {isCorrectOption ? (
                    <span className="text-[11px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                      Correct
                    </span>
                  ) : (
                    selected && (
                      <span className="text-[11px] font-black uppercase tracking-wide">Picked</span>
                    )
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {submitting && (
        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Sending…</p>
      )}

      {feedback && (
        <p
          role="status"
          className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${
            feedback.isCorrect
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
          }`}
        >
          {feedback.isCorrect ? `Correct! +${feedback.points} points` : "Not this time."}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

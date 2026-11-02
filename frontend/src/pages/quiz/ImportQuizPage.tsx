import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Label, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { quizApi } from "@/api/quiz";
import { questionTypeMeta } from "@/config/questionTypes";
import { useAuth } from "@/context/AuthContext";
import { VerifyEmailNotice } from "@/components/VerifyEmailNotice";
import { parseQuizImport } from "@/utils/quizImport";

const EXAMPLE_JSON = `{
  "title": "Photosynthesis basics",
  "description": "A short check after the lesson.",
  "difficulty": "easy",
  "time_limit": 10,
  "questions": [
    {
      "question_text": "Which gas do plants take in during photosynthesis?",
      "question_type": "single_choice",
      "answers": [
        { "answer_text": "Carbon dioxide", "is_correct": true },
        { "answer_text": "Oxygen", "is_correct": false }
      ]
    },
    {
      "question_text": "Plants release oxygen as a result of photosynthesis.",
      "question_type": "true_false",
      "answers": [
        { "answer_text": "True", "is_correct": true },
        { "answer_text": "False", "is_correct": false }
      ]
    },
    {
      "question_text": "Name the green pigment that captures light.",
      "question_type": "text_input",
      "correct_text": "chlorophyll"
    },
    {
      "question_text": "Remember: photosynthesis happens in the chloroplasts.",
      "question_type": "theory",
      "config": { "content": "Chloroplasts contain chlorophyll, which absorbs light energy." }
    }
  ]
}`;

const smallButtonClasses =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:focus-visible:ring-sky-400";

const textareaClasses = [
  "mt-1 w-full resize-y rounded-[10px] border bg-slate-50 px-4 py-3.5 font-mono text-xs leading-relaxed text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-slate-500",
].join(" ");

export function ImportQuizPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [importError, setImportError] = useState("");

  const parsed = useMemo(() => parseQuizImport(raw), [raw]);

  const handleImport = async () => {
    if (!parsed.payload || submitting) return;

    setImportError("");
    setSubmitting(true);

    try {
      const { data } = await quizApi.importJson(parsed.payload);
      navigate(`/quizzes/${data.quiz_id}/edit`, { replace: true });
    } catch (error) {
      setImportError(getErrorMessage(error, "The quiz could not be imported."));
      setSubmitting(false);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Import quiz</h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to import a quiz.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const preview = parsed.preview;
  const ready = parsed.payload !== null;

  return (
    <div className="w-full max-w-6xl">
      <header className="mb-8">
        <Link
          to="/my-quizzes"
          className="mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400"
        >
          Back to my quizzes
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Import quiz</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Paste a quiz as JSON to create a draft with all of its questions at once.
        </p>
      </header>

      <VerifyEmailNotice className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="glass-moon p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <Label htmlFor="quiz-json" className="text-sm font-bold">
              Quiz JSON
            </Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={smallButtonClasses}
                onClick={() => {
                  setRaw(EXAMPLE_JSON);
                  setImportError("");
                }}
              >
                Load example
              </button>
              <button
                type="button"
                className={smallButtonClasses}
                onClick={() => {
                  setRaw("");
                  setImportError("");
                }}
                disabled={!raw}
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            id="quiz-json"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            rows={20}
            spellCheck={false}
            placeholder={EXAMPLE_JSON}
            className={textareaClasses}
          />

          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            The quiz is always imported as a draft. Cover, category and visibility can be changed in the
            editor afterwards.
          </p>

          {parsed.issues.length > 0 && (
            <Alert color="failure" className="mt-4">
              <p className="font-bold">Fix these before importing:</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {parsed.issues.slice(0, 6).map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
              {parsed.issues.length > 6 && (
                <p className="mt-1 text-sm font-semibold">
                  …and {parsed.issues.length - 6} more.
                </p>
              )}
            </Alert>
          )}

          {ready && (
            <Alert color="success" className="mt-4">
              Looks good — {preview?.questions.length ?? 0} question
              {(preview?.questions.length ?? 0) === 1 ? "" : "s"} ready to import.
            </Alert>
          )}

          {importError && (
            <Alert color="failure" className="mt-4">
              {importError}
            </Alert>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              color="info"
              onClick={() => void handleImport()}
              disabled={!ready || submitting}
              className="font-bold"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Importing…
                </>
              ) : (
                "Import quiz"
              )}
            </Button>
            <Link
              to="/my-quizzes"
              className="text-sm font-bold text-slate-500 no-underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </Link>
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass-moon p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Preview</h2>

            {!preview ? (
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Paste JSON to see what will be created.
              </p>
            ) : (
              <>
                <p className="mt-2 text-lg font-black leading-snug text-slate-900 dark:text-white">
                  {preview.title}
                </p>
                {preview.description && (
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {preview.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color="gray" size="sm">
                    {preview.questions.length} question
                    {preview.questions.length === 1 ? "" : "s"}
                  </Badge>
                  {preview.difficulty && (
                    <Badge color="info" size="sm">
                      {preview.difficulty}
                    </Badge>
                  )}
                  {preview.timeLimit != null && (
                    <Badge color="gray" size="sm">
                      {preview.timeLimit} min
                    </Badge>
                  )}
                  <Badge color={preview.isPublic ? "success" : "gray"} size="sm">
                    {preview.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>

                <div className="mt-4 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                  {preview.questions.map((question, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-slate-200 p-2.5 dark:border-white/10"
                    >
                      <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-200">
                        {index + 1}. {question.text}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {questionTypeMeta(question.type).label}
                        {question.answerCount > 0 && ` · ${question.answerCount} answers`}
                        {question.correctCount > 0 && ` · ${question.correctCount} correct`}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

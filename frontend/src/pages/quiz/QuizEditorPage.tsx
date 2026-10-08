import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage, mediaApi, miscApi } from "@/api";
import { quizApi, type QuizPayload } from "@/api/quiz";
import { useAuth } from "@/context/AuthContext";
import { mediaUrl } from "@/utils/helpers";
import type { Category, Quiz } from "@/api/types";
import { QuestionEditorCard } from "@/components/quiz/QuestionEditorCard";
import {
  DIFFICULTIES,
  QUIZ_LANGUAGES,
  QUIZ_STATUSES,
  buildAnswerPayload,
  buildQuestionPayload,
  emptyQuestionDraft,
  questionToDraft,
  questionTypeMeta,
  validateQuestionDraft,
  type QuestionDraft,
} from "@/config/questionTypes";

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

const fieldLabelClasses =
  "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300";

function SpinnerBlock() {
  return (
    <div className="flex justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );
}

export function QuizEditorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialQuestionIds, setInitialQuestionIds] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState("draft");
  const [isPublic, setIsPublic] = useState(true);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    miscApi
      .categories()
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]));

    if (!quizId) {
      setQuiz(null);
      setInitialQuestionIds([]);
      setTitle("");
      setDescription("");
      setCategoryId("");
      setDifficulty("");
      setTimeLimit("");
      setLanguage("en");
      setStatus("draft");
      setIsPublic(true);
      setMediaId(null);
      setCoverUrl("");
      setQuestions([]);
      setLoading(false);
      return;
    }

    try {
      const [quizRes, questionsRes] = await Promise.all([
        quizApi.show(quizId),
        quizApi.questions(quizId),
      ]);

      const loaded = quizRes.data;
      setQuiz(loaded);
      setTitle(loaded.title ?? "");
      setDescription(loaded.description ?? "");
      setCategoryId(loaded.category_id ?? "");
      setDifficulty(loaded.difficulty ?? "");
      setTimeLimit(loaded.time_limit ? String(loaded.time_limit) : "");
      setLanguage(loaded.language ?? "en");
      setStatus(loaded.quiz_status?.status ?? "draft");
      setIsPublic(Boolean(loaded.is_public));
      setMediaId(loaded.media_id ?? null);
      setCoverUrl(mediaUrl(loaded.media?.file_path ?? loaded.media?.url));

      const drafts = (questionsRes.data ?? []).map(questionToDraft);
      setQuestions(drafts);
      setInitialQuestionIds(
        drafts
          .map((draft) => draft.question_id)
          .filter((id): id is string => Boolean(id)),
      );
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load this quiz."));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void (async () => {
      await load();
    })();
  }, [authLoading, user, load]);

  const handleCoverChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Pick an image file for the cover.");
      return;
    }

    setUploadingCover(true);
    setError(null);
    try {
      const { data } = await mediaApi.uploadPhoto(file);
      setMediaId(data.file_id ?? null);
      setCoverUrl(mediaUrl(data.file_path ?? data.url) || URL.createObjectURL(file));
    } catch (err) {
      setError(getErrorMessage(err, "Could not upload that cover image."));
    } finally {
      setUploadingCover(false);
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestionDraft()]);
  };

  const removeQuestion = (key: string) => {
    const draft = questions.find((item) => item.key === key);
    if (draft && (draft.question_id || draft.question_text.trim())) {
      if (!window.confirm("Delete this question and its answers?")) return;
    }

    setQuestions((prev) => prev.filter((item) => item.key !== key));
    setQuestionErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
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
      if (!keep.has(id)) await quizApi.removeAnswer(id);
    }

    let order = 1;
    for (const answer of desired) {
      const payload = buildAnswerPayload(answer, order);
      order += 1;
      if (answer.answer_id) {
        await quizApi.updateAnswer(answer.answer_id, payload);
      } else {
        await quizApi.addAnswer(questionId, payload);
      }
    }
  };

  const save = async () => {
    if (saving) return;

    if (!title.trim()) {
      setError("Give your quiz a title before saving.");
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
      const payload: QuizPayload = {
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
        media_id: mediaId,
        language,
        difficulty: difficulty || null,
        time_limit: timeLimit.trim() ? Number(timeLimit) : null,
        status,
        is_public: isPublic,
      };

      const created = !quizId;
      let savedId = quizId ?? "";

      if (created) {
        const { data } = await quizApi.create(payload);
        savedId = String(data.quiz_id);
      } else {
        await quizApi.update(savedId, payload);
      }

      const keptIds = new Set(
        questions
          .map((draft) => draft.question_id)
          .filter((id): id is string => Boolean(id)),
      );
      for (const id of initialQuestionIds) {
        if (!keptIds.has(id)) await quizApi.removeQuestion(id);
      }

      let order = 1;
      for (const draft of questions) {
        const questionPayload = buildQuestionPayload(draft, order);
        order += 1;

        let questionId = draft.question_id ?? null;
        if (questionId) {
          const { data } = await quizApi.updateQuestion(questionId, questionPayload);
          questionId = data.question_id;
        } else {
          const { data } = await quizApi.addQuestion(savedId, questionPayload);
          questionId = data.question_id;
        }
        await syncAnswers(draft, questionId);
      }

      if (created) {
        navigate(`/quizzes/${savedId}/edit`, { replace: true });
        setNotice("Quiz saved. You can keep editing it here.");
      } else {
        await load();
        setNotice("Changes saved.");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this quiz."));
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
      <div className="mx-auto flex w-full max-w-md justify-center">
        <div className="glass-moon w-full p-10 text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Quiz editor</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            You need to be signed in to build a quiz.
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
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Quiz editor</h1>
        <p className="mb-6 text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
        <Link to="/my-quizzes" className={linkButton}>
          Back to my quizzes
        </Link>
      </div>
    );
  }

  const statusLabel = QUIZ_STATUSES.find((item) => item.id === status)?.label.split(" — ")[0] ?? "Draft";

  return (
    <div className="flex w-full flex-col">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/my-quizzes"
            className={`mb-3 inline-block text-sm font-semibold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400 ${linkFocusRing}`}
          >
            Back to my quizzes
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {quiz ? "Edit quiz" : "Create quiz"}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {quiz
              ? `Editing “${quiz.title}”.`
              : "Fill in the details, add your questions, then save everything at once."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge color={status === "published" ? "success" : "gray"} size="sm">
            {statusLabel}
          </Badge>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || uploadingCover}
            className={primaryButtonClasses}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save quiz"
            )}
          </Button>
        </div>
      </header>

      {notice && <Alert color="success" className="mb-6">{notice}</Alert>}
      {error && <Alert color="failure" className="mb-6">{error}</Alert>}

      <section className="glass-moon mb-6 p-8">
        <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Details</h2>
        <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          A quiz only shows up on the browse page when it is public and published.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="quiz-title" className={fieldLabelClasses}>
              Title
            </label>
            <input
              id="quiz-title"
              type="text"
              value={title}
              disabled={saving}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Capitals of Europe"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="quiz-description" className={fieldLabelClasses}>
              Description
            </label>
            <textarea
              id="quiz-description"
              rows={3}
              value={description}
              disabled={saving}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this quiz about?"
              className={`${inputClasses} resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="quiz-category" className={fieldLabelClasses}>
                Category
              </label>
              <select
                id="quiz-category"
                value={categoryId}
                disabled={saving}
                onChange={(event) => setCategoryId(event.target.value)}
                className={inputClasses}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={String(category.category_id)} value={String(category.category_id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quiz-difficulty" className={fieldLabelClasses}>
                Difficulty
              </label>
              <select
                id="quiz-difficulty"
                value={difficulty}
                disabled={saving}
                onChange={(event) => setDifficulty(event.target.value)}
                className={inputClasses}
              >
                <option value="">Not set</option>
                {DIFFICULTIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quiz-time-limit" className={fieldLabelClasses}>
                Time limit in minutes
              </label>
              <input
                id="quiz-time-limit"
                type="number"
                min={0}
                max={600}
                value={timeLimit}
                disabled={saving}
                onChange={(event) => setTimeLimit(event.target.value)}
                placeholder="No limit"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="quiz-language" className={fieldLabelClasses}>
                Language
              </label>
              <select
                id="quiz-language"
                value={language}
                disabled={saving}
                onChange={(event) => setLanguage(event.target.value)}
                className={inputClasses}
              >
                {QUIZ_LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quiz-status" className={fieldLabelClasses}>
                Status
              </label>
              <select
                id="quiz-status"
                value={status}
                disabled={saving}
                onChange={(event) => setStatus(event.target.value)}
                className={inputClasses}
              >
                {QUIZ_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className={fieldLabelClasses}>Cover image</span>
              <div className="flex flex-wrap items-center gap-4">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Quiz cover"
                    className="h-20 w-36 flex-shrink-0 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-white/15"
                  />
                ) : (
                  <div className="flex h-20 w-36 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-400 dark:border-white/15">
                    No cover
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    color="light"
                    disabled={saving || uploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    className={secondaryButtonClasses}
                  >
                    {uploadingCover ? "Uploading…" : coverUrl ? "Change" : "Upload"}
                  </Button>
                  {coverUrl && (
                    <Button
                      type="button"
                      color="red"
                      outline
                      disabled={saving || uploadingCover}
                      onClick={() => {
                        setMediaId(null);
                        setCoverUrl("");
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleCoverChange(event)}
                />
              </div>
            </div>
          </div>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-sky-500/30 dark:border-white/10 ${linkFocusRing}`}
          >
            <input
              type="checkbox"
              checked={isPublic}
              disabled={saving}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="mt-0.5 h-5 w-5 flex-shrink-0 accent-sky-600 dark:accent-sky-400"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                Public quiz
              </span>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Anyone can open it once the status is set to published.
              </span>
            </span>
          </label>
        </form>
      </section>

      <section className="glass-moon p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Questions ({questions.length})
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Saved top to bottom — use the arrows to change the order.
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
                onChange={(next) =>
                  setQuestions((prev) =>
                    prev.map((item) => (item.key === draft.key ? next : item)),
                  )
                }
                onRemove={() => removeQuestion(draft.key)}
                onMove={(direction) => moveQuestion(draft.key, direction)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || uploadingCover}
            className={primaryButtonClasses}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save quiz"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}

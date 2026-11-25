import type { AnswerPayload, QuestionPayload } from "@/api/quiz";
import type { Answer, Question } from "@/api/types";

export type AnswerMode = "single" | "multi" | "binary" | "none";

export interface QuestionTypeMeta {
  id: string;
  label: string;
  hint: string;
  answerMode: AnswerMode;
}

/**
 * Mirrors `database/seeders/QuestionTypeSeeder.php`. The ids are the primary
 * keys the backend validates against, so they must stay in sync.
 */
export const QUESTION_TYPES: QuestionTypeMeta[] = [
  {
    id: "single_choice",
    label: "Single choice",
    hint: "One correct option out of several.",
    answerMode: "single",
  },
  {
    id: "multiple_choice",
    label: "Multiple choice",
    hint: "More than one option can be correct.",
    answerMode: "multi",
  },
  {
    id: "true_false",
    label: "True or false",
    hint: "A short statement with two options.",
    answerMode: "binary",
  },
  {
    id: "text_input",
    label: "Short answer",
    hint: "The student types the answer you set.",
    answerMode: "none",
  },
  {
    id: "theory",
    label: "Theory",
    hint: "Reading material that awards no points.",
    answerMode: "none",
  },
  {
    id: "code",
    label: "Code task",
    hint: "Write code that passes the teacher's tests.",
    answerMode: "none",
  },
];

export const MATCH_MODES = [
  { id: "exact", label: "Must match exactly" },
  { id: "case_insensitive", label: "Ignore capital letters" },
  { id: "partial", label: "Answer contains the text" },
];

export const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

export const QUIZ_STATUSES = [
  { id: "draft", label: "Draft — only you can see it" },
  { id: "published", label: "Published — visible to everyone" },
  { id: "archived", label: "Archived — hidden from the browse page" },
];

export const PLAY_MODES = [
  {
    id: "all",
    label: "All questions on one page",
    description: "Players answer the whole quiz in a single scroll.",
  },
  {
    id: "one_by_one",
    label: "One question at a time",
    description: "Players move through the quiz question by question.",
  },
] as const;

export const QUIZ_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "lv", label: "Latviešu" },
  { id: "de", label: "Deutsch" },
  { id: "ru", label: "Русский" },
];

export function questionTypeMeta(id: string | null | undefined): QuestionTypeMeta {
  return QUESTION_TYPES.find((type) => type.id === id) ?? QUESTION_TYPES[0];
}

export interface AnswerDraft {
  key: string;
  answer_id?: string | null;
  answer_text: string;
  is_correct: boolean;
}

export interface CodeTestDraft {
  key: string;
  input: string;
  expected_output: string;
  hidden: boolean;
}

export interface QuestionDraft {
  key: string;
  question_id?: string | null;
  question_type: string;
  question_text: string;
  /** Assessments store points per question; quizzes ignore this. */
  points: number;
  /** `text_input` only — stored in `config.correct_text`. */
  correct_text: string;
  /** `text_input` only — stored in `config.match_mode`. */
  match_mode: string;
  /** `theory` only — stored in `config.content`. */
  theory_content: string;
  /** `code` only — language, starter code and test cases in `config`. */
  code_language: string;
  starter_code: string;
  tests: CodeTestDraft[];
  answers: AnswerDraft[];
  /** Server-side answers that exist for this question, so saving can prune them. */
  existing_answer_ids: string[];
}

let draftSequence = 0;

export function nextDraftKey(prefix: string): string {
  draftSequence += 1;
  return `${prefix}-${draftSequence}`;
}

export function makeAnswerDraft(answer_text = "", is_correct = false): AnswerDraft {
  return { key: nextDraftKey("a"), answer_text, is_correct };
}

export function makeCodeTestDraft(hidden = false): CodeTestDraft {
  return { key: nextDraftKey("t"), input: "", expected_output: "", hidden };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function codeTestToDraft(test: {
  input?: string;
  expected_output?: string;
  hidden?: boolean;
}): CodeTestDraft {
  return {
    key: nextDraftKey("t"),
    input: test.input ?? "",
    expected_output: test.expected_output ?? "",
    hidden: test.hidden === true,
  };
}

function codeTestsFromConfig(value: unknown): CodeTestDraft[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((test): test is Record<string, unknown> => typeof test === "object" && test !== null)
    .map((test) => codeTestToDraft({
      input: asString(test.input),
      expected_output: asString(test.expected_output),
      hidden: test.hidden === true,
    }));
}

function toAnswerDraft(answer: Answer): AnswerDraft {
  return {
    key: nextDraftKey("a"),
    answer_id: answer.answer_id ?? null,
    answer_text: answer.answer_text ?? "",
    is_correct: answer.is_correct === true,
  };
}

function binaryPair(): AnswerDraft[] {
  return [makeAnswerDraft("True", true), makeAnswerDraft("False", false)];
}

function choicePair(): AnswerDraft[] {
  return [makeAnswerDraft("", true), makeAnswerDraft("", false)];
}

export function questionToDraft(question: Question): QuestionDraft {
  const meta = questionTypeMeta(question.question_type);
  const serverAnswers = (question.answers ?? []).map(toAnswerDraft);

  const answers =
    meta.answerMode === "binary" && serverAnswers.length < 2 ? binaryPair() : serverAnswers;

  const config = question.config ?? {};
  const content = config.content;
  const codeTests = question.config
    ? codeTestsFromConfig(config.tests)
    : (question.code_config?.tests ?? []).map(codeTestToDraft);

  return {
    key: nextDraftKey("q"),
    question_id: question.question_id ?? null,
    question_type: question.question_type,
    question_text: question.question_text ?? "",
    points: (question as { points?: number }).points ?? 1,
    correct_text: question.correct_text ?? "",
    match_mode: question.match_mode ?? "case_insensitive",
    theory_content: typeof content === "string" ? content : "",
    code_language: asString(config.language ?? question.code_config?.language) || "js",
    starter_code: asString(config.starter_code ?? question.code_config?.starter_code),
    tests: codeTests,
    answers,
    existing_answer_ids: serverAnswers
      .map((answer) => answer.answer_id)
      .filter((id): id is string => Boolean(id)),
  };
}

export function emptyQuestionDraft(questionType = "single_choice"): QuestionDraft {
  const meta = questionTypeMeta(questionType);
  const answers =
    meta.answerMode === "binary"
      ? binaryPair()
      : meta.answerMode === "none"
        ? []
        : choicePair();

  return {
    key: nextDraftKey("q"),
    question_id: null,
    question_type: meta.id,
    question_text: "",
    points: 1,
    correct_text: "",
    match_mode: "case_insensitive",
    theory_content: "",
    code_language: "js",
    starter_code: "",
    tests: [],
    answers,
    existing_answer_ids: [],
  };
}

/** Keeps the answer list usable when the author switches question type. */
export function withQuestionType(draft: QuestionDraft, questionType: string): QuestionDraft {
  const meta = questionTypeMeta(questionType);
  let answers = draft.answers;

  if (meta.answerMode === "binary" && answers.length < 2) {
    answers = binaryPair();
  } else if ((meta.answerMode === "single" || meta.answerMode === "multi") && answers.length === 0) {
    answers = choicePair();
  }

  return { ...draft, question_type: meta.id, answers };
}

export function buildQuestionPayload(draft: QuestionDraft, displayOrder: number): QuestionPayload {
  let config: Record<string, unknown> | null = null;

  if (draft.question_type === "text_input") {
    config = {
      correct_text: draft.correct_text.trim(),
      match_mode: draft.match_mode,
    };
  } else if (draft.question_type === "theory") {
    config = { content: draft.theory_content };
  } else if (draft.question_type === "code") {
    config = {
      language: draft.code_language || "js",
      starter_code: draft.starter_code,
      tests: draft.tests.map((test) => ({
        input: test.input,
        expected_output: test.expected_output,
        hidden: test.hidden,
      })),
    };
  }

  return {
    question_text: draft.question_text.trim(),
    question_type: draft.question_type,
    display_order: displayOrder,
    config,
  };
}

export function buildAnswerPayload(draft: AnswerDraft, displayOrder: number): AnswerPayload {
  return {
    answer_text: draft.answer_text.trim(),
    is_correct: draft.is_correct,
    display_order: displayOrder,
  };
}

/** Returns a human readable problem, or `null` when the question is valid. */
export function validateQuestionDraft(draft: QuestionDraft, position: number): string | null {
  const label = `Question ${position}`;
  const meta = questionTypeMeta(draft.question_type);

  if (!draft.question_text.trim()) {
    return `${label} needs a question.`;
  }

  if (meta.id === "text_input" && !draft.correct_text.trim()) {
    return `${label} needs the correct answer.`;
  }

  if (meta.id === "code" && draft.tests.length === 0) {
    return `${label} needs at least one test.`;
  }

  if (meta.answerMode === "binary") {
    if (!draft.answers.some((answer) => answer.is_correct)) {
      return `${label}: pick whether the statement is true or false.`;
    }
    return null;
  }

  if (meta.answerMode === "single" || meta.answerMode === "multi") {
    const filled = draft.answers.filter((answer) => answer.answer_text.trim());
    if (filled.length < 2) {
      return `${label} needs at least two answer options.`;
    }
    if (!filled.some((answer) => answer.is_correct)) {
      return `${label}: tick at least one correct answer.`;
    }
  }

  return null;
}

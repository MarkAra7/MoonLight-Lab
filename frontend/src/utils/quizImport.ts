import type {
  ImportQuizAnswerPayload,
  ImportQuizPayload,
  ImportQuizQuestionPayload,
} from "@/api/quiz";
import { QUESTION_TYPES } from "@/config/questionTypes";

export interface ImportPreviewQuestion {
  text: string;
  type: string;
  answerCount: number;
  correctCount: number;
}

export interface ImportPreview {
  title: string;
  description: string | null;
  difficulty: string | null;
  timeLimit: number | null;
  isPublic: boolean;
  questions: ImportPreviewQuestion[];
}

export interface ImportParseResult {
  /** Best-effort reading of the JSON, shown even while problems are listed. */
  preview: ImportPreview | null;
  /** Present only when the JSON has no problems. */
  payload: ImportQuizPayload | null;
  issues: string[];
}

const CHOICE_TYPES = ["single_choice", "multiple_choice", "true_false"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const MATCH_MODES = ["exact", "case_insensitive", "partial"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Reads the export format accepted by `POST /quizzes/import-json` and reports
 * every problem at once instead of failing on the first one.
 */
export function parseQuizImport(raw: string): ImportParseResult {
  const issues: string[] = [];

  if (!raw.trim()) {
    return { preview: null, payload: null, issues };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      preview: null,
      payload: null,
      issues: ["The text is not valid JSON. Check the commas and quotation marks."],
    };
  }

  if (!isRecord(parsed)) {
    return {
      preview: null,
      payload: null,
      issues: ["The JSON must be an object with a title and a questions array."],
    };
  }

  // The backend also accepts the quiz nested under a "quiz" key.
  const quiz = isRecord(parsed.quiz) ? parsed.quiz : parsed;
  const title = text(quiz.title);
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  const preview: ImportPreview = {
    title: title || "Untitled quiz",
    description: text(quiz.description) || null,
    difficulty: text(quiz.difficulty) || null,
    timeLimit: typeof quiz.time_limit === "number" ? quiz.time_limit : null,
    isPublic: quiz.is_public === true,
    questions: questions.map((question) => {
      const answers = isRecord(question) && Array.isArray(question.answers) ? question.answers : [];

      return {
        text: isRecord(question) ? text(question.question_text) || "Untitled question" : "Untitled question",
        type: isRecord(question) ? text(question.question_type) || "unknown" : "unknown",
        answerCount: answers.length,
        correctCount: answers.filter((answer) => isRecord(answer) && answer.is_correct === true).length,
      };
    }),
  };

  if (!title) {
    issues.push('A non-empty "title" is required.');
  } else if (title.length > 255) {
    issues.push('"title" must be 255 characters or fewer.');
  }

  if (quiz.description != null && typeof quiz.description !== "string") {
    issues.push('"description" must be text.');
  }
  if (quiz.category_id != null && typeof quiz.category_id !== "string") {
    issues.push('"category_id" must be a category ID string.');
  }
  if (quiz.is_public != null && typeof quiz.is_public !== "boolean") {
    issues.push('"is_public" must be true or false.');
  }
  if (quiz.difficulty != null && !DIFFICULTIES.includes(text(quiz.difficulty))) {
    issues.push('"difficulty" must be "easy", "medium" or "hard".');
  }
  if (quiz.time_limit != null && !isWholeNumber(quiz.time_limit)) {
    issues.push('"time_limit" must be a whole number of minutes.');
  }
  if (quiz.language != null && typeof quiz.language !== "string") {
    issues.push('"language" must be a string such as "en".');
  }

  if (questions.length === 0) {
    issues.push("At least one question is required.");
  }

  const questionPayloads: ImportQuizQuestionPayload[] = [];

  questions.forEach((value, index) => {
    const label = `Question ${index + 1}`;

    if (!isRecord(value)) {
      issues.push(`${label} must be an object.`);
      return;
    }

    const questionText = text(value.question_text);
    const type = text(value.question_type);

    if (!questionText) {
      issues.push(`${label} needs a non-empty "question_text".`);
    }

    if (!QUESTION_TYPES.some((meta) => meta.id === type)) {
      issues.push(
        `${label} has an unknown "question_type" (${type || "missing"}). Use one of: ${QUESTION_TYPES.map(
          (meta) => meta.id
        ).join(", ")}.`
      );
      return;
    }

    if (value.display_order != null && !isWholeNumber(value.display_order)) {
      issues.push(`${label}: "display_order" must be a whole number.`);
    }

    const answers = Array.isArray(value.answers) ? value.answers : [];
    const answerPayloads: ImportQuizAnswerPayload[] = [];

    if (CHOICE_TYPES.includes(type)) {
      if (answers.length < 2) {
        issues.push(`${label} needs at least two answers.`);
      }

      answers.forEach((answer, answerIndex) => {
        const answerLabel = `${label}, answer ${answerIndex + 1}`;

        if (!isRecord(answer)) {
          issues.push(`${answerLabel} must be an object.`);
          return;
        }

        const answerText = text(answer.answer_text);
        if (!answerText) {
          issues.push(`${answerLabel} needs "answer_text".`);
        }
        if (typeof answer.is_correct !== "boolean") {
          issues.push(`${answerLabel} needs a true/false "is_correct".`);
        }
        if (answer.display_order != null && !isWholeNumber(answer.display_order)) {
          issues.push(`${answerLabel}: "display_order" must be a whole number.`);
        }

        answerPayloads.push({
          answer_text: answerText,
          is_correct: answer.is_correct === true,
          ...(typeof answer.display_order === "number" ? { display_order: answer.display_order } : {}),
        });
      });

      const correctCount = answerPayloads.filter((answer) => answer.is_correct).length;

      if (type === "multiple_choice" && correctCount === 0) {
        issues.push(`${label}: mark at least one answer as correct.`);
      }
      if (type !== "multiple_choice" && correctCount !== 1) {
        issues.push(`${label}: mark exactly one answer as correct.`);
      }
    }

    const config = isRecord(value.config) ? value.config : null;
    const correctText = text(value.correct_text) || text(config?.correct_text);
    const theoryContent = text(config?.content) || text(value.content);

    if (type === "text_input" && !correctText) {
      issues.push(`${label} (short answer) needs "correct_text".`);
    }
    if (type === "theory" && !theoryContent) {
      issues.push(`${label} (theory) needs "config.content" with the reading material.`);
    }
    if (value.match_mode != null && !MATCH_MODES.includes(text(value.match_mode))) {
      issues.push(`${label}: "match_mode" must be "exact", "case_insensitive" or "partial".`);
    }

    questionPayloads.push({
      question_text: questionText,
      question_type: type,
      ...(typeof value.display_order === "number" ? { display_order: value.display_order } : {}),
      ...(answerPayloads.length > 0 ? { answers: answerPayloads } : {}),
      ...(type === "text_input"
        ? {
            correct_text: correctText,
            ...(text(value.match_mode)
              ? { match_mode: text(value.match_mode) as ImportQuizQuestionPayload["match_mode"] }
              : {}),
          }
        : {}),
      ...(type === "theory" ? { config: { content: theoryContent } } : {}),
    });
  });

  if (issues.length > 0) {
    return { preview, payload: null, issues };
  }

  return {
    preview,
    issues,
    payload: {
      title,
      ...(typeof quiz.description === "string" ? { description: quiz.description } : {}),
      ...(typeof quiz.category_id === "string" ? { category_id: quiz.category_id } : {}),
      ...(typeof quiz.is_public === "boolean" ? { is_public: quiz.is_public } : {}),
      ...(typeof quiz.difficulty === "string"
        ? { difficulty: quiz.difficulty as ImportQuizPayload["difficulty"] }
        : {}),
      ...(typeof quiz.time_limit === "number" ? { time_limit: quiz.time_limit } : {}),
      ...(typeof quiz.language === "string" ? { language: quiz.language } : {}),
      questions: questionPayloads,
    },
  };
}

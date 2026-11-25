import apiClient from "./client";
import type {
  Answer,
  Assessment,
  AssessmentAssignment,
  AssessmentAttemptResult,
  AssessmentAttemptStart,
  AssessmentAttemptSummary,
  AssessmentQuestion,
  AssessmentResultRow,
  AssessmentReviewQuestion,
  TeacherAssessmentAttemptResult,
} from "./types";

export interface AssessmentPayload {
  title: string;
  description?: string | null;
  status?: string;
  time_limit_minutes?: number | null;
  max_attempts?: number;
  opens_at?: string | null;
  due_at?: string | null;
}

export interface AssessmentQuestionPayload {
  question_text: string;
  question_type: string;
  points?: number;
  display_order?: number;
  config?: Record<string, unknown>;
}

export interface AssessmentAnswerPayload {
  answer_text: string;
  is_correct: boolean;
  display_order?: number;
}

export interface AssessmentAssignmentPayload {
  assessment_id: string;
  class_id: string;
  student_id?: number | string | null;
  title: string;
  description?: string | null;
  max_attempts?: number;
  time_limit_minutes?: number | null;
  opens_at?: string | null;
  due_at?: string | null;
}

export interface SubmitAssessmentPayload {
  assignment_id?: string | null;
  attempt_token?: string | null;
  started_at?: string | null;
  answers: Array<{
    question_id: string;
    answer_id?: string | null;
    answer_ids?: string[];
    text?: string;
    code?: string;
  }>;
}

export interface AssessmentResults {
  assessment: Pick<Assessment, "assessment_id" | "title" | "description" | "status">;
  results: AssessmentResultRow[];
}

export const assessmentApi = {
  list: () => apiClient.get<Assessment[]>("/teacher/assessments"),
  create: (payload: AssessmentPayload) =>
    apiClient.post<{ assessment: Assessment }>("/teacher/assessments", payload),
  show: (id: string) =>
    apiClient.get<{ assessment: Assessment; questions: AssessmentQuestion[]; total_points: number }>(
      `/teacher/assessments/${id}`,
    ),
  update: (id: string, payload: Partial<AssessmentPayload>) =>
    apiClient.put<{ assessment: Assessment }>(`/teacher/assessments/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/teacher/assessments/${id}`),

  questions: (id: string) =>
    apiClient.get<AssessmentQuestion[]>(`/teacher/assessments/${id}/questions`),
  addQuestion: (id: string, payload: AssessmentQuestionPayload) =>
    apiClient.post<AssessmentQuestion>(`/teacher/assessments/${id}/questions`, payload),
  updateQuestion: (questionId: string, payload: Partial<AssessmentQuestionPayload>) =>
    apiClient.put<AssessmentQuestion>(`/teacher/assessment-questions/${questionId}`, payload),
  removeQuestion: (questionId: string) =>
    apiClient.delete(`/teacher/assessment-questions/${questionId}`),
  reorderQuestions: (id: string, questions: Array<{ question_id: string; display_order: number }>) =>
    apiClient.put(`/teacher/assessments/${id}/questions/reorder`, { questions }),

  answers: (questionId: string) =>
    apiClient.get<Answer[]>(`/teacher/assessment-questions/${questionId}/answers`),
  addAnswer: (questionId: string, payload: AssessmentAnswerPayload) =>
    apiClient.post<Answer>(`/teacher/assessment-questions/${questionId}/answers`, payload),
  updateAnswer: (answerId: string, payload: Partial<AssessmentAnswerPayload>) =>
    apiClient.put<Answer>(`/teacher/assessment-answers/${answerId}`, payload),
  removeAnswer: (answerId: string) => apiClient.delete(`/teacher/assessment-answers/${answerId}`),

  assignments: () => apiClient.get<AssessmentAssignment[]>("/teacher/assessment-assignments"),
  createAssignment: (payload: AssessmentAssignmentPayload) =>
    apiClient.post<AssessmentAssignment>("/teacher/assessment-assignments", payload),
  updateAssignment: (id: string, payload: Partial<AssessmentAssignmentPayload>) =>
    apiClient.put<AssessmentAssignment>(`/teacher/assessment-assignments/${id}`, payload),
  removeAssignment: (id: string) => apiClient.delete(`/teacher/assessment-assignments/${id}`),

  results: (id: string) => apiClient.get<AssessmentResults>(`/teacher/assessments/${id}/results`),
  exportResults: (id: string) =>
    apiClient.get<Blob>(`/teacher/assessments/${id}/export`, { responseType: "blob" }),
  attempt: (id: string, attemptId: number) =>
    apiClient.get<TeacherAssessmentAttemptResult>(`/teacher/assessments/${id}/attempts/${attemptId}`),
  gradeAttempt: (
    id: string,
    attemptId: number,
    payload: { teacher_score: number; teacher_feedback?: string | null },
  ) =>
    apiClient.put<TeacherAssessmentAttemptResult>(
      `/teacher/assessments/${id}/attempts/${attemptId}`,
      payload,
    ),

  studentQuestions: (id: string) =>
    apiClient.get<AssessmentQuestion[]>(`/assessments/${id}/questions`),
  startAttempt: (id: string, assignmentId?: string | null) =>
    apiClient.post<AssessmentAttemptStart>(`/assessments/${id}/attempts/start`, {
      assignment_id: assignmentId ?? null,
    }),
  submitAttempt: (id: string, payload: SubmitAssessmentPayload) =>
    apiClient.post<AssessmentAttemptResult>(`/assessments/${id}/attempts`, payload),
  myAttempts: () => apiClient.get<AssessmentAttemptSummary[]>("/my-assessment-attempts"),
  myAttempt: (attemptId: number | string) =>
    apiClient.get<AssessmentAttemptSummary & { questions: AssessmentReviewQuestion[] }>(
      `/my-assessment-attempts/${attemptId}`,
    ),
};

import apiClient from "./client";
import type { Comment, MyRating, Quiz, RatingSummary } from "./types";

export interface QuizListParams {
  category?: number | string;
  search?: string;
  [key: string]: unknown;
}

export interface QuizPayload {
  title: string;
  description?: string | null;
  category_id?: number | string | null;
  media_id?: number | string | null;
  is_public?: boolean;
}

export interface QuestionPayload {
  question_text: string;
  question_type: string;
  media_id?: string | null;
  display_order?: number;
  config?: unknown;
  is_private?: boolean;
}

export interface AnswerPayload {
  answer_text: string;
  is_correct: boolean;
  media_id?: string | null;
  display_order?: number;
  config?: unknown;
}

export interface ReorderPayload {
  questions: { question_id: string; display_order: number }[];
}

export interface RatePayload {
  rating: number;
}

export interface CommentPayload {
  body: string;
}

/** Response of QuizStatsController::stats (`/quizzes/:id/stats`). */
export interface QuizStats {
  quiz: {
    quiz_id: number;
    title: string;
    description?: string | null;
    difficulty?: string | null;
    time_limit?: number;
    views?: number;
    average_score?: number | null;
    is_public?: boolean;
  };
  author: { id: number; first_name: string; last_name: string } | null;
  category: { name: string } | null;
  questions_count: number;
  stats: {
    views: number;
    total_attempts: number;
    unique_students: number;
    average_percentage: number;
    score_distribution: { range: string; count: number }[];
    rating: RatingSummary;
    comments_count: number;
  };
  question_stats: {
    question_id: number;
    question_text: string;
    total_answers: number;
    correct_count: number;
    correct_percentage: number;
  }[];
  recent_attempts: {
    student_name: string;
    score: number;
    total: number;
    percentage: number;
    completed_at: string;
  }[];
}

export const quizApi = {
  list: (params?: QuizListParams) => apiClient.get<Quiz[]>("/quizzes", { params }),
  show: (id: number | string) => apiClient.get<Quiz>(`/quizzes/${id}`),
  stats: (id: number | string) => apiClient.get<QuizStats>(`/quizzes/${id}/stats`),
  ratings: (id: number | string) => apiClient.get<RatingSummary>(`/quizzes/${id}/ratings`),
  comments: (id: number | string) => apiClient.get<Comment[]>(`/quizzes/${id}/comments`),

  myQuizzes: () => apiClient.get<Quiz[]>("/my-quizzes"),
  create: (payload: QuizPayload) => apiClient.post<Quiz>("/quizzes", payload),
  update: (id: number | string, payload: Partial<QuizPayload>) => apiClient.put<Quiz>(`/quizzes/${id}`, payload),
  remove: (id: number | string) => apiClient.delete(`/quizzes/${id}`),
  importJson: (payload: unknown) => apiClient.post("/quizzes/import-json", payload),

  questions: (quizId: number | string) => apiClient.get(`/quizzes/${quizId}/questions`),
  addQuestion: (quizId: number | string, payload: QuestionPayload) =>
    apiClient.post(`/quizzes/${quizId}/questions`, payload),
  reorderQuestions: (quizId: number | string, payload: ReorderPayload) =>
    apiClient.put(`/quizzes/${quizId}/questions/reorder`, payload),
  question: (questionId: number | string) => apiClient.get(`/questions/${questionId}`),
  updateQuestion: (questionId: number | string, payload: Partial<QuestionPayload>) =>
    apiClient.put(`/questions/${questionId}`, payload),
  removeQuestion: (questionId: number | string) => apiClient.delete(`/questions/${questionId}`),

  answers: (questionId: number | string) => apiClient.get(`/questions/${questionId}/answers`),
  addAnswer: (questionId: number | string, payload: AnswerPayload) =>
    apiClient.post(`/questions/${questionId}/answers`, payload),
  updateAnswer: (answerId: number | string, payload: Partial<AnswerPayload>) =>
    apiClient.put(`/answers/${answerId}`, payload),
  removeAnswer: (answerId: number | string) => apiClient.delete(`/answers/${answerId}`),

  rate: (quizId: number | string, payload: RatePayload) => apiClient.post(`/quizzes/${quizId}/ratings`, payload),
  myRating: (quizId: number | string) => apiClient.get<MyRating>(`/quizzes/${quizId}/my-rating`),
  comment: (quizId: number | string, payload: CommentPayload) =>
    apiClient.post<Comment>(`/quizzes/${quizId}/comments`, payload),
  removeComment: (commentId: number | string) => apiClient.delete(`/comments/${commentId}`),
};
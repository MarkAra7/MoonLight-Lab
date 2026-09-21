import apiClient from "./client";
import type { Category, Role } from "./types";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  is_read?: boolean;
  created_at?: string;
}

export interface RunCodePayload {
  code: string;
  language: string;
}

export interface RunCodeResult {
  output: string;
  error: string;
}

export interface SubmitAttemptPayload {
  assignment_id?: string | null;
  quiz_id: string;
  score: number;
  total: number;
  answers_data?: Record<string, unknown> | null;
  started_at?: string | null;
}

export const miscApi = {
  roles: () => apiClient.get<Role[]>("/roles"),
  categories: () => apiClient.get<Category[]>("/categories"),
  category: (id: number | string) => apiClient.get(`/categories/${id}`),
  createCategory: (payload: { name: string; description?: string | null }) =>
    apiClient.post("/categories", payload),
  updateCategory: (id: number | string, payload: { name?: string; description?: string | null }) =>
    apiClient.put(`/categories/${id}`, payload),
  removeCategory: (id: number | string) => apiClient.delete(`/categories/${id}`),

  notifications: () => apiClient.get<NotificationItem[]>("/notifications"),
  unreadCount: () => apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: number | string) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put("/notifications/read-all"),

  myAttempts: () => apiClient.get("/my-attempts"),
  submitAttempt: (payload: SubmitAttemptPayload) => apiClient.post("/quiz-attempts", payload),

  runCode: (payload: RunCodePayload) => apiClient.post<RunCodeResult>("/run-code", payload),

  users: () => apiClient.get("/users"),
  user: (id: number | string) => apiClient.get(`/users/${id}`),
  publicProfile: (username: string) => apiClient.get(`/users/profile/${username}`),

  uploadMedia: (formData: FormData) =>
    apiClient.post("/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
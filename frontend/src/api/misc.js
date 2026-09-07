import apiClient from "./client";

export const miscApi = {
  roles: () => apiClient.get("/roles"),
  categories: () => apiClient.get("/categories"),
  category: (id) => apiClient.get(`/categories/${id}`),
  createCategory: (payload) => apiClient.post("/categories", payload),
  updateCategory: (id, payload) => apiClient.put(`/categories/${id}`, payload),
  removeCategory: (id) => apiClient.delete(`/categories/${id}`),

  notifications: () => apiClient.get("/notifications"),
  unreadCount: () => apiClient.get("/notifications/unread-count"),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put("/notifications/read-all"),

  myAttempts: () => apiClient.get("/my-attempts"),
  submitAttempt: (payload) => apiClient.post("/quiz-attempts", payload),

  runCode: (payload) => apiClient.post("/run-code", payload),

  users: () => apiClient.get("/users"),
  user: (id) => apiClient.get(`/users/${id}`),
  publicProfile: (username) => apiClient.get(`/users/profile/${username}`),

  uploadMedia: (formData) =>
    apiClient.post("/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

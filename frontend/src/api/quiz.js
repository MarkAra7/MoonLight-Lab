import apiClient from "./client";

export const quizApi = {
  list: (params) => apiClient.get("/quizzes", { params }),
  show: (id) => apiClient.get(`/quizzes/${id}`),
  stats: (id) => apiClient.get(`/quizzes/${id}/stats`),
  ratings: (id) => apiClient.get(`/quizzes/${id}/ratings`),
  comments: (id) => apiClient.get(`/quizzes/${id}/comments`),


  myQuizzes: () => apiClient.get("/my-quizzes"),
  create: (payload) => apiClient.post("/quizzes", payload),
  update: (id, payload) => apiClient.put(`/quizzes/${id}`, payload),
  remove: (id) => apiClient.delete(`/quizzes/${id}`),
  importJson: (payload) => apiClient.post("/quizzes/import-json", payload),

  questions: (quizId) => apiClient.get(`/quizzes/${quizId}/questions`),
  addQuestion: (quizId, payload) => apiClient.post(`/quizzes/${quizId}/questions`, payload),
  reorderQuestions: (quizId, payload) => apiClient.put(`/quizzes/${quizId}/questions/reorder`, payload),
  question: (questionId) => apiClient.get(`/questions/${questionId}`),
  updateQuestion: (questionId, payload) => apiClient.put(`/questions/${questionId}`, payload),
  removeQuestion: (questionId) => apiClient.delete(`/questions/${questionId}`),

  answers: (questionId) => apiClient.get(`/questions/${questionId}/answers`),
  addAnswer: (questionId, payload) => apiClient.post(`/questions/${questionId}/answers`, payload),
  updateAnswer: (answerId, payload) => apiClient.put(`/answers/${answerId}`, payload),
  removeAnswer: (answerId) => apiClient.delete(`/answers/${answerId}`),

  rate: (quizId, payload) => apiClient.post(`/quizzes/${quizId}/ratings`, payload),
  myRating: (quizId) => apiClient.get(`/quizzes/${quizId}/my-rating`),
  comment: (quizId, payload) => apiClient.post(`/quizzes/${quizId}/comments`, payload),
  removeComment: (commentId) => apiClient.delete(`/comments/${commentId}`),
};

import apiClient from "./client";

export const authApi = {
  register: (payload) => apiClient.post("/register", payload),
  login: (payload) => apiClient.post("/login", payload),
  logout: () => apiClient.post("/logout"),
  me: () => apiClient.get("/user"),
  verifyEmail: (payload) => apiClient.post("/verify-email", payload),
  resendVerification: () => apiClient.post("/verify-email/resend"),
  forgotPassword: (payload) => apiClient.post("/forgot-password", payload),
  resetPassword: (payload) => apiClient.post("/reset-password", payload),
};

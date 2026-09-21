import apiClient from "./client";
import type { User } from "./types";

export interface LoginPayload {
  login: string;
  password: string;
  device_name: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
}

/**
 * Response of `/login` and `/register` (AuthController): `{ user, token }`.
 * The optional `access_token` / `data.token` members are kept because
 * AuthContext defensively reads all three token locations.
 */
export interface AuthResponse {
  user: User;
  token: string;
  access_token?: string;
  data?: { token?: string };
}

export const authApi = {
  register: (payload: RegisterPayload) => apiClient.post<AuthResponse>("/register", payload),
  login: (payload: LoginPayload) => apiClient.post<AuthResponse>("/login", payload),
  logout: () => apiClient.post("/logout"),
  // UserResource wraps the payload in `{ data: ... }`; AuthContext also tolerates an unwrapped user.
  me: () => apiClient.get<User | { data: User }>("/user"),
  verifyEmail: (payload: { token: string }) => apiClient.post("/verify-email", payload),
  resendVerification: () => apiClient.post("/verify-email/resend"),
  forgotPassword: (payload: { email: string }) => apiClient.post("/forgot-password", payload),
  resetPassword: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => apiClient.post("/reset-password", payload),
};
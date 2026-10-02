import apiClient from "./client";
import type { User } from "./types";

export interface ProfilePayload {
  first_name?: string;
  last_name?: string;
  username?: string;
  country?: string;
  preferred_language?: string;
  is_private?: boolean;
  avatar_id?: string | null;
}

export interface RequestEmailChangePayload {
  current_password: string;
  new_email: string;
}

export interface EmailChangeState {
  id: string;
  new_email: string;
  current_email: string;
  new_email_verified_at: string | null;
  current_email_verified_at: string | null;
  expires_at: string;
  completed_at: string | null;
}

export interface EmailChangeResponse {
  change: EmailChangeState | null;
}

export interface EmailChangeVerifyResponse {
  message: string;
  change: EmailChangeState | null;
  user?: User;
}

export const settingsApi = {
  updateProfile: (id: number, payload: ProfilePayload) =>
    apiClient.put<User>(`/users/${id}`, payload),
  getEmailChange: () => apiClient.get<EmailChangeResponse>("/email-change"),
  requestEmailChange: (payload: RequestEmailChangePayload) =>
    apiClient.post<{ message: string; change: EmailChangeState }>("/email-change", payload),
  verifyNewEmail: (payload: { token: string }) =>
    apiClient.post<EmailChangeVerifyResponse>("/email-change/verify/new-email", payload),
  verifyCurrentEmail: (payload: { token: string }) =>
    apiClient.post<EmailChangeVerifyResponse>("/email-change/verify/current-email", payload),
  cancelEmailChange: () => apiClient.post<{ message: string }>("/email-change/cancel"),
};
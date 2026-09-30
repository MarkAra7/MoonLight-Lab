import apiClient from "./client";
import type { User } from "./types";

/** Payload for UserController::update (`PUT /users/{id}`). All fields optional. */
export interface ProfilePayload {
  first_name?: string;
  last_name?: string;
  username?: string;
  country?: string;
  preferred_language?: string;
  is_private?: boolean;
  /** Media file_id to attach as the avatar, or null to detach the current one. */
  avatar_id?: string | null;
}

/** Payload for EmailChangeController::store (`POST /email-change`). */
export interface RequestEmailChangePayload {
  current_password: string;
  new_email: string;
}

/** A pending email-change request as returned by EmailChangeController. */
export interface EmailChangeState {
  id: string;
  new_email: string;
  current_email: string;
  new_email_verified_at: string | null;
  current_email_verified_at: string | null;
  expires_at: string;
  completed_at: string | null;
}

/** Response of EmailChangeController::show (`GET /email-change`). */
export interface EmailChangeResponse {
  change: EmailChangeState | null;
}

/**
 * Response of EmailChangeController::verifyNewEmail and
 * EmailChangeController::verifyCurrentEmail. `user` is present on both, and is
 * bare (UserResource::withoutWrapping() is set in AppServiceProvider).
 */
export interface EmailChangeVerifyResponse {
  message: string;
  change: EmailChangeState | null;
  user?: User;
}

export const settingsApi = {
  /** UserController::update (`PUT /users/{id}`). Returns a bare user. */
  updateProfile: (id: number, payload: ProfilePayload) =>
    apiClient.put<User>(`/users/${id}`, payload),
  /** EmailChangeController::show (`GET /email-change`). */
  getEmailChange: () => apiClient.get<EmailChangeResponse>("/email-change"),
  /** EmailChangeController::store (`POST /email-change`). */
  requestEmailChange: (payload: RequestEmailChangePayload) =>
    apiClient.post<{ message: string; change: EmailChangeState }>("/email-change", payload),
  /** EmailChangeController::verifyNewEmail (`POST /email-change/verify/new-email`). */
  verifyNewEmail: (payload: { token: string }) =>
    apiClient.post<EmailChangeVerifyResponse>("/email-change/verify/new-email", payload),
  /** EmailChangeController::verifyCurrentEmail (`POST /email-change/verify/current-email`). */
  verifyCurrentEmail: (payload: { token: string }) =>
    apiClient.post<EmailChangeVerifyResponse>("/email-change/verify/current-email", payload),
  /** EmailChangeController::cancel (`POST /email-change/cancel`). */
  cancelEmailChange: () => apiClient.post<{ message: string }>("/email-change/cancel"),
};
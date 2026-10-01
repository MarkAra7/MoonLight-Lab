import apiClient from "./client";
import type { User } from "./types";

export const usersApi = {
  /**
   * Public profile of any user (`GET /users/profile/{username}`).
   *
   * Non-owners never receive `email` / `email_verified_at`; a private profile
   * answers 403 and an unknown username answers 404.
   */
  publicProfile: (username: string) => apiClient.get<User>(`/users/profile/${username}`),
};

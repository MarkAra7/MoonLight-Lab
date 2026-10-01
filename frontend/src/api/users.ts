import apiClient from "./client";
import type { Paged, User } from "./types";

export const usersApi = {
  /**
   * Public profile of any user (`GET /users/profile/{username}`).
   *
   * Non-owners never receive `email` / `email_verified_at`; a private profile
   * answers 403 and an unknown username answers 404.
   */
  publicProfile: (username: string) => apiClient.get<User>(`/users/profile/${username}`),

  /**
   * Public people search (`GET /users/search`), paginated like every other
   * list endpoint. Rows are the public profile shape — `email` and
   * `email_verified_at` are never present, so `User` keeps them optional and
   * nothing in the UI may rely on them here. An empty `q` answers with an
   * empty page.
   */
  search: (q: string, page?: number) =>
    apiClient.get<Paged<User>>("/users/search", { params: { q, page } }),
};
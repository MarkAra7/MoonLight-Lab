import apiClient from "./client";
import type { Paged, User } from "./types";

export const usersApi = {
  publicProfile: (username: string) => apiClient.get<User>(`/users/profile/${username}`),

  search: (q: string, page?: number) =>
    apiClient.get<Paged<User>>("/users/search", { params: { q, page } }),
};
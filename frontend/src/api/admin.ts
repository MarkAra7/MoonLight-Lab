import apiClient from "./client";
import type { Paged, Role, User } from "./types";

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: number;
}

export const adminApi = {
  users: (params: { q?: string; page?: number } = {}) =>
    apiClient.get<Paged<User>>("/users", { params }),

  roles: () => apiClient.get<Role[]>("/admin/roles"),

  createUser: (payload: CreateUserPayload) => apiClient.post<User>("/users", payload),

  updateRole: (id: number | string, roleId: number) =>
    apiClient.patch<User>(`/users/${id}/role`, { role_id: roleId }),
};

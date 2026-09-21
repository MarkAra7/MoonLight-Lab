import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { apiUrl } from "@/config";

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiUrl(),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const TOKEN_KEY = "token";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
    if (status === 401) {
      tokenStore.clear();
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  const data = (error as { response?: { data?: { message?: string } } } | null | undefined)?.response?.data;
  return data?.message ?? fallback;
}

export default apiClient;
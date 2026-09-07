import axios from "axios";
import { apiUrl } from "@/config";


export const apiClient = axios.create({
  baseURL: apiUrl(),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const TOKEN_KEY = "token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};


apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
    }
    return Promise.reject(error);
  }
);


export function getErrorMessage(error, fallback = "Something went wrong.") {
  return error?.response?.data?.message ?? fallback;
}

export default apiClient;

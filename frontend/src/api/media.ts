import apiClient from "./client";
import type { Media } from "./types";

export const mediaApi = {
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<Media>("/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

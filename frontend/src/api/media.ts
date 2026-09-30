import apiClient from "./client";
import type { Media } from "./types";

/**
 * Media endpoints (MediaController).
 *
 * `uploadPhoto` posts a single `file` field to `POST /media` and resolves with
 * the created `Media` record — callers read `data.file_id` and pass it to
 * `settingsApi.updateProfile(id, { avatar_id })`.
 *
 * The shared axios instance in `./client` sets a default
 * `Content-Type: application/json`, which would make axios JSON-encode the
 * FormData instead of streaming it as multipart. The multipart header is
 * therefore required per request.
 */
export const mediaApi = {
  /** MediaController::store (`POST /media`). Sends the file as multipart/form-data. */
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<Media>("/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

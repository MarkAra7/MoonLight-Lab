/** Shared, generic helper functions used across the app. */

/** Format a date string into a localized, human-readable date. */
export function formatDate(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/** Shorten text to a maximum length, appending an ellipsis. */
export function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Build a full URL for backend-hosted media. */
export function mediaUrl(path: string | null | undefined, storageBaseUrl = "/storage"): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${storageBaseUrl}/${path}`.replace(/\/+/g, "/");
}

export function isAuthorizedUser(): boolean {
  return !!localStorage.getItem("auth_token");
}
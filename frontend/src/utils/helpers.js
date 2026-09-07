/** Shared, generic helper functions used across the app. */

/** Format a date string into a localized, human-readable date. */
export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/** Shorten text to a maximum length, appending an ellipsis. */
export function truncate(text, max = 80) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Build a full URL for backend-hosted media. */
export function mediaUrl(path, storageBaseUrl = "/storage") {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${storageBaseUrl}/${path}`.replace(/\/+/g, "/");
}
export function isAuthorizedUser() {
  return !!localStorage.getItem("auth_token");
}

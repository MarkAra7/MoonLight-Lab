export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api",

  apiVersion: "v1",

  storageBaseUrl: (import.meta.env.VITE_STORAGE_BASE_URL as string | undefined) ?? "/storage",

  appName: "MoonLight Lab",
};

export const apiUrl = (path = ""): string => {
  const base = `${config.apiBaseUrl}/${config.apiVersion}`.replace(/\/+$/, "");
  return `${base}/${path}`.replace(/([^:])\/+/g, "$1/");
};
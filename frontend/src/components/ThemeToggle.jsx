import { useEffect, useState } from "react";

const THEME_KEY = "theme";
const SAVED = { light: "light", dark: "dark" };

function savedMode() {
  try {
    const mode = localStorage.getItem(THEME_KEY);
    return mode === SAVED.dark || mode === SAVED.light ? mode : "auto";
  } catch {
    return "auto";
  }
}

function isDark(mode) {
  return (
    mode === SAVED.dark ||
    (mode === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="hidden h-5 w-5 dark:block"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 dark:hidden"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(() => isDark(savedMode()));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const syncFromSystem = () => {
      if (savedMode() === "auto") setDark(mq.matches);
    };
    syncFromSystem();
    mq.addEventListener("change", syncFromSystem);
    return () => mq.removeEventListener("change", syncFromSystem);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === THEME_KEY) setDark(isDark(savedMode()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? SAVED.dark : SAVED.light);
    } catch {
      // ignore — theme still applies for this session
    }
  };

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={`rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:text-slate-300 dark:hover:bg-white/5 dark:focus:ring-white/10 ${className}`}
    >
      <SunIcon />
      <MoonIcon />
    </button>
  );
}
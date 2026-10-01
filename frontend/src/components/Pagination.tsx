import type { ReactNode } from "react";

export interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

type PageItem = number | "gap";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

const idleButton =
  "border-slate-200 bg-white text-slate-600 hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400";

const activeButton =
  "border-sky-500 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-400 dark:text-slate-900";

function pageItems(currentPage: number, lastPage: number): PageItem[] {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  const wanted = [1, currentPage - 1, currentPage, currentPage + 1, lastPage];
  const items: PageItem[] = [];
  let previous = 0;

  for (const page of wanted) {
    if (page < 1 || page > lastPage || page === previous) continue;
    if (previous !== 0 && page - previous > 1) items.push("gap");
    items.push(page);
    previous = page;
  }

  return items;
}

export function Pagination({ currentPage, lastPage, onPageChange, className = "" }: PaginationProps) {
  if (lastPage <= 1) return null;

  const arrowButton =
    `inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600 dark:disabled:hover:border-white/10 dark:disabled:hover:bg-white/[0.03] dark:disabled:hover:text-slate-300 ${focusRing}`;

  const chevron = (direction: "left" | "right"): ReactNode => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M15.75 19.5 8.25 12l7.5-7.5" : "m8.25 4.5 7.5 7.5-7.5 7.5"}
      />
    </svg>
  );

  return (
    <nav
      aria-label="Pagination"
      className={`glass-moon flex flex-wrap items-center justify-center gap-1.5 px-3 py-2.5 ${className}`}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`${arrowButton} ${idleButton}`}
      >
        {chevron("left")}
        <span className="hidden sm:inline">Prev</span>
      </button>

      {pageItems(currentPage, lastPage).map((item, index) =>
        item === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-sm font-bold text-slate-400 dark:text-slate-500"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-sm font-bold transition-colors ${focusRing} ${
              item === currentPage ? activeButton : idleButton
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange(currentPage + 1)}
        className={`${arrowButton} ${idleButton}`}
      >
        <span className="hidden sm:inline">Next</span>
        {chevron("right")}
      </button>
    </nav>
  );
}
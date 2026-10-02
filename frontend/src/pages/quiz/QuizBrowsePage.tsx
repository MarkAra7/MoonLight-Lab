import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getErrorMessage } from "@/api";
import { miscApi } from "@/api/misc";
import { quizApi } from "@/api/quiz";
import { Pagination } from "@/components/Pagination";
import { QuizCard } from "@/components/QuizCard";
import type { Quiz } from "@/api/types";

interface PageCursor {
  key: string;
  page: number;
}

function readCategoryName(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;

  const outer = payload as Record<string, unknown>;
  const direct = outer.name;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const nested = outer.data;
  if (typeof nested === "object" && nested !== null) {
    const inner = (nested as Record<string, unknown>).name;
    if (typeof inner === "string" && inner.trim()) return inner.trim();
  }

  return null;
}

export function QuizBrowsePage() {
  const [searchParams] = useSearchParams();
  const category = (searchParams.get("category") ?? "").trim();
  const search = (searchParams.get("search") ?? "").trim();
  const filterKey = `${category}|${search}`;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [cursor, setCursor] = useState<PageCursor>({ key: filterKey, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryState, setCategoryState] = useState<{ id: string; name: string | null }>({
    id: "",
    name: null,
  });

  const page = cursor.key === filterKey ? cursor.page : 1;
  const categoryName = categoryState.id === category ? categoryState.name : null;

  useEffect(() => {
    if (!category) return;
    let active = true;

    (async () => {
      try {
        const { data } = await miscApi.category(category);
        if (!active) return;
        setCategoryState({ id: category, name: readCategoryName(data) });
      } catch (err) {
        if (!active) return;
        console.error("Failed to load category:", err);
        setCategoryState({ id: category, name: null });
      }
    })();

    return () => {
      active = false;
    };
  }, [category]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await quizApi.list({ category: category || undefined, search: search || undefined, page });
        if (!active) return;
        setQuizzes(data.data);
        setMeta({ currentPage: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total });
      } catch (err) {
        if (!active) return;
        console.error("Failed to load quizzes:", err);
        setQuizzes([]);
        setError(getErrorMessage(err, "Could not load quizzes right now."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [category, search, page]);

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {category ? `${categoryName ?? "Category"} quizzes` : "All quizzes"}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {search ? (
            <>
              Results for{" "}
              <span className="font-semibold text-sky-600 dark:text-sky-400">&ldquo;{search}&rdquo;</span>
              {meta.total > 0 ? ` — ${meta.total} match${meta.total === 1 ? "" : "es"}` : null}
            </>
          ) : (
            "Browse everything published on MoonLight Lab."
          )}
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="glass-moon w-full p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No quizzes found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.quiz_id} quiz={quiz} />
            ))}
          </div>
          <Pagination
            currentPage={meta.currentPage}
            lastPage={meta.lastPage}
            onPageChange={(next) => setCursor({ key: filterKey, page: next })}
          />
        </div>
      )}
    </div>
  );
}
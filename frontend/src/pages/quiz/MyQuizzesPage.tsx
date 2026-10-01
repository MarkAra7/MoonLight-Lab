import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { quizApi } from "@/api/quiz";
import { useAuth } from "@/context/AuthContext";
import { Pagination } from "@/components/Pagination";
import { QuizCard } from "@/components/QuizCard";
import type { Quiz } from "@/api/types";

function StatusBadge({ status }: { status?: string | null }) {
  const label = status?.trim() ? status.trim() : "Draft";
  const published = label.toLowerCase() === "published";

  return (
    <Badge color={published ? "success" : "gray"} size="sm" className="whitespace-nowrap">
      {published ? "Published" : "Draft"}
    </Badge>
  );
}

export function MyQuizzesPage() {
  const { user, loading } = useAuth();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      setQuizzesLoading(true);
      setError(null);
      try {
        const { data } = await quizApi.myQuizzes(page);
        if (!active) return;
        setQuizzes(data.data);
        setMeta({ currentPage: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total });
      } catch (err) {
        if (!active) return;
        console.error("Failed to load my quizzes:", err);
        setQuizzes([]);
        setError(getErrorMessage(err, "Could not load your quizzes right now."));
      } finally {
        if (active) setQuizzesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, page]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md justify-center">
        <div className="glass-moon w-full p-10 text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">My quizzes</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            You need to be signed in to see the quizzes you created.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">My quizzes</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {meta.total} quiz{meta.total === 1 ? "" : "zes"} created by you.
        </p>
      </header>

      {quizzesLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="glass-moon w-full p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            You haven&apos;t created any quizzes yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div key={quiz.quiz_id} className="flex flex-col">
                <div className="mb-2.5 flex justify-end">
                  <StatusBadge status={quiz.quiz_status?.status} />
                </div>
                <div className="flex flex-1">
                  <QuizCard quiz={quiz} showAuthorLink={false} />
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={meta.currentPage}
            lastPage={meta.lastPage}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
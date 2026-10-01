import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { quizApi } from "@/api/quiz";
import { usersApi } from "@/api/users";
import { Pagination } from "@/components/Pagination";
import { QuizCard } from "@/components/QuizCard";
import { mediaUrl } from "@/utils/helpers";
import type { Quiz, User } from "@/api/types";

const linkFocusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

/** Page cursor kept next to the term it belongs to, so a new `q` restarts at page 1. */
interface PageCursor {
  q: string;
  page: number;
}

/** One hit of `GET /users/search` — a public profile, so no email. */
function PersonCard({ person }: { person: User }) {
  const avatar = person.avatar ? mediaUrl(person.avatar.file_path ?? person.avatar.url) : "";
  const initial =
    person.first_name?.trim() ||
    person.name?.trim() ||
    person.username?.trim() ||
    "";

  return (
    <Link
      to={`/users/${person.username}`}
      aria-label={`View ${person.name ?? person.username}'s profile`}
      className={`glass-moon flex items-center gap-4 p-5 no-underline transition-all duration-300 hover:border-sky-500/20 hover:shadow-lg dark:hover:shadow-xl ${linkFocusRing}`}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={person.name ?? person.username ?? undefined}
          className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-4 ring-sky-400/30 dark:ring-sky-400/20"
        />
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg font-black text-sky-600 ring-4 ring-sky-400/30 dark:bg-sky-900/40 dark:text-sky-400 dark:ring-sky-400/20">
          {initial.charAt(0).toUpperCase() || "?"}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-bold text-slate-900 dark:text-white">
            @{person.username}
          </span>
          {person.is_verified && (
            <Badge color="success" size="sm">
              Verified
            </Badge>
          )}
        </div>
        {person.name && (
          <span className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">
            {person.name}
          </span>
        )}
        {person.role?.title && (
          <span className="w-fit">
            <Badge color="info" size="sm">
              {person.role.title}
            </Badge>
          </span>
        )}
      </div>
    </Link>
  );
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const [people, setPeople] = useState<User[]>([]);
  const [peopleMeta, setPeopleMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [peopleCursor, setPeopleCursor] = useState<PageCursor>({ q: "", page: 1 });
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizMeta, setQuizMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [quizCursor, setQuizCursor] = useState<PageCursor>({ q: "", page: 1 });
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);

  const peoplePage = peopleCursor.q === q ? peopleCursor.page : 1;
  const quizPage = quizCursor.q === q ? quizCursor.page : 1;

  useEffect(() => {
    if (!q) return;
    let active = true;

    (async () => {
      setPeopleLoading(true);
      setPeopleError(null);
      try {
        const { data } = await usersApi.search(q, peoplePage);
        if (!active) return;
        setPeople(data.data);
        setPeopleMeta({ currentPage: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total });
      } catch (err) {
        if (!active) return;
        console.error("Failed to search users:", err);
        setPeople([]);
        setPeopleError(getErrorMessage(err, "Could not load people right now."));
      } finally {
        if (active) setPeopleLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [q, peoplePage]);

  useEffect(() => {
    if (!q) return;
    let active = true;

    (async () => {
      setQuizzesLoading(true);
      setQuizzesError(null);
      try {
        const { data } = await quizApi.list({ search: q, page: quizPage });
        if (!active) return;
        setQuizzes(data.data);
        setQuizMeta({ currentPage: data.meta.current_page, lastPage: data.meta.last_page, total: data.meta.total });
      } catch (err) {
        if (!active) return;
        console.error("Failed to search quizzes:", err);
        setQuizzes([]);
        setQuizzesError(getErrorMessage(err, "Could not load quizzes right now."));
      } finally {
        if (active) setQuizzesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [q, quizPage]);

  if (!q) {
    return (
      <div className="glass-moon mx-auto w-full max-w-xl p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
          Type something to search
        </h1>
        <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          Search for people by name or username, and for quizzes by title or description.
        </p>
      </div>
    );
  }

  const firstLoad =
    peopleLoading && quizzesLoading && !peopleError && !quizzesError && people.length === 0 && quizzes.length === 0;

  if (firstLoad) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Search</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Results for <span className="font-semibold text-sky-600 dark:text-sky-400">&ldquo;{q}&rdquo;</span>
        </p>
      </header>

      <section>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">People</h2>
          {!peopleError && (
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {peopleMeta.total} found
            </span>
          )}
        </div>

        {peopleLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : peopleError ? (
          <div className="glass-moon w-full p-6 text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{peopleError}</p>
          </div>
        ) : people.length === 0 ? (
          <div className="glass-moon w-full p-12 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No people match &ldquo;{q}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
            <Pagination
              currentPage={peopleMeta.currentPage}
              lastPage={peopleMeta.lastPage}
              onPageChange={(page) => setPeopleCursor({ q, page })}
            />
          </div>
        )}
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quizzes</h2>
          {!quizzesError && (
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {quizMeta.total} found
            </span>
          )}
        </div>

        {quizzesLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : quizzesError ? (
          <div className="glass-moon w-full p-6 text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{quizzesError}</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="glass-moon w-full p-12 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No quizzes match &ldquo;{q}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <QuizCard key={quiz.quiz_id} quiz={quiz} />
              ))}
            </div>
            <Pagination
              currentPage={quizMeta.currentPage}
              lastPage={quizMeta.lastPage}
              onPageChange={(page) => setQuizCursor({ q, page })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
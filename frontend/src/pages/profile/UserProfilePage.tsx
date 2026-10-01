import { useCallback, useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { quizApi } from "@/api/quiz";
import { usersApi } from "@/api/users";
import { useAuth } from "@/context/AuthContext";
import { QuizCard } from "@/components/QuizCard";
import { formatDate, mediaUrl } from "@/utils/helpers";
import type { Quiz, User } from "@/api/types";

/** Terminal UI states that replace the whole page body. */
type ViewState =
  | { kind: "loading" }
  | { kind: "private" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; profile: User };

/** Read the HTTP status off an axios rejection; `undefined` for anything else. */
function statusOf(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function avatarLetter(user: User | null): string {
  const source =
    user?.first_name?.trim() ||
    user?.name?.trim() ||
    user?.username?.trim() ||
    "";
  return source.charAt(0).toUpperCase() || "?";
}

function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
      <span className="text-sky-600 dark:text-sky-400" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
  );
}

const GlobeIcon = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3M3.6 9h16.8M3.6 15h16.8"
    />
  </svg>
);

const LanguageIcon = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 20h10m-10 0l1.5-4.5M17 20l-1.5-4.5M3 12l18-8-5 16M3 12l3 4 5-16"
    />
  </svg>
);

const CalendarIcon = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const LockIcon = (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M6 10.5h12A2.25 2.25 0 0120.25 12.75v6A2.25 2.25 0 0118 21H6a2.25 2.25 0 01-2.25-2.25v-6A2.25 2.25 0 016 10.5z"
    />
  </svg>
);

const UserMissingIcon = (
  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();

  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [quizzesError, setQuizzesError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!username) return;
    let active = true;

    (async () => {
      setView({ kind: "loading" });
      try {
        const { data } = await usersApi.publicProfile(username);
        if (!active) return;
        setView({ kind: "ready", profile: data });

        // Quizzes are supporting content: a failure here keeps the profile
        // readable instead of discarding it.
        try {
          const list = await quizApi.list({ author: username });
          if (!active) return;
          setQuizzes(list.data);
          setQuizzesError(null);
        } catch (err) {
          if (!active) return;
          console.error("Failed to fetch author quizzes:", err);
          setQuizzes([]);
          setQuizzesError(getErrorMessage(err, "Could not load this user's quizzes."));
        } finally {
          if (active) setQuizzesLoading(false);
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to fetch public profile:", err);
        const status = statusOf(err);
        if (status === 403) setView({ kind: "private" });
        else if (status === 404) setView({ kind: "missing" });
        else setView({ kind: "error", message: getErrorMessage(err, "Could not load this profile.") });
      }
    })();

    return () => {
      active = false;
    };
  }, [username, attempt]);

  if (view.kind === "loading") {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (view.kind === "private") {
    return (
      <div className="flex w-full justify-center">
        <div className="glass-moon w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400">
            {LockIcon}
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            This profile is private
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            When a profile is private, other users can&apos;t view it at all.
          </p>
        </div>
      </div>
    );
  }

  if (view.kind === "missing") {
    return (
      <div className="flex w-full justify-center">
        <div className="glass-moon w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
            {UserMissingIcon}
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">User not found</h1>
          <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            We couldn&apos;t find a profile for{" "}
            <span className="font-semibold text-sky-600 dark:text-sky-400">@{username}</span>.
          </p>
        </div>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="flex w-full justify-center">
        <div className="glass-moon w-full max-w-md p-10 text-center">
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mb-8 text-sm font-medium leading-relaxed text-red-600 dark:text-red-400">
            {view.message}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { profile } = view;
  const isOwner = Boolean(user && profile.id === user.id);
  const displayName = profile.name?.trim() || profile.username || "";
  const avatar = profile.avatar ? mediaUrl(profile.avatar.file_path ?? profile.avatar.url) : "";
  const questions = quizzes.reduce((sum, quiz) => sum + (quiz.questions_count ?? 0), 0);
  const views = quizzes.reduce((sum, quiz) => sum + (quiz.views ?? 0), 0);

  const stats: { label: string; value: number }[] = [
    { label: "Quizzes", value: quizzes.length },
    { label: "Questions", value: questions },
    { label: "Views", value: views },
  ];

  return (
    <div className="flex w-full flex-col">
      <section className="glass-moon w-full p-8 sm:p-10">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="h-28 w-28 flex-shrink-0 rounded-full object-cover ring-4 ring-sky-400/30 shadow-xl dark:ring-sky-400/20 dark:shadow-sky-500/25"
            />
          ) : (
            <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-4xl font-black text-sky-600 ring-4 ring-sky-400/30 dark:bg-sky-900/40 dark:text-sky-400 dark:ring-sky-400/20">
              {avatarLetter(profile)}
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col items-center gap-4 sm:items-start">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {profile.role?.title && (
                <Badge color="info" className="whitespace-nowrap">
                  {profile.role.title}
                </Badge>
              )}
              {profile.is_verified && <Badge color="success">Verified</Badge>}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                @{profile.username}
              </h1>
              {profile.name && (
                <p className="mt-1 truncate text-base font-semibold text-slate-600 dark:text-slate-300">
                  {profile.name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
              {profile.country && <MetaItem icon={GlobeIcon}>{profile.country}</MetaItem>}
              {profile.preferred_language && (
                <MetaItem icon={LanguageIcon}>{profile.preferred_language}</MetaItem>
              )}
              {profile.created_at && (
                <MetaItem icon={CalendarIcon}>
                  Joined {formatDate(profile.created_at, { month: "long", year: "numeric" })}
                </MetaItem>
              )}
            </div>

            {isOwner && (
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <Link
                  to="/settings"
                  className="inline-flex items-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
                >
                  Edit profile
                </Link>
                {profile.is_private && (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Only you can see this profile.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-moon px-6 py-5 text-center">
            <p className="text-3xl font-black text-sky-600 dark:text-sky-400">{stat.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
          Quizzes by {displayName || profile.username}
        </h2>

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
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No quizzes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.quiz_id} quiz={quiz} showAuthorLink={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

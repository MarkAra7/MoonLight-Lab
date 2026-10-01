import { Link } from "react-router-dom";
import { Badge } from "flowbite-react";
import { mediaUrl, truncate } from "@/utils/helpers";
import type { Quiz } from "@/api/types";

export interface QuizCardProps {
  quiz: Quiz;
  /**
   * When false (or when the author has no username) the author row renders as
   * plain text instead of a link — used on an author's own profile page, where
   * linking back to the profile you are already on is noise.
   */
  showAuthorLink?: boolean;
}

const linkFocusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

export function QuizCard({ quiz, showAuthorLink = true }: QuizCardProps) {
  const cover = mediaUrl(quiz.media?.file_path ?? quiz.media?.url);
  const authorAvatar = mediaUrl(quiz.author?.avatar?.file_path ?? quiz.author?.avatar?.url);
  const authorUsername = quiz.author?.username;
  const showAuthorProfileLink = showAuthorLink && Boolean(authorUsername);

  const authorAvatarNode = authorAvatar ? (
    <img
      src={authorAvatar}
      alt={quiz.author?.name ?? undefined}
      className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
      {quiz.author?.name?.charAt(0).toUpperCase()}
    </div>
  );

  const authorNameNode = (
    <span className="truncate text-sm text-slate-600 dark:text-slate-400">
      {quiz.author?.name ?? quiz.author?.username}
    </span>
  );

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-sky-500/20 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-sky-500/20 dark:hover:shadow-xl">
      <Link
        to={`/quizzes/${quiz.quiz_id}`}
        className={`flex flex-1 flex-col no-underline ${linkFocusRing}`}
      >
        {cover && (
          <img
            src={cover}
            alt={quiz.title}
            className="mb-4 h-40 w-full rounded-xl object-cover"
          />
        )}
        <h3 className="mb-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
          {quiz.title}
        </h3>
        {quiz.description && (
          <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {truncate(quiz.description, 120)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {quiz.category && (
            <Badge color="info" size="sm">
              {quiz.category.name}
            </Badge>
          )}
          <Badge color="gray" size="sm">
            {quiz.questions_count ?? 0} questions
          </Badge>
        </div>
      </Link>

      {quiz.author && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
          {showAuthorProfileLink && authorUsername ? (
            <Link
              to={`/users/${authorUsername}`}
              aria-label={`View ${quiz.author.name ?? authorUsername}'s profile`}
              className={`flex items-center gap-2 rounded-lg no-underline transition-colors hover:bg-sky-500/5 dark:hover:bg-sky-400/10 ${linkFocusRing}`}
            >
              {authorAvatarNode}
              {authorNameNode}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {authorAvatarNode}
              {authorNameNode}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

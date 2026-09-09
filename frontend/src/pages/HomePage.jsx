import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/api";
import { quizApi } from "@/api/quiz";
import { miscApi } from "@/api/misc";
import { mediaUrl, truncate } from "@/utils/helpers";
const features = [
  {
    id: "teachers",
    char: "A",
    title: "For Teachers",
    tagline: "Save hours. Teach smarter.",
    points: [
      "Create engaging quizzes in seconds",
      "Auto-grade & track student progress",
      "Assign personalized learning paths",
    ],
  },
  {
    id: "students",
    char: "B",
    title: "For Students",
    tagline: "Learn faster. Have fun.",
    points: [
      "Turn study time into a game",
      "Compete on live leaderboards",
      "Retain more with spaced repetition",
    ],
  },
  {
    id: "individuals",
    char: "C",
    title: "For Individuals",
    tagline: "Feed your curiosity.",
    points: [
      "Challenge yourself daily",
      "Build streaks & earn achievements",
      "Master any topic at your own pace",
    ],
  },
];

export function HomePage() {
  const { user, loading } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const categoryScrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const el = categoryScrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScroll - 1);
  }, []);

  const scrollCategories = useCallback(
    (direction) => {
      const el = categoryScrollerRef.current;
      if (!el) return;
      const amount = direction === "left" ? -280 : 280;
      el.scrollBy({ left: amount, behavior: "smooth" });
    },
    [updateScrollArrows]
  );

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setQuizzesLoading(true);
        const response = await quizApi.list();
        setQuizzes(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
        console.error("Failed to fetch quizzes:", err);
      } finally {
        setQuizzesLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await miscApi.categories();
        setCategories(response.data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchQuizzes();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    const el = categoryScrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollArrows, { passive: true });
    window.addEventListener("resize", updateScrollArrows);
    updateScrollArrows();
    return () => {
      el.removeEventListener("scroll", updateScrollArrows);
      window.removeEventListener("resize", updateScrollArrows);
    };
  }, [categories, updateScrollArrows]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-col items-center pb-16 pt-12 text-center">
        <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-2">
          <span className="text-sm font-semibold tracking-wide text-sky-600 dark:text-sky-400">
            The smart way to learn anything
          </span>
        </div>

        <h1 className="mb-6 max-w-4xl text-5xl font-black leading-[1.05] tracking-tight text-slate-900 dark:text-white lg:text-7xl">
          Turn Knowledge Into{" "}
          <span className="bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent dark:from-sky-400 dark:to-cyan-300">
            Confidence
          </span>
          <br />
          <span className="text-slate-500 dark:text-slate-400">
            One Quiz at a Time
          </span>
        </h1>

        <p className="mb-12 max-w-xl text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-400">
          Whether you&apos;re teaching a class, leveling up your skills, or
          just love a good challenge —{" "}
          <span className="font-semibold text-sky-600 dark:text-sky-400">
            MoonLight Lab
          </span>{" "}
          makes learning irresistible.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-xl dark:bg-sky-400 dark:text-slate-900 dark:shadow-sky-500/25 dark:hover:bg-sky-300"
          >
            Start Creating Free
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Explore Quizzes
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="group rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:border-sky-500/20 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-sky-500/20 dark:hover:bg-white/[0.04]"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 transition-all duration-300 group-hover:scale-105">
              <span className="text-lg font-black text-sky-600 dark:text-sky-400">
                {feature.char}
              </span>
            </div>
            <h3 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">
              {feature.title}
            </h3>
            <p className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">
              {feature.tagline}
            </p>
            <ul className="space-y-2.5">
              {feature.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500/60 dark:bg-sky-400/60" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Categories strip */}
      {categories.length > 0 && (
        <div className="mt-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Browse by Category
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Explore quizzes by topic
            </p>
          </div>

          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scrollCategories("left")}
                className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-md transition-colors hover:border-sky-500/30 hover:bg-slate-50 dark:border-white/10 dark:bg-white/80 dark:text-slate-800 dark:hover:border-sky-500/30 dark:hover:bg-white"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                aria-label="Scroll categories right"
                onClick={() => scrollCategories("right")}
                className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-md transition-colors hover:border-sky-500/30 hover:bg-slate-50 dark:border-white/10 dark:bg-white/80 dark:text-slate-800 dark:hover:border-sky-500/30 dark:hover:bg-white"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            )}

            <div
              ref={categoryScrollerRef}
              className="scrollbar-dark flex w-full gap-4 overflow-x-auto px-12 pb-4"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(148,163,184,0.5) transparent" }}
            >
              {categories.map((category) => (
                <Link
                  key={category.category_id}
                  to={`/quizzes?category=${category.category_id}`}
                  className="group relative flex w-36 flex-shrink-0 flex-col items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-300 hover:border-sky-500/20 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-sky-500/20"
                >
                {category.media?.file_path ? (
                  <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl">
                    <img
                      src={`/storage/${category.media.file_path}`}
                      alt={category.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <span className="text-lg font-black">
                      {category.name?.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="mb-1 text-sm font-bold text-slate-900 group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
                  {category.name}
                </span>
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {category.quizzes_count ?? 0} quizzes
                </span>
              </Link>
            ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-10">
        {quizzesLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            No quizzes available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.quiz_id}
                to={`/quizzes/${quiz.quiz_id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-sky-500/20 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-sky-500/20"
              >
                {mediaUrl(quiz.media?.file_path ?? quiz.media?.url) && (
                  <img
                    src={mediaUrl(quiz.media?.file_path ?? quiz.media?.url)}
                    alt={quiz.title}
                    className="mb-4 h-40 w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="mb-2 text-lg font-bold text-slate-900 group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
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
                    {quiz.questions_count} questions
                  </Badge>
                </div>
                {quiz.author && (
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                    {quiz.author.avatar && mediaUrl(quiz.author.avatar.file_path ?? quiz.author.avatar.url) ? (
                      <img
                        src={mediaUrl(quiz.author.avatar.file_path ?? quiz.author.avatar.url)}
                        alt={quiz.author.name}
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                        {quiz.author.name?.charAt(0)}
                      </div>
                    )}
                    <span className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {quiz.author.name}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Badge, Button } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";

const features = [
  {
    id: "teachers",
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
                {feature.title.charAt(0)}
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

      <div className="mt-20 flex w-full justify-center">
        <div className="glass-moon w-full max-w-xl p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Badge size="sm">Auth status</Badge>
            {loading ? (
              <Badge color="gray">Loading…</Badge>
            ) : user ? (
              <Badge color="success">Logged in</Badge>
            ) : (
              <Badge color="warning">Guest</Badge>
            )}
          </div>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            {loading
              ? "Restoring session…"
              : user
                ? `Signed in as ${user.name ?? user.email ?? "user"}.`
                : "You are browsing as a guest. Log in to access the full app."}
          </p>
          <div className="flex justify-center gap-3">
            <Button href="/login" color="blue">
              Log in
            </Button>
            <Button href="/register" color="light">
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
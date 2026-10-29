import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Badge, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { quizApi, type QuizStats } from "@/api/quiz";
import { formatDate } from "@/utils/helpers";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="glass-moon p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

export function QuizStatsPage() {
  const { quizId } = useParams();
  const [data, setData] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!quizId) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: stats } = await quizApi.stats(quizId);
        if (active) setData(stats);
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Could not load the quiz statistics."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [quizId]);

  if (!quizId) {
    return (
      <div className="mx-auto w-full max-w-xl py-12">
        <Alert color="failure">Quiz ID is missing.</Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-12">
        <Alert color="failure">
          {error || "Could not load the quiz statistics."}
        </Alert>
        <Link
          to={quizId ? `/quizzes/${quizId}` : "/my-quizzes"}
          className="text-sm font-bold text-sky-600 hover:underline dark:text-sky-400"
        >
          Back to the quiz
        </Link>
      </div>
    );
  }

  const { quiz, stats, question_stats: questionStats, recent_attempts: recentAttempts } = data;
  const maxBucket = Math.max(
    ...stats.score_distribution.map((bucket) => bucket.count),
    1
  );

  return (
    <div className="w-full max-w-6xl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/quizzes/${quiz.quiz_id}`}
            className="text-sm font-bold text-sky-600 hover:underline dark:text-sky-400"
          >
            ← Back to quiz
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Statistics
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {quiz.title}
            </span>
            {data.category?.name && <span>· {data.category.name}</span>}
            {quiz.difficulty && (
              <Badge color="info" size="sm">
                {quiz.difficulty}
              </Badge>
            )}
            <Badge color={quiz.is_public ? "success" : "gray"} size="sm">
              {quiz.is_public ? "Public" : "Private"}
            </Badge>
          </p>
        </div>
        <Link
          to={`/quizzes/${quiz.quiz_id}/edit`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 no-underline transition-colors hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-sky-400"
        >
          Edit quiz
        </Link>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Views" value={stats.views} />
        <StatCard label="Attempts" value={stats.total_attempts} />
        <StatCard label="Students" value={stats.unique_students} />
        <StatCard
          label="Average"
          value={`${stats.average_percentage}%`}
          hint="score"
        />
        <StatCard
          label="Rating"
          value={stats.rating.count > 0 ? `${stats.rating.average} ★` : "—"}
          hint={`${stats.rating.count} ${stats.rating.count === 1 ? "rating" : "ratings"}`}
        />
        <StatCard label="Comments" value={stats.comments_count} />
      </div>

      <div className="flex flex-col gap-6">
        <section className="glass-moon p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
            Score distribution
          </h2>

          {stats.total_attempts === 0 ? (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No attempts yet, so there is nothing to compare.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.score_distribution.map((bucket) => (
                <div key={bucket.range} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {bucket.range}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className="h-3 rounded-full bg-sky-500 dark:bg-sky-400"
                      style={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                    {bucket.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-moon overflow-x-auto p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
            Questions
          </h2>

          {questionStats.length === 0 ? (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              This quiz does not have any questions yet.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2 pr-4">
                    Question
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Answers
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Correct
                  </th>
                  <th scope="col" className="py-2 pl-4">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {questionStats.map((question) => (
                  <tr key={question.question_id}>
                    <td className="max-w-md py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                      {question.question_text}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {question.total_answers}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {question.correct_count}
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className="h-2 rounded-full bg-sky-500 dark:bg-sky-400"
                            style={{ width: `${question.correct_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {question.correct_percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="glass-moon overflow-x-auto p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
            Recent attempts
          </h2>

          {recentAttempts.length === 0 ? (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Nobody has completed this quiz yet.
            </p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2 pr-4">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Score
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Result
                  </th>
                  <th scope="col" className="py-2 pl-4">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {recentAttempts.map((attempt, index) => (
                  <tr key={`${attempt.student_name}-${index}`}>
                    <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                      {attempt.student_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {attempt.score} / {attempt.total}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={attempt.percentage >= 60 ? "success" : "warning"}
                        size="sm"
                      >
                        {attempt.percentage}%
                      </Badge>
                    </td>
                    <td className="py-3 pl-4 text-slate-600 dark:text-slate-400">
                      {formatDate(attempt.completed_at, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

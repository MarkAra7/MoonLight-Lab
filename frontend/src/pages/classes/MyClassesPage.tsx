import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { classApi } from "@/api/class";
import { useAuth } from "@/context/AuthContext";
import { truncate } from "@/utils/helpers";

const linkFocusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

export interface MyClassSummary {
  id: string;
  name: string;
  description?: string | null;
  assignments_count?: number | null;
  students_count?: number | null;
}

export function MyClassesPage() {
  const { user, loading } = useAuth();

  const [classes, setClasses] = useState<MyClassSummary[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      setClassesLoading(true);
      setError(null);
      try {
        const { data } = await classApi.myClasses();
        if (!active) return;
        setClasses(data);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load my classes:", err);
        setClasses([]);
        setError(getErrorMessage(err, "Could not load your classes right now."));
      } finally {
        if (active) setClassesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

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
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">My classes</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            You need to be signed in to see the classes you joined.
          </p>
          <Link
            to="/login?redirect=%2Fmy-classes"
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
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">My classes</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Classes you joined with an invite link.
        </p>
      </header>

      {classesLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="glass-moon w-full p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            You haven&apos;t joined any classes yet. Open an invite link your teacher shared with you to
            get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((item) => (
            <Link
              key={item.id}
              to={`/my-classes/${item.id}`}
              aria-label={`Open ${item.name}`}
              className={`glass-moon flex flex-col p-6 no-underline transition-all duration-300 hover:border-sky-500/20 hover:shadow-lg dark:hover:shadow-xl ${linkFocusRing}`}
            >
              <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{item.name}</h2>
              {item.description && (
                <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {truncate(item.description, 120)}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Badge color="info" size="sm">
                  {item.assignments_count ?? 0} assignments
                </Badge>
                <Badge color="gray" size="sm">
                  {item.students_count ?? 0} students
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, Badge, Button, Label, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { classApi } from "@/api/class";
import { useAuth } from "@/context/AuthContext";
import { truncate } from "@/utils/helpers";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

const primaryButtonClasses =
  "bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300";

const secondaryButtonClasses =
  "border border-slate-200 bg-white text-slate-700 hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-sky-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-sky-500/30 dark:hover:text-sky-400";

const linkFocusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

export interface TeacherClassSummary {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  code_expires_at?: string | null;
  students_count?: number | null;
  assignments_count?: number | null;
  created_at?: string | null;
}

export function TeacherClassesPage() {
  const { user, loading } = useAuth();

  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setClassesLoading(true);
    setLoadError(null);
    try {
      const { data } = await classApi.teacherIndex();
      setClasses(data);
    } catch (err) {
      console.error("Failed to load classes:", err);
      setClasses([]);
      setLoadError(getErrorMessage(err, "Could not load your classes right now."));
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      setClassesLoading(true);
      setLoadError(null);
      try {
        const { data } = await classApi.teacherIndex();
        if (!active) return;
        setClasses(data);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load classes:", err);
        setClasses([]);
        setLoadError(getErrorMessage(err, "Could not load your classes right now."));
      } finally {
        if (active) setClassesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("A class name is required.");
      return;
    }

    const hours = Number(expiresHours);
    const payload: { name: string; description?: string | null; code_expires_in_hours?: number } = {
      name: name.trim(),
      description: description.trim() || null,
    };
    if (expiresHours.trim() && Number.isFinite(hours) && hours > 0) {
      payload.code_expires_in_hours = Math.round(hours);
    }

    setSubmitting(true);
    setFormError("");
    try {
      await classApi.teacherCreate(payload);
      setName("");
      setDescription("");
      setExpiresHours("");
      setFormOpen(false);
      await load();
    } catch (err) {
      console.error("Failed to create class:", err);
      setFormError(getErrorMessage(err, "Could not create this class."));
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Classes</h1>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            You need to be signed in to manage your classes.
          </p>
          <Link
            to="/login?redirect=%2Fteacher%2Fclasses"
            className="inline-flex items-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const canManage = user.role?.title === "teacher" || user.role?.title === "admin";

  if (!canManage) {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Classes</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          You don&apos;t have access to teacher classes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Classes</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            {classes.length} class{classes.length === 1 ? "" : "es"} you teach.
          </p>
        </div>

        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className={`inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark ${linkFocusRing}`}
          >
            New class
          </button>
        )}
      </header>

      {formOpen && (
        <form onSubmit={handleCreate} className="glass-moon mb-10 w-full p-8">
          <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">New class</h2>
          <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            Students join with the invite link you get after creating the class.
          </p>

          {formError && (
            <Alert color="failure" className="mb-5">
              {formError}
            </Alert>
          )}

          <div className="flex flex-col gap-5">
            <div>
              <Label htmlFor="class-name" className="mb-2">
                Class name
              </Label>
              <input
                id="class-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Biology 101"
                className={inputClasses}
              />
            </div>

            <div>
              <Label htmlFor="class-description" className="mb-2">
                Description
              </Label>
              <textarea
                id="class-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this class covers"
                className={`${inputClasses} resize-y`}
              />
            </div>

            <div className="max-w-xs">
              <Label htmlFor="class-expiry" className="mb-2">
                Invite link expires in (hours)
              </Label>
              <input
                id="class-expiry"
                type="number"
                min={1}
                max={8760}
                value={expiresHours}
                onChange={(event) => setExpiresHours(event.target.value)}
                placeholder="24"
                className={inputClasses}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className={primaryButtonClasses}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating…
                  </>
                ) : (
                  "Create class"
                )}
              </Button>
              <Button
                type="button"
                color="light"
                onClick={() => {
                  setFormOpen(false);
                  setFormError("");
                }}
                className={secondaryButtonClasses}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {classesLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      ) : loadError ? (
        <div className="glass-moon w-full p-6 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="glass-moon w-full p-12 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            You haven&apos;t created any classes yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((item) => (
            <Link
              key={item.id}
              to={`/teacher/classes/${item.id}`}
              aria-label={`Manage ${item.name}`}
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
                  {item.students_count ?? 0} students
                </Badge>
                <Badge color="gray" size="sm">
                  {item.assignments_count ?? 0} assignments
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
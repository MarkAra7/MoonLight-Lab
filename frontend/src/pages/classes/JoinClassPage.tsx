import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { classApi, type ClassLookup } from "@/api/class";
import { useAuth } from "@/context/AuthContext";

const linkButton =
  "inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-moon-dark";

type ViewState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "ready"; class: ClassLookup }
  | { kind: "joined"; name: string };

export function JoinClassPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();

  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    let active = true;

    (async () => {
      setView({ kind: "loading" });
      try {
        const { data } = await classApi.lookup(code);
        if (!active) return;
        setView({ kind: "ready", class: data });
      } catch (err) {
        if (!active) return;
        console.error("Failed to look up invite code:", err);
        setView({ kind: "invalid" });
      }
    })();

    return () => {
      active = false;
    };
  }, [code]);

  const handleJoin = useCallback(
    async (className: string) => {
      if (!code) return;
      setJoining(true);
      setError("");
      try {
        await classApi.join({ code });
        setView({ kind: "joined", name: className });
      } catch (err) {
        console.error("Failed to join class:", err);
        setError(getErrorMessage(err, "Could not join this class."));
      } finally {
        setJoining(false);
      }
    },
    [code],
  );

  if (authLoading || view.kind === "loading") {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (view.kind === "invalid") {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Invite not available</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          This invite link is invalid or has expired.
        </p>
      </div>
    );
  }

  if (view.kind === "joined") {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
          You joined {view.name}!
        </h1>
        <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          Open your classes to see the assignments your teacher publishes.
        </p>
        <Link to="/my-classes" className={linkButton}>
          Go to my classes
        </Link>
      </div>
    );
  }

  const isStudent = user?.role?.title === "student";
  const hasAuth = Boolean(user);

  return (
    <div className="glass-moon mx-auto w-full max-w-lg p-10 text-center">
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{view.class.name}</h1>
      {view.class.teacher_name && (
        <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Taught by {view.class.teacher_name}
        </p>
      )}
      {view.class.description && (
        <p className="mb-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {view.class.description}
        </p>
      )}

      <div className="mb-6 flex justify-center">
        <Badge color="success" size="sm" className="whitespace-nowrap">
          Open
        </Badge>
      </div>

      {error && (
        <Alert color="failure" className="mb-5 text-left">
          <p>{error}</p>
          <Link
            to="/my-classes"
            className="mt-1 inline-block font-semibold text-sky-600 underline dark:text-sky-400"
          >
            Go to my classes
          </Link>
        </Alert>
      )}

      {!hasAuth ? (
        <>
          <p className="mb-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Sign in to join this class
          </p>
          <Link to={`/login?redirect=${encodeURIComponent(`/join/${code ?? ""}`)}`} className={linkButton}>
            Sign In
          </Link>
        </>
      ) : !isStudent ? (
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Only student accounts can join classes.
        </p>
      ) : (
        <Button
          type="button"
          onClick={() => void handleJoin(view.class.name)}
          disabled={joining}
          className="bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
        >
          {joining ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Joining…
            </>
          ) : (
            "Join class"
          )}
        </Button>
      )}
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Spinner } from "flowbite-react";
import { authApi, getErrorMessage } from "@/api";
import { useAuth } from "@/context/AuthContext";

const TOKEN_KEY = "pendingEmailVerificationToken";

export function VerifyEmailPage() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get("token");

  const pendingToken = sessionStorage.getItem(TOKEN_KEY);
  const hasPendingToken = Boolean(urlToken || pendingToken);

  const [status, setStatus] = useState<"idle" | "verifying" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!urlToken) return;
    sessionStorage.setItem(TOKEN_KEY, urlToken);
    navigate("/verify-email", { replace: true });
  }, [urlToken, navigate]);

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (started.current || !user || !token) return;
    started.current = true;
    (async () => {
      setStatus("verifying");
      try {
        const { data } = await authApi.verifyEmail({ token });
        sessionStorage.removeItem(TOKEN_KEY);
        await refresh();
        setMessage(data.message ?? "Email verified successfully.");
        setStatus("done");
      } catch (err) {
        sessionStorage.removeItem(TOKEN_KEY);
        setMessage(getErrorMessage(err, "Email verification failed."));
        setStatus("error");
      }
    })();
  }, [user, refresh]);

  if (loading) {
    return (
      <div className="flex w-full justify-center py-12">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <Spinner size="sm" />
          Checking your session…
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center py-12">
      <div className="glass-moon w-full max-w-md p-8">
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
          Verify your email
        </h1>

        {!user ? (
          <>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              {hasPendingToken
                ? "Your email is nearly verified. Log in and we will finish the job."
                : "Log in to manage your email verification."}
            </p>
            <Button
              onClick={() =>
                navigate(`/login?redirect=${encodeURIComponent("/verify-email")}`)
              }
              className="w-full bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
            >
              Log in
            </Button>
          </>
        ) : (
          <>
            {status === "idle" && !hasPendingToken && (
              <div className="flex flex-col gap-4">
                <Alert color="failure">No verification token found.</Alert>
                <Button
                  as={Link}
                  to="/settings"
                  className="w-full bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
                >
                  Request a new link
                </Button>
              </div>
            )}

            {(status === "idle" || status === "verifying") && hasPendingToken && (
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Spinner size="sm" />
                Verifying your email…
              </div>
            )}

            {status === "done" && (
              <div className="flex flex-col gap-4">
                <Alert color="success">{message}</Alert>
                <Button
                  as={Link}
                  to="/settings"
                  className="w-full bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
                >
                  Go to Settings
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-4">
                <Alert color="failure">{message}</Alert>
                <Button
                  as={Link}
                  to="/settings"
                  className="w-full bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
                >
                  Request a new link
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
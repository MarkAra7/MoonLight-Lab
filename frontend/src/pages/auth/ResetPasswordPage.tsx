import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Button, Label, Spinner } from "flowbite-react";
import { authApi, getErrorMessage } from "@/api";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not reset your password."));
    } finally {
      setSubmitting(false);
    }
  };

  const missingLink = !token || !email;

  return (
    <div className="flex w-full justify-center py-12">
      <div className="glass-moon w-full max-w-md p-8">
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
          Choose a new password
        </h1>

        {done ? (
          <div className="flex flex-col gap-4">
            <Alert color="success">
              Your password has been reset. You can now log in with your new
              password.
            </Alert>
            <Button
              as={Link}
              to="/login"
              className="w-full bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
            >
              Log in
            </Button>
          </div>
        ) : missingLink ? (
          <div className="flex flex-col gap-4">
            <Alert color="failure">
              This reset link is invalid or has expired. Request a new one to
              continue.
            </Alert>
            <Button
              as={Link}
              to="/forgot-password"
              className="w-full bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
            >
              Request a new link
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              Pick a password with at least 8 characters. You will use it the
              next time you log in.
            </p>

            {error && (
              <Alert color="failure" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <Label htmlFor="email" className="mb-2">
                  Email
                </Label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-2">
                  New password
                </Label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClasses}
                />
              </div>

              <div>
                <Label htmlFor="password_confirmation" className="mb-2">
                  Confirm new password
                </Label>
                <input
                  id="password_confirmation"
                  name="password_confirmation"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="••••••••"
                  className={inputClasses}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="mt-2 bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Resetting…
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

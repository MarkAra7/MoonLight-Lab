import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Label, Spinner } from "flowbite-react";
import { authApi, getErrorMessage } from "@/api";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send the reset link."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full justify-center py-12">
      <div className="glass-moon w-full max-w-md p-8">
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
          Forgot your password?
        </h1>

        {sent ? (
          <div className="flex flex-col gap-4">
            <Alert color="success">
              If an account exists for that email, a password reset link has
              been sent. Check your inbox and follow the link to choose a new
              password.
            </Alert>
            <Button
              as={Link}
              to="/login"
              className="w-full bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
            >
              Back to log in
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              Enter the email address linked to your account and we will send
              you a link to reset your password.
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
                  placeholder="you@school.edu"
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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
              Remembered it?{" "}
              <Link
                to="/login"
                className="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

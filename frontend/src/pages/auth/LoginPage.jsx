import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label, Button, Spinner, Alert } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/api";

/* Reference-style input: translucent surface that lights up with a sky-blue
   border on focus. Theme-aware via Tailwind dark: variants. */
const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function PasswordToggle({ show, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400"
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ login: identifier, password, device_name: "web" });
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full justify-center py-12">
      <div className="glass-moon w-full max-w-md p-8">
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
          Log in
        </h1>

        {error && (
          <Alert color="failure" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Label htmlFor="login" className="mb-2">
              Username or email
            </Label>
            <input
              id="login"
              name="login"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@school.edu or your_username"
              className={`${inputClasses} pr-11`}
            />
          </div>

          <div>
            <Label htmlFor="password" className="mb-2">
              Password
            </Label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClasses} pr-11`}
              />
              <PasswordToggle
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
                label={showPassword ? "Hide password" : "Show password"}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-2 bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Logging in…
              </>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

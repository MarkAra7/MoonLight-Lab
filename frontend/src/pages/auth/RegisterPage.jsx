import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Label, Spinner } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/api";
import { useRoles } from "@/hooks/useRoles";

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

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { roles, loading: rolesLoading } = useRoles();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const effectiveRole = form.role || roles[0]?.title || "";

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ ...form, role: effectiveRole });
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full justify-center py-12">
      <div className="glass-moon w-full max-w-xl p-8">
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
          Register
        </h1>

        {error && (
          <Alert color="failure" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Label htmlFor="first_name" className="mb-2">
              First name
            </Label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              autoComplete="given-name"
              placeholder="John"
              className={inputClasses}
              value={form.first_name}
              onChange={set("first_name")}
            />
          </div>

          <div>
            <Label htmlFor="last_name" className="mb-2">
              Last name
            </Label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              required
              autoComplete="family-name"
              placeholder="Doe"
              className={inputClasses}
              value={form.last_name}
              onChange={set("last_name")}
            />
          </div>

          <div>
            <Label htmlFor="username" className="mb-2">
              Username
            </Label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="john_doe"
              className={inputClasses}
              value={form.username}
              onChange={set("username")}
            />
          </div>

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
              placeholder="name@example.com"
              className={inputClasses}
              value={form.email}
              onChange={set("email")}
            />
          </div>

          <div>
            <Label className="mb-3">I am a…</Label>
            {rolesLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Loading roles…
              </div>
            ) : (
              <div
                className="flex flex-wrap justify-center gap-4"
                role="radiogroup"
                aria-label="Select your role"
              >
                {roles.map((r) => {
                  const selected = effectiveRole === r.title;
                  return (
                    <div
                      key={r.id}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      onClick={() => setForm((f) => ({ ...f, role: r.title }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setForm((f) => ({ ...f, role: r.title }));
                        }
                      }}
                      className={[
                        "flex-[1_1_160px] max-w-[220px] cursor-pointer rounded-2xl border p-7 text-center",
                        "transition-all duration-200",
                        selected
                          ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/20"
                          : "border-slate-300 bg-white hover:border-sky-400",
                        selected
                          ? "dark:border-sky-400 dark:bg-sky-400/[0.08] dark:ring-sky-400/20"
                          : "dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-sky-400/70",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "mb-1.5 text-[15px] font-black uppercase tracking-wider",
                          selected
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-slate-900 dark:text-white",
                        ].join(" ")}
                      >
                        {r.title}
                      </div>
                      {r.description && (
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {r.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                autoComplete="new-password"
                placeholder="Create a password"
                className={`${inputClasses} pr-11`}
                value={form.password}
                onChange={set("password")}
              />
              <PasswordToggle
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
                label={showPassword ? "Hide password" : "Show password"}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password_confirmation" className="mb-2">
              Confirm password
            </Label>
            <div className="relative">
              <input
                id="password_confirmation"
                name="password_confirmation"
                type={showPasswordConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={`${inputClasses} pr-11`}
                value={form.password_confirmation}
                onChange={set("password_confirmation")}
              />
              <PasswordToggle
                show={showPasswordConfirm}
                onToggle={() => setShowPasswordConfirm((s) => !s)}
                label={showPasswordConfirm ? "Hide password" : "Show password"}
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
                Registering…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
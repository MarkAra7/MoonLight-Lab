import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label, TextInput, Button, Spinner, Alert } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="login">Username or email</Label>
            <TextInput
              id="login"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@school.edu or your_username"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <TextInput
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Label, Spinner, ToggleSwitch } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";
import { authApi, getErrorMessage, settingsApi } from "@/api";
import type { EmailChangeState } from "@/api/settings";
import type { User } from "@/api/types";
import { formatDate } from "@/utils/helpers";
import { AvatarUploader } from "@/components/AvatarUploader";
import {
  COUNTRY_OPTIONS,
  isKnownCountry,
  isKnownLanguage,
  LANGUAGE_OPTIONS,
} from "@/config/profileOptions";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-4 py-3.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

const primaryButtonClasses =
  "bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300";

const fieldErrorClasses = "mt-1.5 text-sm text-red-600 dark:text-red-400";

function extractFieldErrors<T extends string>(
  error: unknown,
  fields: readonly T[]
): Partial<Record<T, string>> {
  const errors = (error as { response?: { data?: { errors?: Record<string, unknown> } } } | null | undefined)
    ?.response?.data?.errors;
  if (!errors) return {};
  const result: Partial<Record<T, string>> = {};
  for (const field of fields) {
    const value = errors[field];
    const first = Array.isArray(value) ? value[0] : undefined;
    if (typeof first === "string") result[field] = first;
  }
  return result;
}

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="glass-moon w-full p-8">
      <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      {description && (
        <p className="mb-6 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {children}
    </section>
  );
}

interface ProfileForm {
  first_name: string;
  last_name: string;
  username: string;
  country: string;
  preferred_language: string;
}

const PROFILE_FIELDS = ["first_name", "last_name", "username", "country", "preferred_language"] as const;
type ProfileFieldErrors = Partial<Record<(typeof PROFILE_FIELDS)[number], string>>;

function fromUser(user: User): ProfileForm {
  return {
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    username: user.username ?? "",
    country: user.country ?? "",
    preferred_language: user.preferred_language ?? "",
  };
}

function ProfileSection({ user, onSaved }: { user: User; onSaved: () => void }) {
  const [form, setForm] = useState<ProfileForm>(() => fromUser(user));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  const lastUserRef = useRef({ id: user.id, updatedAt: user.updated_at });
  useEffect(() => {
    const prev = lastUserRef.current;
    const next = { id: user.id, updatedAt: user.updated_at };
    if (prev.id === next.id && prev.updatedAt === next.updatedAt) return;
    lastUserRef.current = next;
    setForm(fromUser(user));
  }, [user]);

  const set = (key: keyof ProfileForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSaved(false);
    setSaving(true);
    try {
      const { data } = await settingsApi.updateProfile(user.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        country: form.country,
        preferred_language: form.preferred_language,
      });
      setForm(fromUser(data));
      setSaved(true);
      await onSaved();
    } catch (err) {
      const nextFieldErrors = extractFieldErrors(err, PROFILE_FIELDS);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
      } else {
        setError(getErrorMessage(err, "Could not save your profile."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Profile" description="Your personal details, shown on your public profile.">
      <AvatarUploader user={user} onChanged={onSaved} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name" className="mb-2">
              First name
            </Label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="John"
              className={inputClasses}
              value={form.first_name}
              onChange={set("first_name")}
            />
            {fieldErrors.first_name && <p className={fieldErrorClasses}>{fieldErrors.first_name}</p>}
          </div>
          <div>
            <Label htmlFor="last_name" className="mb-2">
              Last name
            </Label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Doe"
              className={inputClasses}
              value={form.last_name}
              onChange={set("last_name")}
            />
            {fieldErrors.last_name && <p className={fieldErrorClasses}>{fieldErrors.last_name}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="username" className="mb-2">
            Username
          </Label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="john_doe"
            className={inputClasses}
            value={form.username}
            onChange={set("username")}
          />
          {fieldErrors.username && <p className={fieldErrorClasses}>{fieldErrors.username}</p>}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="country" className="mb-2">
              Country
            </Label>
            <select
              id="country"
              name="country"
              autoComplete="country-name"
              className={inputClasses}
              value={form.country}
              onChange={set("country")}
            >
              <option value="">Select a country…</option>
              {!isKnownCountry(form.country) && form.country && (
                <option value={form.country}>{form.country}</option>
              )}
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.country && <p className={fieldErrorClasses}>{fieldErrors.country}</p>}
          </div>
          <div>
            <Label htmlFor="preferred_language" className="mb-2">
              Preferred language
            </Label>
            <select
              id="preferred_language"
              name="preferred_language"
              className={inputClasses}
              value={form.preferred_language}
              onChange={set("preferred_language")}
            >
              <option value="">Select a language…</option>
              {!isKnownLanguage(form.preferred_language) && form.preferred_language && (
                <option value={form.preferred_language}>{form.preferred_language}</option>
              )}
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.preferred_language && (
              <p className={fieldErrorClasses}>{fieldErrors.preferred_language}</p>
            )}
          </div>
        </div>

        {saved && <Alert color="success">Profile saved.</Alert>}
        {error && <Alert color="failure">{error}</Alert>}

        <div>
          <Button type="submit" disabled={saving} className={primaryButtonClasses}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}


function PrivacySection({ user, onSaved }: { user: User; onSaved: () => void }) {
  const [isPrivate, setIsPrivate] = useState(Boolean(user.is_private));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleToggle = async (checked: boolean) => {
    setError("");
    setSaved(false);
    setIsPrivate(checked);
    setSaving(true);
    try {
      await settingsApi.updateProfile(user.id, { is_private: checked });
      setSaved(true);
      await onSaved();
    } catch (err) {
      setIsPrivate(!checked);
      setError(getErrorMessage(err, "Could not update your privacy setting."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Privacy" description="Control who can see your profile.">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Private profile</p>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            When your profile is private, other users can&apos;t see your first name or country,
            and they can&apos;t view your profile at all.
          </p>
        </div>
        <ToggleSwitch
          checked={isPrivate}
          onChange={handleToggle}
          disabled={saving}
          aria-label="Private profile"
        />
      </div>
      {saved && <Alert color="success" className="mt-4">Privacy setting saved.</Alert>}
      {error && <Alert color="failure" className="mt-4">{error}</Alert>}
    </SectionCard>
  );
}


function EmailSection({ user, onEmailChanged }: { user: User; onEmailChanged: () => void }) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const verified = Boolean(user.email_verified_at);

  const handleResend = async () => {
    setResendError("");
    setResendMessage("");
    setResending(true);
    try {
      const { data } = await authApi.resendVerification();
      const message = (data as { message?: string } | null | undefined)?.message;
      setResendMessage(message ?? "Verification email sent.");
    } catch (err) {
      setResendError(getErrorMessage(err, "Could not resend the verification email."));
    } finally {
      setResending(false);
    }
  };

  return (
    <SectionCard title="Email" description="Manage your email address and verification status.">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</span>
          {verified ? (
            <Badge color="success">Verified</Badge>
          ) : (
            <Badge color="warning">Unverified</Badge>
          )}
        </div>
        {!verified && (
          <Button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className={primaryButtonClasses}
          >
            {resending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Sending…
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
        )}
      </div>

      {resendMessage && <Alert color="success" className="mt-4">{resendMessage}</Alert>}
      {resendError && <Alert color="failure" className="mt-4">{resendError}</Alert>}

      <EmailChangeWizard onEmailChanged={onEmailChanged} />
    </SectionCard>
  );
}


const EMAIL_CHANGE_FIELDS = ["current_password", "new_email", "token"] as const;
type EmailChangeFieldErrors = Partial<Record<(typeof EMAIL_CHANGE_FIELDS)[number], string>>;

const WIZARD_STEPS = ["Details", "Verify new email", "Confirm current email"] as const;

function deriveStep(change: EmailChangeState): 1 | 2 | 3 {
  if (change.new_email_verified_at && !change.current_email_verified_at) return 3;
  return 2;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
      {WIZARD_STEPS.map((label, index) => {
        const number = index + 1;
        const isDone = number < current;
        const isCurrent = number === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                isDone
                  ? "bg-sky-600 text-white dark:bg-sky-400 dark:text-slate-900"
                  : isCurrent
                    ? "border-2 border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                    : "border border-slate-300 text-slate-400 dark:border-white/15 dark:text-slate-500",
              ].join(" ")}
            >
              {isDone ? (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                number
              )}
            </span>
            <span
              className={[
                "text-sm font-medium",
                isCurrent ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400",
              ].join(" ")}
            >
              {label}
            </span>
            {number < WIZARD_STEPS.length && (
              <span className="h-px w-6 bg-slate-300 dark:bg-white/15" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface DeepLinkAlert {
  color: "success" | "failure";
  message: string;
}

function EmailChangeWizard({ onEmailChanged }: { onEmailChanged: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenParam = searchParams.get("email_change_token");
  const stepParam = searchParams.get("step");

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [change, setChange] = useState<EmailChangeState | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<EmailChangeFieldErrors>({});
  const [success, setSuccess] = useState("");
  const [deepLinkAlert, setDeepLinkAlert] = useState<DeepLinkAlert | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await settingsApi.getEmailChange();
        if (!active) return;
        if (data.change && !data.change.completed_at) {
          setChange(data.change);
          setOpen(true);
          setStep(deriveStep(data.change));
          setNewEmail(data.change.new_email);
        }
      } catch {
        setChange(null);
      } finally {
        if (active) setLoading(false);
      }

      if (tokenParam && (stepParam === "new_email" || stepParam === "current_email")) {
        setSubmitting(true);
        try {
          if (stepParam === "new_email") {
            const { data } = await settingsApi.verifyNewEmail({ token: tokenParam });
            if (!active) return;
            if (!data.change) {
              setDeepLinkAlert({
                color: "failure",
                message: data.message || "The email change could not be verified.",
              });
              return;
            }
            setChange(data.change);
            setNewEmail(data.change.new_email);
            setStep(3);
            setOpen(true);
            setDeepLinkAlert({ color: "success", message: data.message });
          } else {
            const { data } = await settingsApi.verifyCurrentEmail({ token: tokenParam });
            if (!active) return;
            if (data.change) {
              setChange(data.change);
              setNewEmail(data.change.new_email);
              setStep(deriveStep(data.change));
              setOpen(true);
              setDeepLinkAlert({ color: "success", message: data.message });
            } else {
              setDeepLinkAlert({ color: "success", message: data.message });
              setChange(null);
              setOpen(false);
              setStep(1);
              setCurrentPassword("");
              setNewEmail("");
              setToken("");
              setSuccess(data.message);
              await onEmailChanged();
            }
          }
        } catch (err) {
          if (!active) return;
          setDeepLinkAlert({
            color: "failure",
            message: getErrorMessage(err, "Could not verify the email change link."),
          });
        } finally {
          if (active) setSubmitting(false);
          setSearchParams({}, { replace: true });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [tokenParam, stepParam, setSearchParams, onEmailChanged]);

  const handleToggleOpen = () => {
    if (!open) {
      if (change && !change.completed_at) {
        setStep(deriveStep(change));
        setNewEmail(change.new_email);
      } else {
        setStep(1);
      }
    }
    setOpen((o) => !o);
  };

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccess("");
    setDeepLinkAlert(null);
    setSubmitting(true);
    try {
      const { data } = await settingsApi.requestEmailChange({
        current_password: currentPassword,
        new_email: newEmail,
      });
      setChange(data.change);
      setStep(2);
      setToken("");
    } catch (err) {
      const nextFieldErrors = extractFieldErrors(err, EMAIL_CHANGE_FIELDS);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
      } else {
        setError(getErrorMessage(err, "Could not start the email change."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyNew = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccess("");
    setDeepLinkAlert(null);
    setSubmitting(true);
    try {
      const { data } = await settingsApi.verifyNewEmail({ token });
      setToken("");
      if (data.change) {
        setChange(data.change);
        setStep(3);
      } else {
        setChange(null);
        setStep(1);
        setError("This email change is no longer active. Start again.");
      }
    } catch (err) {
      const nextFieldErrors = extractFieldErrors(err, EMAIL_CHANGE_FIELDS);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
      } else {
        setError(getErrorMessage(err, "Could not verify the new email."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCurrent = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccess("");
    setDeepLinkAlert(null);
    setSubmitting(true);
    try {
      const { data } = await settingsApi.verifyCurrentEmail({ token });
      setToken("");
      if (data.change) {
        setChange(data.change);
        setStep(deriveStep(data.change));
        setSuccess(data.message);
      } else {
        setSuccess(data.message);
        setChange(null);
        setOpen(false);
        setStep(1);
        setCurrentPassword("");
        setNewEmail("");
        await onEmailChanged();
      }
    } catch (err) {
      const nextFieldErrors = extractFieldErrors(err, EMAIL_CHANGE_FIELDS);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
      } else {
        setError(getErrorMessage(err, "Could not confirm your current email."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setError("");
    setFieldErrors({});
    setSuccess("");
    setDeepLinkAlert(null);
    setSubmitting(true);
    try {
      await settingsApi.cancelEmailChange();
      setChange(null);
      setOpen(false);
      setStep(1);
      setCurrentPassword("");
      setNewEmail("");
      setToken("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not cancel the email change."));
    } finally {
      setSubmitting(false);
    }
  };

  const pending = change !== null && !change.completed_at;

  return (
    <div className="mt-6 border-t border-slate-200 pt-6 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleToggleOpen} className={primaryButtonClasses}>
          {open ? "Close" : "Change email"}
        </Button>
        {pending && (
          <Button type="button" color="gray" onClick={handleCancel} disabled={submitting}>
            Cancel change
          </Button>
        )}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Spinner size="sm" />
          Checking for a pending email change…
        </div>
      )}

      {deepLinkAlert && (
        <Alert color={deepLinkAlert.color} className="mt-4">
          {deepLinkAlert.message}
        </Alert>
      )}
      {success && (
        <Alert color="success" className="mt-4">
          {success}
        </Alert>
      )}
      {error && (
        <Alert color="failure" className="mt-4">
          {error}
        </Alert>
      )}

      {open && (
        <div className="mt-6">
          {step > 1 && change && (
            <>
              <StepIndicator current={step} />
              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                This request expires at {formatDate(change.expires_at)}.
              </p>
            </>
          )}

          {step > 1 && !change && (
            <Alert color="failure">
              This email change is no longer active. Start again.
            </Alert>
          )}

          {step === 1 && (
            <form onSubmit={handleRequest} className="flex flex-col gap-5">
              <div>
                <Label htmlFor="current_password" className="mb-2">
                  Current password
                </Label>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={inputClasses}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                {fieldErrors.current_password && (
                  <p className={fieldErrorClasses}>{fieldErrors.current_password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="new_email" className="mb-2">
                  New email
                </Label>
                <input
                  id="new_email"
                  name="new_email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="new@example.com"
                  className={inputClasses}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                {fieldErrors.new_email && <p className={fieldErrorClasses}>{fieldErrors.new_email}</p>}
              </div>
              <div>
                <Button type="submit" disabled={submitting} className={primaryButtonClasses}>
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Sending…
                    </>
                  ) : (
                    "Send confirmation links"
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === 2 && change && (
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                We sent a confirmation link to{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {change.new_email}
                </span>
                .
              </p>
              <form onSubmit={handleVerifyNew} className="flex flex-col gap-5">
                <div>
                  <Label htmlFor="new_email_token" className="mb-2">
                    Paste the confirmation code from that email
                  </Label>
                  <input
                    id="new_email_token"
                    name="new_email_token"
                    type="text"
                    required
                    autoComplete="one-time-code"
                    placeholder="e.g. 12345678-1234-1234-1234-123456789abc"
                    className={inputClasses}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  {fieldErrors.token && <p className={fieldErrorClasses}>{fieldErrors.token}</p>}
                </div>
                <div>
                  <Button type="submit" disabled={submitting} className={primaryButtonClasses}>
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Verifying…
                      </>
                    ) : (
                      "Verify new email"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && change && (
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Now confirm{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {change.current_email}
                </span>{" "}
                — your current address.
              </p>
              <form onSubmit={handleVerifyCurrent} className="flex flex-col gap-5">
                <div>
                  <Label htmlFor="current_email_token" className="mb-2">
                    Paste the confirmation code from that email
                  </Label>
                  <input
                    id="current_email_token"
                    name="current_email_token"
                    type="text"
                    required
                    autoComplete="one-time-code"
                    placeholder="e.g. 12345678-1234-1234-1234-123456789abc"
                    className={inputClasses}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  {fieldErrors.token && <p className={fieldErrorClasses}>{fieldErrors.token}</p>}
                </div>
                <div>
                  <Button type="submit" disabled={submitting} className={primaryButtonClasses}>
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Confirming…
                      </>
                    ) : (
                      "Confirm current email"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export function SettingsPage() {
  const { user, loading, refresh } = useAuth();

  if (loading) {
    return (
      <div className="flex w-full justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex w-full justify-center py-12">
        <div className="glass-moon w-full max-w-md p-8 text-center">
          <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            You need to be signed in to manage your settings.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Manage your profile, privacy, and email.
          </p>
        </div>

        <ProfileSection user={user} onSaved={refresh} />
        <PrivacySection user={user} onSaved={refresh} />
        <EmailSection user={user} onEmailChanged={refresh} />
      </div>
    </div>
  );
}
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { partyApi, partyTokenStore } from "@/api/party";
import { useAuth } from "@/context/AuthContext";

const codeInputClasses =
  "w-full rounded-[10px] border border-slate-300 bg-slate-50 px-4 py-4 text-center text-2xl font-black uppercase tracking-[0.4em] text-slate-900 outline-none transition-colors placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-400 focus:border-sky-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400";

const inputClasses =
  "w-full rounded-[10px] border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400";

const labelClasses =
  "mb-2 block text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400";

export function JoinPartyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [code, setCode] = useState(() => (searchParams.get("code") ?? "").toUpperCase());
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = code.trim().toUpperCase();

    if (trimmed.length !== 6) {
      setError("Enter the 6-character game code.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { data } = await partyApi.join({
        code: trimmed,
        nickname: user ? undefined : nickname.trim() || undefined,
      });

      partyTokenStore.set(data.party.party_code, data.player_token);
      navigate(`/parties/${data.party.party_code}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not join that game."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col">
      <div className="glass-moon w-full p-8 md:p-10">
        <h1 className="text-center text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Join a live game
        </h1>
        <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Ask the host for the 6-character code shown on their screen.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 flex flex-col gap-5">
          <div>
            <label htmlFor="party-code" className={labelClasses}>
              Game code
            </label>
            <input
              id="party-code"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="ABC123"
              className={codeInputClasses}
            />
          </div>

          {!user && !authLoading && (
            <div>
              <label htmlFor="party-nickname" className={labelClasses}>
                Nickname <span className="font-medium normal-case">(optional)</span>
              </label>
              <input
                id="party-nickname"
                type="text"
                maxLength={20}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Pick a name for the leaderboard"
                className={inputClasses}
              />
            </div>
          )}

          {error && <Alert color="failure">{error}</Alert>}

          <Button
            type="submit"
            disabled={submitting}
            className="bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Joining…
              </>
            ) : (
              "Join game"
            )}
          </Button>
        </form>

        {!user && !authLoading && (
          <p className="mt-6 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            Some games only allow registered players.{" "}
            <Link
              to="/login?redirect=%2Fparties%2Fjoin"
              className="font-bold text-sky-600 no-underline hover:text-sky-500 dark:text-sky-400"
            >
              Sign in
            </Link>{" "}
            if the code is rejected.
          </p>
        )}
      </div>
    </div>
  );
}

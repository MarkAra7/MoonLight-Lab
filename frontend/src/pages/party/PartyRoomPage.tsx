import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { partyApi, partyTokenStore } from "@/api/party";
import { useAuth } from "@/context/AuthContext";
import { PartyLeaderboard } from "@/components/party/PartyLeaderboard";
import type { PartyState, PartyStanding } from "@/api/types";

const primaryButtonClasses =
  "bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300";

const secondaryButtonClasses =
  "border border-slate-200 bg-white text-slate-700 enabled:hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:enabled:hover:bg-white/[0.06]";

const POLL_INTERVAL_MS = 2500;

function SpinnerBlock() {
  return (
    <div className="flex justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );
}

function PlayerRoster({
  players,
  hostNickname,
  canKick,
  onKick,
}: {
  players: PartyStanding[];
  hostNickname?: string | null;
  canKick: boolean;
  onKick: (playerId: number) => void;
}) {
  if (players.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        No players yet. Share the code to invite people.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
      {players.map((player, index) => {
        const isHost = player.nickname === hostNickname;

        return (
          <li key={player.id ?? `${player.nickname}-${index}`} className="flex items-center gap-3 py-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
              {player.nickname.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {player.nickname}
            </span>
            {isHost && (
              <Badge color="info" size="sm">
                Host
              </Badge>
            )}
            {canKick && player.id !== undefined && (
              <button
                type="button"
                onClick={() => onKick(player.id as number)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Remove
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PartyRoomPage() {
  const { partyCode = "" } = useParams<{ partyCode: string }>();
  const code = partyCode.toUpperCase();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [state, setState] = useState<PartyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await partyApi.state(code);
      setState(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this game."));
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;

    let active = true;

    const tick = async () => {
      try {
        const { data } = await partyApi.state(code);
        if (!active) return;
        setState(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err, "Could not load this game."));
      } finally {
        if (active) setLoading(false);
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [code]);

  const handleStart = async () => {
    setStarting(true);
    setActionError(null);

    try {
      await partyApi.start(code);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not start the game."));
    } finally {
      setStarting(false);
    }
  };

  const handleKick = async (playerId: number) => {
    setActionError(null);

    try {
      await partyApi.kick(code, playerId);
      await load();
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not remove that player."));
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    setActionError(null);

    try {
      await partyApi.leave(code);
      partyTokenStore.clear(code);
      navigate(user ? "/quizzes" : "/");
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not leave the game."));
      setLeaving(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (loading) return <SpinnerBlock />;

  if (error && !state) {
    return (
      <div className="glass-moon mx-auto w-full max-w-lg p-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Game not found</h1>
        <p className="mb-6 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        <Link
          to="/parties/join"
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
        >
          Join another game
        </Link>
      </div>
    );
  }

  if (!state) return <SpinnerBlock />;

  const { party, player, phase, standings } = state;
  const isHost = player?.is_host ?? false;
  const needsJoin = !player;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Live game
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {party.quiz_title ?? "Quiz"}
          </h1>
        </div>
        {player && (
          <Button
            type="button"
            color="light"
            onClick={() => void handleLeave()}
            disabled={leaving}
            className={secondaryButtonClasses}
          >
            {leaving ? "Leaving…" : "Leave game"}
          </Button>
        )}
      </header>

      {actionError && <Alert color="failure">{actionError}</Alert>}

      {needsJoin ? (
        <section className="glass-moon p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            You are not in this game yet
          </h2>
          <p className="mx-auto mt-2 mb-6 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
            Join with the code below to take a seat in the lobby.
          </p>
          <Link
            to={`/parties/join?code=${code}`}
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            Join with code {code}
          </Link>
        </section>
      ) : (
        <section className="glass-moon p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Game code
            </p>
            <p className="text-4xl font-black tracking-[0.35em] text-sky-600 dark:text-sky-400">
              {code}
            </p>
            <Button
              type="button"
              size="xs"
              color="light"
              onClick={() => void copyCode()}
              className={secondaryButtonClasses}
            >
              {copied ? "Copied!" : "Copy code"}
            </Button>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Share this code so others can join at{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                moonlightlab / join game
              </span>
              .
            </p>
          </div>
        </section>
      )}

      <section className="glass-moon p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Players
          </h2>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {state.players_count} / {party.max_players}
          </span>
        </div>

        <PlayerRoster
          players={standings}
          hostNickname={party.host_nickname}
          canKick={isHost && phase === "lobby"}
          onKick={(playerId) => void handleKick(playerId)}
        />
      </section>

      {phase === "lobby" ? (
        <section className="glass-moon p-6 text-center md:p-8">
          {isHost ? (
            <>
              <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                {state.players_count < 2
                  ? "At least 2 players are needed to start."
                  : "Everyone ready? Start the game when you are."}
              </p>
              <Button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting || state.players_count < 2}
                className={primaryButtonClasses}
              >
                {starting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Starting…
                  </>
                ) : (
                  "Start game"
                )}
              </Button>
            </>
          ) : (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Waiting for the host to start the game…
            </p>
          )}
        </section>
      ) : (
        <section className="glass-moon p-6 md:p-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {phase === "results" ? "Final standings" : "Game started"}
          </h2>
          {phase !== "results" && (
            <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              The live question screen is on its way — this lobby will hand over to it shortly.
            </p>
          )}
          <PartyLeaderboard
            standings={standings}
            highlightId={player?.id}
            showRanks={phase === "results"}
          />
        </section>
      )}
    </div>
  );
}

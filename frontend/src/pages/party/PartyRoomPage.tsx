import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Spinner } from "flowbite-react";
import { getErrorMessage } from "@/api";
import { partyApi, partyTokenStore } from "@/api/party";
import { useAuth } from "@/context/AuthContext";
import { PartyLeaderboard } from "@/components/party/PartyLeaderboard";
import {
  PartyLiveQuestion,
  type PartyAnswerFeedback,
} from "@/components/party/PartyLiveQuestion";
import type { PartyResults, PartyState, PartyStanding } from "@/api/types";

const primaryButtonClasses =
  "bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300";

const secondaryButtonClasses =
  "border border-slate-200 bg-white text-slate-700 enabled:hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:enabled:hover:bg-white/[0.06]";

const POLL_INTERVAL_MS = 2500;

type AnswerStatus = "idle" | "sending" | "answered";

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
  const [advancing, setAdvancing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>("idle");
  const [feedback, setFeedback] = useState<PartyAnswerFeedback | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [answerQuestionKey, setAnswerQuestionKey] = useState<string | null>(null);
  const [results, setResults] = useState<PartyResults | null>(null);

  const autoAdvancedFor = useRef<number | null>(null);

  const phase = state?.phase ?? "lobby";
  const player = state?.player ?? null;
  const isHost = player?.is_host ?? false;
  const standings = state?.standings ?? [];
  const questionIndex = state?.question_index ?? 0;
  const totalSeconds = state?.party.question_seconds ?? 0;
  const endMs = state?.question_end_at ? new Date(state.question_end_at).getTime() : null;
  const totalMs = totalSeconds * 1000;
  const remainingMs = endMs !== null ? Math.max(0, endMs - now) : 0;
  const secondsLeft = endMs !== null ? Math.ceil(remainingMs / 1000) : totalSeconds;
  const expired = endMs !== null && remainingMs <= 0;

  // Drop the local answer state as soon as the question or phase changes.
  const questionKey = `${phase}:${questionIndex}`;
  if (answerQuestionKey !== questionKey) {
    setAnswerQuestionKey(questionKey);
    setSelectedAnswerId(null);
    setCorrectAnswerId(null);
    setAnswerStatus("idle");
    setFeedback(null);
    setAnswerError(null);
  }

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const advance = useCallback(async () => {
    setAdvancing(true);
    setActionError(null);

    try {
      await partyApi.next(code);
    } catch (err) {
      setActionError(getErrorMessage(err, "Could not move to the next question."));
    } finally {
      setAdvancing(false);
      await load();
    }
  }, [code, load]);

  useEffect(() => {
    if (phase !== "playing" || !isHost || !expired) return;
    if (autoAdvancedFor.current === questionIndex) return;

    autoAdvancedFor.current = questionIndex;
    void advance();
  }, [phase, isHost, expired, questionIndex, advance]);

  useEffect(() => {
    if (phase !== "results" || !code) return;

    let active = true;

    (async () => {
      try {
        const { data } = await partyApi.results(code);
        if (active) setResults(data);
      } catch (err) {
        if (active) {
          setActionError(getErrorMessage(err, "Could not load the final results."));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [phase, code]);

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

  const handleAnswer = async (answerId: string) => {
    if (answerStatus !== "idle") return;

    setSelectedAnswerId(answerId);
    setAnswerStatus("sending");
    setAnswerError(null);

    const startedAtMs = endMs !== null ? endMs - totalMs : Date.now();
    const answeredAtMs = Math.max(0, Math.min(totalMs, Date.now() - startedAtMs));

    try {
      const { data } = await partyApi.answer(code, {
        answer_id: answerId,
        answered_at_ms: answeredAtMs,
      });

      setFeedback({ isCorrect: Boolean(data.is_correct), points: data.points ?? 0 });
      setCorrectAnswerId(data.correct_answer_id ?? null);
      setAnswerStatus("answered");
    } catch (err) {
      setSelectedAnswerId(null);
      setAnswerStatus("idle");
      setAnswerError(getErrorMessage(err, "Could not send your answer."));
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

  const { party } = state;
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
      ) : phase === "lobby" ? (
        <>
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
              canKick={isHost}
              onKick={(playerId) => void handleKick(playerId)}
            />
          </section>

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
        </>
      ) : phase === "playing" ? (
        <>
          {state.question && (
            <PartyLiveQuestion
              question={state.question}
              questionNumber={questionIndex + 1}
              totalQuestions={state.total_questions}
              secondsLeft={secondsLeft}
              totalSeconds={totalSeconds}
              selectedAnswerId={selectedAnswerId}
              correctAnswerId={correctAnswerId}
              feedback={feedback}
              locked={answerStatus === "answered"}
              submitting={answerStatus === "sending"}
              error={answerError}
              onSelect={(answerId) => void handleAnswer(answerId)}
            />
          )}

          <section className="glass-moon p-6 md:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Leaderboard
              </h2>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {state.answered_count} / {state.players_count} answered
              </span>
            </div>

            <PartyLeaderboard standings={standings} highlightId={player?.id} />

            {isHost && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Move on when everyone has answered, or let the timer do it.
                </p>
                <Button
                  type="button"
                  onClick={() => void advance()}
                  disabled={advancing}
                  className={primaryButtonClasses}
                >
                  {advancing ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Next…
                    </>
                  ) : (
                    "Next question"
                  )}
                </Button>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="glass-moon p-6 md:p-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {phase === "results" ? "Final standings" : "Game ended"}
          </h2>

          {phase === "results" && results?.my_rank != null && (
            <p className="mb-5 rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
              You finished #{results.my_rank} with {results.my_score ?? 0} points.
            </p>
          )}

          {phase === "cancelled" && (
            <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              This game was cancelled by the host.
            </p>
          )}

          <PartyLeaderboard
            standings={results?.standings ?? standings}
            highlightId={player?.id}
            highlightNickname={player?.nickname}
            showRanks={phase === "results"}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            {results?.party.quiz_id && (
              <Link
                to={`/quizzes/${results.party.quiz_id}`}
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
              >
                Back to quiz
              </Link>
            )}
            <Link to="/quizzes" className={`${secondaryButtonClasses} inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold no-underline`}>
              Browse quizzes
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

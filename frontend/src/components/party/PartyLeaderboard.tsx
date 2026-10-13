import { Badge } from "flowbite-react";
import type { PartyStanding } from "@/api/types";

export interface PartyLeaderboardProps {
  standings: PartyStanding[];
  highlightId?: number;
  highlightNickname?: string;
  showRanks?: boolean;
  caption?: string;
}

export function PartyLeaderboard({
  standings,
  highlightId,
  highlightNickname,
  showRanks = false,
  caption = "No players yet.",
}: PartyLeaderboardProps) {
  if (standings.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        {caption}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {standings.map((entry, index) => {
        const isMe =
          (highlightId !== undefined && entry.id === highlightId) ||
          (highlightNickname !== undefined && entry.nickname === highlightNickname);

        return (
          <li
            key={entry.id ?? `${entry.nickname}-${index}`}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              isMe
                ? "bg-sky-50 ring-1 ring-sky-500/30 dark:bg-sky-400/10"
                : "bg-slate-50 dark:bg-white/[0.03]"
            }`}
          >
            <span className="w-6 text-sm font-black text-slate-400 dark:text-slate-500">
              {showRanks ? (entry.rank ?? index + 1) : index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {entry.nickname}
            </span>
            {isMe && (
              <Badge color="info" size="sm">
                You
              </Badge>
            )}
            <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{entry.score}</span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {entry.correct}/{entry.total}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

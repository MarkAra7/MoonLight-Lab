import apiClient from "./client";
import type { Party, PartyPlayer, PartyResults, PartyState } from "./types";

const TOKEN_PREFIX = "party_token:";

/**
 * Guests have no session, so the server hands back a per-party player token.
 * It is kept next to the party code so several parties can be joined at once.
 */
export const partyTokenStore = {
  get: (partyCode: string): string | null =>
    localStorage.getItem(TOKEN_PREFIX + partyCode.toUpperCase()),
  set: (partyCode: string, token: string): void =>
    localStorage.setItem(TOKEN_PREFIX + partyCode.toUpperCase(), token),
  clear: (partyCode: string): void =>
    localStorage.removeItem(TOKEN_PREFIX + partyCode.toUpperCase()),
};

export interface CreatePartyPayload {
  quiz_id: string;
  allow_guests?: boolean;
  question_seconds?: number;
  max_players?: number;
}

export interface JoinPartyPayload {
  code: string;
  nickname?: string;
}

export interface PartyAnswerPayload {
  answer_id: string;
  answered_at_ms: number;
}

export interface PartyJoinResult {
  party: Party;
  player: PartyPlayer;
  player_token: string;
  already_joined?: boolean;
}

export interface PartyCreateResult {
  party: Party;
  player: PartyPlayer;
  player_token: string;
}

export interface PartyAnswerResult {
  message: string;
  is_correct: boolean;
  points: number;
  correct_answer_id: string | null;
}

/** Every party request a guest makes identifies itself with the player token. */
function playerHeader(partyCode: string): Record<string, string> {
  const token = partyTokenStore.get(partyCode);
  return token ? { "X-Player-Token": token } : {};
}

export const partyApi = {
  join: (payload: JoinPartyPayload) => apiClient.post<PartyJoinResult>("/parties/join", payload),
  state: (partyCode: string) =>
    apiClient.get<PartyState>(`/parties/${partyCode}/state`, {
      headers: playerHeader(partyCode),
    }),
  answer: (partyCode: string, payload: PartyAnswerPayload) =>
    apiClient.post<PartyAnswerResult>(`/parties/${partyCode}/answer`, payload, {
      headers: playerHeader(partyCode),
    }),
  results: (partyCode: string) =>
    apiClient.get<PartyResults>(`/parties/${partyCode}/results`, {
      headers: playerHeader(partyCode),
    }),

  create: (payload: CreatePartyPayload) => apiClient.post<PartyCreateResult>("/parties", payload),
  start: (partyCode: string) => apiClient.post(`/parties/${partyCode}/start`),
  next: (partyCode: string) => apiClient.post(`/parties/${partyCode}/next`),
  kick: (partyCode: string, playerId: number | string) =>
    apiClient.delete(`/parties/${partyCode}/players/${playerId}`),
  leave: (partyCode: string) =>
    apiClient.delete(`/parties/${partyCode}/leave`, {
      headers: playerHeader(partyCode),
    }),
};

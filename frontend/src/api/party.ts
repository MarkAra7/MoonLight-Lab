import apiClient from "./client";

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

export const partyApi = {
  join: (payload: JoinPartyPayload) => apiClient.post("/parties/join", payload),
  state: (partyCode: string) => apiClient.get(`/parties/${partyCode}/state`),
  answer: (partyCode: string, payload: PartyAnswerPayload) =>
    apiClient.post(`/parties/${partyCode}/answer`, payload),
  results: (partyCode: string) => apiClient.get(`/parties/${partyCode}/results`),

  create: (payload: CreatePartyPayload) => apiClient.post("/parties", payload),
  start: (partyCode: string) => apiClient.post(`/parties/${partyCode}/start`),
  next: (partyCode: string) => apiClient.post(`/parties/${partyCode}/next`),
  kick: (partyCode: string, playerId: number | string) =>
    apiClient.delete(`/parties/${partyCode}/players/${playerId}`),
  leave: (partyCode: string) => apiClient.delete(`/parties/${partyCode}/leave`),
};
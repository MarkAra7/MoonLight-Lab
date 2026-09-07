import apiClient from "./client";

export const partyApi = {
  join: (payload) => apiClient.post("/parties/join", payload),
  state: (partyCode) => apiClient.get(`/parties/${partyCode}/state`),
  answer: (partyCode, payload) => apiClient.post(`/parties/${partyCode}/answer`, payload),
  results: (partyCode) => apiClient.get(`/parties/${partyCode}/results`),


  create: (payload) => apiClient.post("/parties", payload),
  start: (partyCode) => apiClient.post(`/parties/${partyCode}/start`),
  next: (partyCode) => apiClient.post(`/parties/${partyCode}/next`),
  kick: (partyCode, playerId) => apiClient.delete(`/parties/${partyCode}/players/${playerId}`),
  leave: (partyCode) => apiClient.delete(`/parties/${partyCode}/leave`),
};

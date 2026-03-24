// client/src/api/events.ts
import { api } from './axios';

export const confirmEventPlayed = async (eventId: string) => {
  const response = await api.post(`/api/events/${eventId}/confirm-played`);
  return response.data;
};

export const confirmEventNotPlayed = async (eventId: string) => {
  const response = await api.post(`/api/events/${eventId}/confirm-not-played`);
  return response.data;
};

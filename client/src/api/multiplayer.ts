import { api } from './axios';
import type { ApiResponse } from '../types/auth';
import type {
  MatchStreamEventName,
  MultiplayerGameInfo,
  MultiplayerMatch,
  MultiplayerMatchSnapshot,
  MultiplayerVisibility,
} from '../types/multiplayer';

type MovePayload = {
  type: string;
  args?: unknown[];
};

const normalizeBaseUrl = (url?: string) => {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export async function listMultiplayerGames() {
  const response = await api.get<ApiResponse<MultiplayerGameInfo[]>>('/api/multiplayer/games');
  return response.data.data ?? [];
}

export async function listMultiplayerMatches() {
  const response = await api.get<ApiResponse<MultiplayerMatch[]>>('/api/multiplayer/matches');
  return response.data.data ?? [];
}

export async function createMultiplayerMatch(payload: {
  gameKey: string;
  visibility: MultiplayerVisibility;
  maxPlayers: number;
}) {
  const response = await api.post<ApiResponse<MultiplayerMatchSnapshot>>('/api/multiplayer/matches', payload);
  return response.data.data!;
}

export async function getMultiplayerMatch(matchId: string) {
  const response = await api.get<ApiResponse<MultiplayerMatchSnapshot>>(`/api/multiplayer/matches/${matchId}`);
  return response.data.data!;
}

export async function joinMultiplayerMatch(matchId: string) {
  const response = await api.post<ApiResponse<MultiplayerMatchSnapshot>>(`/api/multiplayer/matches/${matchId}/join`);
  return response.data.data!;
}

export async function leaveMultiplayerMatch(matchId: string) {
  const response = await api.post<ApiResponse<MultiplayerMatchSnapshot>>(`/api/multiplayer/matches/${matchId}/leave`);
  return response.data.data!;
}

export async function startMultiplayerMatch(matchId: string) {
  const response = await api.post<ApiResponse<MultiplayerMatchSnapshot>>(`/api/multiplayer/matches/${matchId}/start`);
  return response.data.data!;
}

export async function restartMultiplayerMatch(matchId: string) {
  const response = await api.post<ApiResponse<MultiplayerMatchSnapshot>>(`/api/multiplayer/matches/${matchId}/restart`);
  return response.data.data!;
}

export async function moveMultiplayerMatch(matchId: string, payload: MovePayload) {
  const response = await api.post<ApiResponse<MultiplayerMatchSnapshot>>(`/api/multiplayer/matches/${matchId}/move`, payload);
  return response.data.data!;
}

export function createMultiplayerEventSource(
  matchId: string,
  handlers: Partial<Record<MatchStreamEventName, (snapshot: MultiplayerMatchSnapshot) => void>> & {
    onError?: (event: Event) => void;
  }
) {
  const token = localStorage.getItem('token');
  const baseUrl = normalizeBaseUrl(String(api.defaults.baseURL ?? window.location.origin));
  const streamUrl = `${baseUrl}/api/multiplayer/matches/${matchId}/stream?token=${encodeURIComponent(token ?? '')}`;
  const source = new EventSource(streamUrl);

  const bind = (eventName: MatchStreamEventName) => {
    source.addEventListener(eventName, (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as MultiplayerMatchSnapshot;
      handlers[eventName]?.(parsed);
    });
  };

  bind('match:state');
  bind('match:player-joined');
  bind('match:player-left');
  bind('match:started');
  bind('match:restarted');
  bind('match:move-applied');
  bind('match:finished');
  source.onerror = (event) => handlers.onError?.(event);

  return source;
}

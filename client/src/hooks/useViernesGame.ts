// client/src/hooks/useViernesGame.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import type {
  ViernesGameState,
  ViernesAction,
  Difficulty,
} from '../logic/ViernesEngine';

export type { Difficulty };

// ─── Tipos de la API ──────────────────────────────────────────────────────────

export interface ViernesGame {
  id: string;
  playerId: string;
  player: { id: string; name: string };
  gameState: ViernesGameState;
  difficulty: Difficulty;
  status: 'ACTIVE' | 'FINISHED';
  won: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// ─── useViernesGame ───────────────────────────────────────────────────────────

/**
 * Gestiona el estado de una partida de Viernes.
 * Sin polling (juego solitario: solo el jugador actual actúa).
 */
export function useViernesGame(gameId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<ViernesGame>({
    queryKey: ['viernes-game', gameId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ViernesGame }>(
        `/api/viernes/games/${gameId}`
      );
      return res.data.data;
    },
    staleTime: Infinity,
    refetchInterval: false,
  });

  const actionMutation = useMutation({
    mutationFn: async (action: ViernesAction) => {
      const res = await api.patch<{ success: boolean; data: ViernesGame }>(
        `/api/viernes/games/${gameId}/move`,
        action
      );
      return res.data.data;
    },
    onSuccess: (updatedGame) => {
      queryClient.setQueryData<ViernesGame>(['viernes-game', gameId], updatedGame);
      queryClient.invalidateQueries({ queryKey: ['viernes-games'] });
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete<{ success: boolean; data: ViernesGame }>(`/api/viernes/games/${gameId}`);
      return res.data.data;
    },
    onSuccess: (updatedGame) => {
      queryClient.setQueryData<ViernesGame>(['viernes-game', gameId], updatedGame);
      queryClient.invalidateQueries({ queryKey: ['viernes-games'] });
    },
  });

  const game = query.data;
  const gs   = game?.gameState;

  return {
    game,
    gs,
    isLoading: query.isLoading,
    error: query.error,
    sendAction: actionMutation.mutate,
    isSending: actionMutation.isPending,
    actionError: actionMutation.error,
    abandonGame: abandonMutation.mutate,
    isAbandoning: abandonMutation.isPending,
  };
}

// ─── useViernesGameList ───────────────────────────────────────────────────────

/**
 * Lista las partidas del usuario y permite crear nuevas.
 */
export function useViernesGameList() {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();

  const query = useQuery<ViernesGame[]>({
    queryKey: ['viernes-games'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ViernesGame[] }>('/api/viernes/games');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (difficulty: Difficulty) => {
      const res = await api.post<{ success: boolean; data: ViernesGame }>(
        '/api/viernes/games',
        { difficulty }
      );
      return res.data.data;
    },
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ['viernes-games'] });
      navigate(`/viernes/${game.id}`);
    },
  });

  return {
    games: query.data ?? [],
    isLoading: query.isLoading,
    createGame: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}

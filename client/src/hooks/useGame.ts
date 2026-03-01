// client/src/hooks/useGame.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

// ─── Tipos compartidos con el engine ─────────────────────────────────────────

export type TileColor = 'BLUE' | 'YELLOW' | 'RED' | 'BLACK' | 'TEAL';
export type TileOrNull = TileColor | null;

export interface PlayerState {
  id: string;
  patternLines: TileOrNull[][];
  wall: TileOrNull[][];
  floor: TileColor[];
  hasFirstPlayerMarker: boolean;
  score: number;
}

export interface GameState {
  factories: TileColor[][];
  center: TileColor[];
  firstPlayerMarkerInCenter: boolean;
  players: PlayerState[];
  phase: 'OFFER' | 'WALL_TILING' | 'FINISHED';
  turnIndex: number;
  round: number;
}

export interface AzulGame {
  id: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  currentTurn: string | null;
  winnerId: string | null;
  gameState: GameState;
  player1: { id: string; name: string };
  player2: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovePayload {
  source: 'factory' | 'center';
  factoryIndex?: number;
  color: TileColor;
  patternLineIndex: number; // -1 = suelo
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * Gestiona el estado de una partida en curso.
 * Hace polling cada 3 segundos cuando es turno del oponente.
 */
export function useGame(gameId: string, myUserId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<AzulGame>({
    queryKey: ['azul-game', gameId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AzulGame }>(`/api/azul/games/${gameId}`);
      return res.data.data;
    },
    // Pollear cada 3s cuando es turno del oponente o la partida está esperando
    refetchInterval: (query) => {
      const game = query.state.data;
      if (!game) return 3000;
      if (game.status === 'FINISHED') return false;
      if (game.currentTurn === myUserId) return false; // Es mi turno, no hace falta pollear
      return 3000;
    },
    staleTime: 0,
  });

  const moveMutation = useMutation({
    mutationFn: async (move: MovePayload) => {
      const res = await api.patch<{ success: boolean; data: AzulGame; gameOver: boolean }>(
        `/api/azul/games/${gameId}/move`,
        move
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Actualizar el caché directamente con el estado recibido del servidor
      queryClient.setQueryData(['azul-game', gameId], data.data);
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ success: boolean; data: AzulGame }>(
        `/api/azul/games/${gameId}/join`
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['azul-game', gameId], data.data);
    },
  });

  const game = query.data;
  const isMyTurn = game?.currentTurn === myUserId;
  const myPlayerIndex = game?.gameState.players.findIndex(p => p.id === myUserId) ?? -1;
  const myState = myPlayerIndex >= 0 ? game?.gameState.players[myPlayerIndex] : undefined;
  const opponentState = myPlayerIndex >= 0 ? game?.gameState.players[1 - myPlayerIndex] : undefined;

  return {
    game,
    isLoading: query.isLoading,
    error: query.error,
    isMyTurn,
    myPlayerIndex,
    myState,
    opponentState,
    sendMove: moveMutation.mutate,
    isSendingMove: moveMutation.isPending,
    moveError: moveMutation.error,
    joinGame: joinMutation.mutate,
    isJoining: joinMutation.isPending,
  };
}

// ─── Hook de lista de partidas ────────────────────────────────────────────────

export function useAzulGameList() {
  const queryClient = useQueryClient();

  const query = useQuery<AzulGame[]>({
    queryKey: ['azul-games'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AzulGame[] }>('/api/azul/games');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ success: boolean; data: AzulGame }>('/api/azul/games');
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azul-games'] });
    },
  });

  return {
    games: query.data ?? [],
    isLoading: query.isLoading,
    createGame: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    newGame: createMutation.data,
  };
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMultiplayerMatch, listMultiplayerGames, listMultiplayerMatches } from '../../api/multiplayer';
import type { MultiplayerVisibility } from '../../types/multiplayer';

export function useMultiplayerLobby() {
  const queryClient = useQueryClient();

  const gamesQuery = useQuery({
    queryKey: ['multiplayer-games'],
    queryFn: listMultiplayerGames,
    staleTime: 60 * 60 * 1000,
  });

  const matchesQuery = useQuery({
    queryKey: ['multiplayer-matches'],
    queryFn: listMultiplayerMatches,
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { gameKey: string; visibility: MultiplayerVisibility; maxPlayers: number }) =>
      createMultiplayerMatch(payload),
    onSuccess: (snapshot) => {
      queryClient.invalidateQueries({ queryKey: ['multiplayer-matches'] });
      queryClient.setQueryData(['multiplayer-match', snapshot.match.id], snapshot);
    },
  });

  return {
    games: gamesQuery.data ?? [],
    matches: matchesQuery.data ?? [],
    isLoadingGames: gamesQuery.isLoading,
    isLoadingMatches: matchesQuery.isLoading,
    createMatch: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

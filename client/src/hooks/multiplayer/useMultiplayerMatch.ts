import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMultiplayerMatch,
  joinMultiplayerMatch,
  leaveMultiplayerMatch,
  moveMultiplayerMatch,
  restartMultiplayerMatch,
  startMultiplayerMatch,
} from '../../api/multiplayer';
import { useMultiplayerRealtime } from './useMultiplayerRealtime';

export function useMultiplayerMatch(matchId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['multiplayer-match', matchId],
    queryFn: () => getMultiplayerMatch(matchId),
  });

  useMultiplayerRealtime(matchId);

  const joinMutation = useMutation({
    mutationFn: () => joinMultiplayerMatch(matchId),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(['multiplayer-match', matchId], snapshot);
      queryClient.invalidateQueries({ queryKey: ['multiplayer-matches'] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveMultiplayerMatch(matchId),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(['multiplayer-match', matchId], snapshot);
      queryClient.invalidateQueries({ queryKey: ['multiplayer-matches'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => startMultiplayerMatch(matchId),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(['multiplayer-match', matchId], snapshot);
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => restartMultiplayerMatch(matchId),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(['multiplayer-match', matchId], snapshot);
      queryClient.invalidateQueries({ queryKey: ['multiplayer-matches'] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: (payload: { type: string; args?: unknown[] }) => moveMultiplayerMatch(matchId, payload),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(['multiplayer-match', matchId], snapshot);
    },
  });

  return {
    snapshot: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    joinMatch: joinMutation.mutateAsync,
    leaveMatch: leaveMutation.mutateAsync,
    startMatch: startMutation.mutateAsync,
    restartMatch: restartMutation.mutateAsync,
    sendMove: moveMutation.mutateAsync,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
    isStarting: startMutation.isPending,
    isRestarting: restartMutation.isPending,
    isSendingMove: moveMutation.isPending,
  };
}

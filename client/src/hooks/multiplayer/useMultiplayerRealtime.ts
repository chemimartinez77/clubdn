import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createMultiplayerEventSource } from '../../api/multiplayer';
import type { MultiplayerMatchSnapshot } from '../../types/multiplayer';

export function useMultiplayerRealtime(matchId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!matchId) {
      return undefined;
    }

    const updateSnapshot = (snapshot: MultiplayerMatchSnapshot) => {
      queryClient.setQueryData(['multiplayer-match', matchId], snapshot);
      queryClient.invalidateQueries({ queryKey: ['multiplayer-matches'] });
    };

    const source = createMultiplayerEventSource(matchId, {
      'match:state': updateSnapshot,
      'match:player-joined': updateSnapshot,
      'match:player-left': updateSnapshot,
      'match:started': updateSnapshot,
      'match:move-applied': updateSnapshot,
      'match:finished': updateSnapshot,
    });

    return () => {
      source.close();
    };
  }, [matchId, queryClient]);
}

// client/src/hooks/useTour.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { ApiResponse } from '../types/auth';
import type { UserProfile } from '../types/profile';

export function useTour() {
  const queryClient = useQueryClient();
  const [shouldShow, setShouldShow] = useState(false);

  const { data: profile, isSuccess } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>('/api/profile/me');
      return response.data.data?.profile;
    },
    staleTime: 5 * 60 * 1000
  });

  // Mostrar el tour si el perfil está cargado y tourDismissed es false
  useEffect(() => {
    if (isSuccess && profile && !profile.tourDismissed) {
      // Pequeño delay para que el DOM esté listo
      const timer = setTimeout(() => setShouldShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, profile]);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/profile/me/tour-dismiss');
    },
    onSuccess: () => {
      queryClient.setQueryData(['myProfile'], (old: UserProfile | undefined) => {
        if (!old) return old;
        return { ...old, tourDismissed: true };
      });
    }
  });

  const dismissTour = useCallback((permanent: boolean) => {
    setShouldShow(false);
    if (permanent) {
      dismissMutation.mutate();
    }
  }, [dismissMutation]);

  return { shouldShow, dismissTour };
}

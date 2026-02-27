// client/src/hooks/useTour.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { ApiResponse } from '../types/auth';
import type { UserProfile } from '../types/profile';

export type TourKey = 'home' | 'calendar' | 'feedback' | 'createPartida';

const TOUR_FIELD: Record<TourKey, keyof UserProfile> = {
  home: 'tourDismissed',
  calendar: 'calendarTourDismissed',
  feedback: 'feedbackTourDismissed',
  createPartida: 'createPartidaTourDismissed'
};

export function useTour(tourKey: TourKey) {
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

  const field = TOUR_FIELD[tourKey];

  useEffect(() => {
    if (isSuccess && profile && !profile[field]) {
      const timer = setTimeout(() => setShouldShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, profile, field]);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/profile/me/tour-dismiss', { tour: tourKey });
    },
    onSuccess: () => {
      queryClient.setQueryData(['myProfile'], (old: UserProfile | undefined) => {
        if (!old) return old;
        return { ...old, [field]: true };
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

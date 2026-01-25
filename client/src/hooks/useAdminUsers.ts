// client/src/hooks/useAdminUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: string;
  approvedByName?: string | null;
  rejectedByName?: string | null;
}

export const useAdminUsers = () => {
  const queryClient = useQueryClient();

  // Query para obtener usuarios pendientes
  const { data: pendingUsers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      const response = await api.get('/api/admin/pending-approvals');
      return response.data.data as PendingUser[];
    },
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  // Mutation para aprobar usuario
  const approveMutation = useMutation({
    mutationFn: async ({ userId, customMessage }: { userId: string; customMessage?: string }) => {
      const response = await api.post(`/api/admin/approve/${userId}`, { customMessage });
      return response.data;
    },
    onSuccess: () => {
      // Invalidar y refetch de usuarios pendientes
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    },
  });

  // Mutation para rechazar usuario
  const rejectMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
      customMessage
    }: {
      userId: string;
      reason?: string;
      customMessage?: string
    }) => {
      const response = await api.post(`/api/admin/reject/${userId}`, {
        reason,
        customMessage
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidar y refetch de usuarios pendientes
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    },
  });

  return {
    pendingUsers,
    isLoading,
    error,
    refetch,
    approveUser: approveMutation.mutate,
    rejectUser: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
};

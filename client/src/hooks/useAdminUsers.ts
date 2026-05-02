// client/src/hooks/useAdminUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: string;
  emailVerified: boolean;
  verificationEmailSentAt?: string | null;
  tokenExpiry?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
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
    mutationFn: async ({ userId, membershipType, customMessage }: { userId: string; membershipType: string; customMessage?: string }) => {
      const response = await api.post(`/api/admin/approve/${userId}`, { membershipType, customMessage });
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

  const revokeMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await api.post(`/api/admin/revoke-registration/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const response = await api.post(`/api/admin/resend-verification/${userId}`);
      return response.data;
    },
    onSuccess: () => {
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
    revokeRegistration: revokeMutation.mutate,
    resendVerification: resendVerificationMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isRevoking: revokeMutation.isPending,
    isResendingVerification: resendVerificationMutation.isPending,
  };
};

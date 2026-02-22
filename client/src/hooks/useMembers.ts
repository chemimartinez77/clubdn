// client/src/hooks/useMembers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { MembersResponse, MemberFilters } from '../types/members';
import type { ApiResponse } from '../types/auth';

export const useMembers = (filters: MemberFilters) => {
  const queryClient = useQueryClient();

  // Build query string from filters
  const queryString = new URLSearchParams({
    search: filters.search || '',
    membershipType: filters.membershipType || 'all',
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
    paymentStatus: filters.paymentStatus || 'all',
    page: filters.page.toString(),
    pageSize: filters.pageSize.toString(),
  }).toString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['members', filters],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MembersResponse>>(
        `/api/admin/members?${queryString}`
      );
      return response.data.data;
    },
  });

  const markAsBajaMutation = useMutation({
    mutationFn: async ({ memberId, fechaBaja }: { memberId: string; fechaBaja?: string }) => {
      const response = await api.post(`/api/admin/members/${memberId}/mark-baja`, {
        fechaBaja,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const reactivateMemberMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const response = await api.post(`/api/admin/members/${memberId}/reactivate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const exportCSV = async () => {
    const exportQueryString = new URLSearchParams({
      search: filters.search || '',
      membershipType: filters.membershipType || 'all',
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
      paymentStatus: filters.paymentStatus || 'all',
    }).toString();

    try {
      const response = await api.get(`/api/admin/members/export/csv?${exportQueryString}`, {
        responseType: 'blob',
      });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', 'miembros.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      console.error('Error al exportar CSV');
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    markAsBaja: markAsBajaMutation.mutate,
    isMarkingBaja: markAsBajaMutation.isPending,
    reactivateMember: reactivateMemberMutation.mutate,
    isReactivating: reactivateMemberMutation.isPending,
    exportCSV,
  };
};

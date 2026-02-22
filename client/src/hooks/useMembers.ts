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

  const exportCSV = () => {
    const exportQueryString = new URLSearchParams({
      search: filters.search || '',
      membershipType: filters.membershipType || 'all',
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
      paymentStatus: filters.paymentStatus || 'all',
    }).toString();

    window.open(
      `${api.defaults.baseURL}/api/admin/members/export/csv?${exportQueryString}`,
      '_blank'
    );
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

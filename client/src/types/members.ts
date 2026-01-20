// client/src/types/members.ts
export type MembershipTypeFilter = 'SOCIO' | 'COLABORADOR' | 'BAJA' | 'all';
export type PaymentStatusType = 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO';
export type PaymentStatusFilter = PaymentStatusType | 'all';

export interface MemberData {
  id: string;
  name: string;
  email: string;
  membershipType: 'SOCIO' | 'COLABORADOR' | 'BAJA' | null;
  startDate: string | null;
  fechaBaja: string | null;
  paymentStatus: PaymentStatusType;
  monthlyFee: number | null;
  phone: string | null;
  lastPaymentDate: string | null;
}

export interface MemberFilters {
  search: string;
  membershipType: MembershipTypeFilter;
  dateFrom: string;
  dateTo: string;
  paymentStatus: PaymentStatusFilter;
  page: number;
  pageSize: number;
}

export interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalMembers: number;
  totalPages: number;
}

export interface MembersResponse {
  members: MemberData[];
  pagination: PaginationData;
}

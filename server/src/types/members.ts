// server/src/types/members.ts
export interface MemberFilters {
  search?: string;
  membershipType?: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | 'all';
  interests?: string[];
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO' | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'startDate' | 'paymentStatus';
  sortDir?: 'asc' | 'desc';
}

export interface MemberData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipType: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | null;
  startDate: string | null;
  fechaBaja: string | null;
  paymentStatus: 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO' | null;
  phone: string | null;
  clubInterests: string[];
  lastPaymentDate: string | null;
  showTrialPromotionWarning: boolean;
  trialPromotionWarningDate: string | null;
}

export interface MembersResponse {
  members: MemberData[];
  interestCounts: Array<{
    key: string;
    count: number;
  }>;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalMembers: number;
    totalPages: number;
  };
}

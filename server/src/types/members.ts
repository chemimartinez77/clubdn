// server/src/types/members.ts
export interface MemberFilters {
  search?: string;
  membershipType?: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | 'all';
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: 'al_dia' | 'con_retrasos' | 'all';
  page?: number;
  pageSize?: number;
}

export interface MemberData {
  id: string;
  name: string;
  email: string;
  membershipType: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | null;
  startDate: string | null;
  fechaBaja: string | null;
  paymentStatus: 'al_dia' | 'con_retrasos';
  monthlyFee: number | null;
  phone: string | null;
  lastPaymentDate: string | null;
}

export interface MembersResponse {
  members: MemberData[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalMembers: number;
    totalPages: number;
  };
}

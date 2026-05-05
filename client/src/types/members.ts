// client/src/types/members.ts
export type MembershipTypeFilter = 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | 'all';
export type PaymentStatusType = 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO';
export type PaymentStatusFilter = PaymentStatusType | 'all';

export interface MemberData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  membershipType: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | null;
  startDate: string | null;
  fechaBaja: string | null;
  paymentStatus: PaymentStatusType;
  phone: string | null;
  clubInterests: string[];
  lastPaymentDate: string | null;
  showTrialPromotionWarning: boolean;
  trialPromotionWarningDate: string | null;
}

export interface MemberProfileInfo {
  id: string;
  avatar: string | null;
  firstName: string | null;
  lastName: string | null;
  dni: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  iban: string | null;
  clubInterests: string[];
  imageConsentActivities: boolean;
  imageConsentSocial: boolean;
  accessCombatZone: boolean;
}

export interface MemberReliability {
  responseRate: number | null;      // % eventos organizados donde respondió (null si no hay datos)
  organizedAsked: number;
  organizedAnswered: number;
  attendanceRate: number | null;    // % participaciones confirmadas (null si no hay datos)
  confirmedRegistrations: number;
  lateCancellations: number;
}

export interface MemberProfileDetails {
  id: string;
  name: string;
  email: string;
  membershipType: 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA' | null;
  startDate: string | null;
  fechaBaja: string | null;
  paymentStatus: PaymentStatusType;
  showTrialPromotionWarning: boolean;
  trialPromotionWarningDate: string | null;
  notes: string | null;
  profile: MemberProfileInfo;
  reliability: MemberReliability;
}

export interface MemberProfileResponse {
  member: MemberProfileDetails;
}

export interface MemberFilters {
  search: string;
  membershipType: MembershipTypeFilter;
  interests: string[];
  dateFrom: string;
  dateTo: string;
  paymentStatus: PaymentStatusFilter;
  page: number;
  pageSize: number;
  sortBy: 'firstName' | 'lastName' | 'email' | 'startDate' | 'paymentStatus';
  sortDir: 'asc' | 'desc';
}

export interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalMembers: number;
  totalPages: number;
}

export interface MembersResponse {
  members: MemberData[];
  interestCounts: Array<{
    key: string;
    count: number;
  }>;
  pagination: PaginationData;
}

// client/src/types/membership.ts
export type MembershipType = 'COLABORADOR' | 'SOCIO' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA';
export type PaymentStatus = 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO';

export interface Membership {
  id: string;
  userId: string;
  type: MembershipType;
  startDate: string;
  becameSocioAt: string | null;
  isActive: boolean;
  lastPaymentDate: string | null;
  nextPaymentDue: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  month: number;
  year: number;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  registeredBy: string;
  paidAt: string;
  createdAt: string;
}

export interface UserWithMembership {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  membership: Membership | null;
  monthsAsMember: number;
  canBecomeSocio: boolean;
  paymentsByMonth: { [key: number]: boolean };
  paidMonths: number;
  status: PaymentStatus;
  showTrialPromotionWarning: boolean;
  trialPromotionWarningDate: string | null;
}

export interface UsersMembershipResponse {
  year: number;
  users: UserWithMembership[];
  isCurrentMonthConsolidated: boolean;
  consolidatedAt: string | null;
  consolidatedBy: string | null;
}

export interface PaymentStatusUser {
  id: string;
  name: string;
  email: string;
  membershipType: MembershipType | null;
  monthlyFee: number | null;
  hasPaid: boolean;
  paymentDate: string | null;
}

export interface PaymentStatusResponse {
  currentMonth: number;
  currentYear: number;
  summary: {
    total: number;
    paid: number;
    pending: number;
  };
  users: PaymentStatusUser[];
}

export interface RegisterPaymentData {
  userId: string;
  month: number;
  year: number;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface TogglePaymentData {
  userId: string;
  month: number;
  year: number;
}

export interface MarkFullYearData {
  userId: string;
  year: number;
}

export interface RecentBaja {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  fechaBaja: string | null;
  membershipType: MembershipType;
}

export interface RecentBajasResponse {
  desde: string;
  hasta: string;
  label: string;
  total: number;
  bajas: RecentBaja[];
}

export interface SepaSinMandatoMember {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  iban: string | null;
  membershipType: MembershipType;
  hasMandateRef: boolean;
  hasMandateDate: boolean;
}

export interface SepaSinMandatoResponse {
  total: number;
  members: SepaSinMandatoMember[];
}

export interface ConsolidateCurrentMonthResponse {
  consolidatedAt: string;
  consolidatedBy: string;
  count: number;
  memberNames: string[];
  isCurrentMonthConsolidated: boolean;
}

export type SepaFilterType = 'SOCIO' | 'COLABORADOR' | 'FAMILIAR';

export interface SepaDownloadParams {
  month: number;
  year: number;
  includeIncomplete?: boolean;
  types?: SepaFilterType[];
  memberIds?: string[];
}

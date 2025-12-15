// client/src/types/membership.ts
export type MembershipType = 'COLABORADOR' | 'SOCIO';
export type PaymentStatus = 'Nuevo' | 'En tiempo' | 'Pendiente' | 'Retraso' | 'Año completo';

export interface Membership {
  id: string;
  userId: string;
  type: MembershipType;
  monthlyFee: number;
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
  email: string;
  membership: Membership | null;
  monthsAsMember: number;
  canBecomeSocio: boolean;
  paymentsByMonth: { [key: number]: boolean };
  paidMonths: number;
  status: PaymentStatus;
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

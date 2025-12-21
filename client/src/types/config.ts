// client/src/types/config.ts

export type MembershipType = 'SOCIO' | 'COLABORADOR' | 'FAMILIAR' | 'EN_PRUEBAS' | 'BAJA';

export interface MembershipTypeConfig {
  type: MembershipType;
  displayName: string;
  price: number;
  hasKey: boolean;
  description: string;
}

export interface ClubConfig {
  id: string;
  clubName: string;
  clubEmail?: string;
  clubPhone?: string;
  clubAddress?: string;
  membershipTypes: MembershipTypeConfig[];
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubConfigUpdate {
  clubName?: string;
  clubEmail?: string;
  clubPhone?: string;
  clubAddress?: string;
  membershipTypes?: MembershipTypeConfig[];
  defaultCurrency?: string;
}

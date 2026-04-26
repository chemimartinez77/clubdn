import { UserRole } from '@prisma/client';

export type EffectiveUserRole = UserRole | 'CHEMI';

export const isAdminLikeRole = (role?: EffectiveUserRole | null): boolean =>
  role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === 'CHEMI';

export const isElevatedRole = (role?: EffectiveUserRole | null): boolean =>
  role === UserRole.SUPER_ADMIN || role === 'CHEMI';

export const isChemiRole = (role?: EffectiveUserRole | null): boolean =>
  role === 'CHEMI';

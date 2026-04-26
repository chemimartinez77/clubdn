import type { UserRole } from '../types/auth';

export const isAdminRole = (role?: UserRole | null): boolean =>
  role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'CHEMI';

export const isElevatedRole = (role?: UserRole | null): boolean =>
  role === 'SUPER_ADMIN' || role === 'CHEMI';

export const isChemiRole = (role?: UserRole | null): boolean =>
  role === 'CHEMI';

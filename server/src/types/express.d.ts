// server/src/types/express.d.ts
import { MembershipType } from '@prisma/client';
import type { EffectiveUserRole } from '../utils/roles';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: EffectiveUserRole;
        impersonatedBy?: string;
      };
      membership?: {
        id: string;
        type: MembershipType;
        isActive: boolean;
      };
    }
  }
}

export {};

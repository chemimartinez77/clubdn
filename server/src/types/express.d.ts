// server/src/types/express.d.ts
import { UserRole, MembershipType } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
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

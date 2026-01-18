// server/src/utils/invitationToken.ts
import { createHash, randomBytes } from 'crypto';

export const generateInvitationToken = (): string => {
  return randomBytes(32).toString('hex');
};

export const hashInvitationToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

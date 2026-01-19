// server/src/utils/invitationToken.ts
import { randomBytes } from 'crypto';

export const generateInvitationToken = (): string => {
  return randomBytes(32).toString('hex');
};

import type { EffectiveUserRole } from './roles';
import { isChemiRole } from './roles';

export const MAGIC_THE_GATHERING_BGG_ID = '463';

export const isMagicTheGatheringBggId = (bggId?: string | null): boolean =>
  bggId === MAGIC_THE_GATHERING_BGG_ID;

export const resolveAllowLateJoin = (
  requestedValue: unknown,
  bggId: string | null | undefined,
  role?: EffectiveUserRole | null
): boolean => {
  if (isMagicTheGatheringBggId(bggId)) {
    return true;
  }

  if (isChemiRole(role)) {
    return requestedValue === true || requestedValue === 'true';
  }

  return false;
};

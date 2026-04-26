export const MAGIC_THE_GATHERING_BGG_ID = '463';

export const isMagicTheGatheringBggId = (bggId?: string | null): boolean =>
  bggId === MAGIC_THE_GATHERING_BGG_ID;

import { prisma } from './database';

export const LOAN_DURATION_DAYS = 14; // fallback si no hay config en DB

export async function getLoanConfig(): Promise<{
  loanEnabled: boolean;
  loanDurationDays: number;
  loanQueueNotifyHours: number;
}> {
  const config = await prisma.clubConfig.findUnique({
    where: { id: 'club_config' },
    select: { loanEnabled: true, loanDurationDays: true, loanQueueNotifyHours: true }
  });
  return {
    loanEnabled: config?.loanEnabled ?? false,
    loanDurationDays: config?.loanDurationDays ?? LOAN_DURATION_DAYS,
    loanQueueNotifyHours: config?.loanQueueNotifyHours ?? 48,
  };
}

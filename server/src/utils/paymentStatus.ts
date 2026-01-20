// server/src/utils/paymentStatus.ts
export type PaymentStatusKey = 'NUEVO' | 'PENDIENTE' | 'IMPAGADO' | 'PAGADO' | 'ANO_COMPLETO';

export interface PaymentMonth {
  month: number;
  year: number;
}

const getMonthKey = (month: number, year: number) => `${year}-${month.toString().padStart(2, '0')}`;

const getCycleStart = (startDate: Date, now: Date) => {
  const startMonth = startDate.getMonth() + 1;
  const startYear = startDate.getFullYear();
  let monthsDiff = (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth);
  if (now.getDate() < startDate.getDate()) {
    monthsDiff -= 1;
  }
  const cycleIndex = Math.max(0, Math.floor(monthsDiff / 12));
  const totalMonths = (startMonth - 1) + cycleIndex * 12;
  const year = startYear + Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return { year, month };
};

export const getCycleMonths = (startDate: Date, now: Date) => {
  const cycleStart = getCycleStart(startDate, now);
  const months: PaymentMonth[] = [];
  for (let i = 0; i < 12; i += 1) {
    const totalMonths = (cycleStart.month - 1) + i;
    const year = cycleStart.year + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    months.push({ month, year });
  }
  return months;
};

export const getPaymentStatus = ({
  payments,
  startDate,
  now = new Date()
}: {
  payments: PaymentMonth[];
  startDate?: Date | null;
  now?: Date;
}): PaymentStatusKey => {
  if (payments.length === 0) {
    return 'NUEVO';
  }

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();

  const hasCurrent = payments.some(p => p.month === currentMonth && p.year === currentYear);
  const hasPrev = payments.some(p => p.month === prevMonth && p.year === prevYear);

  if (startDate) {
    const cycleMonths = getCycleMonths(startDate, now);
    const paidSet = new Set(payments.map(p => getMonthKey(p.month, p.year)));
    const hasFullCycle = cycleMonths.every(month => paidSet.has(getMonthKey(month.month, month.year)));
    if (hasFullCycle) {
      return 'ANO_COMPLETO';
    }
  }

  let shouldCheckPrev = true;
  if (startDate) {
    const startKey = startDate.getFullYear() * 12 + (startDate.getMonth() + 1);
    const prevKey = prevYear * 12 + prevMonth;
    shouldCheckPrev = prevKey >= startKey;
  }

  if (shouldCheckPrev && !hasPrev) {
    return 'IMPAGADO';
  }

  if (hasCurrent) {
    return 'PAGADO';
  }

  return 'PENDIENTE';
};

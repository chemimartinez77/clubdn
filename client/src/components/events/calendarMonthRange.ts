export function getMonthGridRange(currentMonth: Date) {
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const gridStart = new Date(monthStart);
  const startOffset = (gridStart.getDay() + 6) % 7;
  gridStart.setDate(gridStart.getDate() - startOffset);
  gridStart.setHours(0, 0, 0, 0);

  const gridEnd = new Date(monthEnd);
  const endOffset = (7 - ((gridEnd.getDay() + 6) % 7) - 1 + 7) % 7;
  gridEnd.setDate(gridEnd.getDate() + endOffset);
  gridEnd.setHours(23, 59, 59, 999);

  return { monthStart, monthEnd, gridStart, gridEnd };
}

export function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

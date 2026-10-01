/**
 * Money formatting.
 * Shillings are whole numbers. A habit is judged against the surplus floor.
 */
const kesFormat = new Intl.NumberFormat("en-KE", {
  style: "decimal",
  maximumFractionDigits: 0,
});

/** Whole shillings, grouped, without a currency symbol. */
export function formatKes(amountKes: number): string {
  return `KES ${kesFormat.format(Math.round(amountKes))}`;
}

/**
 * Share of the safe floor, as a whole percent.
 * Amina's draft is 1,500 of a 2,000 floor, which is 75.
 */
export function habitPercentOfFloor(habitKes: number, floorKes: number): number {
  if (floorKes <= 0) return 0;
  return Math.round((habitKes / floorKes) * 100);
}

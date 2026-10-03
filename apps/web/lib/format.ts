import { localeTag, type Locale } from "./i18n";

/**
 * Money formatting.
 * Shillings are whole numbers. A habit is judged against the surplus floor.
 * The KES label stays the same in both languages. Grouping follows the locale.
 */
const numberFormats = new Map<Locale, Intl.NumberFormat>();

function numberFormat(locale: Locale): Intl.NumberFormat {
  const existing = numberFormats.get(locale);
  if (existing) return existing;
  const created = new Intl.NumberFormat(localeTag(locale), {
    style: "decimal",
    maximumFractionDigits: 0,
  });
  numberFormats.set(locale, created);
  return created;
}

/** Whole numbers, grouped for the active locale. */
export function formatNumber(amount: number, locale: Locale = "en"): string {
  return numberFormat(locale).format(Math.round(amount));
}

/** Whole shillings, grouped, with a KES prefix. */
export function formatKes(amountKes: number, locale: Locale = "en"): string {
  return `KES ${formatNumber(amountKes, locale)}`;
}

/** Calendar date such as 3 Oct 2026, in the active locale. */
export function formatShortDate(value: Date | string | number, locale: Locale = "en"): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Share of the safe floor, as a whole percent.
 * Amina's draft is 1,500 of a 2,000 floor, which is 75.
 */
export function habitPercentOfFloor(habitKes: number, floorKes: number): number {
  if (floorKes <= 0) return 0;
  return Math.round((habitKes / floorKes) * 100);
}

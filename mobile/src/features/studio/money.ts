import { STUDIO_LIMITS } from './limits';

/**
 * USD text -> cents. "" -> `emptyValue`; "29.99" -> 2999; "29,5" -> 2950 (a decimal comma is
 * accepted); "$30" -> 3000. `NaN` when it is not a price with at most 2 decimals or exceeds the max.
 */
export function parseUsdToCents(text: string, emptyValue = 0): number {
  const cleaned = text.trim().replace(/^\$/, '').replace(',', '.');
  if (cleaned === '') return emptyValue;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > STUDIO_LIMITS.priceMaxCents ? Number.NaN : cents;
}

/** 2999 -> "29.99", 3000 -> "30", 0 -> "0" (the editable text of a price field). */
export function centsToUsdText(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '';
  const dollars = Math.round(cents) / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

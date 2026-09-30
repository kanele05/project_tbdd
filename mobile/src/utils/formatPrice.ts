/** Insert thousands separators: 1020 -> "1,020". */
function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a price stored in cents as USD: 5900 -> "$59", 7375 -> "$73.75", 102000 -> "$1,020".
 * Whole-dollar amounts drop the decimals, like in the design.
 */
export function formatPrice(cents: number): string {
  const safeCents = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const dollars = Math.floor(safeCents / 100);
  const remainder = safeCents % 100;
  const base = `$${groupThousands(dollars)}`;
  if (remainder === 0) return base;
  return `${base}.${String(remainder).padStart(2, '0')}`;
}

/** Same as `formatPrice`, but returns "Free" for a zero price. */
export function formatPriceOrFree(cents: number, freeLabel = 'Free'): string {
  return cents <= 0 ? freeLabel : formatPrice(cents);
}

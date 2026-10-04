import { i18n } from '@/i18n';
import { formatFixed } from '@/i18n/format';

/**
 * Format a price stored in cents as USD: 5900 -> "$59", 7375 -> "$73.75", 102000 -> "$1,020".
 * Whole-dollar amounts drop the decimals, like in the design. The currency stays USD in every
 * language; only the digit grouping / decimal mark follow the UI language ("$1.020", "$73,75" in
 * Vietnamese).
 */
export function formatPrice(cents: number): string {
  const safeCents = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const hasCents = safeCents % 100 !== 0;
  return `$${formatFixed(safeCents / 100, hasCents ? 2 : 0)}`;
}

/** Same as `formatPrice`, but returns "Free" (translated) for a zero price. */
export function formatPriceOrFree(cents: number, freeLabel = i18n.t('common:free')): string {
  return cents <= 0 ? freeLabel : formatPrice(cents);
}

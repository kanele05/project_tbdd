import type { CartItemDto } from '@/types/api';

export type CartTotals = {
  /** Sum of the list prices (the struck-through price when a course is discounted). */
  subtotalCents: number;
  /** What the discounts save: `subtotalCents - totalCents`, never negative. */
  discountCents: number;
  totalCents: number;
};

/**
 * Subtotal / discount / total of the order summary on the PC cart and checkout. The total always
 * comes from the server (`totalCents`); the subtotal is the sum of the original prices.
 */
export function getCartTotals(items: readonly CartItemDto[], totalCents: number): CartTotals {
  const subtotalCents = items.reduce(
    (sum, { course }) => sum + Math.max(course.originalPriceCents ?? 0, course.priceCents),
    0,
  );
  return {
    subtotalCents: Math.max(subtotalCents, totalCents),
    discountCents: Math.max(0, subtotalCents - totalCents),
    totalCents,
  };
}

import { i18n } from '@/i18n';
import type { CourseSummary } from '@/types/api';

export type CourseBadgeInfo = {
  kind: 'BEST_SELLER' | 'DISCOUNT';
  label: string;
};

/** round((1 - price / original) * 100); 0 when there is no real discount (BR-10). */
export function calcDiscountPercent(priceCents: number, originalPriceCents: number | null): number {
  if (originalPriceCents == null || originalPriceCents <= 0 || originalPriceCents <= priceCents) {
    return 0;
  }
  return Math.round((1 - priceCents / originalPriceCents) * 100);
}

/**
 * Badge shown on course cards (BR-10): Best-seller wins over "{x}% Off".
 * Trusts the server's `badge`, but recomputes the percentage if the server omitted it.
 */
export function getCourseBadge(
  course: Pick<CourseSummary, 'badge' | 'discountPercent' | 'priceCents' | 'originalPriceCents'>,
): CourseBadgeInfo | null {
  if (course.badge === 'BEST_SELLER')
    return { kind: 'BEST_SELLER', label: i18n.t('common:badge.bestSeller') };
  if (course.badge === 'DISCOUNT') {
    const percent =
      course.discountPercent ?? calcDiscountPercent(course.priceCents, course.originalPriceCents);
    return percent > 0
      ? { kind: 'DISCOUNT', label: i18n.t('common:badge.discount', { percent }) }
      : null;
  }
  return null;
}

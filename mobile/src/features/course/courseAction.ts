import { i18n } from '@/i18n';
import type { CourseDetail } from '@/types/api';
import { calcDiscountPercent } from '@/utils/discount';
import { formatTotalHours } from '@/utils/formatDuration';

/** The single primary action of the course-details bottom bar (BR-17). */
export type CourseAction =
  'CONTINUE' | 'OPEN_COURSE' | 'ENROLL_FREE' | 'GO_TO_CART' | 'ADD_TO_CART';

/** Translated label of the bottom-bar button ("Add to cart", "Thêm vào giỏ"...). */
export function getCourseActionLabel(action: CourseAction): string {
  return i18n.t(`course:action.${action}`);
}

/**
 * BR-17: enrolled -> "Continue learning"; the course's own teacher (BR-23: cannot buy it) -> "Open
 * course"; price 0 -> "Enroll for free"; already in the cart -> "Go to cart"; otherwise "Add to cart".
 */
export function getCourseAction(
  course: Pick<CourseDetail, 'enrollment' | 'priceCents' | 'isInCart'>,
  isOwner = false,
): CourseAction {
  if (course.enrollment) return 'CONTINUE';
  if (isOwner) return 'OPEN_COURSE';
  if (course.priceCents <= 0) return 'ENROLL_FREE';
  if (course.isInCart) return 'GO_TO_CART';
  return 'ADD_TO_CART';
}

/** "x% Disc." value of the bottom bar - always computed with BR-10, never copied from the design. */
export function getDiscountPercent(
  course: Pick<CourseDetail, 'priceCents' | 'originalPriceCents'>,
): number {
  return calcDiscountPercent(course.priceCents, course.originalPriceCents);
}

/**
 * Benefits shown on the Overview tab: the video hours come from `totalDurationSec`, the rest from
 * `course.benefits`. A server-provided video-hours line is dropped (we compute our own) and
 * "Certificate" is dropped too because certificates are out of scope (BR-18).
 */
export function buildBenefits(
  course: Pick<CourseDetail, 'benefits' | 'totalDurationSec'>,
): string[] {
  const rest = course.benefits.filter((text) => !/video|certificate/i.test(text));
  if (course.totalDurationSec <= 0) return rest;
  return [
    i18n.t('course:overview.videoBenefit', { duration: formatTotalHours(course.totalDurationSec) }),
    ...rest,
  ];
}

import type { CourseDetail } from '@/types/api';
import { calcDiscountPercent } from '@/utils/discount';
import { formatTotalHours } from '@/utils/formatDuration';

/** The single primary action of the course-details bottom bar (BR-17). */
export type CourseAction = 'CONTINUE' | 'ENROLL_FREE' | 'GO_TO_CART' | 'ADD_TO_CART';

export const COURSE_ACTION_LABEL: Record<CourseAction, string> = {
  CONTINUE: 'Continue learning',
  ENROLL_FREE: 'Enroll for free',
  GO_TO_CART: 'Go to cart',
  ADD_TO_CART: 'Add to cart',
};

/**
 * BR-17: enrolled -> "Continue learning"; price 0 -> "Enroll for free"; already in the cart ->
 * "Go to cart"; otherwise "Add to cart".
 */
export function getCourseAction(
  course: Pick<CourseDetail, 'enrollment' | 'priceCents' | 'isInCart'>,
): CourseAction {
  if (course.enrollment) return 'CONTINUE';
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
  return [`${formatTotalHours(course.totalDurationSec)} on-demand video`, ...rest];
}

export type BenefitIcon =
  | { family: 'feather'; name: 'video' | 'globe' | 'file-text' | 'clock' | 'check-circle' }
  | { family: 'ionicons'; name: 'checkmark-done' };

/** Picks the design's icon from the benefit text (video, globe, document, clock, double check). */
export function getBenefitIcon(text: string): BenefitIcon {
  if (/video|hour/i.test(text)) return { family: 'feather', name: 'video' };
  if (/teacher|native|language/i.test(text)) return { family: 'feather', name: 'globe' };
  if (/document|file|resource/i.test(text)) return { family: 'feather', name: 'file-text' };
  if (/lifetime|access|time/i.test(text)) return { family: 'feather', name: 'clock' };
  if (/support/i.test(text)) return { family: 'ionicons', name: 'checkmark-done' };
  return { family: 'feather', name: 'check-circle' };
}

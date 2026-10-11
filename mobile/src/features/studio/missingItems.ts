import { tr } from '@/i18n';
import type { CourseMissingCode, CourseMissingItemDto } from '@/types/api';

import type { WizardStep } from './wizardSteps';

const STEP_OF_CODE: Record<CourseMissingCode, WizardStep> = {
  TITLE_LENGTH: 'idea',
  NO_CATEGORY: 'idea',
  DESCRIPTION_TOO_SHORT: 'intro',
  NO_THUMBNAIL: 'intro',
  PRICE_INVALID: 'price',
  ORIGINAL_PRICE_INVALID: 'price',
  NO_SECTION: 'lessons',
  NOT_ENOUGH_LESSONS: 'lessons',
  LESSON_VIDEO_INVALID: 'lessons',
  LESSON_DURATION_INVALID: 'lessons',
  PREVIEW_COUNT: 'lessons',
};

/** The wizard step (SC-24) where an unmet submit requirement is fixed. */
export function getMissingStep(code: CourseMissingCode): WizardStep {
  return STEP_OF_CODE[code];
}

/** Human-readable sentence (current language) for one item of the BR-20 checklist. */
export function describeMissing(item: CourseMissingItemDto): string {
  return tr(`studio:missing.${item.code}`, { number: item.lessonNumber ?? 0 });
}

/**
 * `details.missing` of a 422 `COURSE_INCOMPLETE` response, or `[]` when the error carries none
 * (so the screen can fall back to the generic message).
 */
export function getMissingFromError(details: unknown): CourseMissingItemDto[] {
  if (typeof details !== 'object' || details === null) return [];
  const missing = (details as { missing?: unknown }).missing;
  if (!Array.isArray(missing)) return [];
  return missing.filter(
    (item): item is CourseMissingItemDto =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { code?: unknown }).code === 'string',
  );
}

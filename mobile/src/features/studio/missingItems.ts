import { tr } from '@/i18n';
import type { CourseMissingCode, CourseMissingItemDto } from '@/types/api';

/** Where the teacher fixes an unmet submit requirement. */
export type MissingTarget = 'edit' | 'curriculum';

const CURRICULUM_CODES: ReadonlySet<CourseMissingCode> = new Set([
  'NO_SECTION',
  'NOT_ENOUGH_LESSONS',
  'LESSON_VIDEO_INVALID',
  'LESSON_DURATION_INVALID',
  'PREVIEW_COUNT',
]);

export function getMissingTarget(code: CourseMissingCode): MissingTarget {
  return CURRICULUM_CODES.has(code) ? 'curriculum' : 'edit';
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

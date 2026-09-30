import type { CourseSummary } from '@/types/api';

/** Sample course used by component tests (not shipped in the UI). */
export function makeCourse(overrides: Partial<CourseSummary> = {}): CourseSummary {
  return {
    id: 'course-1',
    title: 'PHP in One Click',
    thumbnailUrl: 'https://example.com/php.png',
    teacher: { id: 'teacher-1', fullName: 'Ramono Wultschner' },
    priceCents: 5900,
    originalPriceCents: null,
    badge: null,
    discountPercent: null,
    ratingAvg: 4.5,
    ratingCount: 1233,
    lessonCount: 18,
    totalDurationSec: 8700,
    isBookmarked: false,
    ...overrides,
  };
}

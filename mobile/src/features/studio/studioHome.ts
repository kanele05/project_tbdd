import { router } from 'expo-router';

import type { CourseStatus, StudioCourseSummaryDto } from '@/types/api';

/** The status filter of the Studio list (`all` = no filter). */
export type StatusFilter = CourseStatus | 'all';

export const STATUS_FILTERS: readonly StatusFilter[] = [
  'all',
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
];

export function openCourse(course: StudioCourseSummaryDto): void {
  router.push({ pathname: '/studio/[id]', params: { id: course.id } });
}

export function createCourse(): void {
  router.push({ pathname: '/studio/[id]/edit', params: { id: 'new' } });
}

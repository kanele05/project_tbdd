import type { MyCoursesStatus } from '@/types/api';

/** Tabs of the My Courses screen, in display order (labels: `myCourses:tabs.<key>`). */
export const MY_COURSES_TAB_KEYS = [
  'all',
  'ongoing',
  'completed',
] as const satisfies readonly MyCoursesStatus[];

/** Query param `?tab=` the Profile screen navigates with. */
export function parseTabParam(value: string | string[] | undefined): MyCoursesStatus | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'all' || raw === 'ongoing' || raw === 'completed' ? raw : null;
}

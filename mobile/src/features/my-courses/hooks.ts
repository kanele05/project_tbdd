import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import { queryKeys } from '@/lib/queryKeys';
import type { MyCoursesStatus } from '@/types/api';

import { myCoursesApi } from './api';

/**
 * `GET /me/courses?status=` (persisted, staleTime 0 - PLAN.md §10). The screen refetches when it
 * gets focus, so a lesson finished a moment ago shows the new percentage.
 */
export function useMyCourses(status: MyCoursesStatus) {
  return useQuery({
    queryKey: queryKeys.meCourses(status),
    queryFn: () => myCoursesApi.list(status),
    staleTime: STALE_TIME.myCourses,
  });
}

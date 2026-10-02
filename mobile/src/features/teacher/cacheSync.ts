import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import type { CourseDetail, TeacherDetail } from '@/types/api';

/** `[key, previousData]` pairs captured before an optimistic write, used to roll back. */
export type CacheSnapshot = [QueryKey, unknown][];

/** `['course', id]` = the `GET /courses/:id` entry (not curriculum / reviews / ...). */
function isCourseDetailQuery(query: Query): boolean {
  return query.queryKey.length === 2 && query.queryKey[0] === 'course';
}

export type FollowPatch = {
  isFollowed: boolean;
  /** Authoritative count from the server; when omitted the cached count is adjusted by +/- 1. */
  followerCount?: number;
};

/**
 * Write the follow state of a teacher into every cache that shows it (PLAN.md §10):
 * `['teacher', id]` (isFollowed + stats.followerCount) and every cached `['course', id]` whose
 * `teacher.id` matches (SC-09 Overview "Follow" button).
 *
 * @returns the previous values (for `restoreSnapshot`) - empty when nothing was cached.
 */
export function patchFollowInCaches(
  queryClient: QueryClient,
  teacherId: string,
  patch: FollowPatch,
): CacheSnapshot {
  const snapshot: CacheSnapshot = [];

  const teacherKey = queryKeys.teacher(teacherId);
  const teacher = queryClient.getQueryData<TeacherDetail>(teacherKey);
  if (teacher) {
    snapshot.push([teacherKey, teacher]);
    const delta = teacher.isFollowed === patch.isFollowed ? 0 : patch.isFollowed ? 1 : -1;
    queryClient.setQueryData<TeacherDetail>(teacherKey, {
      ...teacher,
      isFollowed: patch.isFollowed,
      stats: {
        ...teacher.stats,
        followerCount: patch.followerCount ?? Math.max(0, teacher.stats.followerCount + delta),
      },
    });
  }

  const courses = queryClient.getQueriesData<CourseDetail>({ predicate: isCourseDetailQuery });
  for (const [key, course] of courses) {
    if (course?.teacher?.id !== teacherId) continue;
    snapshot.push([key, course]);
    queryClient.setQueryData<CourseDetail>(key, {
      ...course,
      teacher: { ...course.teacher, isFollowed: patch.isFollowed },
    });
  }

  return snapshot;
}

/** Put back the values captured by `patchFollowInCaches`. */
export function restoreSnapshot(queryClient: QueryClient, snapshot: CacheSnapshot): void {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

/** Refetch what the follow toggle touched: the teacher detail and the teacher's course details. */
export function invalidateFollowCaches(queryClient: QueryClient, teacherId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.teacher(teacherId), exact: true });
  void queryClient.invalidateQueries({
    predicate: (query) =>
      isCourseDetailQuery(query) &&
      (query.state.data as CourseDetail | undefined)?.teacher?.id === teacherId,
  });
}

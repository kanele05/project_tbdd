import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import type { AppError } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import type {
  AdminCourseDetailDto,
  AdminCourseListParams,
  AdminStatsDto,
  AdminUserDto,
  AdminUserListParams,
  AdminUsersPage,
  AiCourseReviewDto,
  AiLang,
  DisableUserRequest,
  ModerationReasonRequest,
  RejectCourseRequest,
} from '@/types/api';

import { adminApi } from './api';

/** Data in the admin area changes under the admin's feet (other admins, teachers): keep it fresh. */
const ADMIN_STALE_TIME = STALE_TIME.submissions;

/** `GET /admin/stats` (SC-31). */
export function useAdminStats() {
  return useQuery<AdminStatsDto, AppError>({
    queryKey: queryKeys.adminStats(),
    queryFn: () => adminApi.stats(),
    staleTime: ADMIN_STALE_TIME,
  });
}

/** `GET /admin/courses` (SC-32), infinite. */
export function useAdminCourses(params: AdminCourseListParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminCourses(params),
    queryFn: ({ pageParam }) => adminApi.courses({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) => (meta.page < meta.totalPages ? meta.page + 1 : undefined),
    staleTime: ADMIN_STALE_TIME,
  });
}

/** `GET /admin/courses/:id` (SC-33). */
export function useAdminCourse(courseId: string) {
  return useQuery<AdminCourseDetailDto, AppError>({
    queryKey: queryKeys.adminCourse(courseId),
    queryFn: () => adminApi.course(courseId),
    staleTime: ADMIN_STALE_TIME,
    enabled: courseId.length > 0,
  });
}

/**
 * `GET /admin/courses/:id/ai-review` - runs only once `isEnabled` is true (the admin taps "Run AI
 * check"), because every new content version costs a Gemini call. Never retried automatically.
 */
export function useAdminAiReview(courseId: string, lang: AiLang, isEnabled: boolean) {
  return useQuery<AiCourseReviewDto, AppError>({
    queryKey: queryKeys.adminAiReview(courseId, lang),
    queryFn: () => adminApi.aiReview(courseId, lang),
    enabled: isEnabled && courseId.length > 0,
    staleTime: STALE_TIME.ai,
    retry: false,
  });
}

/** Refresh everything a moderation action can change. */
function useAfterModeration(courseId: string) {
  const queryClient = useQueryClient();
  return (detail: AdminCourseDetailDto): void => {
    queryClient.setQueryData(queryKeys.adminCourse(courseId), detail);
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminCoursesAll() });
    // What learners see changes when a course is published / hidden.
    void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.coursesAll() });
  };
}

/** `POST /admin/courses/:id/approve`. */
export function useApproveCourse(courseId: string) {
  const afterModeration = useAfterModeration(courseId);
  return useMutation<AdminCourseDetailDto, AppError, void>({
    mutationFn: () => adminApi.approve(courseId),
    onSuccess: afterModeration,
  });
}

/** `POST /admin/courses/:id/reject`. */
export function useRejectCourse(courseId: string) {
  const afterModeration = useAfterModeration(courseId);
  return useMutation<AdminCourseDetailDto, AppError, RejectCourseRequest>({
    mutationFn: (body) => adminApi.reject(courseId, body),
    onSuccess: afterModeration,
  });
}

/** `POST /admin/courses/:id/archive`. */
export function useArchiveCourse(courseId: string) {
  const afterModeration = useAfterModeration(courseId);
  return useMutation<AdminCourseDetailDto, AppError, ModerationReasonRequest>({
    mutationFn: (body) => adminApi.archive(courseId, body),
    onSuccess: afterModeration,
  });
}

/** `POST /admin/courses/:id/restore`. */
export function useRestoreCourse(courseId: string) {
  const afterModeration = useAfterModeration(courseId);
  return useMutation<AdminCourseDetailDto, AppError, ModerationReasonRequest>({
    mutationFn: (body) => adminApi.restore(courseId, body),
    onSuccess: afterModeration,
  });
}

/** `GET /admin/users` (SC-34), infinite. */
export function useAdminUsers(params: AdminUserListParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminUsers(params),
    queryFn: ({ pageParam }) => adminApi.users({ ...params, page: pageParam }),
    initialPageParam: 1,
    // Keep the old rows on screen while a new search / filter loads (no skeleton flicker per keystroke).
    placeholderData: keepPreviousData,
    getNextPageParam: ({ meta }) => (meta.page < meta.totalPages ? meta.page + 1 : undefined),
    staleTime: ADMIN_STALE_TIME,
  });
}

/** Swap the updated user into every cached page, then refetch (filters may now exclude it). */
function useAfterUserChange() {
  const queryClient = useQueryClient();
  return (user: AdminUserDto): void => {
    queryClient.setQueriesData<InfiniteData<AdminUsersPage>>(
      { queryKey: queryKeys.adminUsersAll() },
      (cached) =>
        cached
          ? {
              ...cached,
              pages: cached.pages.map((page) => ({
                ...page,
                data: page.data.map((row) => (row.id === user.id ? user : row)),
              })),
            }
          : cached,
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsersAll() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminStats() });
  };
}

/** `POST /admin/users/:id/disable` - variables: `{ userId, reason }`. */
export function useDisableUser() {
  const afterUserChange = useAfterUserChange();
  return useMutation<AdminUserDto, AppError, { userId: string } & DisableUserRequest>({
    mutationFn: ({ userId, reason }) => adminApi.disableUser(userId, { reason }),
    onSuccess: afterUserChange,
  });
}

/** `POST /admin/users/:id/enable` - variable: the user id. */
export function useEnableUser() {
  const afterUserChange = useAfterUserChange();
  return useMutation<AdminUserDto, AppError, string>({
    mutationFn: (userId) => adminApi.enableUser(userId),
    onSuccess: afterUserChange,
  });
}

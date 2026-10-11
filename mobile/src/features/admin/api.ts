import { AI_REQUEST_TIMEOUT_MS } from '@/constants/config';
import { api } from '@/lib/apiClient';
import type {
  AdminCourseDetailDto,
  AdminCourseListParams,
  AdminCoursesPage,
  AdminQueueCountsDto,
  AdminStatsDto,
  AdminUserDto,
  AdminUserListParams,
  AdminUsersPage,
  AiCourseReviewDto,
  AiLang,
  DisableUserRequest,
  ModerationReasonRequest,
  RejectCourseRequest,
  AdminCourseQueueItemDto,
} from '@/types/api';

/** HTTP layer of the admin feature (PLAN §2.4, notes/teacher-admin-contract.md §5). */
export const adminApi = {
  /** `GET /admin/stats` (SC-31). */
  stats: () => api.get<AdminStatsDto>('/admin/stats'),

  /** `GET /admin/courses` - review queue; `meta.pending` carries the pending counters. */
  courses: (params: AdminCourseListParams = {}): Promise<AdminCoursesPage> =>
    api.getPage<AdminCourseQueueItemDto, { pending: AdminQueueCountsDto }>(
      '/admin/courses',
      params,
    ),

  /** `GET /admin/courses/:id` (SC-33): content, revision + diff, moderation history. */
  course: (courseId: string) => api.get<AdminCourseDetailDto>(`/admin/courses/${courseId}`),

  /** `POST /admin/courses/:id/approve`. */
  approve: (courseId: string) =>
    api.post<AdminCourseDetailDto>(`/admin/courses/${courseId}/approve`),

  /** `POST /admin/courses/:id/reject` - reason 5-500 chars, shown to the teacher. */
  reject: (courseId: string, body: RejectCourseRequest) =>
    api.post<AdminCourseDetailDto>(`/admin/courses/${courseId}/reject`, body),

  /** `POST /admin/courses/:id/archive` - optional reason. */
  archive: (courseId: string, body: ModerationReasonRequest = {}) =>
    api.post<AdminCourseDetailDto>(`/admin/courses/${courseId}/archive`, body),

  /** `POST /admin/courses/:id/restore` - optional reason. */
  restore: (courseId: string, body: ModerationReasonRequest = {}) =>
    api.post<AdminCourseDetailDto>(`/admin/courses/${courseId}/restore`, body),

  /** `GET /admin/courses/:id/ai-review?lang=` - advisory only (BR-29); can take a while. */
  aiReview: (courseId: string, lang: AiLang) =>
    api.get<AiCourseReviewDto>(
      `/admin/courses/${courseId}/ai-review`,
      { lang },
      { timeout: AI_REQUEST_TIMEOUT_MS },
    ),

  /** `GET /admin/users` (SC-34), newest first. */
  users: (params: AdminUserListParams = {}): Promise<AdminUsersPage> =>
    api.getPage<AdminUserDto>('/admin/users', params),

  /** `POST /admin/users/:id/disable` - reason 5-500 chars. */
  disableUser: (userId: string, body: DisableUserRequest) =>
    api.post<AdminUserDto>(`/admin/users/${userId}/disable`, body),

  /** `POST /admin/users/:id/enable`. */
  enableUser: (userId: string) => api.post<AdminUserDto>(`/admin/users/${userId}/enable`),
};

import { api } from '@/lib/apiClient';
import type {
  FollowResponse,
  Paginated,
  ReviewDto,
  TeacherCoursesGroupDto,
  TeacherDetail,
  TeacherSummary,
} from '@/types/api';

type PageParams = { page?: number; limit?: number };

/** HTTP layer of the teacher feature (PLAN.md §9.2). Components never call this directly. */
export const teacherApi = {
  /** `GET /teachers?sort=top` - Top teachers (SC-19). */
  list: (params: PageParams = {}): Promise<Paginated<TeacherSummary>> =>
    api.getPage<TeacherSummary>('/teachers', { sort: 'top', ...params }),

  /** `GET /teachers/:id` - 404 `TEACHER_NOT_FOUND`. `isFollowed` is false without a token. */
  detail: (teacherId: string) => api.get<TeacherDetail>(`/teachers/${teacherId}`),

  /** `GET /teachers/:id/courses` - courses grouped by category (`isTopRated` when avg >= 4.5). */
  courses: (teacherId: string) =>
    api.get<TeacherCoursesGroupDto[]>(`/teachers/${teacherId}/courses`),

  /** `GET /teachers/:id/reviews` - reviews of all the teacher's courses (each has `course`). */
  reviews: (teacherId: string, params: PageParams = {}): Promise<Paginated<ReviewDto>> =>
    api.getPage<ReviewDto>(`/teachers/${teacherId}/reviews`, params),

  /** `PUT /teachers/:id/follow` - idempotent (BR-14); 422 `CANNOT_FOLLOW_SELF`. */
  follow: (teacherId: string) => api.put<FollowResponse>(`/teachers/${teacherId}/follow`),

  /** `DELETE /teachers/:id/follow`. */
  unfollow: (teacherId: string) => api.delete<FollowResponse>(`/teachers/${teacherId}/follow`),
};

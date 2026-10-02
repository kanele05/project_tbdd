import { api } from '@/lib/apiClient';
import type { CourseDetail, CourseSummary, LessonDetail } from '@/types/api';

/** HTTP calls of the course-details screen (SC-09). Components never import axios (CLAUDE.md §7). */
export const courseApi = {
  /** `GET /courses/:id` - `isBookmarked`, `isInCart`, `enrollment`... depend on the token. */
  detail: (courseId: string) => api.get<CourseDetail>(`/courses/${courseId}`),

  /** `GET /courses/:id/similar` - up to 3 courses of the same category. */
  similar: (courseId: string) => api.get<CourseSummary[]>(`/courses/${courseId}/similar`),

  /** `POST /courses/:id/enroll` - free courses only (422 `PAID_COURSE` otherwise). */
  enroll: (courseId: string) => api.post<void>(`/courses/${courseId}/enroll`),

  /** `GET /lessons/:id` - used for the preview video (403 `NOT_ENROLLED` for locked lessons). */
  lesson: (lessonId: string) => api.get<LessonDetail>(`/lessons/${lessonId}`),
};

import { api } from '@/lib/apiClient';
import type {
  CurriculumSection,
  LessonDetail,
  LessonProgressResponse,
  LikeResponse,
  ShareResponse,
} from '@/types/api';

/** Body of `PUT /lessons/:id/progress` (BR-03): `isCompleted` is only ever sent as `true`. */
export type SaveProgressBody = { positionSec: number; isCompleted?: boolean };

/** HTTP calls of the learning flow (SC-09 Lessons tab, SC-15). Components never import axios. */
export const learningApi = {
  /** `GET /courses/:id/curriculum` - sections with a BR-02 `status` per lesson. */
  curriculum: (courseId: string) => api.get<CurriculumSection[]>(`/courses/${courseId}/curriculum`),

  /** `GET /lessons/:id` - 403 `NOT_ENROLLED` unless enrolled or preview (BR-01). */
  lesson: (lessonId: string) => api.get<LessonDetail>(`/lessons/${lessonId}`),

  /** `PUT /lessons/:id/progress` - enrolled only. Returns the new course progress (BR-04). */
  saveProgress: (lessonId: string, body: SaveProgressBody) =>
    api.put<LessonProgressResponse>(`/lessons/${lessonId}/progress`, body),

  /** `PUT /courses/:id/like`. */
  like: (courseId: string) => api.put<LikeResponse>(`/courses/${courseId}/like`),

  /** `DELETE /courses/:id/like`. */
  unlike: (courseId: string) => api.delete<LikeResponse>(`/courses/${courseId}/like`),

  /** `POST /courses/:id/share` - counts one share. */
  share: (courseId: string) => api.post<ShareResponse>(`/courses/${courseId}/share`),
};

import { api } from '@/lib/apiClient';

/** PLAN.md §9.2 - both endpoints are idempotent and answer `204 No Content`. */
export const bookmarkApi = {
  /** `PUT /courses/:id/bookmark` - save a course. */
  add: (courseId: string) => api.put(`/courses/${courseId}/bookmark`),
  /** `DELETE /courses/:id/bookmark` - remove a course from the saved list. */
  remove: (courseId: string) => api.delete(`/courses/${courseId}/bookmark`),
};

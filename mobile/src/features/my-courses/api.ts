import { api } from '@/lib/apiClient';
import type { MyCourseItem, MyCoursesStatus } from '@/types/api';

/** HTTP calls of My Courses (SC-14). */
export const myCoursesApi = {
  /** `GET /me/courses?status=all|ongoing|completed` - newest activity first (BR-05). */
  list: (status: MyCoursesStatus) => api.get<MyCourseItem[]>('/me/courses', { status }),
};

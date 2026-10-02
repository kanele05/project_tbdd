import { api } from '@/lib/apiClient';
import type { CategoryDto, CourseListParams, CourseSummary, TagDto } from '@/types/api';

/** Catalog endpoints used by Search, Filter and the course lists (PLAN.md §9.2). */
export const searchApi = {
  /** `GET /courses` - one page of `CourseSummary[]` + `meta` (used for SC-06, SC-07, SC-08). */
  courses: (params: CourseListParams) => api.getPage<CourseSummary>('/courses', params),
  /** `GET /categories` - the 6 categories (public, cached 24 h). */
  categories: () => api.get<CategoryDto[]>('/categories'),
  /** `GET /tags/hot` - "Hot topics" chips (public, cached 24 h). */
  hotTags: () => api.get<TagDto[]>('/tags/hot'),
};

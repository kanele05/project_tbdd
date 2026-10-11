import { AI_REQUEST_TIMEOUT_MS } from '@/constants/config';
import { api } from '@/lib/apiClient';
import type {
  AiCourseDraftDto,
  AiCourseDraftRequest,
  CourseRevisionInput,
  CreateStudioCourseRequest,
  ReorderRequest,
  StudioCourseDetailDto,
  StudioCourseInfoInput,
  StudioCourseListParams,
  StudioCourseSummaryDto,
  StudioLessonDto,
  StudioLessonInput,
  StudioListSummaryDto,
  StudioSectionDto,
  StudioSectionInput,
  UploadImageResponse,
} from '@/types/api';

/** A local image ready to be sent as the `file` part of the cover upload. */
export type CoverFile = { uri: string; name: string; type: string };

/** Page size of the Studio course list. */
export const STUDIO_PAGE_SIZE = 20;

/** HTTP layer of the teacher Studio (notes/teacher-admin-contract.md §2 and §4). */
export const studioApi = {
  /** `GET /teacher/courses?status=&page&limit` - `meta.summary` counts over all courses. */
  list: (params: StudioCourseListParams) =>
    api.getPage<StudioCourseSummaryDto, { summary: StudioListSummaryDto }>('/teacher/courses', {
      limit: STUDIO_PAGE_SIZE,
      ...params,
    }),
  /** `GET /teacher/courses/:id` - full course with curriculum, revision, history, checklist. */
  detail: (id: string) => api.get<StudioCourseDetailDto>(`/teacher/courses/${id}`),
  /** `POST /teacher/courses` (201) - a DRAFT; needs `title` + `categoryId`. */
  create: (body: CreateStudioCourseRequest) =>
    api.post<StudioCourseDetailDto>('/teacher/courses', body),
  /** `PATCH /teacher/courses/:id` - on a PUBLISHED course only the minor fields. */
  update: (id: string, body: Partial<StudioCourseInfoInput>) =>
    api.patch<StudioCourseDetailDto>(`/teacher/courses/${id}`, body),
  /** `DELETE /teacher/courses/:id` (204) - never published and no enrollments. */
  remove: (id: string) => api.delete(`/teacher/courses/${id}`),

  /* ---- curriculum (DRAFT / REJECTED courses) ---- */
  addSection: (courseId: string, body: StudioSectionInput) =>
    api.post<StudioSectionDto>(`/teacher/courses/${courseId}/sections`, body),
  renameSection: (sectionId: string, body: StudioSectionInput) =>
    api.patch<StudioSectionDto>(`/teacher/sections/${sectionId}`, body),
  deleteSection: (sectionId: string) => api.delete(`/teacher/sections/${sectionId}`),
  addLesson: (sectionId: string, body: StudioLessonInput) =>
    api.post<StudioLessonDto>(`/teacher/sections/${sectionId}/lessons`, body),
  updateLesson: (lessonId: string, body: Partial<StudioLessonInput>) =>
    api.patch<StudioLessonDto>(`/teacher/lessons/${lessonId}`, body),
  deleteLesson: (lessonId: string) => api.delete(`/teacher/lessons/${lessonId}`),
  /** `POST /teacher/courses/:id/reorder` -> the whole curriculum in its new order. */
  reorder: (courseId: string, body: ReorderRequest) =>
    api.post<StudioSectionDto[]>(`/teacher/courses/${courseId}/reorder`, body),

  /* ---- review workflow ---- */
  submit: (id: string) => api.post<StudioCourseDetailDto>(`/teacher/courses/${id}/submit`),
  withdraw: (id: string) => api.post<StudioCourseDetailDto>(`/teacher/courses/${id}/withdraw`),
  archive: (id: string) => api.post<StudioCourseDetailDto>(`/teacher/courses/${id}/archive`),
  restore: (id: string) => api.post<StudioCourseDetailDto>(`/teacher/courses/${id}/restore`),

  /* ---- revision of a PUBLISHED course (BR-21) ---- */
  createRevision: (id: string) =>
    api.post<StudioCourseDetailDto>(`/teacher/courses/${id}/revision`),
  saveRevision: (id: string, body: CourseRevisionInput) =>
    api.put<StudioCourseDetailDto>(`/teacher/courses/${id}/revision`, body),
  submitRevision: (id: string) =>
    api.post<StudioCourseDetailDto>(`/teacher/courses/${id}/revision/submit`),
  discardRevision: (id: string) => api.delete(`/teacher/courses/${id}/revision`),

  /** `POST /teacher/uploads/image` (201) multipart `file` (png/jpg <= 5 MB) -> `{ url }`. */
  uploadImage: (file: CoverFile, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    // React Native's FormData accepts `{ uri, name, type }` in place of a Blob.
    form.append('file', file as unknown as Blob);
    return api.postForm<UploadImageResponse>('/teacher/uploads/image', form, onProgress);
  },

  /** `POST /teacher/ai/course-draft` - suggestions only, nothing is saved (BR-29). */
  aiCourseDraft: (body: AiCourseDraftRequest) =>
    api.post<AiCourseDraftDto>('/teacher/ai/course-draft', body, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    }),
};

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from '@/lib/queryKeys';
import type {
  AiCourseDraftRequest,
  CourseRevisionInput,
  CourseStatus,
  CreateStudioCourseRequest,
  ReorderRequest,
  StudioCourseDetailDto,
  StudioCourseInfoInput,
  StudioCourseSummaryDto,
  StudioLessonInput,
  StudioSectionDto,
  StudioSectionInput,
} from '@/types/api';

import { studioApi, type CoverFile } from './api';

/** Studio data is the teacher's own and changes often: always revalidate on mount, never persist. */
const STUDIO_STALE_TIME = 0;

/**
 * `GET /teacher/courses` (infinite, newest update first). `summary` is the `meta.summary` of the
 * first page (counts over ALL courses, ignoring the filter); `courses` is the flattened list.
 */
export function useStudioCourses(status: CourseStatus | 'all' = 'all') {
  const query = useInfiniteQuery({
    queryKey: queryKeys.studioCourses(status),
    queryFn: ({ pageParam }) =>
      studioApi.list({ page: pageParam, ...(status === 'all' ? {} : { status }) }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    staleTime: STUDIO_STALE_TIME,
  });
  const pages = query.data?.pages;
  const courses = useMemo<StudioCourseSummaryDto[]>(
    () => (pages ?? []).flatMap((page) => page.data),
    [pages],
  );
  return { ...query, courses, summary: pages?.[0]?.meta.summary };
}

/** `GET /teacher/courses/:id` (404 `COURSE_NOT_FOUND` also when the course is not yours). */
export function useStudioCourse(id: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.studioCourse(id ?? ''),
    queryFn: () => studioApi.detail(id ?? ''),
    enabled: Boolean(id) && (options.enabled ?? true),
    staleTime: STUDIO_STALE_TIME,
  });
}

/** Public catalog caches that change when a course is hidden / restored / published. */
function invalidateCatalog(client: QueryClient, courseId: string): void {
  void client.invalidateQueries({ queryKey: queryKeys.home() });
  void client.invalidateQueries({ queryKey: queryKeys.coursesAll() });
  void client.invalidateQueries({ queryKey: queryKeys.course(courseId) });
}

/** Writes a fresh course detail to its cache and refreshes the lists that show it. */
export function syncCourseDetail(client: QueryClient, detail: StudioCourseDetailDto): void {
  client.setQueryData(queryKeys.studioCourse(detail.id), detail);
  void client.invalidateQueries({ queryKey: queryKeys.studioCoursesAll() });
}

/** `POST /teacher/courses`. */
export function useCreateCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStudioCourseRequest) => studioApi.create(body),
    onSuccess: (detail) => syncCourseDetail(client, detail),
  });
}

/** `PATCH /teacher/courses/:id` (info fields). */
export function useUpdateCourse(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<StudioCourseInfoInput>) => studioApi.update(id, body),
    onSuccess: (detail) => syncCourseDetail(client, detail),
  });
}

/** `DELETE /teacher/courses/:id`. */
export function useDeleteCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studioApi.remove(id),
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: queryKeys.studioCourse(id) });
      void client.invalidateQueries({ queryKey: queryKeys.studioCoursesAll() });
    },
  });
}

export type CourseWorkflowAction =
  'submit' | 'withdraw' | 'archive' | 'restore' | 'createRevision' | 'submitRevision';

/** The workflow endpoint behind each action; all answer with the updated course detail. */
const WORKFLOW_CALLS: Record<CourseWorkflowAction, (id: string) => Promise<StudioCourseDetailDto>> =
  {
    submit: studioApi.submit,
    withdraw: studioApi.withdraw,
    archive: studioApi.archive,
    restore: studioApi.restore,
    createRevision: studioApi.createRevision,
    submitRevision: studioApi.submitRevision,
  };

/** Status changes of one course: submit / withdraw / archive / restore / revision create + submit. */
export function useCourseWorkflow(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: CourseWorkflowAction) => WORKFLOW_CALLS[action](id),
    onSuccess: (detail, action) => {
      syncCourseDetail(client, detail);
      if (action === 'archive' || action === 'restore') invalidateCatalog(client, id);
    },
  });
}

/** `DELETE /teacher/courses/:id/revision` - discard the open revision (204). */
export function useDiscardRevision(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => studioApi.discardRevision(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.studioCourse(id) });
      void client.invalidateQueries({ queryKey: queryKeys.studioCoursesAll() });
    },
  });
}

/** `PUT /teacher/courses/:id/revision`. */
export function useSaveRevision(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CourseRevisionInput) => studioApi.saveRevision(id, body),
    onSuccess: (detail) => syncCourseDetail(client, detail),
  });
}

/** Section / lesson editing of a DRAFT or REJECTED course; every call refreshes the detail. */
export function useCurriculumMutations(courseId: string) {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: queryKeys.studioCourse(courseId) });
    void client.invalidateQueries({ queryKey: queryKeys.studioCoursesAll() });
  };
  return {
    addSection: useMutation({
      mutationFn: (body: StudioSectionInput) => studioApi.addSection(courseId, body),
      onSuccess: refresh,
    }),
    renameSection: useMutation({
      mutationFn: (args: { sectionId: string; body: StudioSectionInput }) =>
        studioApi.renameSection(args.sectionId, args.body),
      onSuccess: refresh,
    }),
    deleteSection: useMutation({
      mutationFn: (sectionId: string) => studioApi.deleteSection(sectionId),
      onSuccess: refresh,
    }),
    addLesson: useMutation({
      mutationFn: (args: { sectionId: string; body: StudioLessonInput }) =>
        studioApi.addLesson(args.sectionId, args.body),
      onSuccess: refresh,
    }),
    updateLesson: useMutation({
      mutationFn: (args: { lessonId: string; body: Partial<StudioLessonInput> }) =>
        studioApi.updateLesson(args.lessonId, args.body),
      onSuccess: refresh,
    }),
    deleteLesson: useMutation({
      mutationFn: (lessonId: string) => studioApi.deleteLesson(lessonId),
      onSuccess: refresh,
    }),
    reorder: useMutation({
      mutationFn: (body: ReorderRequest) => studioApi.reorder(courseId, body),
      onSuccess: (sections: StudioSectionDto[]) => {
        client.setQueryData<StudioCourseDetailDto>(queryKeys.studioCourse(courseId), (current) =>
          current ? { ...current, sections } : current,
        );
      },
    }),
  };
}

/** `POST /teacher/uploads/image` with progress. */
export function useUploadCover(onProgress?: (percent: number) => void) {
  return useMutation({
    mutationFn: (file: CoverFile) => studioApi.uploadImage(file, onProgress),
  });
}

/** `POST /teacher/ai/course-draft` (a POST that only reads: the server caches per input). */
export function useAiCourseDraft() {
  return useMutation({ mutationFn: (body: AiCourseDraftRequest) => studioApi.aiCourseDraft(body) });
}

import { PAGE_SIZE } from '@/constants/config';
import { api } from '@/lib/apiClient';
import type {
  AnswerDto,
  GradeSubmissionRequest,
  ReviewDto,
  ReviewReplyRequest,
  TeacherCourseStatsDto,
  TeacherProfileDto,
  TeacherProfileInput,
  TeacherSubmissionDto,
  TeacherSubmissionListParams,
  TeacherSubmissionsPage,
  TeacherSubmissionsSummaryDto,
} from '@/types/api';

/** Status filter of the submissions list (SC-29). */
export type SubmissionFilter = NonNullable<TeacherSubmissionListParams['status']>;

/**
 * HTTP layer of the teacher-side teaching tools (PLAN §2.4.6, notes/teacher-admin-contract.md §2-3).
 * Every route needs the TEACHER role; course-scoped routes also need ownership of the course.
 */
export const teachingApi = {
  /** `GET /me/teacher-profile` - created empty on first read. */
  profile: () => api.get<TeacherProfileDto>('/me/teacher-profile'),

  /** `PATCH /me/teacher-profile` - at least one field. */
  updateProfile: (input: Partial<TeacherProfileInput>) =>
    api.patch<TeacherProfileDto>('/me/teacher-profile', input),

  /** `GET /teacher/courses/:id/stats` - 404 `COURSE_NOT_FOUND` for a course that is not yours. */
  stats: (courseId: string) => api.get<TeacherCourseStatsDto>(`/teacher/courses/${courseId}/stats`),

  /** `GET /teacher/courses/:id/submissions` - newest first, `meta.summary` counts graded / ungraded. */
  submissions: (
    courseId: string,
    params: { status: SubmissionFilter; page: number },
  ): Promise<TeacherSubmissionsPage> =>
    api.getPage<TeacherSubmissionDto, { summary: TeacherSubmissionsSummaryDto }>(
      `/teacher/courses/${courseId}/submissions`,
      { status: params.status, page: params.page, limit: PAGE_SIZE },
    ),

  /** `PUT /teacher/submissions/:id/grade` - grading again overwrites; notifies the student. */
  grade: (submissionId: string, body: GradeSubmissionRequest) =>
    api.put<TeacherSubmissionDto>(`/teacher/submissions/${submissionId}/grade`, body),

  /** `PUT /teacher/reviews/:id/reply` - create or edit the (single) reply. */
  replyToReview: (reviewId: string, body: ReviewReplyRequest) =>
    api.put<ReviewDto>(`/teacher/reviews/${reviewId}/reply`, body),

  /** `DELETE /teacher/reviews/:id/reply` - returns the review with `teacherReply: null`. */
  deleteReviewReply: (reviewId: string) =>
    api.delete<ReviewDto>(`/teacher/reviews/${reviewId}/reply`),

  /** `PUT /teacher/answers/:id/pin` - the previously pinned answer of the question is unpinned. */
  pinAnswer: (answerId: string) => api.put<AnswerDto>(`/teacher/answers/${answerId}/pin`),

  /** `DELETE /teacher/answers/:id/pin`. */
  unpinAnswer: (answerId: string) => api.delete<AnswerDto>(`/teacher/answers/${answerId}/pin`),
};

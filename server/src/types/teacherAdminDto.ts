/**
 * DTO của luồng Giảng viên & Quản trị (PLAN §2.4). Khối dưới đây là BẢN SAO NGUYÊN VĂN của khối cùng tên trong
 * mobile/src/types/api.ts (test `tests/contract/teacherAdminDtoSync.test.ts` bắt lệch). Sửa ở mobile rồi chép sang đây.
 * Hợp đồng endpoint: notes/teacher-admin-contract.md.
 */
import type { AiLangDto as AiLang, CourseStatus, ProjectSubmissionDto, Role } from '@/types/dto';

// BEGIN TEACHER-ADMIN DTOs - mirrored VERBATIM (modulo the renames in server/tests/contract) in
// server/src/types/teacherAdminDto.ts. Endpoint contract: notes/teacher-admin-contract.md.

export type RevisionStatus = 'OPEN' | 'PENDING_REVIEW' | 'REJECTED';
export type ModerationAction =
  'SUBMITTED' | 'WITHDRAWN' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'RESTORED';
/** What a moderation entry is about: the course itself or its revision (BR-21). */
export type ModerationTarget = 'COURSE' | 'REVISION';

/** Code of one unmet submit requirement (BR-20); `details.missing` of 422 `COURSE_INCOMPLETE`. */
export type CourseMissingCode =
  | 'TITLE_LENGTH'
  | 'DESCRIPTION_TOO_SHORT'
  | 'NO_THUMBNAIL'
  | 'NO_CATEGORY'
  | 'NO_SECTION'
  | 'NOT_ENOUGH_LESSONS'
  | 'LESSON_VIDEO_INVALID'
  | 'LESSON_DURATION_INVALID'
  | 'PREVIEW_COUNT'
  | 'PRICE_INVALID'
  | 'ORIGINAL_PRICE_INVALID';

export type CourseMissingItemDto = {
  code: CourseMissingCode;
  /** Present for the two `LESSON_*` codes when the lesson already has an id. */
  lessonId?: string;
  /** 1-based position of the lesson in the whole course (always present for the `LESSON_*` codes). */
  lessonNumber?: number;
};

/** One row of the moderation history (newest first), shown to the teacher and to admins. */
export type CourseModerationDto = {
  id: string;
  action: ModerationAction;
  target: ModerationTarget;
  /** Reject / archive reason when given. */
  reason: string | null;
  createdAt: string;
  actor: { id: string; fullName: string; role: Role };
};

/* ------------------------------ Studio: course content ------------------------------ */

/** Lesson as the teacher edits it. `videoUrl` is a normalized `https://www.youtube.com/watch?v=<id>[&start=][&end=]`. */
export type StudioLessonDto = {
  id: string;
  title: string;
  order: number;
  durationSec: number;
  videoUrl: string;
  isPreview: boolean;
  /** Text notes of the lesson (source for the AI features). */
  content: string;
};

export type StudioSectionDto = {
  id: string;
  title: string;
  order: number;
  lessons: StudioLessonDto[];
};

/** Body of `POST /teacher/sections/:id/lessons`; `PATCH /teacher/lessons/:id` takes `Partial<>` (>= 1 field). */
export type StudioLessonInput = {
  /** 1-160 chars. */
  title: string;
  /** Any YouTube watch/short link; rejected with 400 when it is not a valid YouTube link. */
  videoUrl: string;
  /** Integer seconds, 1..21600 (6 h). */
  durationSec: number;
  isPreview: boolean;
  /** 0-3000 chars (default ""). */
  content?: string;
};

/** Body of `POST /teacher/courses/:id/sections` and `PATCH /teacher/sections/:id`. */
export type StudioSectionInput = { title: string };

/** Body of `POST /teacher/courses/:id/reorder`; `ids` must be exactly the current set, in the new order. */
export type ReorderRequest =
  { target: 'sections'; ids: string[] } | { target: 'lessons'; sectionId: string; ids: string[] };

/** `title` is required at creation; everything else is optional. */
export type CreateStudioCourseRequest = { title: string; categoryId: string } & Partial<
  Omit<StudioCourseInfoInput, 'title' | 'categoryId'>
>;

/**
 * Info fields of a course. PATCH takes `Partial<StudioCourseInfoInput>` (>= 1 field).
 * "Minor" fields (apply immediately even when PUBLISHED): subtitle, description, benefits, projectDescription,
 * thumbnailUrl. "Major" fields (a PUBLISHED course needs a revision, else 422 `REVISION_REQUIRED`): title,
 * categoryId, tagIds, priceCents, originalPriceCents.
 */
export type StudioCourseInfoInput = {
  /** 5-120 chars. */
  title: string;
  /** 0-200 chars; `null` clears it. */
  subtitle: string | null;
  /** 0-5000 chars (>= 100 chars is only required to submit). */
  description: string;
  categoryId: string;
  /** At most 5 existing tag ids. */
  tagIds: string[];
  /** Integer cents 0..99999 (0 = free; paid prices must be >= 99 to submit). */
  priceCents: number;
  /** Integer cents or `null`; must be > `priceCents` to submit. */
  originalPriceCents: number | null;
  /** At most 10 items of 1-200 chars. */
  benefits: string[];
  /** 0-2000 chars; `null` clears it. */
  projectDescription: string | null;
  /** The `url` returned by `POST /teacher/uploads/image` (own uploads only). */
  thumbnailUrl: string;
};

/** `POST /teacher/uploads/image` (201): multipart field `file`, PNG/JPG up to 5 MB. */
export type UploadImageResponse = { url: string };

/**
 * Stored payload of a course revision (BR-21): only the "major" fields. A lesson/section WITH `id` updates the
 * existing one (students keep their progress), WITHOUT `id` it is new, an existing one that is missing is deleted
 * on approval. Every `id` must belong to the course (400 otherwise). Rules of the form: <= 5 tags, <= 20 sections,
 * <= 100 lessons in total, `videoUrl` a valid YouTube link, `durationSec` 1..21600, titles as in `StudioLessonInput`.
 */
export type CourseRevisionPayload = {
  title: string;
  priceCents: number;
  originalPriceCents: number | null;
  categoryId: string;
  tagIds: string[];
  sections: {
    id?: string;
    title: string;
    lessons: {
      id?: string;
      title: string;
      videoUrl: string;
      durationSec: number;
      isPreview: boolean;
      content: string;
    }[];
  }[];
};

/** Body of `PUT /teacher/courses/:id/revision`: like the payload, with lesson `content` optional (default ""). */
export type CourseRevisionInput = Omit<CourseRevisionPayload, 'sections'> & {
  sections: {
    id?: string;
    title: string;
    lessons: {
      id?: string;
      title: string;
      videoUrl: string;
      durationSec: number;
      isPreview: boolean;
      content?: string;
    }[];
  }[];
};

export type StudioRevisionDto = {
  id: string;
  status: RevisionStatus;
  payload: CourseRevisionPayload;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  /** BR-20 result for the course as it would be after approval; empty = can be submitted. */
  missing: CourseMissingItemDto[];
  /** Reason of the latest rejection of this revision when `status` is `REJECTED`. */
  rejectionReason: string | null;
};

/** One row of `GET /teacher/courses`. Money in cents; `thumbnailUrl` is `""` until a cover is uploaded. */
export type StudioCourseSummaryDto = {
  id: string;
  title: string;
  thumbnailUrl: string;
  status: CourseStatus;
  category: { id: string; name: string };
  priceCents: number;
  originalPriceCents: number | null;
  lessonCount: number;
  totalDurationSec: number;
  enrollmentCount: number;
  ratingAvg: number;
  ratingCount: number;
  /** Status of the open revision (`PUBLISHED` courses only), else `null`. */
  revisionStatus: RevisionStatus | null;
  /** Reason of the latest rejection while `status` is `REJECTED`, else `null`. */
  rejectionReason: string | null;
  publishedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** `GET /teacher/courses/:id` and the response of every workflow / revision endpoint. */
export type StudioCourseDetailDto = StudioCourseSummaryDto & {
  subtitle: string | null;
  description: string;
  benefits: string[];
  projectDescription: string | null;
  tags: { id: string; name: string; isHot: boolean }[];
  sections: StudioSectionDto[];
  /** The open revision (at most one) with its own checklist, or `null`. */
  revision: StudioRevisionDto | null;
  /** Newest first. */
  moderation: CourseModerationDto[];
  /** BR-20 checklist of the LIVE course content (computed on every read); empty = can be submitted. */
  missing: CourseMissingItemDto[];
};

/** `meta.summary` of `GET /teacher/courses` (over all of the teacher's courses, ignoring the filter). */
export type StudioListSummaryDto = {
  courseCount: number;
  totalEnrollments: number;
  totalRevenueCents: number;
  byStatus: Record<CourseStatus, number>;
};

/* ------------------------------ Teacher: teaching ------------------------------ */

/** `GET /me/teacher-profile` and the response of `PATCH /me/teacher-profile`. */
export type TeacherProfileDto = {
  id: string;
  jobTitle: string;
  bio: string;
  organization: string | null;
  location: string | null;
  /** IANA time zone, e.g. "Europe/Vienna". */
  timezone: string | null;
};

/** Body of `PATCH /me/teacher-profile` (>= 1 field). Name / avatar / headline still use `PATCH /me`. */
export type TeacherProfileInput = {
  /** 1-100 chars. */
  jobTitle: string;
  /** 0-2000 chars. */
  bio: string;
  /** 0-100 chars; `null` clears it. */
  organization: string | null;
  location: string | null;
  /** A valid IANA time zone id; `null` clears it. */
  timezone: string | null;
};

/** `GET /teacher/courses/:id/stats`. */
export type TeacherCourseStatsDto = {
  courseId: string;
  enrollmentCount: number;
  /** Sum of the prices of PAID order items for this course (simulated payments). */
  revenueCents: number;
  /** Average `progressPercent` of the enrollments, rounded to an integer (0 when none). */
  avgProgressPercent: number;
  completedCount: number;
  ratingAvg: number;
  ratingCount: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Exactly 30 entries, oldest first, zero-filled, one per UTC day (`YYYY-MM-DD`). */
  newEnrollments30d: { date: string; count: number }[];
  submissionCount: number;
  gradedCount: number;
};

/** One submission in `GET /teacher/courses/:id/submissions` (newest first). */
export type TeacherSubmissionDto = ProjectSubmissionDto & { courseId: string };

/** `meta.summary` of the submissions list (ignores the `status` filter). */
export type TeacherSubmissionsSummaryDto = { gradedCount: number; ungradedCount: number };

/** Body of `PUT /teacher/submissions/:id/grade` (grading again overwrites). */
export type GradeSubmissionRequest = {
  /** Integer 0-100. */
  grade: number;
  /** 1-2000 chars. */
  feedback: string;
};

/** Body of `PUT /teacher/reviews/:id/reply`. */
export type ReviewReplyRequest = {
  /** 1-1000 chars. */
  reply: string;
};

/* ------------------------------ AI (Gemini) ------------------------------ */

export type AiCourseLevel = 'beginner' | 'intermediate' | 'advanced';

/** Body of `POST /teacher/ai/course-draft`. */
export type AiCourseDraftRequest = {
  /** 3-200 chars. */
  topic: string;
  level: AiCourseLevel;
  /** Language of the generated text. */
  lang: AiLang;
};

/** Suggestions to fill the course form; the teacher applies each part and saves by hand (BR-29). Cached per input. */
export type AiCourseDraftDto = {
  topic: string;
  level: AiCourseLevel;
  lang: AiLang;
  /** <= 200 chars. */
  subtitle: string;
  /** 100-1500 chars. */
  description: string;
  /** 3-6 items. */
  benefits: string[];
  /** Id of the existing category that fits the topic best; `null` when none fits. */
  categoryId: string | null;
  /** 3-6 sections of 2-5 lessons each. */
  sections: { title: string; lessons: { title: string; summary: string }[] }[];
  model: string;
  generatedAt: string;
};

export type AiReviewSeverity = 'low' | 'medium' | 'high';

/** `GET /admin/courses/:id/ai-review` - advisory only, the admin decides (BR-29). Cached per content version. */
export type AiCourseReviewDto = {
  courseId: string;
  /** What was reviewed: the pending revision when there is one, else the course itself. */
  target: ModerationTarget;
  lang: AiLang;
  verdict: 'LOOKS_OK' | 'NEEDS_ATTENTION';
  summary: string;
  /** At most 10, most severe first. `area` e.g. title, description, curriculum, pricing, media, policy, other. */
  issues: { severity: AiReviewSeverity; area: string; message: string }[];
  model: string;
  generatedAt: string;
};

/* ------------------------------ Admin ------------------------------ */

/** `GET /admin/stats`. */
export type AdminStatsDto = {
  users: {
    total: number;
    byRole: Record<Role, number>;
    disabledCount: number;
    newLast7d: number;
    newLast30d: number;
  };
  courses: { total: number; byStatus: Record<CourseStatus, number> };
  /** Review queue size (drives the badge of the admin tab): new courses + pending revisions. */
  pending: { courses: number; revisions: number; total: number };
  /** Simulated payments: orders with status PAID. */
  orders: { paidCount: number; revenueCents: number };
  /** Top 5 published courses by enrollments. */
  topCourses: {
    id: string;
    title: string;
    thumbnailUrl: string;
    teacher: { id: string; fullName: string };
    enrollmentCount: number;
    revenueCents: number;
  }[];
};

/** One row of `GET /admin/courses`: a course, or the pending revision of a published course. */
export type AdminCourseQueueItemDto = {
  /** Course id (also the id used by `GET /admin/courses/:id`). */
  id: string;
  type: 'COURSE' | 'REVISION';
  /** Title under review (the revision's title for `REVISION`). */
  title: string;
  thumbnailUrl: string;
  /** Status of the course itself. */
  status: CourseStatus;
  /** Status of the revision when `type` is `REVISION`, else `null`. */
  revisionStatus: RevisionStatus | null;
  teacher: { id: string; userId: string; fullName: string; avatarUrl: string | null };
  category: { id: string; name: string };
  /** Price under review. */
  priceCents: number;
  /** Lesson count of the content under review. */
  lessonCount: number;
  submittedAt: string | null;
  updatedAt: string;
};

/** `meta.pending` of `GET /admin/courses`. */
export type AdminQueueCountsDto = { courses: number; revisions: number };

/** Before/after of one changed field. */
export type FieldChangeDto<T> = { before: T; after: T };

export type AdminDiffLessonDto = {
  /** `null` for a lesson that is new in the revision. */
  id: string | null;
  title: string;
  sectionTitle: string;
  durationSec: number;
};

export type AdminDiffLessonContentDto = {
  title: string;
  videoUrl: string;
  durationSec: number;
  isPreview: boolean;
  content: string;
};

/** Comparison of the live course with its pending revision (only for a course that has a revision). */
export type AdminRevisionDiffDto = {
  hasChanges: boolean;
  /** Each is `null` when unchanged. */
  title: FieldChangeDto<string> | null;
  priceCents: FieldChangeDto<number> | null;
  originalPriceCents: FieldChangeDto<number | null> | null;
  category: FieldChangeDto<{ id: string; name: string }> | null;
  tags: FieldChangeDto<{ id: string; name: string; isHot: boolean }[]> | null;
  curriculum: {
    sectionsAdded: string[];
    sectionsRemoved: string[];
    sectionsRenamed: FieldChangeDto<string>[];
    lessonsAdded: AdminDiffLessonDto[];
    /** `progressCount` = learner progress rows that will be lost when the revision is approved. */
    lessonsRemoved: (AdminDiffLessonDto & { progressCount: number })[];
    lessonsChanged: {
      id: string;
      sectionTitle: string;
      before: AdminDiffLessonContentDto;
      after: AdminDiffLessonContentDto;
      changedFields: ('title' | 'videoUrl' | 'durationSec' | 'isPreview' | 'content')[];
    }[];
    /** Same sections and lessons but a different order. */
    isReordered: boolean;
  };
};

/** `GET /admin/courses/:id` and the response of approve / reject / archive / restore. */
export type AdminCourseDetailDto = StudioCourseDetailDto & {
  teacher: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    isDisabled: boolean;
  };
  /** What an approval would publish: the revision (when it is pending), the course (when pending), else `null`. */
  reviewTarget: ModerationTarget | null;
  /** Non-null whenever the course has a revision. */
  diff: AdminRevisionDiffDto | null;
};

/** Body of `POST /admin/courses/:id/reject`. */
export type RejectCourseRequest = {
  /** 5-500 chars; shown to the teacher (notification + e-mail). */
  reason: string;
};

/** Optional body of `POST /admin/courses/:id/archive|restore`. */
export type ModerationReasonRequest = {
  /** 5-500 chars. */
  reason?: string;
};

/** One row of `GET /admin/users`. */
export type AdminUserDto = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  emailVerified: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
  /** Number of courses (TEACHER), else 0. */
  courseCount: number;
  /** Number of enrollments (any role). */
  enrollmentCount: number;
};

/** Body of `POST /admin/users/:id/disable`. */
export type DisableUserRequest = {
  /** 5-500 chars. */
  reason: string;
};

// END TEACHER-ADMIN DTOs

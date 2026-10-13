/**
 * Shared API DTOs. The first block matches PLAN.md §9.3 exactly (server returns these shapes);
 * the rest are the additional DTOs derived from PLAN.md §8.2 / §9.2.
 * Money is always in cents (`priceCents`), durations in seconds (`durationSec`), dates are ISO 8601.
 */

/* ------------------------------------------------------------------ */
/* PLAN.md §9.3 - core DTOs                                            */
/* ------------------------------------------------------------------ */

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

/** Lifecycle of a course (PLAN §2.4, BR-19). Only `PUBLISHED` shows in the catalog. */
export type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

/**
 * `GET /auth/me`, `PATCH /me`, and the `user` of every auth response. `role` is the CURRENT role in the
 * database (an access token's role claim can be stale); drives the role-based tab (Studio / Admin).
 */
export type UserDto = {
  id: string;
  email: string;
  fullName: string;
  headline: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: Role;
};

export type CourseSummary = {
  id: string;
  title: string;
  thumbnailUrl: string;
  teacher: { id: string; fullName: string };
  priceCents: number;
  originalPriceCents: number | null;
  badge: 'BEST_SELLER' | 'DISCOUNT' | null;
  discountPercent: number | null; // BR-10
  ratingAvg: number;
  ratingCount: number;
  lessonCount: number;
  totalDurationSec: number;
  isBookmarked: boolean; // false when there is no token
};

export type CourseDetail = CourseSummary & {
  /**
   * Anyone can open a `PUBLISHED` course. A non-published course (`ARCHIVED`, `DRAFT`, ...) is only returned to
   * its students, its teacher and admins (everyone else gets 404 `COURSE_NOT_FOUND`).
   */
  status: CourseStatus;
  subtitle: string | null;
  description: string;
  bannerUrl: string | null;
  benefits: string[];
  likeCount: number;
  shareCount: number;
  isLiked: boolean;
  category: { id: string; name: string };
  teacher: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    jobTitle: string;
    isFollowed: boolean;
  };
  enrollment: { progressPercent: number; lastLessonId: string | null } | null;
  isInCart: boolean;
  previewLessonId: string | null;
};

export type LessonStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED';

export type CurriculumLesson = {
  id: string;
  number: number;
  title: string;
  durationSec: number;
  isPreview: boolean;
  status: LessonStatus;
};

export type CurriculumSection = {
  id: string;
  title: string;
  order: number;
  lessons: CurriculumLesson[];
};

export type LessonDetail = {
  id: string;
  courseId: string;
  title: string;
  durationSec: number;
  videoUrl: string;
  positionSec: number;
  isCompleted: boolean;
  nextLessonId: string | null;
};

export type MyCourseItem = {
  course: { id: string; title: string; thumbnailUrl: string };
  totalDurationSec: number;
  progressPercent: number;
  lastLessonId: string | null;
  lastAccessedAt: string;
  /** Lessons in the course. */
  lessonCount: number;
  /** Lessons the student has finished. */
  completedLessonCount: number;
  /** The lesson the student studied last (`number` = 1-based position); `null` before the first one. */
  lastLesson: { id: string; title: string; number: number } | null;
};

export type TeacherSummary = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  organization: string | null;
  ratingAvg: number;
  ratingCount: number;
};

export type TeacherDetail = TeacherSummary & {
  jobTitle: string;
  bio: string;
  coverUrl: string | null;
  location: string | null;
  timezone: string | null;
  /**
   * Current time in `timezone` as "09:30 AM" (BR-16), computed by the server. Optional: the app
   * formats the time itself from `timezone` (works offline), so older payloads/fixtures omit it.
   */
  localTime?: string | null;
  isFollowed: boolean;
  stats: { courseCount: number; studentCount: number; followerCount: number };
};

export type ReviewDto = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
  course?: { id: string; title: string };
  /** Instructor reply (BR-25), at most one per review; `null` when there is none. */
  teacherReply: string | null;
  teacherRepliedAt: string | null;
};

export type QuestionDto = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  answerCount: number;
  isLiked: boolean;
  user: { id: string; fullName: string; avatarUrl: string | null };
};

export type BannerDto = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaText: string;
  imageUrl: string;
  bgColor: string;
  target: { type: 'COURSE' | 'CATEGORY'; id: string };
};

export type HomeResponse = {
  banners: BannerDto[];
  categories: CategoryDto[];
  popular: CourseSummary[];
  recommended: CourseSummary[];
  inspires: CourseSummary[];
  topTeachers: TeacherSummary[];
};

/**
 * `title` / `body` are stored in English by the server; the app localizes by `type` + `data` where it can.
 * New types: `COURSE_APPROVED` / `COURSE_REJECTED` (to the teacher), `NEW_COURSE` (to followers),
 * `PROJECT_GRADED` (to the submitter), `REVIEW_REPLY` (to the reviewer).
 */
export type NotificationType =
  | 'ORDER_PAID'
  | 'NEW_ANSWER'
  | 'COURSE_COMPLETED'
  | 'SYSTEM'
  | 'COURSE_APPROVED'
  | 'COURSE_REJECTED'
  | 'NEW_COURSE'
  | 'PROJECT_GRADED'
  | 'REVIEW_REPLY';

export type NotificationData = {
  courseId?: string;
  questionId?: string;
  /** `PROJECT_GRADED`. */
  submissionId?: string;
  /** `REVIEW_REPLY`. */
  reviewId?: string;
  /**
   * Stable message key (`NEW_DEVICE`, `ORDER_PAID_ONE`, `COURSE_REJECTED`...). With `params` the app renders the
   * text in the UI language (`notification:messages.<key>`); absent on old rows or unknown keys, where the
   * stored `title`/`body` are shown instead.
   */
  key?: string;
  params?: Record<string, string | number>;
};

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData | null;
  isRead: boolean;
  createdAt: string;
};

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

/* ------------------------------------------------------------------ */
/* Additional DTOs                                                     */
/* ------------------------------------------------------------------ */

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  /** Feather icon name, e.g. "trending-up". */
  icon: string;
  /** Hex color of the icon tile, e.g. "#00BDD6". */
  color: string;
  courseCount: number;
};

export type TagDto = { id: string; name: string; isHot: boolean };

export type AnswerDto = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
  /** The author is the instructor of this course -> show the "Instructor" badge (BR-24). */
  isInstructor: boolean;
  /** Pinned by the instructor; pinned answers are listed first (at most one per question). */
  isPinned: boolean;
};

export type ResourceDto = {
  id: string;
  name: string;
  fileUrl: string;
  sizeBytes: number;
  mimeType: string;
};

export type ProjectSubmissionDto = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  fileUrl: string;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
  /** Instructor grade, integer 0-100 (BR-26); `null` until graded. */
  grade: number | null;
  feedback: string | null;
  gradedAt: string | null;
};

/** `GET /courses/:id/project` */
export type CourseProjectDto = {
  description: string;
  resources: ResourceDto[];
  submissionCount: number;
};

export type CartItemDto = { course: CourseSummary; addedAt: string };

/** `GET /cart` */
export type CartDto = { items: CartItemDto[]; totalCents: number };

export type PaymentMethod = 'MOCK_CARD' | 'MOCK_EWALLET';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED';

export type OrderDto = {
  id: string;
  totalCents: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  paidAt: string | null;
  items: {
    courseId: string;
    priceCents: number;
    course?: { id: string; title: string; thumbnailUrl: string };
  }[];
};

/** `POST /orders/checkout` */
export type CheckoutResponse = { order: OrderDto; enrolledCourseIds: string[] };

/** `GET /me/stats` (BR-15) */
export type MeStatsDto = {
  savedCount: number;
  ongoingCount: number;
  completedCount: number;
  /** Total time spent learning, in seconds. */
  learningSec: number;
};

/** One item of `GET /teachers/:id/courses` (grouped by category). */
export type TeacherCoursesGroupDto = {
  category: { id: string; name: string };
  isTopRated: boolean;
  courses: CourseSummary[];
};

/** `meta.summary` of `GET /courses/:id/reviews`. */
export type ReviewSummaryDto = {
  avg: number;
  count: number;
  /** Number of reviews per star rating. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

/* ------------------------------------------------------------------ */
/* Envelopes, requests & query params                                  */
/* ------------------------------------------------------------------ */

/** Success envelope: `{ data, meta? }`. */
export type ApiSuccess<T, M = undefined> = { data: T; meta?: M };

/** Paginated list envelope; `M` adds endpoint-specific meta (summary, unreadCount...). */
export type Paginated<T, M = object> = { data: T[]; meta: PaginationMeta & M };

export type ReviewsPage = Paginated<ReviewDto, { summary: ReviewSummaryDto }>;
export type NotificationsPage = Paginated<NotificationDto, { unreadCount: number }>;

/** PLAN.md §9.4 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'FORBIDDEN'
  | 'NOT_ENROLLED'
  | 'COURSE_NOT_FOUND'
  | 'LESSON_NOT_FOUND'
  | 'TEACHER_NOT_FOUND'
  | 'QUESTION_NOT_FOUND'
  | 'ALREADY_ENROLLED'
  | 'ALREADY_IN_CART'
  | 'FREE_COURSE'
  | 'PAID_COURSE'
  | 'CART_EMPTY'
  | 'CANNOT_FOLLOW_SELF'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'RATE_LIMITED'
  | 'PAYMENT_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_ERROR'
  | 'AI_RATE_LIMITED'
  | 'AI_BLOCKED'
  | 'AI_UNAVAILABLE'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'CAPTCHA_REQUIRED'
  | 'CAPTCHA_FAILED'
  | 'CAPTCHA_UNAVAILABLE'
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'RESEND_TOO_SOON'
  | 'ALREADY_VERIFIED'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_CHALLENGE'
  | 'INVALID_PASSWORD'
  | 'TWO_FACTOR_NOT_SETUP'
  | 'TWO_FACTOR_NOT_ENABLED'
  | 'TWO_FACTOR_ALREADY_ENABLED'
  | 'SESSION_NOT_FOUND'
  // Teacher & admin (PLAN §2.4.6)
  | 'INVALID_COURSE_STATE'
  | 'COURSE_INCOMPLETE'
  | 'REVISION_REQUIRED'
  | 'REVISION_EXISTS'
  | 'REVISION_NOT_FOUND'
  | 'COURSE_HAS_ENROLLMENTS'
  | 'OWN_COURSE'
  | 'ACCOUNT_DISABLED'
  | 'CANNOT_DISABLE_ADMIN'
  | 'NOT_COURSE_TEACHER';

/** Error envelope: `{ error: { code, message, details? } }`. */
export type ApiErrorBody = {
  error: { code: ApiErrorCode | (string & {}); message: string; details?: unknown };
};

export type UpdateProfileRequest = { fullName?: string; headline?: string };

export type CourseSort = 'popular' | 'rating' | 'newest' | 'price_asc' | 'price_desc';
export type CourseSection = 'popular' | 'recommended' | 'inspires';

/** Query of `GET /courses`. */
export type CourseListParams = {
  q?: string;
  categoryId?: string;
  teacherId?: string;
  isFree?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: CourseSort;
  section?: CourseSection;
  page?: number;
  limit?: number;
};

export type MyCoursesStatus = 'all' | 'ongoing' | 'completed';

/** Response of `PUT /lessons/:id/progress`. */
export type LessonProgressResponse = {
  lessonProgress: { positionSec: number; isCompleted: boolean };
  courseProgressPercent: number;
};

export type LikeResponse = { likeCount: number; isLiked: boolean };
export type ShareResponse = { shareCount: number };
export type FollowResponse = { followerCount: number; isFollowed: boolean };

/** `GET /notifications/unread-count` (badge of the Home bell). */
export type UnreadCountResponse = { count: number };
/** Response of `POST /me/avatar`. */
export type UploadAvatarResponse = { avatarUrl: string };

/** Body of `POST /orders/checkout`. `simulateFailure` is only sent by dev builds (BR-07). */
export type CheckoutRequest = { paymentMethod: PaymentMethod; simulateFailure?: boolean };

// ---------------------------------------------------------------- AI (phase 2, PLAN §9.2 "AI")

/** Language of AI answers (`?lang=`; falls back to `Accept-Language`, then `en`). */
export type AiLang = 'vi' | 'en';

/** `GET /courses/:id/ai/summary` (cached in DB per course + language). */
export type AiCourseSummaryDto = {
  courseId: string;
  lang: AiLang;
  overview: string;
  /** 3-6 items. */
  objectives: string[];
  /** In curriculum order, at most 15 sections. */
  sections: { title: string; summary: string }[];
  /** 2-5 items. */
  targetAudience: string[];
  /** 3-6 items. */
  outcomes: string[];
  /** `gemini-...`, or `mock-ai-1` when the server has no Gemini key. */
  model: string;
  generatedAt: string;
};

/** `GET /lessons/:id/ai/summary` (enrolled, or a preview lesson). */
export type AiLessonSummaryDto = {
  lessonId: string;
  lang: AiLang;
  summary: string;
  /** 3-6 items. */
  keyPoints: string[];
  model: string;
  generatedAt: string;
};

export type AiQuizQuestionDto = {
  question: string;
  /** Exactly 4 options. */
  options: string[];
  /** 0-3, index into `options`. */
  correctIndex: number;
  explanation: string;
};

/** `POST /lessons/:id/ai/quiz` (enrolled only): exactly 5 questions. */
export type AiQuizDto = {
  lessonId: string;
  lang: AiLang;
  questions: AiQuizQuestionDto[];
  model: string;
  generatedAt: string;
};

export type AiRecommendationItemDto = { course: CourseSummary; reason: string };

/** `GET /me/ai/recommendations`: learning path of 3-5 courses (or none), in suggested order. */
export type AiRecommendationsDto = {
  lang: AiLang;
  encouragement: string;
  items: AiRecommendationItemDto[];
  model: string;
  generatedAt: string;
};

export type AiChatRole = 'USER' | 'ASSISTANT';

/** `GET /courses/:id/ai/chat` (newest first, paginated). */
export type AiChatMessageDto = { id: string; role: AiChatRole; content: string; createdAt: string };

/** Body of `POST /courses/:id/ai/chat` (1-1000 chars after trim). */
export type AiChatRequest = { message: string };

/**
 * Server-sent events of `POST /courses/:id/ai/chat` (`event: <name>` + one-line JSON `data:`).
 * Order: `delta`… then `done`, or `delta`… then `error` (the message is not saved).
 * Use a streaming `fetch`, not `EventSource` (needs POST + Authorization header).
 */
export type AiChatSseEvent =
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { messageId: string } }
  | { event: 'error'; data: { code: string; message: string } };

// ---------------------------------------------------------------- Auth (phase 2, AUTH-01..04, PLAN §9.2)

/** Tokens of a signed-in session. Access token: JWT 15 min bound to a session; refresh token: 30 days, single use. */
export type TokenPairDto = {
  accessToken: string;
  refreshToken: string;
  /** Seconds (900). */
  accessTokenExpiresIn: number;
  /** @deprecated Same as `accessToken`; kept for the pre-AUTH-08 app, will be removed. */
  token: string;
};

/** `POST /auth/verify-email`, `/auth/2fa/verify`, `/auth/refresh`, and `/auth/login` without 2FA. */
export type AuthSessionDto = TokenPairDto & { twoFactorRequired: false; user: UserDto };

/** `POST /auth/login` when 2FA is on: send `challengeToken` + code to `/auth/2fa/verify` within 5 min. */
export type TwoFactorChallengeDto = {
  twoFactorRequired: true;
  challengeToken: string;
  /** Seconds (300). */
  challengeExpiresIn: number;
};

export type LoginResultDto = AuthSessionDto | TwoFactorChallengeDto;

/** `POST /auth/register` (201): no tokens until the email OTP is verified. */
export type RegisterResultDto = {
  user: UserDto;
  emailVerificationRequired: true;
  /** Seconds (600). */
  codeExpiresIn: number;
  /** Seconds before "resend" is allowed (60). */
  resendAfter: number;
};

/** `POST /auth/resend-verification`, `/auth/forgot-password` (always 200). */
export type SentCodeDto = { sent: true; codeExpiresIn: number; resendAfter: number };

/** `GET /me/sessions`. `ipAddress` is truncated ("113.161.45.x"). */
export type SessionDto = {
  id: string;
  deviceName: string;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

/** `GET /me/security`. */
export type SecurityOverviewDto = {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  recoveryCodesRemaining: number;
};

/** `POST /me/2fa/setup`: render `otpauthUrl` as a QR code; `secret` (base32) for manual entry. */
export type TwoFactorSetupDto = { secret: string; otpauthUrl: string };

/** `POST /me/2fa/enable`, `/me/2fa/recovery-codes`: 10 codes "XXXXX-XXXXX", shown once. */
export type RecoveryCodesDto = { recoveryCodes: string[] };

export type LoginRequestV2 = {
  email: string;
  password: string;
  captchaToken?: string;
  deviceName?: string;
};
export type RegisterRequestV2 = {
  fullName: string;
  email: string;
  password: string;
  captchaToken: string;
  role: 'STUDENT' | 'TEACHER';
  lang?: AiLang;
};
export type VerifyEmailRequest = { email: string; code: string; deviceName?: string };
export type TwoFactorVerifyRequest =
  | { challengeToken: string; code: string; deviceName?: string }
  | { challengeToken: string; recoveryCode: string; deviceName?: string };
export type ResetPasswordRequest = { email: string; code: string; newPassword: string };
export type ChangePasswordRequest = { currentPassword: string; newPassword: string };
export type ResendVerificationRequest = { email: string; lang?: AiLang };
export type ForgotPasswordRequest = { email: string; captchaToken: string; lang?: AiLang };
export type EnableTwoFactorRequest = { code: string };
/** Exactly one of `code` (TOTP) / `recoveryCode`. */
export type DisableTwoFactorRequest = { password: string } & (
  { code: string } | { recoveryCode: string }
);
export type RecoveryCodesRequest = { code: string } | { recoveryCode: string };

// ---------------------------------------------------------------- Teacher & Admin (PLAN §2.4, v2.16)
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

/* ------------------------------------------------------------------ */
/* Teacher & Admin: query params and list envelopes (mobile-only)      */
/* ------------------------------------------------------------------ */

/** Query of `GET /teacher/courses`. */
export type StudioCourseListParams = { status?: CourseStatus; page?: number; limit?: number };
export type StudioCoursesPage = Paginated<
  StudioCourseSummaryDto,
  { summary: StudioListSummaryDto }
>;

/** Query of `GET /teacher/courses/:id/submissions`. */
export type TeacherSubmissionListParams = {
  status?: 'all' | 'graded' | 'ungraded';
  page?: number;
  limit?: number;
};
export type TeacherSubmissionsPage = Paginated<
  TeacherSubmissionDto,
  { summary: TeacherSubmissionsSummaryDto }
>;

/**
 * Query of `GET /admin/courses`. `type` defaults to `course`. `status` is a `CourseStatus` for `course` and a
 * `RevisionStatus` for `revision`; omitted = all. The review queue is `type=course&status=PENDING_REVIEW` plus
 * `type=revision&status=PENDING_REVIEW`.
 */
export type AdminCourseListParams = {
  type?: 'course' | 'revision';
  status?: CourseStatus | RevisionStatus;
  page?: number;
  limit?: number;
};
export type AdminCoursesPage = Paginated<AdminCourseQueueItemDto, { pending: AdminQueueCountsDto }>;

/** Query of `GET /admin/users`. */
export type AdminUserListParams = {
  /** Matches name or e-mail (contains, case-insensitive). */
  search?: string;
  role?: Role;
  status?: 'active' | 'disabled';
  page?: number;
  limit?: number;
};
export type AdminUsersPage = Paginated<AdminUserDto>;

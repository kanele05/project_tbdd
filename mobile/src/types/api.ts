/**
 * Shared API DTOs. The first block matches PLAN.md §9.3 exactly (server returns these shapes);
 * the rest are the additional DTOs derived from PLAN.md §8.2 / §9.2.
 * Money is always in cents (`priceCents`), durations in seconds (`durationSec`), dates are ISO 8601.
 */

/* ------------------------------------------------------------------ */
/* PLAN.md §9.3 - core DTOs                                            */
/* ------------------------------------------------------------------ */

export type UserDto = {
  id: string;
  email: string;
  fullName: string;
  headline: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
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

export type NotificationDto = {
  id: string;
  type: 'ORDER_PAID' | 'NEW_ANSWER' | 'COURSE_COMPLETED' | 'SYSTEM';
  title: string;
  body: string;
  data: { courseId?: string; questionId?: string } | null;
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
export type MeStatsDto = { savedCount: number; ongoingCount: number; completedCount: number };

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
  | 'SESSION_NOT_FOUND';

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

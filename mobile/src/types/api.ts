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
  | 'INTERNAL_ERROR';

/** Error envelope: `{ error: { code, message, details? } }`. */
export type ApiErrorBody = {
  error: { code: ApiErrorCode | (string & {}); message: string; details?: unknown };
};

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = { fullName: string; email: string; password: string };
export type AuthResponse = { token: string; user: UserDto };
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

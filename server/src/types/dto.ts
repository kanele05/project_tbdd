/**
 * DTO trả về cho mobile - khớp PLAN.md §9.3.
 * (Bản sao phía mobile nằm ở mobile/src/types/api.ts.)
 */
export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type UserDto = {
  id: string;
  email: string;
  fullName: string;
  headline: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: Role;
};

export type CourseBadge = 'BEST_SELLER' | 'DISCOUNT';

export type CourseSummaryDto = {
  id: string;
  title: string;
  thumbnailUrl: string;
  teacher: { id: string; fullName: string };
  priceCents: number;
  originalPriceCents: number | null;
  badge: CourseBadge | null;
  discountPercent: number | null;
  ratingAvg: number;
  ratingCount: number;
  lessonCount: number;
  totalDurationSec: number;
  isBookmarked: boolean;
};

export type TeacherSummaryDto = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  organization: string | null;
  ratingAvg: number;
  ratingCount: number;
};

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  courseCount: number;
};

export type TagDto = {
  id: string;
  name: string;
  isHot: boolean;
};

// ---------------------------------------------------------------- Learning / Review / Q&A (agent C)

export type UserRefDto = { id: string; fullName: string; avatarUrl: string | null };

export type ReviewDto = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  user: UserRefDto;
  course?: { id: string; title: string };
};

/** `meta.summary` của `GET /courses/:id/reviews` (tính trên TẤT CẢ review của khóa, không phụ thuộc bộ lọc sao). */
export type ReviewSummaryDto = {
  avg: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type QuestionDto = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  answerCount: number;
  isLiked: boolean;
  user: UserRefDto;
};

export type AnswerDto = {
  id: string;
  content: string;
  createdAt: string;
  user: UserRefDto;
};

export type LessonStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED';

export type CurriculumLessonDto = {
  id: string;
  number: number;
  title: string;
  durationSec: number;
  isPreview: boolean;
  status: LessonStatus;
};

export type CurriculumSectionDto = {
  id: string;
  title: string;
  order: number;
  lessons: CurriculumLessonDto[];
};

export type LessonDetailDto = {
  id: string;
  courseId: string;
  title: string;
  durationSec: number;
  videoUrl: string;
  positionSec: number;
  isCompleted: boolean;
  nextLessonId: string | null;
};

export type MyCourseItemDto = {
  course: { id: string; title: string; thumbnailUrl: string };
  totalDurationSec: number;
  progressPercent: number;
  lastLessonId: string | null;
  lastAccessedAt: string;
};

export type LessonProgressResponseDto = {
  lessonProgress: { positionSec: number; isCompleted: boolean };
  courseProgressPercent: number;
};

/** Kết quả like khóa học / câu hỏi. */
export type LikeStateDto = { likeCount: number; isLiked: boolean };

export type ShareDto = { shareCount: number };

// ---------------------------------------------------------------- Course detail / Teacher / Home / Cart / Order / Me / Project (agent A)

/** `GET /courses/:id` - PLAN §9.3 (`CourseSummary & {...}` với `teacher` mở rộng). */
export type CourseDetailDto = Omit<CourseSummaryDto, 'teacher'> & {
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

export type TeacherDetailDto = TeacherSummaryDto & {
  jobTitle: string;
  bio: string;
  coverUrl: string | null;
  location: string | null;
  timezone: string | null;
  /** Giờ hiện tại theo `timezone` dạng `hh:mm A` (BR-16), vd "09:30 AM"; null nếu thiếu / sai múi giờ. */
  localTime: string | null;
  isFollowed: boolean;
  stats: { courseCount: number; studentCount: number; followerCount: number };
};

/** Một phần tử của `GET /teachers/:id/courses` (nhóm theo danh mục). */
export type TeacherCoursesGroupDto = {
  category: { id: string; name: string };
  isTopRated: boolean;
  courses: CourseSummaryDto[];
};

export type FollowStateDto = { followerCount: number; isFollowed: boolean };

export type BannerDto = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaText: string;
  imageUrl: string;
  bgColor: string;
  target: { type: 'COURSE' | 'CATEGORY'; id: string };
};

export type HomeResponseDto = {
  banners: BannerDto[];
  categories: CategoryDto[];
  popular: CourseSummaryDto[];
  recommended: CourseSummaryDto[];
  inspires: CourseSummaryDto[];
  topTeachers: TeacherSummaryDto[];
};

export type CartItemDto = { course: CourseSummaryDto; addedAt: string };

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

export type CheckoutResponseDto = { order: OrderDto; enrolledCourseIds: string[] };

/** `POST /courses/:id/enroll` (khóa miễn phí). */
export type EnrollmentStateDto = {
  courseId: string;
  progressPercent: number;
  lastLessonId: string | null;
};

export type MeStatsDto = { savedCount: number; ongoingCount: number; completedCount: number };

export type NotificationType = 'ORDER_PAID' | 'NEW_ANSWER' | 'COURSE_COMPLETED' | 'SYSTEM';

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: { courseId?: string; questionId?: string } | null;
  isRead: boolean;
  createdAt: string;
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
  user: UserRefDto;
};

/** `GET /courses/:id/project` */
export type CourseProjectDto = {
  description: string;
  resources: ResourceDto[];
  submissionCount: number;
};

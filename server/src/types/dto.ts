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

/** Vòng đời khóa học (PLAN §2.4, BR-19). Chỉ `PUBLISHED` hiện ở danh mục. */
export type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

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
  /** Phản hồi của giảng viên (BR-25); `null` nếu chưa có. */
  teacherReply: string | null;
  teacherRepliedAt: string | null;
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
  /** Người trả lời là giảng viên của khóa (huy hiệu "Giảng viên", BR-24). */
  isInstructor: boolean;
  /** Câu trả lời được ghim (xếp đầu danh sách). */
  isPinned: boolean;
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
  /** Khóa không `PUBLISHED` chỉ trả cho học viên đã ghi danh, chủ khóa và ADMIN (BR-22). */
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

/** `NotificationDto.data` (PLAN §9.3 + §2.4): id để mobile mở đúng màn khi chạm thông báo. */
export type NotificationDataDto = {
  courseId?: string;
  questionId?: string;
  /** `PROJECT_GRADED`. */
  submissionId?: string;
  /** `REVIEW_REPLY`. */
  reviewId?: string;
};

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationDataDto | null;
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
  /** Điểm 0-100 giảng viên chấm (BR-26); `null` nếu chưa chấm. */
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

// ---------------------------------------------------------------- AI (Google Gemini)

/** Ngôn ngữ AI trả lời. */
export type AiLangDto = 'vi' | 'en';

/** `GET /courses/:id/ai/summary` */
export type AiCourseSummaryDto = {
  courseId: string;
  lang: AiLangDto;
  /** 2-3 câu giới thiệu khóa học. */
  overview: string;
  /** Mục tiêu học tập (3-6). */
  objectives: string[];
  /** Nội dung chính theo từng chương (đúng thứ tự chương của khóa). */
  sections: { title: string; summary: string }[];
  /** Ai nên học (2-5). */
  targetAudience: string[];
  /** Kết quả đạt được sau khóa (3-6). */
  outcomes: string[];
  /** `gemini-...` hoặc `mock-ai-1` khi chưa cấu hình GEMINI_API_KEY. */
  model: string;
  generatedAt: string;
};

/** `GET /lessons/:id/ai/summary` */
export type AiLessonSummaryDto = {
  lessonId: string;
  lang: AiLangDto;
  summary: string;
  /** Ý chính (3-6). */
  keyPoints: string[];
  model: string;
  generatedAt: string;
};

export type AiQuizQuestionDto = {
  question: string;
  /** Đúng 4 lựa chọn. */
  options: string[];
  /** Chỉ số (0-3) của đáp án đúng trong `options`. */
  correctIndex: number;
  explanation: string;
};

/** `POST /lessons/:id/ai/quiz` - 5 câu trắc nghiệm (cache theo bài + ngôn ngữ). */
export type AiQuizDto = {
  lessonId: string;
  lang: AiLangDto;
  questions: AiQuizQuestionDto[];
  model: string;
  generatedAt: string;
};

export type AiRecommendationItemDto = { course: CourseSummaryDto; reason: string };

/** `GET /me/ai/recommendations` - lộ trình 3-5 khóa theo thứ tự nên học (cache 24 h theo user + ngôn ngữ). */
export type AiRecommendationsDto = {
  lang: AiLangDto;
  /** 1 câu động viên. */
  encouragement: string;
  items: AiRecommendationItemDto[];
  model: string;
  generatedAt: string;
};

export type AiChatRole = 'USER' | 'ASSISTANT';

/** `GET /courses/:id/ai/chat` (mới nhất trước). */
export type AiChatMessageDto = {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
};

/** Sự kiện SSE của `POST /courses/:id/ai/chat` (`event:` + `data:` JSON). */
export type AiChatSseEvent =
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { messageId: string } }
  | { event: 'error'; data: { code: string; message: string } };

// ---------------------------------------------------------------- Xác thực chuẩn app thật (AUTH-01…AUTH-06)

/** Cặp token trả về khi đăng nhập / xác minh email / 2FA / refresh. */
export type TokenPairDto = {
  /** JWT sống ngắn (mặc định 15 phút) - gửi trong `Authorization: Bearer`. */
  accessToken: string;
  /** Chuỗi ngẫu nhiên sống 30 ngày, dùng một lần (xoay vòng) ở `POST /auth/refresh`. Lưu ở SecureStore. */
  refreshToken: string;
  /** Số giây access token còn sống kể từ lúc cấp (vd. 900). */
  accessTokenExpiresIn: number;
  /** @deprecated Bằng `accessToken`; chỉ để app cũ chạy tiếp, bỏ sau AUTH-08. */
  token: string;
};

/** `POST /auth/login` (không bật 2FA), `POST /auth/2fa/verify`, `POST /auth/verify-email`, `POST /auth/refresh`. */
export type AuthSessionDto = TokenPairDto & { twoFactorRequired: false; user: UserDto };

/** `POST /auth/login` khi tài khoản bật 2FA: mật khẩu đúng, cần thêm mã ở `POST /auth/2fa/verify`. */
export type TwoFactorChallengeDto = {
  twoFactorRequired: true;
  /** JWT 5 phút, chỉ dùng ở `POST /auth/2fa/verify`. */
  challengeToken: string;
  challengeExpiresIn: number;
};

export type LoginResultDto = AuthSessionDto | TwoFactorChallengeDto;

/** `POST /auth/register`: chưa cấp token, phải xác minh email bằng OTP (xem `POST /auth/verify-email`). */
export type RegisterResultDto = {
  user: UserDto;
  emailVerificationRequired: true;
  /** Mã hết hạn sau (giây). */
  codeExpiresIn: number;
  /** Được gửi lại mã sau (giây). */
  resendAfter: number;
};

export type SentCodeDto = { sent: true; codeExpiresIn: number; resendAfter: number };

/** `GET /me/sessions`: thiết bị đang đăng nhập. */
export type SessionDto = {
  id: string;
  deviceName: string;
  /** Đã rút gọn, vd. `113.161.45.x`. */
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

/** `GET /me/security` */
export type SecurityOverviewDto = {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  /** Số mã khôi phục 2FA chưa dùng (0 nếu chưa bật 2FA). */
  recoveryCodesRemaining: number;
};

/** `POST /me/2fa/setup` */
export type TwoFactorSetupDto = {
  /** Secret base32 để nhập tay vào app Authenticator. */
  secret: string;
  /** `otpauth://totp/...` -> client vẽ mã QR. */
  otpauthUrl: string;
};

/** `POST /me/2fa/enable`, `POST /me/2fa/recovery-codes`: hiện đúng 1 lần, server chỉ lưu hash. */
export type RecoveryCodesDto = { recoveryCodes: string[] };

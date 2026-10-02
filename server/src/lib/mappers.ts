/**
 * Mapper + Prisma `select` chuẩn dùng chung cho mọi service (Home, Course, Bookmark, Teacher, Cart...).
 * Quy ước: service dùng `xxxSelect` để lấy đúng các cột cần, rồi gọi `toXxx()` để ra DTO.
 * File này thuần (không truy vấn DB) nên unit test dễ dàng.
 */
import type { Prisma } from '@/generated/prisma/client';
import { toAbsoluteUrl, toAbsoluteUrlOrNull } from '@/lib/url';
import type {
  CategoryDto,
  CourseBadge,
  CourseSummaryDto,
  ReviewDto,
  TagDto,
  TeacherSummaryDto,
  UserDto,
  UserRefDto,
} from '@/types/dto';

// ---------------------------------------------------------------- Badge (BR-10)

export type BadgeInput = {
  isBestSeller: boolean;
  priceCents: number;
  originalPriceCents: number | null;
};

export type BadgeResult = { badge: CourseBadge | null; discountPercent: number | null };

/**
 * BR-10: `isBestSeller` -> "Best-seller" (ưu tiên); ngược lại có giảm giá -> "{x}% Off"
 * với x = round((1 - price / original) * 100). `discountPercent` vẫn có giá trị khi là Best-seller
 * (thanh giá ở trang chi tiết cần). Giảm giá làm tròn về 0% thì coi như không giảm.
 */
export function computeBadge(input: BadgeInput): BadgeResult {
  const { isBestSeller, priceCents, originalPriceCents } = input;
  let discountPercent: number | null = null;
  if (originalPriceCents !== null && originalPriceCents > priceCents) {
    const percent = Math.round((1 - priceCents / originalPriceCents) * 100);
    discountPercent = percent > 0 ? percent : null;
  }
  const badge: CourseBadge | null = isBestSeller
    ? 'BEST_SELLER'
    : discountPercent !== null
      ? 'DISCOUNT'
      : null;
  return { badge, discountPercent };
}

// ---------------------------------------------------------------- Course summary

export const courseSummarySelect = {
  id: true,
  title: true,
  thumbnailUrl: true,
  priceCents: true,
  originalPriceCents: true,
  isBestSeller: true,
  ratingAvg: true,
  ratingCount: true,
  lessonCount: true,
  totalDurationSec: true,
  teacher: { select: { id: true, user: { select: { fullName: true } } } },
} satisfies Prisma.CourseSelect;

export type CourseSummaryRow = Prisma.CourseGetPayload<{ select: typeof courseSummarySelect }>;

export type CourseSummaryOptions = {
  /** Tập id khóa học người dùng đã lưu; bỏ trống (khách) -> `isBookmarked = false`. */
  bookmarkedIds?: ReadonlySet<string> | readonly string[];
};

function hasId(ids: CourseSummaryOptions['bookmarkedIds'], id: string): boolean {
  if (!ids) return false;
  return ids instanceof Set ? ids.has(id) : (ids as readonly string[]).includes(id);
}

export function toCourseSummary(
  course: CourseSummaryRow,
  options: CourseSummaryOptions = {},
): CourseSummaryDto {
  const { badge, discountPercent } = computeBadge(course);
  return {
    id: course.id,
    title: course.title,
    thumbnailUrl: toAbsoluteUrl(course.thumbnailUrl),
    teacher: { id: course.teacher.id, fullName: course.teacher.user.fullName },
    priceCents: course.priceCents,
    originalPriceCents: course.originalPriceCents,
    badge,
    discountPercent,
    ratingAvg: course.ratingAvg,
    ratingCount: course.ratingCount,
    lessonCount: course.lessonCount,
    totalDurationSec: course.totalDurationSec,
    isBookmarked: hasId(options.bookmarkedIds, course.id),
  };
}

// ---------------------------------------------------------------- Teacher summary

export const teacherSummarySelect = {
  id: true,
  organization: true,
  user: { select: { fullName: true, avatarUrl: true } },
  // Chỉ khóa đã publish và đã có đánh giá mới tính điểm (PLAN.md §9.3, BR-11).
  courses: {
    where: { isPublished: true, ratingCount: { gt: 0 } },
    select: { ratingAvg: true, ratingCount: true },
  },
} satisfies Prisma.TeacherProfileSelect;

export type TeacherSummaryRow = Prisma.TeacherProfileGetPayload<{
  select: typeof teacherSummarySelect;
}>;

/** Làm tròn 1 chữ số thập phân (4.46 -> 4.5) để hiển thị đồng nhất với card khóa học. */
export function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}

/** `ratingAvg` = trung bình cộng ratingAvg các khóa; `ratingCount` = tổng ratingCount. */
export function toTeacherSummary(teacher: TeacherSummaryRow): TeacherSummaryDto {
  const rated = teacher.courses;
  const ratingAvg =
    rated.length === 0
      ? 0
      : roundRating(rated.reduce((sum, c) => sum + c.ratingAvg, 0) / rated.length);
  return {
    id: teacher.id,
    fullName: teacher.user.fullName,
    avatarUrl: toAbsoluteUrlOrNull(teacher.user.avatarUrl),
    organization: teacher.organization,
    ratingAvg,
    ratingCount: rated.reduce((sum, c) => sum + c.ratingCount, 0),
  };
}

// ---------------------------------------------------------------- User

export const userDtoSelect = {
  id: true,
  email: true,
  fullName: true,
  headline: true,
  avatarUrl: true,
  coverUrl: true,
  role: true,
} satisfies Prisma.UserSelect;

export type UserDtoRow = Prisma.UserGetPayload<{ select: typeof userDtoSelect }>;

/** Nhận cả bản ghi User đầy đủ (chứa passwordHash) - chỉ các trường của DTO được copy ra. */
export function toUserDto(user: UserDtoRow): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    headline: user.headline,
    avatarUrl: toAbsoluteUrlOrNull(user.avatarUrl),
    coverUrl: toAbsoluteUrlOrNull(user.coverUrl),
    role: user.role,
  };
}

// ---------------------------------------------------------------- Category / Tag

export const categoryDtoSelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  color: true,
  _count: { select: { courses: { where: { isPublished: true } } } },
} satisfies Prisma.CategorySelect;

export type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof categoryDtoSelect }>;

export function toCategoryDto(category: CategoryRow): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    color: category.color,
    courseCount: category._count.courses,
  };
}

export const tagDtoSelect = { id: true, name: true, isHot: true } satisfies Prisma.TagSelect;

export function toTagDto(tag: { id: string; name: string; isHot: boolean }): TagDto {
  return { id: tag.id, name: tag.name, isHot: tag.isHot };
}

// ---------------------------------------------------------------- User ref / Review

/** Tác giả rút gọn ({id, fullName, avatarUrl}) dùng trong review, câu hỏi, trả lời. */
export const userRefSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export type UserRefRow = Prisma.UserGetPayload<{ select: typeof userRefSelect }>;

export function toUserRef(user: UserRefRow): UserRefDto {
  return { id: user.id, fullName: user.fullName, avatarUrl: toAbsoluteUrlOrNull(user.avatarUrl) };
}

export const reviewDtoSelect = {
  id: true,
  rating: true,
  content: true,
  createdAt: true,
  user: { select: userRefSelect },
} satisfies Prisma.ReviewSelect;

export type ReviewDtoRow = Prisma.ReviewGetPayload<{ select: typeof reviewDtoSelect }> & {
  /** Có khi query mở rộng `course: { select: { id: true, title: true } }` (review của giảng viên). */
  course?: { id: string; title: string };
};

export function toReviewDto(review: ReviewDtoRow): ReviewDto {
  const dto: ReviewDto = {
    id: review.id,
    rating: review.rating,
    content: review.content,
    createdAt: review.createdAt.toISOString(),
    user: toUserRef(review.user),
  };
  if (review.course) dto.course = { id: review.course.id, title: review.course.title };
  return dto;
}

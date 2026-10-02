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

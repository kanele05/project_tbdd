import { getBookmarkedIds } from '@/lib/bookmarkedIds';
import { cache } from '@/lib/cache';
import { courseSummarySelect, toCourseSummary } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/url';
import { listCategories } from '@/modules/category/category.service';
import {
  buildCourseOrderBy,
  findCourseSummariesByIds,
  getRecommendedCourseIds,
} from '@/modules/course/course.service';
import { getTopTeachers } from '@/modules/teacher/teacher.service';
import type { BannerDto, CourseSummaryDto, HomeResponseDto } from '@/types/dto';

/** Mọi khóa cache của Home bắt đầu bằng tiền tố này (xem `invalidateHomeCache`). */
export const HOME_CACHE_PREFIX = 'home:';
export const HOME_PUBLIC_CACHE_KEY = `${HOME_CACHE_PREFIX}public`;
/** PLAN §17.1: cache in-memory 60 s cho phần công khai của Home. */
export const HOME_CACHE_TTL_MS = 60_000;
/** Số phần tử mỗi section (popular, recommended, inspires, topTeachers). */
export const HOME_SECTION_SIZE = 10;

/** Phần Home giống nhau cho mọi người dùng (được cache); `isBookmarked` luôn false trong cache. */
type PublicHome = Omit<HomeResponseDto, 'recommended'> & {
  /** "Recommended" cho khách = khóa rating cao nhất (BR-12). */
  guestRecommended: CourseSummaryDto[];
};

/** Xóa cache Home khi dữ liệu nền đổi (checkout, ghi danh, review...). */
export function invalidateHomeCache(): void {
  cache.invalidatePrefix(HOME_CACHE_PREFIX);
}

async function loadBanners(): Promise<BannerDto[]> {
  const rows = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
  return rows.map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    ctaText: banner.ctaText,
    imageUrl: toAbsoluteUrl(banner.imageUrl),
    bgColor: banner.bgColor,
    target: { type: banner.targetType, id: banner.targetId },
  }));
}

/** BR-11: popular = `enrollmentCount` giảm dần; inspires = `isFeatured`. */
async function loadCourses(onlyFeatured: boolean): Promise<CourseSummaryDto[]> {
  const rows = await prisma.course.findMany({
    where: { isPublished: true, ...(onlyFeatured ? { isFeatured: true } : {}) },
    orderBy: buildCourseOrderBy('popular'),
    take: HOME_SECTION_SIZE,
    select: courseSummarySelect,
  });
  return rows.map((row) => toCourseSummary(row));
}

async function loadRecommended(userId?: string): Promise<CourseSummaryDto[]> {
  const ids = await getRecommendedCourseIds(userId);
  return findCourseSummariesByIds(ids.slice(0, HOME_SECTION_SIZE), userId);
}

async function loadPublicHome(): Promise<PublicHome> {
  const [banners, categories, popular, inspires, topTeachers, guestRecommended] = await Promise.all(
    [
      loadBanners(),
      listCategories(),
      loadCourses(false),
      loadCourses(true),
      getTopTeachers(HOME_SECTION_SIZE),
      loadRecommended(),
    ],
  );
  return { banners, categories, popular, inspires, topTeachers, guestRecommended };
}

function withBookmarks(
  courses: readonly CourseSummaryDto[],
  bookmarkedIds: ReadonlySet<string>,
): CourseSummaryDto[] {
  return courses.map((course) =>
    bookmarkedIds.has(course.id) ? { ...course, isBookmarked: true } : course,
  );
}

/**
 * `GET /home`: gom 6 section trong 1 request. Phần công khai cache 60 s; phần theo người dùng
 * (recommended, `isBookmarked`) ghép SAU cache nên không lộ dữ liệu giữa các user.
 */
export async function getHome(userId?: string): Promise<HomeResponseDto> {
  const [publicHome, personalRecommended] = await Promise.all([
    cache.wrap(HOME_PUBLIC_CACHE_KEY, HOME_CACHE_TTL_MS, loadPublicHome),
    userId ? loadRecommended(userId) : Promise.resolve(null),
  ]);

  const bookmarkedIds = await getBookmarkedIds(userId, [
    ...publicHome.popular.map((course) => course.id),
    ...publicHome.inspires.map((course) => course.id),
  ]);

  return {
    banners: publicHome.banners,
    categories: publicHome.categories,
    popular: withBookmarks(publicHome.popular, bookmarkedIds),
    recommended: personalRecommended ?? publicHome.guestRecommended,
    inspires: withBookmarks(publicHome.inspires, bookmarkedIds),
    topTeachers: publicHome.topTeachers,
  };
}

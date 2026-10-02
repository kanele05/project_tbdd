import type { CourseSummaryDto } from '@/types/dto';

import {
  getHome,
  HOME_CACHE_PREFIX,
  HOME_CACHE_TTL_MS,
  HOME_PUBLIC_CACHE_KEY,
  invalidateHomeCache,
} from './home.service';

jest.mock('@/lib/cache', () => ({
  cache: {
    // Chạy loader thật mỗi lần (cache của test không lưu), chỉ ghi nhận tham số.
    wrap: jest.fn((_key: string, _ttl: number, loader: () => Promise<unknown>) => loader()),
    invalidatePrefix: jest.fn(),
  },
}));
jest.mock('@/lib/prisma', () => ({
  prisma: { banner: { findMany: jest.fn() }, course: { findMany: jest.fn() } },
}));
jest.mock('@/lib/bookmarkedIds', () => ({ getBookmarkedIds: jest.fn() }));
jest.mock('@/modules/category/category.service', () => ({ listCategories: jest.fn() }));
jest.mock('@/modules/teacher/teacher.service', () => ({ getTopTeachers: jest.fn() }));
jest.mock('@/modules/course/course.service', () => ({
  buildCourseOrderBy: jest.fn(() => []),
  findCourseSummariesByIds: jest.fn(),
  getRecommendedCourseIds: jest.fn(),
}));

type Fn = jest.Mock;
const { cache } = jest.requireMock('@/lib/cache') as {
  cache: { wrap: Fn; invalidatePrefix: Fn };
};
const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: { banner: { findMany: Fn }; course: { findMany: Fn } };
};
const { getBookmarkedIds } = jest.requireMock('@/lib/bookmarkedIds') as { getBookmarkedIds: Fn };
const { listCategories } = jest.requireMock('@/modules/category/category.service') as {
  listCategories: Fn;
};
const { getTopTeachers } = jest.requireMock('@/modules/teacher/teacher.service') as {
  getTopTeachers: Fn;
};
const courseService = jest.requireMock('@/modules/course/course.service') as {
  findCourseSummariesByIds: Fn;
  getRecommendedCourseIds: Fn;
};

function row(id: string) {
  return {
    id,
    title: id,
    thumbnailUrl: 'https://img/x.jpg',
    priceCents: 100,
    originalPriceCents: null,
    isBestSeller: false,
    ratingAvg: 4,
    ratingCount: 1,
    lessonCount: 1,
    totalDurationSec: 1,
    teacher: { id: 't', user: { fullName: 'T' } },
  };
}

function dto(id: string, isBookmarked = false): CourseSummaryDto {
  return { ...(row(id) as unknown as CourseSummaryDto), isBookmarked };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.banner.findMany.mockResolvedValue([
    {
      id: 'b1',
      title: 'Banner',
      subtitle: null,
      ctaText: 'GO',
      imageUrl: 'https://img/b.png',
      bgColor: '#fff',
      targetType: 'COURSE',
      targetId: 'c1',
    },
  ]);
  prisma.course.findMany.mockResolvedValue([row('c1'), row('c2')]);
  listCategories.mockResolvedValue([]);
  getTopTeachers.mockResolvedValue([]);
  getBookmarkedIds.mockResolvedValue(new Set());
  courseService.getRecommendedCourseIds.mockResolvedValue(['r1']);
  courseService.findCourseSummariesByIds.mockResolvedValue([dto('r1')]);
});

describe('getHome', () => {
  it('caches the public part for 60 s under the home: prefix', async () => {
    await getHome();
    expect(cache.wrap).toHaveBeenCalledTimes(1);
    expect(cache.wrap).toHaveBeenCalledWith(
      HOME_PUBLIC_CACHE_KEY,
      HOME_CACHE_TTL_MS,
      expect.any(Function),
    );
    expect(HOME_CACHE_TTL_MS).toBe(60_000);
    expect(HOME_PUBLIC_CACHE_KEY.startsWith(HOME_CACHE_PREFIX)).toBe(true);
  });

  it('serves guests the top-rated recommendation and never queries bookmarks', async () => {
    const home = await getHome();

    expect(home.recommended.map((c) => c.id)).toEqual(['r1']);
    expect(courseService.getRecommendedCourseIds).toHaveBeenCalledTimes(1);
    expect(courseService.getRecommendedCourseIds).toHaveBeenCalledWith(undefined);
    expect(home.banners[0]).toMatchObject({ id: 'b1', target: { type: 'COURSE', id: 'c1' } });
    expect(home.popular.every((c) => !c.isBookmarked)).toBe(true);
  });

  it('adds the per-user recommendation and isBookmarked AFTER the cached part', async () => {
    getBookmarkedIds.mockResolvedValue(new Set(['c2']));
    courseService.findCourseSummariesByIds.mockResolvedValue([dto('mine')]);

    const home = await getHome('user-1');

    expect(courseService.getRecommendedCourseIds).toHaveBeenCalledWith('user-1');
    expect(home.recommended.map((c) => c.id)).toEqual(['mine']);
    expect(home.popular.map((c) => [c.id, c.isBookmarked])).toEqual([
      ['c1', false],
      ['c2', true],
    ]);
  });

  it('does not mutate the cached objects when applying bookmarks', async () => {
    getBookmarkedIds.mockResolvedValue(new Set(['c1']));
    await getHome('user-1');
    getBookmarkedIds.mockResolvedValue(new Set());
    const guest = await getHome();
    expect(guest.popular.every((c) => !c.isBookmarked)).toBe(true);
  });
});

describe('invalidateHomeCache', () => {
  it('drops every home:* cache entry', () => {
    invalidateHomeCache();
    expect(cache.invalidatePrefix).toHaveBeenCalledWith(HOME_CACHE_PREFIX);
  });
});

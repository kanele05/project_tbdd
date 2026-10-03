import type { ListCoursesQuery } from './course.schema';
import {
  buildCourseOrderBy,
  buildCourseWhere,
  escapeLikePattern,
  findCourseSummariesByIds,
  getCourseDetail,
  getRecommendedCourseIds,
  getSimilarCourses,
  listCourses,
  splitSearchTerms,
} from './course.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
    enrollment: { findMany: jest.fn(), findUnique: jest.fn() },
    bookmark: { findMany: jest.fn(), findUnique: jest.fn() },
    courseLike: { findUnique: jest.fn() },
    follow: { findUnique: jest.fn() },
    cartItem: { findUnique: jest.fn() },
    lesson: { findFirst: jest.fn() },
  },
}));

type Fn = jest.Mock;
const db = (jest.requireMock('@/lib/prisma') as { prisma: Record<string, Record<string, Fn>> })
  .prisma;

const baseQuery: ListCoursesQuery = { page: 1, limit: 20 };

beforeEach(() => {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
});

describe('splitSearchTerms', () => {
  it('splits on whitespace, drops empties and keeps at most 5 words', () => {
    expect(splitSearchTerms('  ux   design ')).toEqual(['ux', 'design']);
    expect(splitSearchTerms('a b c d e f g')).toHaveLength(5);
    expect(splitSearchTerms(undefined)).toEqual([]);
    expect(splitSearchTerms('   ')).toEqual([]);
  });
});

describe('escapeLikePattern', () => {
  it('escapes %, _ and backslash so they match literally', () => {
    expect(escapeLikePattern('100%_a\\b')).toBe('100\\%\\_a\\\\b');
    expect(escapeLikePattern('plain')).toBe('plain');
  });
});

describe('buildCourseWhere', () => {
  it('always restricts to published courses', () => {
    expect(buildCourseWhere({})).toEqual({ isPublished: true, AND: [] });
  });

  it('adds one case-insensitive OR group per search word over title/subtitle/tag/teacher', () => {
    const where = buildCourseWhere({ q: 'ux design' });
    expect(where.AND).toHaveLength(2);
    const group = (where.AND as { OR: unknown[] }[])[0];
    expect(group.OR).toEqual([
      { title: { contains: 'ux', mode: 'insensitive' } },
      { subtitle: { contains: 'ux', mode: 'insensitive' } },
      { tags: { some: { tag: { name: { contains: 'ux', mode: 'insensitive' } } } } },
      { teacher: { user: { fullName: { contains: 'ux', mode: 'insensitive' } } } },
    ]);
  });

  it('maps category, teacher, price, rating, free and section filters', () => {
    const where = buildCourseWhere({
      categoryId: ['c1', 'c2'],
      teacherId: 't1',
      isFree: false,
      minPrice: 100,
      maxPrice: 900,
      minRating: 4,
      section: 'inspires',
    });
    expect(where.AND).toEqual([
      { categoryId: { in: ['c1', 'c2'] } },
      { teacherId: 't1' },
      { priceCents: { gt: 0 } },
      { priceCents: { gte: 100 } },
      { priceCents: { lte: 900 } },
      { ratingAvg: { gte: 4 } },
      { isFeatured: true },
    ]);
  });

  it('maps isFree=true to price 0 and ignores an empty category list', () => {
    expect(buildCourseWhere({ isFree: true, categoryId: [] }).AND).toEqual([{ priceCents: 0 }]);
  });
});

describe('buildCourseOrderBy', () => {
  it('defaults to popular and always ends with id for stable paging', () => {
    expect(buildCourseOrderBy()[0]).toEqual({ enrollmentCount: 'desc' });
    for (const sort of ['popular', 'rating', 'newest', 'price_asc', 'price_desc'] as const) {
      expect(buildCourseOrderBy(sort).at(-1)).toEqual({ id: 'asc' });
    }
    expect(buildCourseOrderBy('price_asc')[0]).toEqual({ priceCents: 'asc' });
  });
});

describe('listCourses', () => {
  it('queries count + page with skip/take and returns meta', async () => {
    db.course.count.mockResolvedValue(45);
    db.course.findMany.mockResolvedValue([]);

    const result = await listCourses({ ...baseQuery, page: 3, limit: 10, sort: 'newest' });

    expect(db.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10, orderBy: buildCourseOrderBy('newest') }),
    );
    expect(result).toEqual({
      courses: [],
      meta: { page: 3, limit: 10, total: 45, totalPages: 5 },
    });
  });

  it('does not query bookmarks for guests', async () => {
    db.course.count.mockResolvedValue(0);
    db.course.findMany.mockResolvedValue([]);
    await listCourses(baseQuery);
    expect(db.bookmark.findMany).not.toHaveBeenCalled();
  });
});

describe('getRecommendedCourseIds (BR-12)', () => {
  it('puts interest categories first, excludes enrolled courses, keeps rating order inside groups', async () => {
    db.enrollment.findMany.mockResolvedValue([{ courseId: 'e1', course: { categoryId: 'cat-a' } }]);
    db.bookmark.findMany.mockResolvedValue([{ course: { categoryId: 'cat-b' } }]);
    db.course.findMany.mockResolvedValue([
      { id: 'x', categoryId: 'cat-z' },
      { id: 'a1', categoryId: 'cat-a' },
      { id: 'y', categoryId: 'cat-y' },
      { id: 'b1', categoryId: 'cat-b' },
    ]);

    const ids = await getRecommendedCourseIds('user-1');

    expect(ids).toEqual(['a1', 'b1', 'x', 'y']);
    const where = db.course.findMany.mock.calls[0][0].where as { AND: unknown[] };
    expect(where.AND).toContainEqual({ id: { notIn: ['e1'] } });
  });

  it('is plain top-rated for a guest and skips user queries', async () => {
    db.course.findMany.mockResolvedValue([{ id: 'a', categoryId: 'c' }]);
    expect(await getRecommendedCourseIds(undefined)).toEqual(['a']);
    expect(db.enrollment.findMany).not.toHaveBeenCalled();
  });
});

describe('getCourseDetail', () => {
  it('throws 404 COURSE_NOT_FOUND when the course is missing or unpublished', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(getCourseDetail('nope')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
    expect(db.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'nope', isPublished: true } }),
    );
  });
});

type CourseRow = {
  id: string;
  title: string;
  thumbnailUrl: string;
  priceCents: number;
  originalPriceCents: number | null;
  isBestSeller: boolean;
  ratingAvg: number;
  ratingCount: number;
  lessonCount: number;
  totalDurationSec: number;
  teacher: { id: string; user: { fullName: string } };
};

function courseRow(id: string, overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id,
    title: `Course ${id}`,
    thumbnailUrl: 'https://img.example.com/x.jpg',
    priceCents: 5900,
    originalPriceCents: null,
    isBestSeller: false,
    ratingAvg: 4.5,
    ratingCount: 10,
    lessonCount: 5,
    totalDurationSec: 3600,
    teacher: { id: 't1', user: { fullName: 'Teacher One' } },
    ...overrides,
  };
}

describe('listCourses (more)', () => {
  it('marks courses the user bookmarked in the result page', async () => {
    db.course.count.mockResolvedValue(2);
    db.course.findMany.mockResolvedValue([courseRow('a'), courseRow('b')]);
    db.bookmark.findMany.mockResolvedValue([{ courseId: 'b' }]);

    const { courses } = await listCourses(baseQuery, 'user-1');

    expect(courses.map((c) => [c.id, c.isBookmarked])).toEqual([
      ['a', false],
      ['b', true],
    ]);
  });

  it('uses the BR-12 recommended order when section=recommended and no sort is given', async () => {
    db.enrollment.findMany.mockResolvedValue([]);
    db.bookmark.findMany.mockResolvedValue([]);
    // 1) ứng viên gợi ý (id, categoryId)  2) bản ghi đầy đủ của trang
    db.course.findMany
      .mockResolvedValueOnce([
        { id: 'r1', categoryId: 'c' },
        { id: 'r2', categoryId: 'c' },
        { id: 'r3', categoryId: 'c' },
      ])
      .mockResolvedValueOnce([courseRow('r3')]);

    const result = await listCourses(
      { page: 2, limit: 2, section: 'recommended' } as ListCoursesQuery,
      'user-1',
    );

    expect(result.courses.map((c) => c.id)).toEqual(['r3']);
    expect(result.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(db.course.count).not.toHaveBeenCalled();
  });

  it('lets an explicit sort win over the recommended order', async () => {
    db.course.count.mockResolvedValue(0);
    db.course.findMany.mockResolvedValue([]);

    await listCourses({ ...baseQuery, section: 'recommended', sort: 'rating' });

    expect(db.course.count).toHaveBeenCalledTimes(1);
    expect(db.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: buildCourseOrderBy('rating') }),
    );
  });
});

describe('findCourseSummariesByIds', () => {
  it('returns [] without querying when no ids are given', async () => {
    await expect(findCourseSummariesByIds([])).resolves.toEqual([]);
    expect(db.course.findMany).not.toHaveBeenCalled();
  });

  it('keeps the order of the ids and drops unknown or unpublished courses', async () => {
    db.course.findMany.mockResolvedValue([courseRow('a'), courseRow('c')]);

    const result = await findCourseSummariesByIds(['c', 'missing', 'a']);

    expect(result.map((c) => c.id)).toEqual(['c', 'a']);
    expect(db.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['c', 'missing', 'a'] }, isPublished: true } }),
    );
  });
});

describe('getCourseDetail (success paths)', () => {
  const detailRow = {
    ...courseRow('c1', { originalPriceCents: 7375 }),
    subtitle: 'Learn UX',
    description: 'Long text',
    bannerUrl: '/static/banner.jpg',
    benefits: ['Certificate'],
    likeCount: 3,
    shareCount: 1,
    category: { id: 'cat', name: 'Design' },
    teacher: {
      id: 't1',
      jobTitle: 'Designer',
      user: { fullName: 'Teacher One', avatarUrl: null },
    },
  };

  it('returns guest state and skips all per-user queries for a guest', async () => {
    db.course.findFirst.mockResolvedValue(detailRow);
    db.lesson.findFirst.mockResolvedValue({ id: 'lesson-1' });

    const detail = await getCourseDetail('c1');

    expect(detail).toMatchObject({
      id: 'c1',
      subtitle: 'Learn UX',
      benefits: ['Certificate'],
      badge: 'DISCOUNT',
      discountPercent: 20,
      isLiked: false,
      isInCart: false,
      isBookmarked: false,
      enrollment: null,
      previewLessonId: 'lesson-1',
      category: { id: 'cat', name: 'Design' },
      teacher: { id: 't1', fullName: 'Teacher One', jobTitle: 'Designer', isFollowed: false },
    });
    expect(detail.bannerUrl).toMatch(/\/static\/banner\.jpg$/);
    expect(db.enrollment.findUnique).not.toHaveBeenCalled();
  });

  it('reflects enrollment, like, follow, cart and bookmark state of the user', async () => {
    db.course.findFirst.mockResolvedValue(detailRow);
    db.lesson.findFirst.mockResolvedValue(null);
    db.enrollment.findUnique.mockResolvedValue({ progressPercent: 40, lastLessonId: 'l2' });
    db.courseLike.findUnique.mockResolvedValue({ userId: 'u' });
    db.follow.findUnique.mockResolvedValue({ userId: 'u' });
    db.cartItem.findUnique.mockResolvedValue({ userId: 'u' });
    db.bookmark.findUnique.mockResolvedValue({ userId: 'u' });

    const detail = await getCourseDetail('c1', 'u');

    expect(detail).toMatchObject({
      enrollment: { progressPercent: 40, lastLessonId: 'l2' },
      isLiked: true,
      isInCart: true,
      isBookmarked: true,
      previewLessonId: null,
      teacher: { isFollowed: true },
    });
  });

  it('reports false for every flag when the user has no relation to the course', async () => {
    db.course.findFirst.mockResolvedValue(detailRow);
    db.lesson.findFirst.mockResolvedValue(null);
    db.enrollment.findUnique.mockResolvedValue(null);
    db.courseLike.findUnique.mockResolvedValue(null);
    db.follow.findUnique.mockResolvedValue(null);
    db.cartItem.findUnique.mockResolvedValue(null);
    db.bookmark.findUnique.mockResolvedValue(null);

    const detail = await getCourseDetail('c1', 'u');

    expect(detail).toMatchObject({ enrollment: null, isLiked: false, isInCart: false });
    expect(detail.isBookmarked).toBe(false);
  });
});

describe('getSimilarCourses', () => {
  it('throws 404 COURSE_NOT_FOUND for a missing course', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(getSimilarCourses('nope')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });

  it('returns at most 3 published courses of the same category except itself', async () => {
    db.course.findFirst.mockResolvedValue({ categoryId: 'cat' });
    db.course.findMany.mockResolvedValue([courseRow('s1'), courseRow('s2')]);
    db.bookmark.findMany.mockResolvedValue([{ courseId: 's2' }]);

    const result = await getSimilarCourses('c1', 'u');

    expect(result.map((c) => [c.id, c.isBookmarked])).toEqual([
      ['s1', false],
      ['s2', true],
    ]);
    expect(db.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true, categoryId: 'cat', id: { not: 'c1' } },
        take: 3,
      }),
    );
  });
});

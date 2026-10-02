import type { ListCoursesQuery } from './course.schema';
import {
  buildCourseOrderBy,
  buildCourseWhere,
  escapeLikePattern,
  getCourseDetail,
  getRecommendedCourseIds,
  listCourses,
  splitSearchTerms,
} from './course.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
    enrollment: { findMany: jest.fn() },
    bookmark: { findMany: jest.fn() },
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

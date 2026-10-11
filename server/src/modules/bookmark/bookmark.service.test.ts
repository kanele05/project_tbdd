import { prisma } from '@/lib/prisma';

import * as bookmarkService from './bookmark.service';

jest.mock('@/lib/prisma', () => {
  const model = () => ({
    findFirst: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  });
  return { prisma: { course: model(), bookmark: model() } };
});

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as Record<'course' | 'bookmark', MockModel>;

beforeEach(() => {
  for (const model of [db.course, db.bookmark]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
});

describe('bookmarkService.addBookmark', () => {
  it('inserts with skipDuplicates so repeating the call is harmless', async () => {
    db.course.findFirst.mockResolvedValue({ id: 'course-1' });
    db.bookmark.createMany.mockResolvedValue({ count: 0 });

    await expect(bookmarkService.addBookmark('u-1', 'course-1')).resolves.toBeUndefined();

    expect(db.bookmark.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'u-1', courseId: 'course-1' }],
      skipDuplicates: true,
    });
  });

  it('throws 404 COURSE_NOT_FOUND and writes nothing for an unknown course', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(bookmarkService.addBookmark('u-1', 'nope')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
    expect(db.bookmark.createMany).not.toHaveBeenCalled();
  });
});

describe('bookmarkService.removeBookmark', () => {
  it('deletes only the row of the caller and never throws when nothing matched', async () => {
    db.bookmark.deleteMany.mockResolvedValue({ count: 0 });
    await expect(bookmarkService.removeBookmark('u-1', 'course-1')).resolves.toBeUndefined();
    expect(db.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', courseId: 'course-1' },
    });
  });
});

describe('bookmarkService.listBookmarks', () => {
  const course = (id: string) => ({
    id,
    title: `Course ${id}`,
    thumbnailUrl: 'https://images.example.com/x.jpg',
    priceCents: 5900,
    originalPriceCents: null,
    isBestSeller: false,
    ratingAvg: 4.5,
    ratingCount: 10,
    lessonCount: 3,
    totalDurationSec: 300,
    teacher: { id: 't-1', user: { fullName: 'Teacher' } },
  });

  it('marks every returned course as bookmarked and builds pagination meta', async () => {
    db.bookmark.findMany.mockResolvedValue([{ course: course('c1') }, { course: course('c2') }]);
    db.bookmark.count.mockResolvedValue(5);

    const { items, meta } = await bookmarkService.listBookmarks('u-1', { page: 1, limit: 2 });

    expect(items.map((c) => [c.id, c.isBookmarked])).toEqual([
      ['c1', true],
      ['c2', true],
    ]);
    expect(meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(db.bookmark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-1', course: { status: 'PUBLISHED' } },
        orderBy: [{ createdAt: 'desc' }, { courseId: 'asc' }],
        skip: 0,
        take: 2,
      }),
    );
  });
});

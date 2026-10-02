import { cache } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

import * as reviewService from './review.service';

jest.mock('@/lib/prisma', () => {
  const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
    update: jest.fn(),
  });
  const db: Record<string, unknown> = {
    course: model(),
    enrollment: model(),
    review: model(),
    $queryRaw: jest.fn(),
  };
  db.$transaction = jest.fn();
  return { prisma: db };
});

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as Record<'course' | 'enrollment' | 'review', MockModel> & {
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

beforeEach(() => {
  for (const model of [db.course, db.enrollment, db.review]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  db.$queryRaw.mockReset();
  db.$transaction.mockReset();
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
});

const reviewRow = {
  id: 'r-1',
  rating: 4,
  content: 'Solid content and clear explanations.',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  user: { id: 'u-1', fullName: 'Martha Rosie', avatarUrl: null },
};

describe('reviewService.upsertMyReview (BR-08)', () => {
  function arrange(options: { isEnrolled?: boolean; sum?: number; count?: number } = {}) {
    db.course.findUnique.mockResolvedValue({
      id: 'course-1',
      enrollments:
        options.isEnrolled === false
          ? []
          : [{ id: 'enr-1', progressPercent: 0, lastLessonId: null }],
    });
    db.$queryRaw.mockResolvedValue([{ id: 'course-1' }]);
    db.review.upsert.mockResolvedValue(reviewRow);
    db.review.aggregate.mockResolvedValue({
      _sum: { rating: options.sum ?? 13 },
      _count: { _all: options.count ?? 3 },
    });
    db.course.update.mockResolvedValue({ id: 'course-1' });
  }

  it('upserts the review and stores the rounded average and count of the course', async () => {
    arrange({ sum: 13, count: 3 });

    const result = await reviewService.upsertMyReview('u-1', 'course-1', {
      rating: 4,
      content: 'Solid content and clear explanations.',
    });

    expect(result).toEqual({
      id: 'r-1',
      rating: 4,
      content: 'Solid content and clear explanations.',
      createdAt: '2026-10-01T00:00:00.000Z',
      user: { id: 'u-1', fullName: 'Martha Rosie', avatarUrl: null },
    });
    expect(db.review.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_courseId: { userId: 'u-1', courseId: 'course-1' } },
      }),
    );
    expect(db.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ratingCount: 3, ratingAvg: 4.3 } }),
    );
  });

  it('runs inside a single transaction', async () => {
    arrange();
    await reviewService.upsertMyReview('u-1', 'course-1', { rating: 5, content: '1234567890' });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('throws 403 NOT_ENROLLED and does not write when the user is not enrolled', async () => {
    arrange({ isEnrolled: false });
    await expect(
      reviewService.upsertMyReview('u-1', 'course-1', { rating: 5, content: '1234567890' }),
    ).rejects.toMatchObject({ status: 403, code: 'NOT_ENROLLED' });
    expect(db.review.upsert).not.toHaveBeenCalled();
    expect(db.course.update).not.toHaveBeenCalled();
  });

  it('throws 404 COURSE_NOT_FOUND for an unknown course', async () => {
    db.course.findUnique.mockResolvedValue(null);
    await expect(
      reviewService.upsertMyReview('u-1', 'nope', { rating: 5, content: '1234567890' }),
    ).rejects.toMatchObject({ status: 404, code: 'COURSE_NOT_FOUND' });
  });

  it('invalidates the Home cache after the transaction commits', async () => {
    arrange();
    const spy = jest.spyOn(cache, 'invalidatePrefix');

    await reviewService.upsertMyReview('u-1', 'course-1', { rating: 5, content: '1234567890' });

    expect(spy).toHaveBeenCalledWith('home:');
    spy.mockRestore();
  });
});

describe('reviewService.listReviews', () => {
  beforeEach(() => {
    db.course.findFirst.mockResolvedValue({ id: 'course-1' });
    db.review.groupBy.mockResolvedValue([
      { rating: 5, _count: { _all: 1 } },
      { rating: 4, _count: { _all: 2 } },
    ]);
    db.review.findMany.mockResolvedValue([reviewRow]);
  });

  it('builds meta.summary from all reviews and the total from the filtered distribution', async () => {
    const result = await reviewService.listReviews('course-1', { page: 1, limit: 20, rating: 4 });

    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      summary: { avg: 4.3, count: 3, distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 } },
    });
    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courseId: 'course-1', rating: 4 } }),
    );
  });

  it('does not filter by rating when none is given', async () => {
    const result = await reviewService.listReviews('course-1', { page: 1, limit: 20 });
    expect(result.meta.total).toBe(3);
    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courseId: 'course-1' } }),
    );
  });

  it('throws 404 COURSE_NOT_FOUND for an unknown course', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(reviewService.listReviews('nope', { page: 1, limit: 20 })).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });
});

describe('reviewService.getMyReview', () => {
  it('returns null when the user has no review but the course exists', async () => {
    db.review.findUnique.mockResolvedValue(null);
    db.course.findFirst.mockResolvedValue({ id: 'course-1' });
    await expect(reviewService.getMyReview('u-1', 'course-1')).resolves.toBeNull();
  });

  it('throws 404 when there is no review and no course', async () => {
    db.review.findUnique.mockResolvedValue(null);
    db.course.findFirst.mockResolvedValue(null);
    await expect(reviewService.getMyReview('u-1', 'nope')).rejects.toMatchObject({
      code: 'COURSE_NOT_FOUND',
    });
  });
});

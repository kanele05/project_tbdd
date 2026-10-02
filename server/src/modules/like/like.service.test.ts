import { prisma } from '@/lib/prisma';

import * as likeService from './like.service';

jest.mock('@/lib/prisma', () => {
  const model = () => ({
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
  });
  const db: Record<string, unknown> = { course: model(), courseLike: model() };
  db.$transaction = jest.fn();
  return { prisma: db };
});

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as Record<'course' | 'courseLike', MockModel> & {
  $transaction: jest.Mock;
};

beforeEach(() => {
  for (const model of [db.course, db.courseLike]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  db.$transaction.mockReset();
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  db.course.findFirst.mockResolvedValue({ id: 'course-1' });
});

describe('likeService.likeCourse', () => {
  it('increments likeCount when a new like was created', async () => {
    db.courseLike.createMany.mockResolvedValue({ count: 1 });
    db.course.update.mockResolvedValue({ likeCount: 8 });

    await expect(likeService.likeCourse('u-1', 'course-1')).resolves.toEqual({
      likeCount: 8,
      isLiked: true,
    });
    expect(db.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { likeCount: { increment: 1 } } }),
    );
  });

  it('leaves likeCount alone when the like already existed (idempotent)', async () => {
    db.courseLike.createMany.mockResolvedValue({ count: 0 });
    db.course.findUniqueOrThrow.mockResolvedValue({ likeCount: 8 });

    await expect(likeService.likeCourse('u-1', 'course-1')).resolves.toEqual({
      likeCount: 8,
      isLiked: true,
    });
    expect(db.course.update).not.toHaveBeenCalled();
  });

  it('throws 404 COURSE_NOT_FOUND for an unknown course', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(likeService.likeCourse('u-1', 'nope')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });
});

describe('likeService.unlikeCourse', () => {
  it('decrements likeCount only when a like row was removed', async () => {
    db.courseLike.deleteMany.mockResolvedValue({ count: 1 });
    db.course.update.mockResolvedValue({ likeCount: 7 });

    await expect(likeService.unlikeCourse('u-1', 'course-1')).resolves.toEqual({
      likeCount: 7,
      isLiked: false,
    });
    expect(db.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { likeCount: { decrement: 1 } } }),
    );
  });

  it('leaves likeCount alone when there was nothing to remove', async () => {
    db.courseLike.deleteMany.mockResolvedValue({ count: 0 });
    db.course.findUniqueOrThrow.mockResolvedValue({ likeCount: 7 });

    await expect(likeService.unlikeCourse('u-1', 'course-1')).resolves.toEqual({
      likeCount: 7,
      isLiked: false,
    });
    expect(db.course.update).not.toHaveBeenCalled();
  });
});

describe('likeService.shareCourse', () => {
  it('increments shareCount and returns the new value', async () => {
    db.course.update.mockResolvedValue({ shareCount: 3 });
    await expect(likeService.shareCourse('course-1')).resolves.toEqual({ shareCount: 3 });
    expect(db.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { shareCount: { increment: 1 } } }),
    );
  });

  it('throws 404 COURSE_NOT_FOUND for an unknown course', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(likeService.shareCourse('nope')).rejects.toMatchObject({ status: 404 });
    expect(db.course.update).not.toHaveBeenCalled();
  });
});

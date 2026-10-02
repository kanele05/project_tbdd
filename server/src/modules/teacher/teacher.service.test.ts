import type { CourseSummaryDto, TeacherSummaryDto } from '@/types/dto';

import {
  compareTeachers,
  followTeacher,
  groupCoursesByCategory,
  isTopRatedGroup,
  unfollowTeacher,
} from './teacher.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    teacherProfile: { findUnique: jest.fn(), findMany: jest.fn() },
    follow: { upsert: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  },
}));

type Fn = jest.Mock;
const db = (jest.requireMock('@/lib/prisma') as { prisma: Record<string, Record<string, Fn>> })
  .prisma;

beforeEach(() => {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
});

function summary(overrides: Partial<TeacherSummaryDto>): TeacherSummaryDto {
  return {
    id: 't',
    fullName: 'T',
    avatarUrl: null,
    organization: null,
    ratingAvg: 0,
    ratingCount: 0,
    ...overrides,
  };
}

function course(id: string, ratingAvg: number, ratingCount = 1): CourseSummaryDto {
  return {
    id,
    title: id,
    thumbnailUrl: 'x',
    teacher: { id: 't', fullName: 'T' },
    priceCents: 100,
    originalPriceCents: null,
    badge: null,
    discountPercent: null,
    ratingAvg,
    ratingCount,
    lessonCount: 1,
    totalDurationSec: 1,
    isBookmarked: false,
  };
}

describe('compareTeachers', () => {
  it('sorts by rating desc, then rating count desc, then name', () => {
    const sorted = [
      summary({ id: '1', fullName: 'B', ratingAvg: 4, ratingCount: 5 }),
      summary({ id: '2', fullName: 'A', ratingAvg: 4, ratingCount: 5 }),
      summary({ id: '3', fullName: 'C', ratingAvg: 4.5, ratingCount: 1 }),
      summary({ id: '4', fullName: 'D', ratingAvg: 4, ratingCount: 9 }),
    ].sort(compareTeachers);
    expect(sorted.map((t) => t.id)).toEqual(['3', '4', '2', '1']);
  });
});

describe('isTopRatedGroup', () => {
  it('is true when the average of rated courses rounds to >= 4.5', () => {
    expect(isTopRatedGroup([course('a', 4.5), course('b', 4.5)])).toBe(true);
    expect(isTopRatedGroup([course('a', 4.46)])).toBe(true); // hiển thị 4.5
    expect(isTopRatedGroup([course('a', 4.4), course('b', 4.4)])).toBe(false);
  });

  it('ignores unrated courses and is false when nothing is rated', () => {
    expect(isTopRatedGroup([course('a', 4.8), course('b', 0, 0)])).toBe(true);
    expect(isTopRatedGroup([course('a', 0, 0)])).toBe(false);
    expect(isTopRatedGroup([])).toBe(false);
  });
});

describe('groupCoursesByCategory', () => {
  it('groups by category keeping the first-seen category order', () => {
    const design = { id: 'd', name: 'Design' };
    const code = { id: 'c', name: 'Code' };
    const groups = groupCoursesByCategory([
      { category: design, course: course('d1', 5) },
      { category: code, course: course('c1', 3) },
      { category: design, course: course('d2', 4.5) },
    ]);

    expect(groups.map((g) => [g.category.name, g.courses.map((c) => c.id), g.isTopRated])).toEqual([
      ['Design', ['d1', 'd2'], true],
      ['Code', ['c1'], false],
    ]);
  });

  it('returns an empty array for no courses', () => {
    expect(groupCoursesByCategory([])).toEqual([]);
  });
});

describe('followTeacher / unfollowTeacher', () => {
  it('rejects following yourself with 422 CANNOT_FOLLOW_SELF before touching follows', async () => {
    db.teacherProfile.findUnique.mockResolvedValue({ id: 't1', userId: 'me' });
    await expect(followTeacher('me', 't1')).rejects.toMatchObject({
      status: 422,
      code: 'CANNOT_FOLLOW_SELF',
    });
    expect(db.follow.upsert).not.toHaveBeenCalled();
  });

  it('upserts the follow and returns the new follower count', async () => {
    db.teacherProfile.findUnique.mockResolvedValue({ id: 't1', userId: 'someone' });
    db.follow.count.mockResolvedValue(8);

    await expect(followTeacher('me', 't1')).resolves.toEqual({
      followerCount: 8,
      isFollowed: true,
    });
    expect(db.follow.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_teacherId: { userId: 'me', teacherId: 't1' } } }),
    );
  });

  it('throws 404 TEACHER_NOT_FOUND for unknown teachers', async () => {
    db.teacherProfile.findUnique.mockResolvedValue(null);
    await expect(followTeacher('me', 'x')).rejects.toMatchObject({ code: 'TEACHER_NOT_FOUND' });
    await expect(unfollowTeacher('me', 'x')).rejects.toMatchObject({ status: 404 });
  });

  it('unfollow deletes by (user, teacher) and reports isFollowed=false', async () => {
    db.teacherProfile.findUnique.mockResolvedValue({ id: 't1' });
    db.follow.count.mockResolvedValue(2);

    await expect(unfollowTeacher('me', 't1')).resolves.toEqual({
      followerCount: 2,
      isFollowed: false,
    });
    expect(db.follow.deleteMany).toHaveBeenCalledWith({ where: { userId: 'me', teacherId: 't1' } });
  });
});

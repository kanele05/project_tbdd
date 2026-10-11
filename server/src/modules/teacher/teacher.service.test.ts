import type { CourseSummaryDto, TeacherSummaryDto } from '@/types/dto';

import {
  compareTeachers,
  followTeacher,
  getTeacherCourses,
  getTeacherDetail,
  getTopTeachers,
  groupCoursesByCategory,
  isTopRatedGroup,
  listTeacherReviews,
  listTeachers,
  unfollowTeacher,
} from './teacher.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    teacherProfile: { findUnique: jest.fn(), findMany: jest.fn() },
    follow: { upsert: jest.fn(), deleteMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    course: { findMany: jest.fn(), count: jest.fn() },
    review: { findMany: jest.fn(), count: jest.fn() },
    bookmark: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

type Fn = jest.Mock;
const { $queryRaw: queryRaw, ...models } = (
  jest.requireMock('@/lib/prisma') as {
    prisma: Record<string, Record<string, Fn>> & { $queryRaw: Fn };
  }
).prisma;
const db: Record<string, Record<string, Fn>> = models;

beforeEach(() => {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
  queryRaw.mockReset();
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

function teacherRow(id: string, fullName: string, ratings: [number, number][]) {
  return {
    id,
    organization: 'Org',
    user: { fullName, avatarUrl: null },
    courses: ratings.map(([ratingAvg, ratingCount]) => ({ ratingAvg, ratingCount })),
  };
}

function courseRow(id: string, category: { id: string; name: string }) {
  return {
    id,
    title: id,
    thumbnailUrl: 'https://img.example.com/x.jpg',
    priceCents: 1000,
    originalPriceCents: null,
    isBestSeller: false,
    ratingAvg: 4.8,
    ratingCount: 3,
    lessonCount: 2,
    totalDurationSec: 60,
    teacher: { id: 't1', user: { fullName: 'T One' } },
    category,
  };
}

describe('getTopTeachers / listTeachers (BR-11)', () => {
  beforeEach(() => {
    db.teacherProfile.findMany.mockResolvedValue([
      teacherRow('low', 'Low', [[3.9, 10]]),
      teacherRow('high', 'High', [
        [4.8, 5],
        [4.6, 5],
      ]),
      teacherRow('mid', 'Mid', [[4.2, 2]]),
    ]);
  });

  it('ranks by average course rating and truncates to the limit', async () => {
    const top = await getTopTeachers(2);
    expect(top.map((t) => t.id)).toEqual(['high', 'mid']);
    expect(top[0]).toMatchObject({ ratingAvg: 4.7, ratingCount: 10 });
    expect(db.teacherProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courses: { some: { status: 'PUBLISHED' } } } }),
    );
  });

  it('paginates the ranking and reports meta', async () => {
    const { teachers, meta } = await listTeachers({ page: 2, limit: 2, sort: 'top' });
    expect(teachers.map((t) => t.id)).toEqual(['low']);
    expect(meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('gives teachers without any rated course a rating of 0', async () => {
    db.teacherProfile.findMany.mockResolvedValue([teacherRow('new', 'New', [])]);
    const [only] = await getTopTeachers(5);
    expect(only).toMatchObject({ ratingAvg: 0, ratingCount: 0 });
  });
});

describe('getTeacherDetail', () => {
  const detailRow = {
    ...teacherRow('t1', 'T One', [[4.5, 4]]),
    jobTitle: 'Designer',
    bio: 'Bio',
    location: 'Hanoi',
    timezone: 'Asia/Ho_Chi_Minh',
    user: { fullName: 'T One', avatarUrl: null, coverUrl: '/uploads/cover.png' },
  };

  function arrange(followRow: { userId: string } | null = null) {
    db.teacherProfile.findUnique.mockResolvedValue(detailRow);
    db.course.count.mockResolvedValue(3);
    queryRaw.mockResolvedValue([{ count: BigInt(42) }]);
    db.follow.count.mockResolvedValue(7);
    db.follow.findUnique.mockResolvedValue(followRow);
  }

  it('throws 404 TEACHER_NOT_FOUND for an unknown teacher', async () => {
    db.teacherProfile.findUnique.mockResolvedValue(null);
    await expect(getTeacherDetail('nope')).rejects.toMatchObject({
      status: 404,
      code: 'TEACHER_NOT_FOUND',
    });
  });

  it('returns stats, local time and isFollowed=false for a guest', async () => {
    arrange();

    const detail = await getTeacherDetail('t1', undefined, new Date('2026-10-01T02:30:00Z'));

    expect(detail).toMatchObject({
      id: 't1',
      fullName: 'T One',
      jobTitle: 'Designer',
      location: 'Hanoi',
      localTime: '09:30 AM',
      isFollowed: false,
      stats: { courseCount: 3, studentCount: 42, followerCount: 7 },
    });
    expect(detail.coverUrl).toMatch(/\/uploads\/cover\.png$/);
    expect(db.follow.findUnique).not.toHaveBeenCalled();
  });

  it('sets isFollowed from the follow row of the signed-in user', async () => {
    arrange({ userId: 'u' });
    await expect(getTeacherDetail('t1', 'u')).resolves.toMatchObject({ isFollowed: true });

    arrange(null);
    await expect(getTeacherDetail('t1', 'u')).resolves.toMatchObject({ isFollowed: false });
  });

  it('counts 0 students when the aggregate query returns no row', async () => {
    arrange();
    queryRaw.mockResolvedValue([]);
    const detail = await getTeacherDetail('t1');
    expect(detail.stats.studentCount).toBe(0);
  });
});

describe('getTeacherCourses', () => {
  it('throws 404 TEACHER_NOT_FOUND for an unknown teacher', async () => {
    db.teacherProfile.findUnique.mockResolvedValue(null);
    await expect(getTeacherCourses('nope')).rejects.toMatchObject({ code: 'TEACHER_NOT_FOUND' });
    expect(db.course.findMany).not.toHaveBeenCalled();
  });

  it('groups published courses by category and flags bookmarks of the user', async () => {
    const design = { id: 'd', name: 'Design' };
    const code = { id: 'c', name: 'Code' };
    db.teacherProfile.findUnique.mockResolvedValue({ id: 't1' });
    db.course.findMany.mockResolvedValue([
      courseRow('d1', design),
      courseRow('d2', design),
      courseRow('c1', code),
    ]);
    db.bookmark.findMany.mockResolvedValue([{ courseId: 'c1' }]);

    const groups = await getTeacherCourses('t1', 'u');

    expect(groups.map((g) => [g.category.name, g.courses.map((c) => c.id), g.isTopRated])).toEqual([
      ['Design', ['d1', 'd2'], true],
      ['Code', ['c1'], true],
    ]);
    expect(groups[1]?.courses[0]?.isBookmarked).toBe(true);
    expect(db.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: 't1', status: 'PUBLISHED' }, take: 100 }),
    );
  });

  it('returns an empty list when the teacher has no published courses', async () => {
    db.teacherProfile.findUnique.mockResolvedValue({ id: 't1' });
    db.course.findMany.mockResolvedValue([]);
    await expect(getTeacherCourses('t1')).resolves.toEqual([]);
  });
});

describe('listTeacherReviews', () => {
  it('throws 404 TEACHER_NOT_FOUND for an unknown teacher', async () => {
    db.teacherProfile.findUnique.mockResolvedValue(null);
    await expect(listTeacherReviews('nope', {})).rejects.toMatchObject({
      code: 'TEACHER_NOT_FOUND',
    });
  });

  it('returns newest-first reviews with their course and pagination meta', async () => {
    db.teacherProfile.findUnique.mockResolvedValue({ id: 't1' });
    db.review.count.mockResolvedValue(11);
    db.review.findMany.mockResolvedValue([
      {
        id: 'r1',
        rating: 5,
        content: 'Great',
        createdAt: new Date('2026-10-01T00:00:00Z'),
        user: { id: 'u', fullName: 'Student', avatarUrl: null },
        course: { id: 'c1', title: 'UX Foundation' },
        teacherReply: 'Thank you!',
        teacherRepliedAt: new Date('2026-10-02T00:00:00Z'),
      },
    ]);

    const { reviews, meta } = await listTeacherReviews('t1', { page: 2, limit: 10 });

    expect(reviews).toEqual([
      {
        id: 'r1',
        rating: 5,
        content: 'Great',
        createdAt: '2026-10-01T00:00:00.000Z',
        user: { id: 'u', fullName: 'Student', avatarUrl: null },
        course: { id: 'c1', title: 'UX Foundation' },
        teacherReply: 'Thank you!',
        teacherRepliedAt: '2026-10-02T00:00:00.000Z',
      },
    ]);
    expect(meta).toEqual({ page: 2, limit: 10, total: 11, totalPages: 2 });
    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { course: { teacherId: 't1', status: 'PUBLISHED' } },
        skip: 10,
        take: 10,
      }),
    );
  });
});

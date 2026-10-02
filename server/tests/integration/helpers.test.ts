/**
 * Kiểm tra các helper dùng chung (factories, getBookmarkedIds + mapper) trên DB thật -
 * đồng thời là ví dụ để các module sau viết integration test.
 */
import { getBookmarkedIds } from '@/lib/bookmarkedIds';
import {
  courseSummarySelect,
  teacherSummarySelect,
  toCourseSummary,
  toTeacherSummary,
} from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

import {
  createBookmark,
  createCourse,
  createCourseWithLessons,
  createEnrollment,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';

beforeEach(async () => {
  await resetDb();
});

describe('factories', () => {
  it('builds a course with sections/lessons and updates denormalized counters', async () => {
    const { course, sections, lessons } = await createCourseWithLessons({
      sections: 2,
      lessonsPerSection: 3,
      previewCount: 2,
      lessonDurationSec: 20,
    });
    expect(sections).toHaveLength(2);
    expect(lessons).toHaveLength(6);
    expect(lessons.filter((l) => l.isPreview)).toHaveLength(2);
    expect(course.lessonCount).toBe(6);
    expect(course.totalDurationSec).toBe(120);
  });

  it('creates enrollments and bookmarks', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createEnrollment(user.id, course.id, { progressPercent: 100 });
    await createBookmark(user.id, course.id);
    const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { userId: user.id } });
    expect(enrollment.completedAt).not.toBeNull();
    expect(await prisma.bookmark.count()).toBe(1);
  });
});

describe('mappers with real Prisma rows', () => {
  it('maps course/teacher rows selected with the shared select objects', async () => {
    const user = await createUser();
    const bookmarked = await createCourse({
      title: 'Bookmarked',
      priceCents: 3900,
      originalPriceCents: 4900,
      ratingAvg: 4.5,
      ratingCount: 10,
    });
    const other = await createCourse({ title: 'Other', teacherId: bookmarked.teacherId });
    await createBookmark(user.id, bookmarked.id);

    const rows = await prisma.course.findMany({
      where: { id: { in: [bookmarked.id, other.id] } },
      orderBy: { title: 'asc' },
      select: courseSummarySelect,
    });
    const bookmarkedIds = await getBookmarkedIds(
      user.id,
      rows.map((r) => r.id),
    );
    const [first, second] = rows.map((r) => toCourseSummary(r, { bookmarkedIds }));

    expect(first).toMatchObject({
      title: 'Bookmarked',
      isBookmarked: true,
      badge: 'DISCOUNT',
      discountPercent: 20,
    });
    expect(second).toMatchObject({ title: 'Other', isBookmarked: false, badge: null });
    expect(first?.teacher.fullName).toBe('Test Teacher');

    const teacher = await prisma.teacherProfile.findUniqueOrThrow({
      where: { id: bookmarked.teacherId },
      select: teacherSummarySelect,
    });
    expect(toTeacherSummary(teacher)).toMatchObject({ ratingAvg: 4.5, ratingCount: 10 });
  });

  it('getBookmarkedIds returns an empty set for guests and empty lists', async () => {
    expect((await getBookmarkedIds(undefined, ['a'])).size).toBe(0);
    expect((await getBookmarkedIds('u', [])).size).toBe(0);
  });
});

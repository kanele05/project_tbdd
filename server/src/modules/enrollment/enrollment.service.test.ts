import { prisma } from '@/lib/prisma';

import * as enrollmentService from './enrollment.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    enrollment: { findMany: jest.fn() },
    lesson: { findMany: jest.fn() },
    lessonProgress: { findMany: jest.fn() },
  },
}));

type Db = Record<'enrollment' | 'lesson' | 'lessonProgress', { findMany: jest.Mock }>;
const db = prisma as unknown as Db;
const findMany = db.enrollment.findMany;
const lessonFindMany = db.lesson.findMany;
const progressFindMany = db.lessonProgress.findMany;

beforeEach(() => {
  findMany.mockReset();
  lessonFindMany.mockReset().mockResolvedValue([]);
  progressFindMany.mockReset().mockResolvedValue([]);
});

const lessonRow = (id: string, title: string, courseId: string) => ({
  id,
  title,
  section: { courseId },
});

describe('progressFilter (BR-05)', () => {
  it('maps each status to a progress condition', () => {
    expect(enrollmentService.progressFilter('all')).toEqual({});
    expect(enrollmentService.progressFilter('ongoing')).toEqual({ progressPercent: { lt: 100 } });
    expect(enrollmentService.progressFilter('completed')).toEqual({
      progressPercent: { gte: 100 },
    });
  });
});

describe('listMyCourses', () => {
  it('queries the caller enrollments, latest access first, and maps to MyCourseItem', async () => {
    findMany.mockResolvedValue([
      {
        progressPercent: 30,
        lastLessonId: 'lesson-4',
        lastAccessedAt: new Date('2026-10-01T08:00:00Z'),
        course: {
          id: 'course-1',
          title: 'UX Foundation',
          thumbnailUrl: 'https://images.example.com/ux.jpg',
          totalDurationSec: 7200,
        },
      },
    ]);

    lessonFindMany.mockResolvedValue([
      lessonRow('lesson-1', 'Intro', 'course-1'),
      lessonRow('lesson-2', 'Basics', 'course-1'),
      lessonRow('lesson-3', 'Wireframes', 'course-1'),
      lessonRow('lesson-4', 'Prototypes', 'course-1'),
      lessonRow('other-lesson', 'Elsewhere', 'course-2'),
    ]);
    progressFindMany.mockResolvedValue([{ lessonId: 'lesson-1' }, { lessonId: 'lesson-3' }]);

    const result = await enrollmentService.listMyCourses('u-1', 'ongoing');

    expect(result).toEqual([
      {
        course: {
          id: 'course-1',
          title: 'UX Foundation',
          thumbnailUrl: 'https://images.example.com/ux.jpg',
        },
        totalDurationSec: 7200,
        progressPercent: 30,
        lastLessonId: 'lesson-4',
        lastAccessedAt: '2026-10-01T08:00:00.000Z',
        lessonCount: 4,
        completedLessonCount: 2,
        lastLesson: { id: 'lesson-4', title: 'Prototypes', number: 4 },
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-1', progressPercent: { lt: 100 } },
        orderBy: [{ lastAccessedAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('defaults to status "all" and skips the lesson queries when there is no enrollment', async () => {
    findMany.mockResolvedValue([]);
    await enrollmentService.listMyCourses('u-1');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u-1' } }));
    expect(lessonFindMany).not.toHaveBeenCalled();
    expect(progressFindMany).not.toHaveBeenCalled();
  });

  it('batches lesson lookups once for all items and nulls a missing or unset last lesson', async () => {
    const base = { progressPercent: 0, lastAccessedAt: new Date('2026-10-01T08:00:00Z') };
    const course = (id: string) => ({
      id,
      title: id,
      thumbnailUrl: 'https://img.example.com/x.jpg',
      totalDurationSec: 0,
    });
    findMany.mockResolvedValue([
      { ...base, lastLessonId: 'deleted', course: course('c1') },
      { ...base, lastLessonId: null, course: course('c2') },
    ]);
    lessonFindMany.mockResolvedValue([lessonRow('a', 'A', 'c1'), lessonRow('b', 'B', 'c2')]);

    const result = await enrollmentService.listMyCourses('u-1');

    expect(lessonFindMany).toHaveBeenCalledTimes(1);
    expect(progressFindMany).toHaveBeenCalledTimes(1);
    expect(result.map((r) => [r.lessonCount, r.completedLessonCount, r.lastLesson])).toEqual([
      [1, 0, null],
      [1, 0, null],
    ]);
  });
});

import { prisma } from '@/lib/prisma';

import * as enrollmentService from './enrollment.service';

jest.mock('@/lib/prisma', () => ({ prisma: { enrollment: { findMany: jest.fn() } } }));

const findMany = (prisma as unknown as { enrollment: { findMany: jest.Mock } }).enrollment.findMany;

beforeEach(() => findMany.mockReset());

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
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-1', progressPercent: { lt: 100 } },
        orderBy: [{ lastAccessedAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('defaults to status "all"', async () => {
    findMany.mockResolvedValue([]);
    await enrollmentService.listMyCourses('u-1');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u-1' } }));
  });
});

import { prisma } from '@/lib/prisma';

import * as lessonService from './lesson.service';

jest.mock('@/lib/prisma', () => {
  const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  });
  const db: Record<string, unknown> = {
    course: model(),
    lesson: model(),
    enrollment: model(),
    lessonProgress: model(),
    notification: model(),
    $queryRaw: jest.fn(),
  };
  db.$transaction = jest.fn();
  return { prisma: db };
});

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as Record<
  'course' | 'lesson' | 'enrollment' | 'lessonProgress' | 'notification',
  MockModel
> & {
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

beforeEach(() => {
  for (const model of [db.course, db.lesson, db.enrollment, db.lessonProgress, db.notification]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  db.$queryRaw.mockReset();
  db.$transaction.mockReset();
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
});

const lessonRow = {
  id: 'lesson-2',
  title: 'Lesson 2',
  order: 2,
  durationSec: 15,
  videoUrl: '/static/videos/sample.mp4',
  isPreview: false,
  sectionId: 'section-1',
  section: { order: 1, courseId: 'course-1' },
};

describe('lessonService.getCurriculum', () => {
  it('throws 404 COURSE_NOT_FOUND for an unknown or unpublished course', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(lessonService.getCurriculum('nope')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });

  it('does not query the user progress for a guest', async () => {
    db.course.findFirst.mockResolvedValue({
      sections: [
        {
          id: 's1',
          title: 'Intro',
          order: 1,
          lessons: [{ id: 'l1', title: 'A', durationSec: 10, isPreview: false }],
        },
      ],
    });

    const result = await lessonService.getCurriculum('course-1');

    expect(result[0]?.lessons[0]?.status).toBe('LOCKED');
    expect(db.enrollment.findUnique).not.toHaveBeenCalled();
    expect(db.lessonProgress.findMany).not.toHaveBeenCalled();
  });
});

describe('lessonService.getLesson (BR-01)', () => {
  it('throws 404 LESSON_NOT_FOUND when the lesson does not exist', async () => {
    db.lesson.findUnique.mockResolvedValue(null);
    await expect(lessonService.getLesson('user-1', 'nope')).rejects.toMatchObject({
      status: 404,
      code: 'LESSON_NOT_FOUND',
    });
  });

  it('throws 403 NOT_ENROLLED for a non-preview lesson and reads no progress', async () => {
    db.lesson.findUnique.mockResolvedValue(lessonRow);
    db.enrollment.findUnique.mockResolvedValue(null);

    await expect(lessonService.getLesson('user-1', 'lesson-2')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(db.lessonProgress.findUnique).not.toHaveBeenCalled();
    expect(db.enrollment.update).not.toHaveBeenCalled();
  });

  it('returns a preview lesson to a non-enrolled user without touching enrollments', async () => {
    db.lesson.findUnique.mockResolvedValue({ ...lessonRow, isPreview: true });
    db.enrollment.findUnique.mockResolvedValue(null);
    db.lessonProgress.findUnique.mockResolvedValue(null);
    db.lesson.findFirst.mockResolvedValue({ id: 'lesson-3', isPreview: false });

    const result = await lessonService.getLesson('user-1', 'lesson-2');

    expect(result).toEqual({
      id: 'lesson-2',
      courseId: 'course-1',
      title: 'Lesson 2',
      durationSec: 15,
      videoUrl: expect.stringMatching(/^https?:\/\/.+\/static\/videos\/sample\.mp4$/),
      positionSec: 0,
      isCompleted: false,
      nextLessonId: null, // bài kế tiếp bị khóa
    });
    expect(db.enrollment.update).not.toHaveBeenCalled();
  });

  it('records the lesson as lastLessonId when the user is enrolled', async () => {
    db.lesson.findUnique.mockResolvedValue(lessonRow);
    db.enrollment.findUnique.mockResolvedValue({ id: 'enr-1' });
    db.lessonProgress.findUnique.mockResolvedValue({ positionSec: 9, isCompleted: true });
    db.lesson.findFirst.mockResolvedValue({ id: 'lesson-3', isPreview: false });
    db.enrollment.update.mockResolvedValue({ id: 'enr-1' });

    const result = await lessonService.getLesson('user-1', 'lesson-2');

    expect(result).toEqual(
      expect.objectContaining({ positionSec: 9, isCompleted: true, nextLessonId: 'lesson-3' }),
    );
    expect(db.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enr-1' },
        data: { lastLessonId: 'lesson-2', lastAccessedAt: expect.any(Date) },
      }),
    );
  });
});

describe('lessonService.saveProgress', () => {
  const lessonForProgress = {
    durationSec: 15,
    section: { courseId: 'course-1', course: { title: 'UX Foundation' } },
  };

  function arrange(options: {
    enrollment?: { id: string; progressPercent: number } | null;
    existing?: { isCompleted: boolean } | null;
    total?: number;
    done?: number;
  }) {
    db.lesson.findUnique.mockResolvedValue(lessonForProgress);
    db.$queryRaw.mockResolvedValue(
      options.enrollment === null
        ? []
        : [options.enrollment ?? { id: 'enr-1', progressPercent: 0 }],
    );
    db.lessonProgress.findUnique.mockResolvedValue(options.existing ?? null);
    db.lessonProgress.upsert.mockResolvedValue({ lessonId: 'lesson-1' });
    db.lesson.count.mockResolvedValue(options.total ?? 3);
    db.lessonProgress.count.mockResolvedValue(options.done ?? 1);
    db.enrollment.update.mockResolvedValue({ id: 'enr-1' });
    db.notification.create.mockResolvedValue({ id: 'n-1' });
  }

  it('throws 404 LESSON_NOT_FOUND when the lesson does not exist', async () => {
    db.lesson.findUnique.mockResolvedValue(null);
    await expect(
      lessonService.saveProgress('user-1', 'nope', { positionSec: 1 }),
    ).rejects.toMatchObject({ status: 404, code: 'LESSON_NOT_FOUND' });
  });

  it('throws 403 NOT_ENROLLED and writes nothing when there is no enrollment', async () => {
    arrange({ enrollment: null });
    await expect(
      lessonService.saveProgress('user-1', 'lesson-1', { positionSec: 1 }),
    ).rejects.toMatchObject({ status: 403, code: 'NOT_ENROLLED' });
    expect(db.lessonProgress.upsert).not.toHaveBeenCalled();
    expect(db.enrollment.update).not.toHaveBeenCalled();
  });

  it('saves the position without recomputing the percentage when nothing was completed', async () => {
    arrange({ enrollment: { id: 'enr-1', progressPercent: 40 } });

    const result = await lessonService.saveProgress('user-1', 'lesson-1', { positionSec: 6.4 });

    expect(result).toEqual({
      lessonProgress: { positionSec: 6, isCompleted: false },
      courseProgressPercent: 40,
    });
    expect(db.lesson.count).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it('clamps the position to the lesson duration (BR-03)', async () => {
    arrange({});
    const result = await lessonService.saveProgress('user-1', 'lesson-1', { positionSec: 500 });
    expect(result.lessonProgress.positionSec).toBe(15);
    expect(db.lessonProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ positionSec: 15 }) }),
    );
  });

  it('recomputes round(done / total * 100) when a lesson becomes completed (BR-04)', async () => {
    arrange({ total: 3, done: 1 });

    const result = await lessonService.saveProgress('user-1', 'lesson-1', {
      positionSec: 15,
      isCompleted: true,
    });

    expect(result.courseProgressPercent).toBe(33);
    expect(db.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ progressPercent: 33 }) }),
    );
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it('sets completedAt and notifies COURSE_COMPLETED when the course reaches 100 %', async () => {
    arrange({ enrollment: { id: 'enr-1', progressPercent: 67 }, total: 3, done: 3 });

    const result = await lessonService.saveProgress('user-1', 'lesson-3', {
      positionSec: 15,
      isCompleted: true,
    });

    expect(result.courseProgressPercent).toBe(100);
    expect(db.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ progressPercent: 100, completedAt: expect.any(Date) }),
      }),
    );
    expect(db.notification.create).toHaveBeenCalledTimes(1);
    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'COURSE_COMPLETED',
          data: { courseId: 'course-1' },
        }),
      }),
    );
  });

  it('does not notify again when the course was already at 100 %', async () => {
    arrange({ enrollment: { id: 'enr-1', progressPercent: 100 }, total: 3, done: 3 });

    await lessonService.saveProgress('user-1', 'lesson-3', { positionSec: 15, isCompleted: true });

    expect(db.notification.create).not.toHaveBeenCalled();
    const updateArgs = db.enrollment.update.mock.calls[0]?.[0] as { data: object };
    expect(updateArgs.data).not.toHaveProperty('completedAt');
  });

  it('keeps a completed lesson completed even if the client sends false (BR-03)', async () => {
    arrange({ existing: { isCompleted: true }, enrollment: { id: 'enr-1', progressPercent: 33 } });

    const result = await lessonService.saveProgress('user-1', 'lesson-1', {
      positionSec: 2,
      isCompleted: false,
    });

    expect(result.lessonProgress).toEqual({ positionSec: 2, isCompleted: true });
    expect(db.lessonProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { positionSec: 2, isCompleted: true } }),
    );
    // Không "vừa hoàn thành" -> không tính lại %, giữ giá trị đã lưu.
    expect(db.lesson.count).not.toHaveBeenCalled();
    expect(result.courseProgressPercent).toBe(33);
  });
});

describe('lessonService.getCurriculum (signed-in user)', () => {
  const course = {
    sections: [
      {
        id: 's1',
        title: 'Intro',
        order: 1,
        lessons: [
          { id: 'l1', title: 'A', durationSec: 10, isPreview: false },
          { id: 'l2', title: 'B', durationSec: 20, isPreview: false },
        ],
      },
    ],
  };

  it('unlocks lessons and marks completed / in-progress ones for an enrolled user', async () => {
    db.course.findFirst.mockResolvedValue(course);
    db.enrollment.findUnique.mockResolvedValue({ lastLessonId: 'l2' });
    db.lessonProgress.findMany.mockResolvedValue([{ lessonId: 'l1' }]);

    const result = await lessonService.getCurriculum('course-1', 'user-1');

    expect(result[0]?.lessons.map((l) => [l.id, l.status])).toEqual([
      ['l1', 'COMPLETED'],
      ['l2', 'IN_PROGRESS'],
    ]);
  });

  it('keeps non-preview lessons locked for a user without enrollment', async () => {
    db.course.findFirst.mockResolvedValue(course);
    db.enrollment.findUnique.mockResolvedValue(null);
    db.lessonProgress.findMany.mockResolvedValue([]);

    const result = await lessonService.getCurriculum('course-1', 'user-1');

    expect(result[0]?.lessons.every((l) => l.status === 'LOCKED')).toBe(true);
  });
});

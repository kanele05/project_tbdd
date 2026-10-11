import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createCourseWithLessons,
  createEnrollment,
  createLessonProgress,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

type CurriculumBody = {
  data: { id: string; order: number; lessons: { id: string; number: number; status: string }[] }[];
};

function statuses(body: CurriculumBody): string[][] {
  return body.data.map((section) => section.lessons.map((lesson) => lesson.status));
}

describe('GET /courses/:id/curriculum', () => {
  it('numbers lessons continuously across sections', async () => {
    const { course } = await createCourseWithLessons({ sections: 3, lessonsPerSection: 2 });

    const res = await api.get(`${API}/courses/${course.id}/curriculum`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { order: number }) => s.order)).toEqual([1, 2, 3]);
    expect(
      res.body.data.map((s: { lessons: { number: number }[] }) => s.lessons.map((l) => l.number)),
    ).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(res.body.data[0].lessons[0]).toEqual({
      id: expect.any(String),
      number: 1,
      title: 'Lesson 1',
      durationSec: 15,
      isPreview: true,
      status: 'UNLOCKED',
    });
  });

  it('shows UNLOCKED for preview lessons and LOCKED for the rest to guests (BR-02)', async () => {
    const { course } = await createCourseWithLessons({
      sections: 2,
      lessonsPerSection: 2,
      previewCount: 3,
    });

    const res = await api.get(`${API}/courses/${course.id}/curriculum`);

    expect(statuses(res.body)).toEqual([
      ['UNLOCKED', 'UNLOCKED'],
      ['UNLOCKED', 'LOCKED'],
    ]);
  });

  it('treats a signed-in user who has not enrolled like a guest', async () => {
    const user = await createUser();
    const { course } = await createCourseWithLessons({ previewCount: 1 });

    const res = await api.get(`${API}/courses/${course.id}/curriculum`).set(authHeader(user));

    expect(statuses(res.body)).toEqual([
      ['UNLOCKED', 'LOCKED', 'LOCKED'],
      ['LOCKED', 'LOCKED', 'LOCKED'],
    ]);
  });

  it('marks COMPLETED, IN_PROGRESS (lastLessonId) and UNLOCKED for an enrolled user', async () => {
    const user = await createUser();
    const { course, lessons } = await createCourseWithLessons({
      sections: 2,
      lessonsPerSection: 2,
      previewCount: 0,
    });
    await createEnrollment(user.id, course.id, { lastLessonId: lessons[2]!.id });
    await createLessonProgress(user.id, lessons[0]!.id, { isCompleted: true });
    await createLessonProgress(user.id, lessons[1]!.id, { isCompleted: true });
    await createLessonProgress(user.id, lessons[2]!.id, { positionSec: 5, isCompleted: false });

    const res = await api.get(`${API}/courses/${course.id}/curriculum`).set(authHeader(user));

    expect(statuses(res.body)).toEqual([
      ['COMPLETED', 'COMPLETED'],
      ['IN_PROGRESS', 'UNLOCKED'],
    ]);
  });

  it('shows COMPLETED (not IN_PROGRESS) when the last lesson is already finished', async () => {
    const user = await createUser();
    const { course, lessons } = await createCourseWithLessons({
      sections: 1,
      lessonsPerSection: 2,
      previewCount: 0,
    });
    await createEnrollment(user.id, course.id, { lastLessonId: lessons[0]!.id });
    await createLessonProgress(user.id, lessons[0]!.id, { isCompleted: true });

    const res = await api.get(`${API}/courses/${course.id}/curriculum`).set(authHeader(user));

    expect(statuses(res.body)).toEqual([['COMPLETED', 'UNLOCKED']]);
  });

  it("does not leak another user's progress", async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    const { course, lessons } = await createCourseWithLessons({
      sections: 1,
      lessonsPerSection: 2,
      previewCount: 0,
    });
    await createEnrollment(me.id, course.id);
    await createEnrollment(other.id, course.id);
    await createLessonProgress(other.id, lessons[0]!.id, { isCompleted: true });

    const res = await api.get(`${API}/courses/${course.id}/curriculum`).set(authHeader(me));

    expect(statuses(res.body)).toEqual([['UNLOCKED', 'UNLOCKED']]);
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown course', async () => {
    const res = await api.get(`${API}/courses/nope/curriculum`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it('returns 401 when the token is invalid', async () => {
    const { course } = await createCourseWithLessons();
    const res = await api
      .get(`${API}/courses/${course.id}/curriculum`)
      .set({ Authorization: 'Bearer not-a-token' });
    expect(res.status).toBe(401);
  });
});

describe('GET /lessons/:id', () => {
  it('returns the lesson with saved position, completion flag and next lesson (enrolled)', async () => {
    const user = await createUser();
    const { course, lessons } = await createCourseWithLessons({ previewCount: 0 });
    await createEnrollment(user.id, course.id);
    await createLessonProgress(user.id, lessons[1]!.id, { positionSec: 9, isCompleted: false });

    const res = await api.get(`${API}/lessons/${lessons[1]!.id}`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: lessons[1]!.id,
      courseId: course.id,
      title: 'Lesson 2',
      durationSec: 15,
      videoUrl: 'http://localhost:4001/static/videos/sample.mp4',
      positionSec: 9,
      isCompleted: false,
      nextLessonId: lessons[2]!.id,
    });
  });

  it('points nextLessonId to the first lesson of the next section and null at the end', async () => {
    const user = await createUser();
    const { course, lessons } = await createCourseWithLessons({
      sections: 2,
      lessonsPerSection: 2,
      previewCount: 0,
    });
    await createEnrollment(user.id, course.id);

    const endOfSection = await api.get(`${API}/lessons/${lessons[1]!.id}`).set(authHeader(user));
    const last = await api.get(`${API}/lessons/${lessons[3]!.id}`).set(authHeader(user));

    expect(endOfSection.body.data.nextLessonId).toBe(lessons[2]!.id);
    expect(last.body.data.nextLessonId).toBeNull();
  });

  it('records lastLessonId and lastAccessedAt on the enrollment', async () => {
    const user = await createUser();
    const { course, lessons } = await createCourseWithLessons({ previewCount: 0 });
    const enrollment = await createEnrollment(user.id, course.id);
    const longAgo = new Date('2026-01-01T00:00:00Z');
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastAccessedAt: longAgo },
    });

    await api.get(`${API}/lessons/${lessons[2]!.id}`).set(authHeader(user));

    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(stored.lastLessonId).toBe(lessons[2]!.id);
    expect(stored.lastAccessedAt.getTime()).toBeGreaterThan(longAgo.getTime());
  });

  it('returns 403 NOT_ENROLLED without videoUrl for a locked lesson (BR-01)', async () => {
    const user = await createUser();
    const { lessons } = await createCourseWithLessons({ previewCount: 1 });

    const res = await api.get(`${API}/lessons/${lessons[3]!.id}`).set(authHeader(user));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(JSON.stringify(res.body)).not.toContain('videoUrl');
    expect(JSON.stringify(res.body)).not.toContain('sample.mp4');
  });

  it('lets a non-enrolled user watch a preview lesson without touching any enrollment', async () => {
    const user = await createUser();
    const { lessons } = await createCourseWithLessons({
      sections: 1,
      lessonsPerSection: 3,
      previewCount: 2,
    });

    const first = await api.get(`${API}/lessons/${lessons[0]!.id}`).set(authHeader(user));
    const second = await api.get(`${API}/lessons/${lessons[1]!.id}`).set(authHeader(user));

    expect(first.status).toBe(200);
    expect(first.body.data.videoUrl).toContain('sample.mp4');
    expect(first.body.data.positionSec).toBe(0);
    // Bài kế tiếp là preview -> trỏ tới; bài kế tiếp bị khóa -> null.
    expect(first.body.data.nextLessonId).toBe(lessons[1]!.id);
    expect(second.body.data.nextLessonId).toBeNull();
    expect(await prisma.enrollment.count()).toBe(0);
  });

  it('returns 404 LESSON_NOT_FOUND for an unknown lesson', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/lessons/nope`).set(authHeader(user));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LESSON_NOT_FOUND');
  });

  it('returns 401 without a token', async () => {
    const { lessons } = await createCourseWithLessons();
    const res = await api.get(`${API}/lessons/${lessons[0]!.id}`);
    expect(res.status).toBe(401);
  });
});

describe('PUT /lessons/:id/progress', () => {
  async function setup(options: Parameters<typeof createCourseWithLessons>[0] = {}) {
    const user = await createUser();
    const data = await createCourseWithLessons({ previewCount: 0, ...options });
    const enrollment = await createEnrollment(user.id, data.course.id);
    return { user, enrollment, ...data };
  }

  const put = (lessonId: string, user: { id: string }, body: object) =>
    api.put(`${API}/lessons/${lessonId}/progress`).set(authHeader(user)).send(body);

  it('stores the position and returns the course progress', async () => {
    const { user, lessons } = await setup();

    const res = await put(lessons[0]!.id, user, { positionSec: 7 });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      lessonProgress: { positionSec: 7, isCompleted: false },
      courseProgressPercent: 0,
    });
    const stored = await prisma.lessonProgress.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored).toEqual(expect.objectContaining({ positionSec: 7, isCompleted: false }));
  });

  it('clamps and rounds the position into [0, durationSec] (BR-03)', async () => {
    const { user, lessons } = await setup(); // durationSec = 15

    const tooFar = await put(lessons[0]!.id, user, { positionSec: 999 });
    const negative = await put(lessons[0]!.id, user, { positionSec: -5 });
    const fractional = await put(lessons[0]!.id, user, { positionSec: 7.6 });

    expect(tooFar.body.data.lessonProgress.positionSec).toBe(15);
    expect(negative.body.data.lessonProgress.positionSec).toBe(0);
    expect(fractional.body.data.lessonProgress.positionSec).toBe(8);
  });

  it('never un-completes a finished lesson (BR-03)', async () => {
    const { user, lessons } = await setup();

    await put(lessons[0]!.id, user, { positionSec: 15, isCompleted: true });
    const res = await put(lessons[0]!.id, user, { positionSec: 3, isCompleted: false });
    const withoutFlag = await put(lessons[0]!.id, user, { positionSec: 4 });

    expect(res.body.data.lessonProgress).toEqual({ positionSec: 3, isCompleted: true });
    expect(withoutFlag.body.data.lessonProgress.isCompleted).toBe(true);
  });

  it('recomputes progressPercent = round(done / total * 100) (BR-04)', async () => {
    const { user, enrollment, lessons } = await setup({ sections: 1, lessonsPerSection: 3 });

    const first = await put(lessons[0]!.id, user, { positionSec: 15, isCompleted: true });
    const second = await put(lessons[1]!.id, user, { positionSec: 15, isCompleted: true });

    expect(first.body.data.courseProgressPercent).toBe(33);
    expect(second.body.data.courseProgressPercent).toBe(67);
    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(stored.progressPercent).toBe(67);
    expect(stored.completedAt).toBeNull();
  });

  it('is idempotent: completing the same lesson twice does not change the percentage', async () => {
    const { user, lessons } = await setup({ sections: 1, lessonsPerSection: 4 });

    await put(lessons[0]!.id, user, { positionSec: 15, isCompleted: true });
    const again = await put(lessons[0]!.id, user, { positionSec: 15, isCompleted: true });

    expect(again.body.data.courseProgressPercent).toBe(25);
  });

  it('sets completedAt and creates ONE COURSE_COMPLETED notification at 100 % (BR-04)', async () => {
    const { user, enrollment, course, lessons } = await setup({
      sections: 1,
      lessonsPerSection: 2,
    });

    await put(lessons[0]!.id, user, { positionSec: 15, isCompleted: true });
    const last = await put(lessons[1]!.id, user, { positionSec: 15, isCompleted: true });
    await put(lessons[1]!.id, user, { positionSec: 15, isCompleted: true }); // gửi lại

    expect(last.body.data.courseProgressPercent).toBe(100);
    const stored = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(stored.progressPercent).toBe(100);
    expect(stored.completedAt).not.toBeNull();
    const notifications = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toEqual(
      expect.objectContaining({
        type: 'COURSE_COMPLETED',
        isRead: false,
        data: {
          courseId: course.id,
          key: 'COURSE_COMPLETED',
          params: { courseTitle: course.title },
        },
      }),
    );
  });

  it('returns 403 NOT_ENROLLED when the user has not enrolled (even for a preview lesson)', async () => {
    const user = await createUser();
    const { lessons } = await createCourseWithLessons({ previewCount: 2 });

    const res = await put(lessons[0]!.id, user, { positionSec: 5 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(await prisma.lessonProgress.count()).toBe(0);
  });

  it('returns 404 LESSON_NOT_FOUND for an unknown lesson', async () => {
    const user = await createUser();
    const res = await put('nope', user, { positionSec: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LESSON_NOT_FOUND');
  });

  it('returns 400 VALIDATION_ERROR for a bad body', async () => {
    const { user, lessons } = await setup();

    const missing = await put(lessons[0]!.id, user, {});
    const wrongType = await put(lessons[0]!.id, user, { positionSec: 'ten' });
    const badFlag = await put(lessons[0]!.id, user, { positionSec: 1, isCompleted: 'yes' });

    for (const res of [missing, wrongType, badFlag]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns 401 without a token', async () => {
    const { lessons } = await createCourseWithLessons();
    const res = await api.put(`${API}/lessons/${lessons[0]!.id}/progress`).send({ positionSec: 1 });
    expect(res.status).toBe(401);
  });
});

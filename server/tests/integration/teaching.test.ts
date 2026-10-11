import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createAnswer,
  createCourse,
  createEnrollment,
  createQuestion,
  createReview,
  createSubmission,
  createTeacher,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** Giảng viên + khóa của họ + một giảng viên khác (để thử IDOR) + học viên. */
async function setup() {
  const owner = await createTeacher({ fullName: 'Owner Teacher' });
  const other = await createTeacher({ fullName: 'Other Teacher' });
  const course = await createCourse({ title: 'Owned Course', teacherId: owner.profile.id });
  const otherCourse = await createCourse({ title: 'Other Course', teacherId: other.profile.id });
  const student = await createUser({ fullName: 'Student One' });
  await createEnrollment(student.id, course.id);
  return { owner, other, course, otherCourse, student };
}

function createOrder(
  userId: string,
  courseId: string,
  priceCents: number,
  status: 'PAID' | 'PENDING',
) {
  return prisma.order.create({
    data: {
      userId,
      totalCents: priceCents,
      status,
      paymentMethod: 'card',
      paidAt: status === 'PAID' ? new Date() : null,
      items: { create: [{ courseId, priceCents }] },
    },
  });
}

describe('GET /teacher/courses/:id/stats', () => {
  it('returns enrollment, revenue (PAID only), progress, rating and 30-day numbers', async () => {
    const { owner, course, student } = await setup();
    const s2 = await createUser();
    const s3 = await createUser();
    const now = Date.now();
    await prisma.enrollment.update({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      data: { progressPercent: 100, completedAt: new Date(), enrolledAt: new Date(now) },
    });
    await createEnrollment(s2.id, course.id, { progressPercent: 50 });
    await createEnrollment(s3.id, course.id, { progressPercent: 25 });
    await prisma.enrollment.updateMany({
      where: { userId: s2.id },
      data: { enrolledAt: new Date(now - 3 * DAY_MS) },
    });
    await prisma.enrollment.updateMany({
      where: { userId: s3.id },
      data: { enrolledAt: new Date(now - 40 * DAY_MS) }, // ngoài cửa sổ 30 ngày
    });
    await createOrder(student.id, course.id, 5900, 'PAID');
    await createOrder(s2.id, course.id, 4000, 'PAID');
    await createOrder(s3.id, course.id, 9999, 'PENDING'); // không tính
    await createReview(student.id, course.id, { rating: 5 });
    await createReview(s2.id, course.id, { rating: 4 });
    await createReview(s3.id, course.id, { rating: 4 });
    const graded = await createSubmission(student.id, course.id);
    await createSubmission(s2.id, course.id);
    await prisma.projectSubmission.update({
      where: { id: graded.id },
      data: { grade: 80, feedback: 'Good', gradedAt: new Date() },
    });

    const res = await api
      .get(`${API}/teacher/courses/${course.id}/stats`)
      .set(authHeader(owner.user));

    expect(res.status).toBe(200);
    const stats = res.body.data;
    expect(stats).toMatchObject({
      courseId: course.id,
      enrollmentCount: 3,
      revenueCents: 9900,
      avgProgressPercent: 58, // (100 + 50 + 25) / 3 = 58.33
      completedCount: 1,
      ratingAvg: 4.3,
      ratingCount: 3,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 },
      submissionCount: 2,
      gradedCount: 1,
    });
    expect(stats.newEnrollments30d).toHaveLength(30);
    const dates = stats.newEnrollments30d.map((d: { date: string }) => d.date);
    expect([...dates].sort()).toEqual(dates); // cũ -> mới
    expect(dates[29]).toBe(new Date(now).toISOString().slice(0, 10));
    const total = stats.newEnrollments30d.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0,
    );
    expect(total).toBe(2); // 1 hôm nay + 1 cách 3 ngày; bản ghi cách 40 ngày bị loại
    const threeDaysAgo = new Date(now - 3 * DAY_MS).toISOString().slice(0, 10);
    expect(
      stats.newEnrollments30d.find((d: { date: string }) => d.date === threeDaysAgo).count,
    ).toBe(1);
  });

  it('returns zeros for a course without any activity', async () => {
    const { owner, course } = await setup();
    await prisma.enrollment.deleteMany({ where: { courseId: course.id } });

    const res = await api
      .get(`${API}/teacher/courses/${course.id}/stats`)
      .set(authHeader(owner.user));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      enrollmentCount: 0,
      revenueCents: 0,
      avgProgressPercent: 0,
      ratingAvg: 0,
      ratingCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
    expect(res.body.data.newEnrollments30d.every((d: { count: number }) => d.count === 0)).toBe(
      true,
    );
  });

  it('returns 404 COURSE_NOT_FOUND for another teacher and for an unknown course', async () => {
    const { other, course } = await setup();
    const asOther = await api
      .get(`${API}/teacher/courses/${course.id}/stats`)
      .set(authHeader(other.user));
    expect(asOther.status).toBe(404);
    expect(asOther.body.error.code).toBe('COURSE_NOT_FOUND');
    const unknown = await api.get(`${API}/teacher/courses/nope/stats`).set(authHeader(other.user));
    expect(unknown.status).toBe(404);
  });

  it('returns 403 for a student and 401 without a token', async () => {
    const { course, student } = await setup();
    const asStudent = await api
      .get(`${API}/teacher/courses/${course.id}/stats`)
      .set(authHeader(student));
    expect(asStudent.status).toBe(403);
    expect((await api.get(`${API}/teacher/courses/${course.id}/stats`)).status).toBe(401);
  });
});

describe('GET /teacher/courses/:id/submissions', () => {
  it('lists newest first with student info, filters by status and reports a summary', async () => {
    const { owner, course, student } = await setup();
    const s2 = await createUser({ fullName: 'Second Student' });
    const older = await createSubmission(student.id, course.id, {
      title: 'Older',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    const newer = await createSubmission(s2.id, course.id, {
      title: 'Newer',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    await prisma.projectSubmission.update({
      where: { id: older.id },
      data: { grade: 90, feedback: 'Great', gradedAt: new Date('2026-09-03T00:00:00Z') },
    });

    const all = await api
      .get(`${API}/teacher/courses/${course.id}/submissions`)
      .set(authHeader(owner.user));
    expect(all.status).toBe(200);
    expect(all.body.data.map((s: { id: string }) => s.id)).toEqual([newer.id, older.id]);
    expect(all.body.data[0]).toMatchObject({
      id: newer.id,
      courseId: course.id,
      title: 'Newer',
      user: { id: s2.id, fullName: 'Second Student' },
      grade: null,
      feedback: null,
      gradedAt: null,
    });
    expect(all.body.data[1]).toMatchObject({ grade: 90, feedback: 'Great' });
    expect(all.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      summary: { gradedCount: 1, ungradedCount: 1 },
    });

    const graded = await api
      .get(`${API}/teacher/courses/${course.id}/submissions?status=graded`)
      .set(authHeader(owner.user));
    expect(graded.body.data.map((s: { id: string }) => s.id)).toEqual([older.id]);
    expect(graded.body.meta.total).toBe(1);
    expect(graded.body.meta.summary).toEqual({ gradedCount: 1, ungradedCount: 1 });

    const ungraded = await api
      .get(`${API}/teacher/courses/${course.id}/submissions?status=ungraded&limit=1`)
      .set(authHeader(owner.user));
    expect(ungraded.body.data.map((s: { id: string }) => s.id)).toEqual([newer.id]);
  });

  it('rejects an invalid status, another teacher and a student', async () => {
    const { owner, other, course, student } = await setup();
    const bad = await api
      .get(`${API}/teacher/courses/${course.id}/submissions?status=weird`)
      .set(authHeader(owner.user));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const asOther = await api
      .get(`${API}/teacher/courses/${course.id}/submissions`)
      .set(authHeader(other.user));
    expect(asOther.status).toBe(404);
    expect(asOther.body.error.code).toBe('COURSE_NOT_FOUND');
    const asStudent = await api
      .get(`${API}/teacher/courses/${course.id}/submissions`)
      .set(authHeader(student));
    expect(asStudent.status).toBe(403);
  });
});

describe('PUT /teacher/submissions/:id/grade', () => {
  it('grades, notifies the student with ids, and allows regrading', async () => {
    const { owner, course, student } = await setup();
    const submission = await createSubmission(student.id, course.id, { title: 'Final project' });

    const res = await api
      .put(`${API}/teacher/submissions/${submission.id}/grade`)
      .set(authHeader(owner.user))
      .send({ grade: 85, feedback: '  Nice work  ' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: submission.id,
      courseId: course.id,
      grade: 85,
      feedback: 'Nice work',
    });
    expect(typeof res.body.data.gradedAt).toBe('string');
    const first = await prisma.notification.findMany({ where: { userId: student.id } });
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      type: 'PROJECT_GRADED',
      data: { courseId: course.id, submissionId: submission.id },
    });
    expect(first[0]?.body).toContain('85/100');

    const regrade = await api
      .put(`${API}/teacher/submissions/${submission.id}/grade`)
      .set(authHeader(owner.user))
      .send({ grade: 0, feedback: 'Actually, redo it.' });
    expect(regrade.status).toBe(200);
    expect(regrade.body.data).toMatchObject({ grade: 0, feedback: 'Actually, redo it.' });
    expect(new Date(regrade.body.data.gradedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(res.body.data.gradedAt).getTime(),
    );
    expect(await prisma.notification.count({ where: { userId: student.id } })).toBe(2);
  });

  it('validates grade and feedback', async () => {
    const { owner, course, student } = await setup();
    const submission = await createSubmission(student.id, course.id);
    const url = `${API}/teacher/submissions/${submission.id}/grade`;
    const bodies = [
      { grade: 101, feedback: 'x' },
      { grade: -1, feedback: 'x' },
      { grade: 50.5, feedback: 'x' },
      { grade: '50', feedback: 'x' },
      { grade: 50, feedback: '   ' },
      { grade: 50, feedback: 'a'.repeat(2001) },
      { feedback: 'x' },
    ];
    for (const body of bodies) {
      const res = await api.put(url).set(authHeader(owner.user)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const boundary = await api
      .put(url)
      .set(authHeader(owner.user))
      .send({ grade: 100, feedback: 'a'.repeat(2000) });
    expect(boundary.status).toBe(200);
    expect(await prisma.notification.count({ where: { type: 'PROJECT_GRADED' } })).toBe(1);
  });

  it('returns 404 NOT_FOUND for unknown, 403 NOT_COURSE_TEACHER for another teacher, 403 for a student', async () => {
    const { owner, other, course, student } = await setup();
    const submission = await createSubmission(student.id, course.id);
    const url = `${API}/teacher/submissions/${submission.id}/grade`;
    const payload = { grade: 70, feedback: 'ok' };

    const unknown = await api
      .put(`${API}/teacher/submissions/nope/grade`)
      .set(authHeader(owner.user))
      .send(payload);
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('NOT_FOUND');

    const asOther = await api.put(url).set(authHeader(other.user)).send(payload);
    expect(asOther.status).toBe(403);
    expect(asOther.body.error.code).toBe('NOT_COURSE_TEACHER');

    const asStudent = await api.put(url).set(authHeader(student)).send(payload);
    expect(asStudent.status).toBe(403);
    expect(asStudent.body.error.code).toBe('FORBIDDEN');

    const stored = await prisma.projectSubmission.findUniqueOrThrow({
      where: { id: submission.id },
    });
    expect(stored.grade).toBeNull();
    expect(await prisma.notification.count()).toBe(0);
  });
});

describe('PUT/DELETE /teacher/reviews/:id/reply', () => {
  it('replies, notifies only on the first reply, edits and deletes', async () => {
    const { owner, course, student } = await setup();
    const review = await createReview(student.id, course.id, { rating: 3 });
    const url = `${API}/teacher/reviews/${review.id}/reply`;

    const first = await api
      .put(url)
      .set(authHeader(owner.user))
      .send({ reply: '  Thanks for the feedback!  ' });
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({
      id: review.id,
      rating: 3,
      teacherReply: 'Thanks for the feedback!',
      user: { id: student.id },
    });
    expect(typeof first.body.data.teacherRepliedAt).toBe('string');
    const notifications = await prisma.notification.findMany({ where: { userId: student.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'REVIEW_REPLY',
      data: { courseId: course.id, reviewId: review.id },
    });

    const edited = await api.put(url).set(authHeader(owner.user)).send({ reply: 'Edited reply.' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.teacherReply).toBe('Edited reply.');
    expect(await prisma.notification.count({ where: { userId: student.id } })).toBe(1);

    const removed = await api.delete(url).set(authHeader(owner.user));
    expect(removed.status).toBe(200);
    expect(removed.body.data).toMatchObject({ teacherReply: null, teacherRepliedAt: null });

    // Sau khi xóa, phản hồi mới được tính là "lần đầu" nên thông báo lại.
    await api.put(url).set(authHeader(owner.user)).send({ reply: 'Back again.' });
    expect(await prisma.notification.count({ where: { userId: student.id } })).toBe(2);
  });

  it('validates the reply length', async () => {
    const { owner, course, student } = await setup();
    const review = await createReview(student.id, course.id);
    const url = `${API}/teacher/reviews/${review.id}/reply`;
    for (const body of [{}, { reply: '   ' }, { reply: 'a'.repeat(1001) }]) {
      const res = await api.put(url).set(authHeader(owner.user)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const max = await api
      .put(url)
      .set(authHeader(owner.user))
      .send({ reply: 'a'.repeat(1000) });
    expect(max.status).toBe(200);
  });

  it('returns 404, 403 NOT_COURSE_TEACHER (IDOR) and 403 for students on both verbs', async () => {
    const { owner, other, course, student } = await setup();
    const review = await createReview(student.id, course.id);
    const url = `${API}/teacher/reviews/${review.id}/reply`;
    await api.put(url).set(authHeader(owner.user)).send({ reply: 'Owner reply.' });

    expect(
      (
        await api
          .put(`${API}/teacher/reviews/nope/reply`)
          .set(authHeader(owner.user))
          .send({ reply: 'x' })
      ).status,
    ).toBe(404);
    expect(
      (await api.delete(`${API}/teacher/reviews/nope/reply`).set(authHeader(owner.user))).status,
    ).toBe(404);

    const putOther = await api.put(url).set(authHeader(other.user)).send({ reply: 'Hijack' });
    expect(putOther.status).toBe(403);
    expect(putOther.body.error.code).toBe('NOT_COURSE_TEACHER');
    const delOther = await api.delete(url).set(authHeader(other.user));
    expect(delOther.status).toBe(403);
    expect(delOther.body.error.code).toBe('NOT_COURSE_TEACHER');

    expect((await api.put(url).set(authHeader(student)).send({ reply: 'x' })).status).toBe(403);
    expect((await api.delete(url).set(authHeader(student))).status).toBe(403);

    const stored = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    expect(stored.teacherReply).toBe('Owner reply.');
  });
});

describe('PUT/DELETE /teacher/answers/:id/pin', () => {
  async function questionWithAnswers() {
    const ctx = await setup();
    const question = await createQuestion(ctx.student.id, ctx.course.id);
    const a1 = await createAnswer(ctx.student.id, question.id, {
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    const a2 = await createAnswer(ctx.owner.user.id, question.id, {
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    const a3 = await createAnswer(ctx.student.id, question.id, {
      createdAt: new Date('2026-09-03T00:00:00Z'),
    });
    return { ...ctx, question, a1, a2, a3 };
  }

  it('pins one answer per question, unpinning the previous, and lists the pinned first', async () => {
    const { owner, question, a1, a2, a3 } = await questionWithAnswers();

    const pin1 = await api.put(`${API}/teacher/answers/${a3.id}/pin`).set(authHeader(owner.user));
    expect(pin1.status).toBe(200);
    expect(pin1.body.data).toMatchObject({ id: a3.id, isPinned: true, isInstructor: false });

    const pin2 = await api.put(`${API}/teacher/answers/${a2.id}/pin`).set(authHeader(owner.user));
    expect(pin2.body.data).toMatchObject({ id: a2.id, isPinned: true, isInstructor: true });

    const pinned = await prisma.answer.findMany({
      where: { questionId: question.id, isPinned: true },
    });
    expect(pinned.map((a) => a.id)).toEqual([a2.id]);

    const list = await api
      .get(`${API}/questions/${question.id}/answers`)
      .set(authHeader(owner.user));
    expect(list.status).toBe(200);
    expect(list.body.data.map((a: { id: string }) => a.id)).toEqual([a2.id, a1.id, a3.id]);

    const again = await api.put(`${API}/teacher/answers/${a2.id}/pin`).set(authHeader(owner.user));
    expect(again.status).toBe(200);

    const unpin = await api
      .delete(`${API}/teacher/answers/${a2.id}/pin`)
      .set(authHeader(owner.user));
    expect(unpin.status).toBe(200);
    expect(unpin.body.data).toMatchObject({ id: a2.id, isPinned: false });
    expect(await prisma.answer.count({ where: { isPinned: true } })).toBe(0);
  });

  it('keeps pins of other questions untouched', async () => {
    const { owner, course, student, a1 } = await questionWithAnswers();
    const q2 = await createQuestion(student.id, course.id);
    const b1 = await createAnswer(student.id, q2.id);
    await api.put(`${API}/teacher/answers/${a1.id}/pin`).set(authHeader(owner.user));
    await api.put(`${API}/teacher/answers/${b1.id}/pin`).set(authHeader(owner.user));
    expect(await prisma.answer.count({ where: { isPinned: true } })).toBe(2);
  });

  it('returns 404, 403 NOT_COURSE_TEACHER (IDOR) and 403 for students', async () => {
    const { owner, other, student, a1 } = await questionWithAnswers();
    const url = `${API}/teacher/answers/${a1.id}/pin`;

    expect(
      (await api.put(`${API}/teacher/answers/nope/pin`).set(authHeader(owner.user))).status,
    ).toBe(404);
    expect(
      (await api.delete(`${API}/teacher/answers/nope/pin`).set(authHeader(owner.user))).status,
    ).toBe(404);

    const putOther = await api.put(url).set(authHeader(other.user));
    expect(putOther.status).toBe(403);
    expect(putOther.body.error.code).toBe('NOT_COURSE_TEACHER');
    expect((await api.delete(url).set(authHeader(other.user))).body.error.code).toBe(
      'NOT_COURSE_TEACHER',
    );

    expect((await api.put(url).set(authHeader(student))).status).toBe(403);
    expect(await prisma.answer.count({ where: { isPinned: true } })).toBe(0);
  });
});

describe('Q&A access for the course instructor (BR-24)', () => {
  it('lets the owner read questions/answers, like and answer without enrolling', async () => {
    const { owner, other, course, student } = await setup();
    const question = await createQuestion(student.id, course.id, { content: 'Need help here?' });
    const teacher = authHeader(owner.user);

    const list = await api.get(`${API}/courses/${course.id}/questions`).set(teacher);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect((await api.get(`${API}/questions/${question.id}`).set(teacher)).status).toBe(200);
    expect((await api.get(`${API}/questions/${question.id}/answers`).set(teacher)).status).toBe(
      200,
    );
    expect((await api.put(`${API}/questions/${question.id}/like`).set(teacher)).status).toBe(200);

    const answered = await api
      .post(`${API}/questions/${question.id}/answers`)
      .set(teacher)
      .send({ content: 'Here is how to do it.' });
    expect(answered.status).toBe(201);
    expect(answered.body.data).toMatchObject({
      content: 'Here is how to do it.',
      isInstructor: true,
      isPinned: false,
      user: { id: owner.user.id },
    });
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: student.id },
    });
    expect(notification).toMatchObject({
      type: 'NEW_ANSWER',
      data: { courseId: course.id, questionId: question.id },
    });
    expect(
      (await prisma.question.findUniqueOrThrow({ where: { id: question.id } })).answerCount,
    ).toBe(1);

    // Giảng viên khóa khác vẫn bị chặn (chưa ghi danh).
    const denied = await api
      .post(`${API}/questions/${question.id}/answers`)
      .set(authHeader(other.user))
      .send({ content: 'I should not be able to' });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('NOT_ENROLLED');
    expect(
      (await api.get(`${API}/courses/${course.id}/questions`).set(authHeader(other.user))).status,
    ).toBe(403);
    expect(
      (await api.get(`${API}/questions/${question.id}`).set(authHeader(other.user))).status,
    ).toBe(403);
  });

  it('still returns 404 for an unknown course for the instructor', async () => {
    const { owner } = await setup();
    const res = await api.get(`${API}/courses/nope/questions`).set(authHeader(owner.user));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });
});

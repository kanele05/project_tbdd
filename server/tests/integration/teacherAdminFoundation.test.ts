/**
 * Nền tảng Giảng viên & Quản trị (TA-01): phân quyền theo vai trò, hiển thị khóa theo trạng thái (BR-19/22/23),
 * khóa tài khoản (BR-28), OWN_COURSE (BR-23), script đổi vai trò (BR-30), thông báo follower.
 */
import { notifyFollowersOfNewCourse } from '@/lib/courseNotify';
import { prisma } from '@/lib/prisma';
import { disableUser, enableUser } from '@/modules/auth/accountStatus.service';
import { setUserRole } from '@/modules/user/setUserRole.service';

import { bearer, loginViaApi } from '../helpers/authFlow';
import { authHeader } from '../helpers/authHelper';
import {
  createAnswer,
  createCartItem,
  createCourse,
  createCourseWithLessons,
  createEnrollment,
  createFollow,
  createNotification,
  createQuestion,
  createReview,
  createSubmission,
  createTeacher,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(resetDb);

describe('role guards on /teacher/* and /admin/* (BR-23)', () => {
  it('returns 401 without a token', async () => {
    expect((await api.get(`${API}/teacher/courses`)).status).toBe(401);
    expect((await api.get(`${API}/admin/stats`)).status).toBe(401);
  });

  it('returns 403 FORBIDDEN for a student on both areas and for a teacher on /admin', async () => {
    const student = await createUser();
    const { user: teacher } = await createTeacher();

    for (const path of ['/teacher/courses', '/me/teacher-profile', '/teacher/ai/course-draft']) {
      const res = await api.get(`${API}${path}`).set(authHeader(student));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
    for (const path of ['/admin/stats', '/admin/courses/x/ai-review']) {
      const asStudent = await api.get(`${API}${path}`).set(authHeader(student));
      const asTeacher = await api.get(`${API}${path}`).set(authHeader(teacher));
      expect(asStudent.status).toBe(403);
      expect(asTeacher.status).toBe(403);
      expect(asTeacher.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('lets the right role through to the module routers', async () => {
    const { user: teacher } = await createTeacher();
    const admin = await createUser({ role: 'ADMIN' });
    // Qua được guard thì không còn là 401/403: /teacher/courses trả 200 (TA-02).
    expect((await api.get(`${API}/teacher/courses`).set(authHeader(teacher))).status).toBe(200);
    expect([401, 403]).not.toContain(
      (await api.get(`${API}/admin/stats`).set(authHeader(admin))).status,
    );
  });

  it('takes the role from the database, not from the (stale) JWT claim', async () => {
    const student = await createUser(); // token ký lúc còn là STUDENT
    await prisma.user.update({ where: { id: student.id }, data: { role: 'TEACHER' } });
    expect((await api.get(`${API}/teacher/courses`).set(authHeader(student))).status).toBe(200);

    await prisma.user.update({ where: { id: student.id }, data: { role: 'STUDENT' } });
    expect((await api.get(`${API}/teacher/courses`).set(authHeader(student))).status).toBe(403);
  });
});

describe('course visibility by status (BR-19, BR-22)', () => {
  it('hides non-published courses from the public detail, curriculum and similar endpoints', async () => {
    const { course } = await createCourseWithLessons({ course: { status: 'ARCHIVED' } });
    const draft = await createCourse({ status: 'DRAFT' });

    for (const id of [course.id, draft.id]) {
      for (const suffix of ['', '/curriculum', '/similar']) {
        const res = await api.get(`${API}/courses/${id}${suffix}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
      }
    }
    const list = await api.get(`${API}/courses`);
    expect(list.body.data).toHaveLength(0);
  });

  it('keeps an archived course visible to its students, its teacher and admins', async () => {
    const teacher = await createTeacher();
    const { course, lessons } = await createCourseWithLessons({
      course: { status: 'ARCHIVED', teacherId: teacher.profile.id },
    });
    const student = await createUser();
    const outsider = await createUser();
    const admin = await createUser({ role: 'ADMIN' });
    await createEnrollment(student.id, course.id);

    for (const viewer of [student, teacher.user, admin]) {
      const detail = await api.get(`${API}/courses/${course.id}`).set(authHeader(viewer));
      expect(detail.status).toBe(200);
      const curriculum = await api
        .get(`${API}/courses/${course.id}/curriculum`)
        .set(authHeader(viewer));
      expect(curriculum.status).toBe(200);
    }
    expect((await api.get(`${API}/courses/${course.id}`).set(authHeader(outsider))).status).toBe(
      404,
    );

    // Học viên đã ghi danh vẫn học tiếp và thấy khóa trong My Courses.
    const lesson = await api.get(`${API}/lessons/${lessons[3]!.id}`).set(authHeader(student));
    expect(lesson.status).toBe(200);
    const mine = await api.get(`${API}/me/courses`).set(authHeader(student));
    expect(mine.body.data.map((item: { course: { id: string } }) => item.course.id)).toEqual([
      course.id,
    ]);
  });

  it('lets the course teacher and admins watch any lesson without recording progress (BR-23)', async () => {
    const teacher = await createTeacher();
    const { course, lessons } = await createCourseWithLessons({
      course: { status: 'DRAFT', teacherId: teacher.profile.id },
    });
    const admin = await createUser({ role: 'ADMIN' });
    const locked = lessons[5]!; // không phải bài xem thử

    const asTeacher = await api.get(`${API}/lessons/${locked.id}`).set(authHeader(teacher.user));
    expect(asTeacher.status).toBe(200);
    expect((await api.get(`${API}/lessons/${locked.id}`).set(authHeader(admin))).status).toBe(200);

    const curriculum = await api
      .get(`${API}/courses/${course.id}/curriculum`)
      .set(authHeader(teacher.user));
    const statuses = (curriculum.body.data as { lessons: { status: string }[] }[]).flatMap((s) =>
      s.lessons.map((l) => l.status),
    );
    expect(new Set(statuses)).toEqual(new Set(['UNLOCKED']));

    const other = await createUser();
    expect((await api.get(`${API}/lessons/${locked.id}`).set(authHeader(other))).status).toBe(403);
    expect(await prisma.enrollment.count()).toBe(0);
  });
});

describe('OWN_COURSE (BR-23)', () => {
  it('rejects cart add, free enroll and checkout for the course own teacher with 422', async () => {
    const teacher = await createTeacher();
    const paid = await createCourse({ teacherId: teacher.profile.id, priceCents: 4900 });
    const free = await createCourse({ teacherId: teacher.profile.id, priceCents: 0 });

    const add = await api
      .post(`${API}/cart/items`)
      .set(authHeader(teacher.user))
      .send({ courseId: paid.id });
    expect(add.status).toBe(422);
    expect(add.body.error.code).toBe('OWN_COURSE');

    const enroll = await api.post(`${API}/courses/${free.id}/enroll`).set(authHeader(teacher.user));
    expect(enroll.status).toBe(422);
    expect(enroll.body.error.code).toBe('OWN_COURSE');

    await createCartItem(teacher.user.id, paid.id); // giỏ cũ từ trước khi trở thành chủ khóa
    const checkout = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(teacher.user))
      .send({ paymentMethod: 'MOCK_CARD' });
    expect(checkout.status).toBe(422);
    expect(checkout.body.error.code).toBe('OWN_COURSE');
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.enrollment.count()).toBe(0);
  });

  it('still lets a teacher buy another teacher course', async () => {
    const buyer = await createTeacher();
    const course = await createCourse({ priceCents: 4900 });
    await createCartItem(buyer.user.id, course.id);
    const checkout = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(buyer.user))
      .send({ paymentMethod: 'MOCK_CARD' });
    expect(checkout.status).toBe(201);
  });
});

describe('disabled accounts (BR-28)', () => {
  it('rejects login with 403 ACCOUNT_DISABLED only after the correct password', async () => {
    const user = await createUser({ session: false });
    await disableUser(user.id, 'Violated the terms of service', 'admin-id');

    const ok = await loginViaApi(api, user.email, user.password);
    expect(ok.status).toBe(403);
    expect(ok.body.error.code).toBe('ACCOUNT_DISABLED');

    const wrong = await loginViaApi(api, user.email, 'Wrong-password-1');
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');

    await enableUser(user.id, 'admin-id');
    expect((await loginViaApi(api, user.email, user.password)).status).toBe(200);
  });

  it('revokes every session: access tokens stop working and refresh returns 403', async () => {
    const user = await createUser({ session: false });
    const first = (await loginViaApi(api, user.email, user.password)).body.data;
    const second = (await loginViaApi(api, user.email, user.password)).body.data;
    await api.get(`${API}/auth/me`).set(bearer(first.accessToken)).expect(200);

    const status = await disableUser(user.id, 'Spam in the Q&A section', 'admin-id');
    expect(status.disabledAt).toBeInstanceOf(Date);
    expect(status.disabledReason).toBe('Spam in the Q&A section');

    for (const session of [first, second]) {
      expect((await api.get(`${API}/auth/me`).set(bearer(session.accessToken))).status).toBe(401);
      const refresh = await api
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: session.refreshToken });
      expect([401, 403]).toContain(refresh.status);
    }
    expect(await prisma.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });

  it('refresh of a still-valid refresh token returns 403 ACCOUNT_DISABLED when only the flag is set', async () => {
    const user = await createUser({ session: false });
    const session = (await loginViaApi(api, user.email, user.password)).body.data;
    await prisma.user.update({ where: { id: user.id }, data: { disabledAt: new Date() } });

    const refresh = await api
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: session.refreshToken });
    expect(refresh.status).toBe(403);
    expect(refresh.body.error.code).toBe('ACCOUNT_DISABLED');
    // Access token của tài khoản bị khóa cũng bị từ chối dù phiên chưa thu hồi.
    expect((await api.get(`${API}/auth/me`).set(bearer(session.accessToken))).status).toBe(401);
  });

  it('never disables an admin (or yourself) and reports unknown users', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const other = await createUser({ role: 'ADMIN' });
    await expect(disableUser(other.id, 'Some valid reason', admin.id)).rejects.toMatchObject({
      status: 422,
      code: 'CANNOT_DISABLE_ADMIN',
    });
    await expect(disableUser(admin.id, 'Some valid reason', admin.id)).rejects.toMatchObject({
      code: 'CANNOT_DISABLE_ADMIN',
    });
    await expect(disableUser('missing', 'Some valid reason', admin.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(enableUser('missing', admin.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('setUserRole (BR-30)', () => {
  it('dry-run does not write; --apply changes the role and creates the teacher profile', async () => {
    const user = await createUser({ session: false });

    const dry = await setUserRole(user.email, 'TEACHER', false);
    expect(dry).toMatchObject({
      fromRole: 'STUDENT',
      toRole: 'TEACHER',
      applied: false,
      willCreateTeacherProfile: true,
    });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('STUDENT');

    const applied = await setUserRole(user.email, 'TEACHER', true);
    expect(applied.applied).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('TEACHER');
    expect(await prisma.teacherProfile.count({ where: { userId: user.id } })).toBe(1);

    const again = await setUserRole(user.email, 'ADMIN', true);
    expect(again).toMatchObject({ fromRole: 'TEACHER', toRole: 'ADMIN', applied: true });
    expect(await prisma.teacherProfile.count({ where: { userId: user.id } })).toBe(1);
  });

  it('refuses unverified and unknown accounts', async () => {
    const unverified = await createUser({ verified: false, session: false });
    await expect(setUserRole(unverified.email, 'ADMIN', true)).rejects.toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
    });
    await expect(setUserRole('nobody@example.com', 'ADMIN', true)).rejects.toMatchObject({
      status: 404,
    });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: unverified.id } })).role).toBe(
      'STUDENT',
    );
  });
});

describe('notifyFollowersOfNewCourse (FR-54)', () => {
  it('creates a NEW_COURSE notification for each follower of the teacher', async () => {
    const teacher = await createTeacher({ fullName: 'Sara Teacher' });
    const course = await createCourse({ teacherId: teacher.profile.id, title: 'Fresh Course' });
    const a = await createUser();
    const b = await createUser();
    const stranger = await createUser();
    await createFollow(a.id, teacher.profile.id);
    await createFollow(b.id, teacher.profile.id);

    expect(await notifyFollowersOfNewCourse(course.id)).toBe(2);

    const rows = await prisma.notification.findMany({ where: { type: 'NEW_COURSE' } });
    expect(rows.map((n) => n.userId).sort()).toEqual([a.id, b.id].sort());
    expect(rows[0]).toMatchObject({ data: { courseId: course.id }, isRead: false });
    expect(rows[0]?.body).toContain('Fresh Course');
    expect(await prisma.notification.count({ where: { userId: stranger.id } })).toBe(0);
    await expect(notifyFollowersOfNewCourse('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('returns 0 when the teacher has no followers', async () => {
    const course = await createCourse();
    expect(await notifyFollowersOfNewCourse(course.id)).toBe(0);
  });
});

describe('notification types of TA-01', () => {
  it('lists the new types and data ids without crashing', async () => {
    const user = await createUser();
    await createNotification(user.id, { type: 'COURSE_APPROVED', title: 'Approved' });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'PROJECT_GRADED',
        title: 'Graded',
        body: 'You got 90',
        data: { courseId: 'c1', submissionId: 's1', ignored: 'x' },
      },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'REVIEW_REPLY',
        title: 'Reply',
        body: 'Thanks',
        data: { courseId: 'c1', reviewId: 'r1' },
      },
    });

    const res = await api.get(`${API}/notifications`).set(authHeader(user));
    expect(res.status).toBe(200);
    const byType = Object.fromEntries(
      (res.body.data as { type: string; data: unknown }[]).map((n) => [n.type, n.data]),
    );
    expect(byType.PROJECT_GRADED).toEqual({ courseId: 'c1', submissionId: 's1' });
    expect(byType.REVIEW_REPLY).toEqual({ courseId: 'c1', reviewId: 'r1' });
    expect(Object.keys(byType)).toContain('COURSE_APPROVED');
  });
});

describe('DTO additions for the teacher features', () => {
  it('returns status on the course detail', async () => {
    const course = await createCourse({ status: 'PUBLISHED' });
    const res = await api.get(`${API}/courses/${course.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
  });

  it('lists pinned answers first and flags the instructor answers', async () => {
    const teacher = await createTeacher();
    const course = await createCourse({ teacherId: teacher.profile.id });
    const asker = await createUser();
    const helper = await createUser();
    await createEnrollment(asker.id, course.id);
    await createEnrollment(helper.id, course.id);
    const question = await createQuestion(asker.id, course.id);
    const first = await createAnswer(helper.id, question.id, {
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    const byTeacher = await createAnswer(teacher.user.id, question.id, {
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    await prisma.answer.update({ where: { id: byTeacher.id }, data: { isPinned: true } });

    const res = await api.get(`${API}/questions/${question.id}/answers`).set(authHeader(asker));

    expect(res.status).toBe(200);
    expect(res.body.data.map((a: { id: string }) => a.id)).toEqual([byTeacher.id, first.id]);
    expect(res.body.data[0]).toMatchObject({ isInstructor: true, isPinned: true });
    expect(res.body.data[1]).toMatchObject({ isInstructor: false, isPinned: false });
  });

  it('exposes the teacher reply on reviews and the grade on project submissions', async () => {
    const course = await createCourse();
    const student = await createUser();
    await createEnrollment(student.id, course.id);
    const review = await createReview(student.id, course.id);
    await prisma.review.update({
      where: { id: review.id },
      data: { teacherReply: 'Thanks for the feedback!', teacherRepliedAt: new Date('2026-10-02') },
    });
    const submission = await createSubmission(student.id, course.id);
    await prisma.projectSubmission.update({
      where: { id: submission.id },
      data: { grade: 92, feedback: 'Nice work', gradedAt: new Date('2026-10-03') },
    });

    const reviews = await api.get(`${API}/courses/${course.id}/reviews`);
    expect(reviews.body.data[0]).toMatchObject({
      teacherReply: 'Thanks for the feedback!',
      teacherRepliedAt: '2026-10-02T00:00:00.000Z',
    });
    const submissions = await api
      .get(`${API}/courses/${course.id}/submissions`)
      .set(authHeader(student));
    expect(submissions.status).toBe(200);
    expect(submissions.body.data[0]).toMatchObject({
      grade: 92,
      feedback: 'Nice work',
      gradedAt: '2026-10-03T00:00:00.000Z',
    });
  });
});

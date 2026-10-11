/** /admin/users (tìm, lọc, khóa / mở khóa - BR-28) và /admin/stats (FR-53). */
import { prisma } from '@/lib/prisma';

import { bearer, createUserAndLogin, loginViaApi } from '../helpers/authFlow';
import { authHeader } from '../helpers/authHelper';
import {
  createCategory,
  createCourse,
  createEnrollment,
  createTeacher,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';
import { seedSubmittableCourse } from './adminFixtures';

const api = createTestApi();

beforeEach(resetDb);

describe('role guards', () => {
  it('rejects anonymous callers with 401 and non-admins with 403', async () => {
    const student = await createUser();
    const { user: teacher } = await createTeacher();
    const routes: [string, string][] = [
      ['get', '/admin/stats'],
      ['get', '/admin/users'],
      ['post', '/admin/users/x/disable'],
      ['post', '/admin/users/x/enable'],
    ];
    for (const [method, path] of routes) {
      const call = (): ReturnType<typeof api.get> =>
        (api as unknown as Record<string, (url: string) => ReturnType<typeof api.get>>)[method]!(
          `${API}${path}`,
        );
      expect((await call()).status).toBe(401);
      expect((await call().set(authHeader(student))).status).toBe(403);
      expect((await call().set(authHeader(teacher))).status).toBe(403);
    }
  });
});

describe('GET /admin/users', () => {
  it('lists users newest first with counts, and paginates', async () => {
    const root = await createUser({ role: 'ADMIN', email: 'root@example.com' });
    const { user: teacher, profile } = await createTeacher({ fullName: 'Tina Teacher' });
    const course = await createCourse({ teacherId: profile.id });
    const learner = await createUser({ fullName: 'Lee Learner' });
    await createEnrollment(learner.id, course.id);
    await createCourse({ teacherId: profile.id, status: 'DRAFT' });

    const res = await api.get(`${API}/admin/users?limit=2`).set(authHeader(root));

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data.map((u: { id: string }) => u.id)).toEqual([learner.id, teacher.id]);
    expect(res.body.data[0]).toMatchObject({
      email: learner.email,
      role: 'STUDENT',
      emailVerified: true,
      disabledAt: null,
      disabledReason: null,
      courseCount: 0,
      enrollmentCount: 1,
    });
    expect(res.body.data[1]).toMatchObject({ role: 'TEACHER', courseCount: 2, enrollmentCount: 0 });
    expect(res.body.data[0]).not.toHaveProperty('passwordHash');
  });

  it('searches by name or e-mail ignoring case and treats % and _ literally', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const lee = await createUser({ fullName: 'Lee Learner', email: 'lee@example.com' });
    const wild = await createUser({ fullName: 'Plain name', email: 'a_b@example.com' });
    await createUser({ fullName: 'Other', email: 'axb@example.com' });

    const byName = await api.get(`${API}/admin/users?search=LEARNER`).set(authHeader(root));
    expect(byName.body.data.map((u: { id: string }) => u.id)).toEqual([lee.id]);
    const byMail = await api.get(`${API}/admin/users?search=LEE@`).set(authHeader(root));
    expect(byMail.body.data.map((u: { id: string }) => u.id)).toEqual([lee.id]);
    const underscore = await api.get(`${API}/admin/users?search=a_b`).set(authHeader(root));
    expect(underscore.body.data.map((u: { id: string }) => u.id)).toEqual([wild.id]);
    const percent = await api.get(`${API}/admin/users?search=%25`).set(authHeader(root));
    expect(percent.body.data).toEqual([]);
  });

  it('filters by role and by status', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { user: teacher } = await createTeacher();
    const blocked = await createUser();
    await prisma.user.update({
      where: { id: blocked.id },
      data: { disabledAt: new Date(), disabledReason: 'Spam' },
    });

    const teachers = await api.get(`${API}/admin/users?role=TEACHER`).set(authHeader(root));
    expect(teachers.body.data.map((u: { id: string }) => u.id)).toEqual([teacher.id]);
    const disabled = await api.get(`${API}/admin/users?status=disabled`).set(authHeader(root));
    expect(disabled.body.data).toHaveLength(1);
    expect(disabled.body.data[0]).toMatchObject({ id: blocked.id, disabledReason: 'Spam' });
    expect(disabled.body.data[0].disabledAt).not.toBeNull();
    const active = await api.get(`${API}/admin/users?status=active`).set(authHeader(root));
    expect(active.body.meta.total).toBe(2);
  });

  it('returns 400 for an unknown role or status', async () => {
    const root = await createUser({ role: 'ADMIN' });
    expect((await api.get(`${API}/admin/users?role=OWNER`).set(authHeader(root))).status).toBe(400);
    expect((await api.get(`${API}/admin/users?status=banned`).set(authHeader(root))).status).toBe(
      400,
    );
  });
});

describe('POST /admin/users/:id/disable and /enable', () => {
  it('locks the account: sessions are revoked and the next login answers ACCOUNT_DISABLED', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { user: target, session } = await createUserAndLogin(api, {
      email: 'victim@example.com',
    });

    const res = await api
      .post(`${API}/admin/users/${target.id}/disable`)
      .set(authHeader(root))
      .send({ reason: 'Abusive behaviour in Q&A' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: target.id,
      disabledReason: 'Abusive behaviour in Q&A',
    });
    expect(res.body.data.disabledAt).not.toBeNull();

    expect(
      (await api.get(`${API}/notifications/unread-count`).set(bearer(session.accessToken))).status,
    ).toBe(401);
    const login = await loginViaApi(api, target.email, target.password);
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('unlocks the account again and clears the reason', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const target = await createUser();
    await api
      .post(`${API}/admin/users/${target.id}/disable`)
      .set(authHeader(root))
      .send({ reason: 'Temporary lock' });

    const res = await api.post(`${API}/admin/users/${target.id}/enable`).set(authHeader(root));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: target.id, disabledAt: null, disabledReason: null });
    const login = await loginViaApi(api, target.email, target.password);
    expect(login.status).toBe(200);
  });

  it('refuses to disable another admin or the caller with 422 CANNOT_DISABLE_ADMIN', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const other = await createUser({ role: 'ADMIN' });
    for (const id of [other.id, root.id]) {
      const res = await api
        .post(`${API}/admin/users/${id}/disable`)
        .set(authHeader(root))
        .send({ reason: 'Not allowed at all' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('CANNOT_DISABLE_ADMIN');
    }
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: other.id } })).disabledAt,
    ).toBeNull();
  });

  it('keeps the courses of a disabled teacher untouched', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { course, teacher } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    await api
      .post(`${API}/admin/users/${teacher.user.id}/disable`)
      .set(authHeader(root))
      .send({ reason: 'Policy violation' });
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).status).toBe(
      'PUBLISHED',
    );
    const detail = await api.get(`${API}/admin/courses/${course.id}`).set(authHeader(root));
    expect(detail.body.data.teacher.isDisabled).toBe(true);
  });

  it('returns 400 for a missing or too short reason and 404 for an unknown user', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const target = await createUser();
    for (const body of [{}, { reason: 'no' }, { reason: 'x'.repeat(501) }]) {
      const res = await api
        .post(`${API}/admin/users/${target.id}/disable`)
        .set(authHeader(root))
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const missing = await api
      .post(`${API}/admin/users/nope/disable`)
      .set(authHeader(root))
      .send({ reason: 'Valid reason' });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect((await api.post(`${API}/admin/users/nope/enable`).set(authHeader(root))).status).toBe(
      404,
    );
  });
});

describe('GET /admin/stats', () => {
  it('returns zeros on an empty system apart from the caller', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const res = await api.get(`${API}/admin/stats`).set(authHeader(root));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      users: {
        total: 1,
        byRole: { STUDENT: 0, TEACHER: 0, ADMIN: 1 },
        disabledCount: 0,
        newLast7d: 1,
        newLast30d: 1,
      },
      courses: {
        total: 0,
        byStatus: { DRAFT: 0, PENDING_REVIEW: 0, PUBLISHED: 0, REJECTED: 0, ARCHIVED: 0 },
      },
      pending: { courses: 0, revisions: 0, total: 0 },
      orders: { paidCount: 0, revenueCents: 0 },
      topCourses: [],
    });
  });

  it('aggregates users, courses, queue, paid orders and the top 5 published courses', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const old = await createUser();
    await prisma.user.update({
      where: { id: old.id },
      data: { createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    });
    const ancient = await createUser();
    await prisma.user.update({
      where: { id: ancient.id },
      data: { createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), disabledAt: new Date() },
    });
    const { profile } = await createTeacher({ fullName: 'Top Teacher' });
    const category = await createCategory();
    const make = (
      title: string,
      enrollmentCount: number,
      status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED',
    ) =>
      createCourse({
        title,
        enrollmentCount,
        status,
        teacherId: profile.id,
        categoryId: category.id,
      });
    const best = await make('Best', 50);
    await make('Second', 30);
    await make('Third', 20);
    await make('Fourth', 10);
    await make('Fifth', 5);
    await make('Sixth', 1);
    await make('Hidden draft', 999, 'DRAFT');
    const pending = await seedSubmittableCourse();
    const live = await seedSubmittableCourse({ status: 'PUBLISHED', publishedAt: new Date() });
    await prisma.courseRevision.create({
      data: { courseId: live.course.id, payload: {}, status: 'PENDING_REVIEW' },
    });
    expect(pending.course.status).toBe('PENDING_REVIEW');

    const buyer = await createUser();
    const paid = await prisma.order.create({
      data: {
        userId: buyer.id,
        totalCents: 8800,
        status: 'PAID',
        paymentMethod: 'card',
        paidAt: new Date(),
      },
    });
    await prisma.orderItem.create({
      data: { orderId: paid.id, courseId: best.id, priceCents: 5900 },
    });
    await prisma.orderItem.create({
      data: { orderId: paid.id, courseId: live.course.id, priceCents: 2900 },
    });
    const failed = await prisma.order.create({
      data: { userId: buyer.id, totalCents: 5900, status: 'FAILED', paymentMethod: 'card' },
    });
    await prisma.orderItem.create({
      data: { orderId: failed.id, courseId: best.id, priceCents: 5900 },
    });

    const res = await api.get(`${API}/admin/stats`).set(authHeader(root));

    expect(res.status).toBe(200);
    const stats = res.body.data;
    expect(stats.users).toMatchObject({
      byRole: { STUDENT: 3, TEACHER: 1 + 2, ADMIN: 1 },
      disabledCount: 1,
    });
    // admin + buyer + 2 giảng viên của seedSubmittableCourse + giảng viên Top Teacher mới trong 7 ngày; old: 20 ngày.
    expect(stats.users.newLast7d).toBe(stats.users.total - 2);
    expect(stats.users.newLast30d).toBe(stats.users.total - 1);
    expect(stats.courses.byStatus).toMatchObject({ DRAFT: 1, PENDING_REVIEW: 1, PUBLISHED: 7 });
    expect(stats.courses.total).toBe(9);
    expect(stats.pending).toEqual({ courses: 1, revisions: 1, total: 2 });
    expect(stats.orders).toEqual({ paidCount: 1, revenueCents: 8800 });
    expect(stats.topCourses).toHaveLength(5);
    expect(stats.topCourses.map((c: { title: string }) => c.title)).toEqual([
      'Best',
      'Second',
      'Third',
      'Fourth',
      'Fifth',
    ]);
    expect(stats.topCourses[0]).toMatchObject({
      id: best.id,
      enrollmentCount: 50,
      revenueCents: 5900,
      teacher: { id: profile.id, fullName: 'Top Teacher' },
    });
    expect(stats.topCourses[1].revenueCents).toBe(0);
  });
});

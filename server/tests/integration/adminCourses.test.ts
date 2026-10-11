/**
 * Kiểm duyệt khóa học của /admin: hàng chờ, chi tiết, duyệt / từ chối khóa mới, ẩn / khôi phục
 * (BR-19, BR-21, BR-23, BR-27, FR-50, FR-54).
 */
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createFollow, createTeacher, createUser } from '../helpers/factories';
import { installMailbox, mailbox, uninstallMailbox } from '../helpers/mailbox';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';
import { payloadOf, saveRevision, seedSubmittableCourse } from './adminFixtures';

const api = createTestApi();

beforeAll(() => installMailbox());
afterAll(() => uninstallMailbox());
beforeEach(async () => {
  await resetDb();
  mailbox.clear();
});

async function admin() {
  return createUser({ role: 'ADMIN', fullName: 'Ada Admin' });
}

describe('role guards', () => {
  it('rejects anonymous callers with 401 and students / teachers with 403', async () => {
    const student = await createUser();
    const { user: teacher } = await createTeacher();
    const routes: [string, string][] = [
      ['get', '/admin/courses'],
      ['get', '/admin/courses/x'],
      ['post', '/admin/courses/x/approve'],
      ['post', '/admin/courses/x/reject'],
      ['post', '/admin/courses/x/archive'],
      ['post', '/admin/courses/x/restore'],
    ];
    for (const [method, path] of routes) {
      const call = (): ReturnType<typeof api.get> =>
        (api as unknown as Record<string, (url: string) => ReturnType<typeof api.get>>)[method]!(
          `${API}${path}`,
        );
      expect((await call()).status).toBe(401);
      expect((await call().set(authHeader(student))).status).toBe(403);
      const asTeacher = await call().set(authHeader(teacher));
      expect(asTeacher.status).toBe(403);
      expect(asTeacher.body.error.code).toBe('FORBIDDEN');
    }
  });
});

describe('GET /admin/courses', () => {
  it('lists the pending courses first-in-first-out with the pending counts in meta', async () => {
    const root = await admin();
    const older = await seedSubmittableCourse({
      title: 'Older submission',
      submittedAt: new Date('2026-10-01T00:00:00Z'),
    });
    const newer = await seedSubmittableCourse({
      title: 'Newer submission',
      submittedAt: new Date('2026-10-05T00:00:00Z'),
    });
    await seedSubmittableCourse({ status: 'DRAFT' });
    const published = await seedSubmittableCourse({ status: 'PUBLISHED', publishedAt: new Date() });
    await saveRevision(published.course.id, await payloadOf(published.course.id));

    const res = await api.get(`${API}/admin/courses?status=PENDING_REVIEW`).set(authHeader(root));

    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { id: string }) => c.id)).toEqual([
      older.course.id,
      newer.course.id,
    ]);
    expect(res.body.data[0]).toMatchObject({
      type: 'COURSE',
      title: 'Older submission',
      status: 'PENDING_REVIEW',
      revisionStatus: null,
      lessonCount: 4,
    });
    expect(res.body.data[0].teacher).toMatchObject({ userId: older.teacher.user.id });
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      pending: { courses: 2, revisions: 1 },
    });
  });

  it('lists every course newest-update-first without a filter and paginates', async () => {
    const root = await admin();
    await seedSubmittableCourse({ status: 'DRAFT' });
    await seedSubmittableCourse({ status: 'ARCHIVED', publishedAt: new Date() });
    await seedSubmittableCourse();
    const res = await api.get(`${API}/admin/courses?limit=2&page=2`).set(authHeader(root));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('lists pending revisions with the revision title, price and lesson count', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    const payload = await payloadOf(course.id);
    payload.title = 'Brand new title';
    payload.priceCents = 1234;
    payload.sections[0]!.lessons.pop();
    await saveRevision(course.id, payload);
    const other = await seedSubmittableCourse({ status: 'PUBLISHED', publishedAt: new Date() });
    await saveRevision(other.course.id, await payloadOf(other.course.id), 'OPEN');

    const res = await api
      .get(`${API}/admin/courses?type=revision&status=PENDING_REVIEW`)
      .set(authHeader(root));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: course.id,
      type: 'REVISION',
      title: 'Brand new title',
      status: 'PUBLISHED',
      revisionStatus: 'PENDING_REVIEW',
      priceCents: 1234,
      lessonCount: 3,
    });
  });

  it('returns 400 when the status does not belong to the type', async () => {
    const root = await admin();
    const wrongForRevision = await api
      .get(`${API}/admin/courses?type=revision&status=PUBLISHED`)
      .set(authHeader(root));
    expect(wrongForRevision.status).toBe(400);
    expect(wrongForRevision.body.error.code).toBe('VALIDATION_ERROR');
    const wrongForCourse = await api
      .get(`${API}/admin/courses?type=course&status=OPEN`)
      .set(authHeader(root));
    expect(wrongForCourse.status).toBe(400);
    expect((await api.get(`${API}/admin/courses?status=NOPE`).set(authHeader(root))).status).toBe(
      400,
    );
  });
});

describe('GET /admin/courses/:id', () => {
  it('returns the full pending course for review with teacher, checklist and review target', async () => {
    const root = await admin();
    const { course, teacher } = await seedSubmittableCourse();
    const res = await api.get(`${API}/admin/courses/${course.id}`).set(authHeader(root));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: course.id,
      status: 'PENDING_REVIEW',
      reviewTarget: 'COURSE',
      revision: null,
      diff: null,
      missing: [],
      moderation: [],
      teacher: {
        id: teacher.profile.id,
        userId: teacher.user.id,
        email: teacher.user.email,
        isDisabled: false,
      },
    });
    expect(res.body.data.sections).toHaveLength(2);
    expect(res.body.data.sections[0].lessons[0]).toMatchObject({
      title: 'Lesson 1',
      isPreview: true,
      content: 'Notes 1',
    });
  });

  it('reports the missing checklist items of an incomplete course', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse({ sections: 1, lessonsPerSection: 2 });
    const res = await api.get(`${API}/admin/courses/${course.id}`).set(authHeader(root));
    expect(res.body.data.missing).toEqual([{ code: 'NOT_ENOUGH_LESSONS' }]);
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown id', async () => {
    const root = await admin();
    const res = await api.get(`${API}/admin/courses/nope`).set(authHeader(root));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });
});

describe('POST /admin/courses/:id/approve (new course)', () => {
  it('publishes the course, records the history and notifies the teacher and the followers', async () => {
    const root = await admin();
    const { course, teacher } = await seedSubmittableCourse();
    const fan = await createUser();
    const stranger = await createUser();
    await createFollow(fan.id, teacher.profile.id);

    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: course.id, status: 'PUBLISHED', reviewTarget: null });
    expect(res.body.data.publishedAt).not.toBeNull();
    expect(res.body.data.moderation[0]).toMatchObject({
      action: 'APPROVED',
      target: 'COURSE',
      reason: null,
      actor: { id: root.id, role: 'ADMIN' },
    });

    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.publishedAt).not.toBeNull();

    const teacherNotes = await prisma.notification.findMany({ where: { userId: teacher.user.id } });
    expect(teacherNotes).toHaveLength(1);
    expect(teacherNotes[0]).toMatchObject({
      type: 'COURSE_APPROVED',
      data: {
        courseId: course.id,
        key: 'COURSE_APPROVED',
        params: { courseTitle: stored.title },
      },
    });
    const fanNotes = await prisma.notification.findMany({ where: { userId: fan.id } });
    expect(fanNotes.map((n) => n.type)).toEqual(['NEW_COURSE']);
    expect(fanNotes[0]?.data).toEqual({
      courseId: course.id,
      key: 'NEW_COURSE',
      params: { teacher: teacher.user.fullName, courseTitle: stored.title },
    });
    expect(await prisma.notification.count({ where: { userId: stranger.id } })).toBe(0);

    const mail = mailbox.lastTo(teacher.user.email);
    expect(mail.subject).toContain('đã được duyệt');
    expect(mail.subject).toContain('was approved');
    expect(mail.text).toContain(stored.title);
  });

  it('does not notify the followers again when the course was already published once', async () => {
    const root = await admin();
    const { course, teacher } = await seedSubmittableCourse({
      publishedAt: new Date('2026-09-01'),
    });
    const fan = await createUser();
    await createFollow(fan.id, teacher.profile.id);

    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));

    expect(res.status).toBe(200);
    expect(await prisma.notification.count({ where: { userId: fan.id } })).toBe(0);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.publishedAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('still succeeds when the e-mail cannot be sent', async () => {
    const root = await admin();
    const { course, teacher } = await seedSubmittableCourse();
    mailbox.failNext = true;

    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(mailbox.to(teacher.user.email)).toHaveLength(0);
    expect(await prisma.notification.count({ where: { type: 'COURSE_APPROVED' } })).toBe(1);
  });

  it('returns 422 COURSE_INCOMPLETE with the missing items when the content no longer passes', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse({ sections: 1, lessonsPerSection: 2 });
    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COURSE_INCOMPLETE');
    expect(res.body.error.details.missing).toEqual([{ code: 'NOT_ENOUGH_LESSONS' }]);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.status).toBe('PENDING_REVIEW');
  });

  it.each(['DRAFT', 'REJECTED', 'ARCHIVED', 'PUBLISHED'] as const)(
    'returns 422 INVALID_COURSE_STATE for a %s course with nothing pending',
    async (status) => {
      const root = await admin();
      const { course } = await seedSubmittableCourse({
        status,
        publishedAt: status === 'PUBLISHED' || status === 'ARCHIVED' ? new Date() : null,
      });
      const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
    },
  );

  it('returns 422 for a published course whose revision is only OPEN', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    await saveRevision(course.id, await payloadOf(course.id), 'OPEN');
    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
  });

  it('returns 404 for an unknown course', async () => {
    const root = await admin();
    const res = await api.post(`${API}/admin/courses/nope/approve`).set(authHeader(root));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });
});

describe('POST /admin/courses/:id/reject', () => {
  it('rejects a pending course, stores the reason and tells the teacher', async () => {
    const root = await admin();
    const { course, teacher } = await seedSubmittableCourse();
    const reason = 'The preview lessons do not show the real content.';

    const res = await api
      .post(`${API}/admin/courses/${course.id}/reject`)
      .set(authHeader(root))
      .send({ reason });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'REJECTED',
      rejectionReason: reason,
      reviewTarget: null,
    });
    expect(res.body.data.moderation[0]).toMatchObject({
      action: 'REJECTED',
      target: 'COURSE',
      reason,
    });
    const note = await prisma.notification.findFirstOrThrow({ where: { userId: teacher.user.id } });
    expect(note.type).toBe('COURSE_REJECTED');
    expect(note.body).toContain(reason);
    expect(note.data).toEqual({
      courseId: course.id,
      key: 'COURSE_REJECTED',
      params: { courseTitle: course.title, reason },
    });
    const mail = mailbox.lastTo(teacher.user.email);
    expect(mail.text).toContain(reason);
    expect(mail.subject).toContain('chưa được duyệt');
  });

  it('lets the teacher see the same reason again after a second review cycle', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse();
    await api
      .post(`${API}/admin/courses/${course.id}/reject`)
      .set(authHeader(root))
      .send({ reason: 'First reason here' });
    await prisma.course.update({ where: { id: course.id }, data: { status: 'PENDING_REVIEW' } });
    const res = await api
      .post(`${API}/admin/courses/${course.id}/reject`)
      .set(authHeader(root))
      .send({ reason: 'Second reason here' });
    expect(res.body.data.rejectionReason).toBe('Second reason here');
    expect(res.body.data.moderation).toHaveLength(2);
  });

  it('returns 400 VALIDATION_ERROR without a reason or with one that is too short or too long', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse();
    for (const body of [{}, { reason: '' }, { reason: 'no' }, { reason: 'x'.repeat(501) }]) {
      const res = await api
        .post(`${API}/admin/courses/${course.id}/reject`)
        .set(authHeader(root))
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(
      (await api.post(`${API}/admin/courses/${course.id}/reject`).set(authHeader(root))).status,
    ).toBe(400);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.status).toBe('PENDING_REVIEW');
  });

  it('returns 422 INVALID_COURSE_STATE when nothing is pending and 404 for an unknown course', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse({ status: 'DRAFT' });
    const res = await api
      .post(`${API}/admin/courses/${course.id}/reject`)
      .set(authHeader(root))
      .send({ reason: 'Not ready yet' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
    const missing = await api
      .post(`${API}/admin/courses/nope/reject`)
      .set(authHeader(root))
      .send({ reason: 'Not ready yet' });
    expect(missing.status).toBe(404);
  });

  it('still succeeds when the e-mail cannot be sent', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse();
    mailbox.failNext = true;
    const res = await api
      .post(`${API}/admin/courses/${course.id}/reject`)
      .set(authHeader(root))
      .send({ reason: 'Please add more lessons' });
    expect(res.status).toBe(200);
    expect(await prisma.notification.count({ where: { type: 'COURSE_REJECTED' } })).toBe(1);
  });
});

describe('POST /admin/courses/:id/archive and /restore', () => {
  it('hides a published course and restores it, recording the optional reason', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    const archived = await api
      .post(`${API}/admin/courses/${course.id}/archive`)
      .set(authHeader(root))
      .send({ reason: 'Copyright complaint received' });
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe('ARCHIVED');
    expect(archived.body.data.moderation[0]).toMatchObject({
      action: 'ARCHIVED',
      target: 'COURSE',
      reason: 'Copyright complaint received',
    });

    const restored = await api
      .post(`${API}/admin/courses/${course.id}/restore`)
      .set(authHeader(root));
    expect(restored.status).toBe(200);
    expect(restored.body.data.status).toBe('PUBLISHED');
    expect(restored.body.data.moderation[0]).toMatchObject({ action: 'RESTORED', reason: null });
  });

  it('does not touch publishedAt and works with an empty JSON body', async () => {
    const root = await admin();
    const publishedAt = new Date('2026-08-01T00:00:00Z');
    const { course } = await seedSubmittableCourse({ status: 'PUBLISHED', publishedAt });
    const res = await api
      .post(`${API}/admin/courses/${course.id}/archive`)
      .set(authHeader(root))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.publishedAt).toBe(publishedAt.toISOString());
  });

  it('returns 422 INVALID_COURSE_STATE for the wrong source status and 404 for an unknown course', async () => {
    const root = await admin();
    const draft = await seedSubmittableCourse({ status: 'DRAFT' });
    const published = await seedSubmittableCourse({ status: 'PUBLISHED', publishedAt: new Date() });
    for (const [id, action] of [
      [draft.course.id, 'archive'],
      [published.course.id, 'restore'],
    ] as const) {
      const res = await api.post(`${API}/admin/courses/${id}/${action}`).set(authHeader(root));
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
    }
    expect((await api.post(`${API}/admin/courses/nope/archive`).set(authHeader(root))).status).toBe(
      404,
    );
  });

  it('returns 400 when the optional reason is present but too short', async () => {
    const root = await admin();
    const { course } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    const res = await api
      .post(`${API}/admin/courses/${course.id}/archive`)
      .set(authHeader(root))
      .send({ reason: 'no' });
    expect(res.status).toBe(400);
  });
});

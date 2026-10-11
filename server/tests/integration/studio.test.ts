/**
 * Studio giảng viên (TA-02): danh sách / tạo / chi tiết / sửa / xóa khóa, chương-bài, đổi thứ tự, upload ảnh bìa,
 * hồ sơ giảng viên. Luồng duyệt + bản sửa đổi nằm ở studioWorkflow.test.ts.
 */
import fs from 'node:fs';
import path from 'node:path';

import { paths } from '@/config/env';
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createCategory,
  createCourse,
  createEnrollment,
  createTag,
  createTeacher,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';
import { createReadyCourse, setupTeacher, YT, YT_SHORT } from './studioFixtures';

const api = createTestApi();
const createdFiles: string[] = [];
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
function send(method: Method, url: string, user: { id: string }, body?: object) {
  const req = api[method](url).set(authHeader(user));
  return body === undefined ? req : req.send(body);
}

beforeEach(resetDb);
afterAll(() => {
  for (const file of createdFiles) fs.rmSync(file, { force: true });
});

describe('role guards and IDOR (BR-23)', () => {
  it('returns 401 without a token and 403 for a student on every Studio area', async () => {
    const student = await createUser();
    expect((await api.get(`${API}/teacher/courses`)).status).toBe(401);
    for (const [method, url] of [
      ['get', '/teacher/courses'],
      ['post', '/teacher/courses'],
      ['get', '/teacher/courses/x'],
      ['post', '/teacher/courses/x/submit'],
      ['post', '/teacher/uploads/image'],
      ['get', '/me/teacher-profile'],
    ] as const) {
      const res = await api[method](`${API}${url}`).set(authHeader(student));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('answers 404 for another teacher on every resource of a course', async () => {
    const { profile, category } = await setupTeacher();
    const { user: other } = await createTeacher();
    const { course, sections, lessons } = await createReadyCourse(profile.id, category.id);
    const lessonBody = { title: 'New lesson', videoUrl: YT, durationSec: 60, isPreview: false };

    const t = `${API}/teacher`;
    const cid = course.id;
    const sid = sections[0]!.id;
    const lid = lessons[0]!.id;
    const checks: ReadonlyArray<readonly [Method, string, object | undefined, string]> = [
      ['get', `${t}/courses/${cid}`, undefined, 'COURSE_NOT_FOUND'],
      ['patch', `${t}/courses/${cid}`, { subtitle: 'x' }, 'COURSE_NOT_FOUND'],
      ['delete', `${t}/courses/${cid}`, undefined, 'COURSE_NOT_FOUND'],
      ['post', `${t}/courses/${cid}/sections`, { title: 'S' }, 'COURSE_NOT_FOUND'],
      ['post', `${t}/courses/${cid}/submit`, undefined, 'COURSE_NOT_FOUND'],
      ['post', `${t}/courses/${cid}/withdraw`, undefined, 'COURSE_NOT_FOUND'],
      ['post', `${t}/courses/${cid}/archive`, undefined, 'COURSE_NOT_FOUND'],
      ['post', `${t}/courses/${cid}/restore`, undefined, 'COURSE_NOT_FOUND'],
      ['post', `${t}/courses/${cid}/revision`, undefined, 'COURSE_NOT_FOUND'],
      ['delete', `${t}/courses/${cid}/revision`, undefined, 'COURSE_NOT_FOUND'],
      [
        'post',
        `${t}/courses/${cid}/reorder`,
        { target: 'sections', ids: sections.map((s) => s.id) },
        'COURSE_NOT_FOUND',
      ],
      ['patch', `${t}/sections/${sid}`, { title: 'x' }, 'NOT_FOUND'],
      ['delete', `${t}/sections/${sid}`, undefined, 'NOT_FOUND'],
      ['post', `${t}/sections/${sid}/lessons`, lessonBody, 'NOT_FOUND'],
      ['patch', `${t}/lessons/${lid}`, { title: 'x' }, 'LESSON_NOT_FOUND'],
      ['delete', `${t}/lessons/${lid}`, undefined, 'LESSON_NOT_FOUND'],
    ];
    for (const [method, url, body, code] of checks) {
      const res = await send(method, url, other, body);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(code);
    }
  });
});

describe('GET /teacher/courses', () => {
  it('lists only my courses newest-updated first with a summary over all of them', async () => {
    const { user, profile, category } = await setupTeacher();
    const older = await createCourse({
      teacherId: profile.id,
      categoryId: category.id,
      status: 'DRAFT',
      title: 'Older draft',
    });
    const published = await createCourse({
      teacherId: profile.id,
      categoryId: category.id,
      status: 'PUBLISHED',
      title: 'Published one',
      enrollmentCount: 7,
    });
    const rejected = await createCourse({
      teacherId: profile.id,
      categoryId: category.id,
      status: 'REJECTED',
      title: 'Rejected one',
    });
    await createCourse({ title: 'Somebody else' }); // khóa của giảng viên khác
    await prisma.courseModeration.create({
      data: { courseId: rejected.id, actorId: user.id, action: 'REJECTED', reason: 'Too short' },
    });
    await prisma.courseRevision.create({
      data: { courseId: published.id, payload: {}, status: 'PENDING_REVIEW' },
    });
    await prisma.course.update({ where: { id: older.id }, data: { subtitle: 'touch' } });

    const res = await api.get(`${API}/teacher/courses`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { title: string }) => c.title)).toEqual([
      'Older draft',
      'Rejected one',
      'Published one',
    ]);
    const byTitle = Object.fromEntries(
      res.body.data.map((c: { title: string }) => [c.title, c]),
    ) as Record<string, Record<string, unknown>>;
    expect(byTitle['Rejected one']).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Too short',
    });
    expect(byTitle['Published one']).toMatchObject({
      revisionStatus: 'PENDING_REVIEW',
      enrollmentCount: 7,
      rejectionReason: null,
    });
    expect(byTitle['Older draft']).toMatchObject({ revisionStatus: null });
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 3, totalPages: 1 });
    expect(res.body.meta.summary).toEqual({
      courseCount: 3,
      totalEnrollments: 7,
      totalRevenueCents: 0,
      byStatus: { DRAFT: 1, PENDING_REVIEW: 0, PUBLISHED: 1, REJECTED: 1, ARCHIVED: 0 },
    });
  });

  it('filters by status, paginates and sums PAID revenue', async () => {
    const { user, profile, category } = await setupTeacher();
    const buyer = await createUser();
    const paid = await createCourse({ teacherId: profile.id, categoryId: category.id });
    await createCourse({ teacherId: profile.id, categoryId: category.id, status: 'DRAFT' });
    await createCourse({ teacherId: profile.id, categoryId: category.id, status: 'DRAFT' });
    const order = await prisma.order.create({
      data: { userId: buyer.id, totalCents: 5900, status: 'PAID', paymentMethod: 'card' },
    });
    await prisma.orderItem.create({
      data: { orderId: order.id, courseId: paid.id, priceCents: 5900 },
    });
    const pending = await prisma.order.create({
      data: { userId: buyer.id, totalCents: 100, status: 'PENDING', paymentMethod: 'card' },
    });
    await prisma.orderItem.create({
      data: { orderId: pending.id, courseId: paid.id, priceCents: 100 },
    });

    const drafts = await api
      .get(`${API}/teacher/courses?status=DRAFT&limit=1&page=2`)
      .set(authHeader(user));
    expect(drafts.status).toBe(200);
    expect(drafts.body.data).toHaveLength(1);
    expect(drafts.body.meta).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });
    expect(drafts.body.meta.summary.totalRevenueCents).toBe(5900);
    expect(drafts.body.meta.summary.courseCount).toBe(3);

    const bad = await api.get(`${API}/teacher/courses?status=NOPE`).set(authHeader(user));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns an empty list for a teacher without courses', async () => {
    const { user } = await createTeacher();
    const res = await api.get(`${API}/teacher/courses`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.summary.courseCount).toBe(0);
    expect(res.body.meta.summary.byStatus.PUBLISHED).toBe(0);
  });
});

describe('POST /teacher/courses', () => {
  it('creates an empty DRAFT with defaults', async () => {
    const { user, profile, category } = await setupTeacher();
    const tagA = await createTag({ name: 'alpha' });
    const tagB = await createTag({ name: 'beta' });

    const res = await api
      .post(`${API}/teacher/courses`)
      .set(authHeader(user))
      .send({ title: '  My first course  ', categoryId: category.id, tagIds: [tagB.id, tagA.id] });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'My first course',
      status: 'DRAFT',
      thumbnailUrl: '',
      description: '',
      priceCents: 0,
      originalPriceCents: null,
      subtitle: null,
      benefits: [],
      lessonCount: 0,
      sections: [],
      revision: null,
      moderation: [],
      category: { id: category.id, name: category.name },
    });
    expect(res.body.data.tags.map((t: { name: string }) => t.name)).toEqual(['alpha', 'beta']);
    expect(res.body.data.missing.map((m: { code: string }) => m.code)).toEqual(
      expect.arrayContaining(['DESCRIPTION_TOO_SHORT', 'NO_THUMBNAIL', 'NO_SECTION']),
    );
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(stored.teacherId).toBe(profile.id);
  });

  it('accepts every optional field and stores the cover as a relative upload path', async () => {
    const { user, category } = await setupTeacher();
    const res = await api
      .post(`${API}/teacher/courses`)
      .set(authHeader(user))
      .send({
        title: 'Full course',
        categoryId: category.id,
        subtitle: 'Sub',
        description: 'Desc',
        priceCents: 4900,
        originalPriceCents: 9900,
        benefits: ['One', 'Two'],
        projectDescription: 'Build it',
        thumbnailUrl: '/uploads/courses/abc-1.png',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      subtitle: 'Sub',
      priceCents: 4900,
      originalPriceCents: 9900,
      benefits: ['One', 'Two'],
      projectDescription: 'Build it',
    });
    expect(res.body.data.thumbnailUrl).toMatch(/^https?:\/\/.+\/uploads\/courses\/abc-1\.png$/);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(stored.thumbnailUrl).toBe('/uploads/courses/abc-1.png');
  });

  it('creates the teacher profile on demand for an account promoted to TEACHER', async () => {
    const category = await createCategory();
    const promoted = await createUser({ role: 'TEACHER' });
    const res = await api
      .post(`${API}/teacher/courses`)
      .set(authHeader(promoted))
      .send({ title: 'Promoted course', categoryId: category.id });
    expect(res.status).toBe(201);
    expect(await prisma.teacherProfile.count({ where: { userId: promoted.id } })).toBe(1);
  });

  it.each([
    ['a short title', { title: 'abc' }],
    ['a missing category', { title: 'Valid title' }],
    ['more than 5 tags', { title: 'Valid title', tagIds: ['a', 'b', 'c', 'd', 'e', 'f'] }],
    ['a foreign thumbnail url', { title: 'Valid title', thumbnailUrl: 'https://evil.test/a.png' }],
    [
      'a thumbnail with path traversal',
      { title: 'Valid title', thumbnailUrl: '/uploads/courses/../x.png' },
    ],
    ['a negative price', { title: 'Valid title', priceCents: -1 }],
    ['a price above the maximum', { title: 'Valid title', priceCents: 100000 }],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, extra) => {
    const { user, category } = await setupTeacher();
    const body =
      'categoryId' in extra || _label === 'a missing category'
        ? extra
        : { categoryId: category.id, ...extra };
    const res = await api.post(`${API}/teacher/courses`).set(authHeader(user)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for an unknown category or tag', async () => {
    const { user, category } = await setupTeacher();
    const badCategory = await api
      .post(`${API}/teacher/courses`)
      .set(authHeader(user))
      .send({ title: 'Valid title', categoryId: 'nope' });
    const badTag = await api
      .post(`${API}/teacher/courses`)
      .set(authHeader(user))
      .send({ title: 'Valid title', categoryId: category.id, tagIds: ['nope'] });
    expect(badCategory.status).toBe(404);
    expect(badCategory.body.error.code).toBe('NOT_FOUND');
    expect(badTag.status).toBe(404);
    expect(await prisma.course.count()).toBe(0);
  });
});

describe('GET /teacher/courses/:id', () => {
  it('returns the whole course with curriculum, history and the checklist', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course, lessons } = await createReadyCourse(profile.id, category.id);
    await prisma.courseModeration.create({
      data: { courseId: course.id, actorId: user.id, action: 'SUBMITTED', target: 'COURSE' },
    });

    const res = await api.get(`${API}/teacher/courses/${course.id}`).set(authHeader(user));

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.sections).toHaveLength(2);
    expect(data.sections[0].lessons.map((l: { id: string }) => l.id)).toEqual([
      lessons[0]!.id,
      lessons[1]!.id,
    ]);
    expect(data.sections[0].lessons[0]).toMatchObject({
      title: 'Lesson 1',
      order: 1,
      durationSec: 100,
      videoUrl: YT,
      isPreview: true,
      content: 'Notes 1',
    });
    expect(data.missing).toEqual([]);
    expect(data.moderation).toHaveLength(1);
    expect(data.moderation[0]).toMatchObject({
      action: 'SUBMITTED',
      target: 'COURSE',
      actor: { id: user.id, role: 'TEACHER' },
    });
    expect(data.revision).toBeNull();
  });

  it('reports lesson-level checklist items with the lesson id and number', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course, lessons } = await createReadyCourse(profile.id, category.id);
    await prisma.lesson.update({
      where: { id: lessons[2]!.id },
      data: { videoUrl: '/static/x.mp4' },
    });

    const res = await api.get(`${API}/teacher/courses/${course.id}`).set(authHeader(user));
    expect(res.body.data.missing).toEqual([
      { code: 'LESSON_VIDEO_INVALID', lessonId: lessons[2]!.id, lessonNumber: 3 },
    ]);
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown id', async () => {
    const { user } = await createTeacher();
    const res = await api.get(`${API}/teacher/courses/nope`).set(authHeader(user));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });
});

describe('PATCH /teacher/courses/:id', () => {
  it('edits every field of a DRAFT and replaces the tags', async () => {
    const { user, profile, category } = await setupTeacher();
    const other = await createCategory();
    const [t1, t2] = [await createTag(), await createTag()];
    const { course } = await createReadyCourse(profile.id, category.id, { tagIds: [t1.id] });

    const res = await api
      .patch(`${API}/teacher/courses/${course.id}`)
      .set(authHeader(user))
      .send({
        title: 'Renamed course',
        subtitle: '',
        categoryId: other.id,
        tagIds: [t2.id],
        priceCents: 0,
        originalPriceCents: null,
        benefits: ['A', 'B', 'C'],
        projectDescription: 'Do a project',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: 'Renamed course',
      subtitle: null,
      priceCents: 0,
      benefits: ['A', 'B', 'C'],
      projectDescription: 'Do a project',
      category: { id: other.id },
    });
    expect(res.body.data.tags.map((t: { id: string }) => t.id)).toEqual([t2.id]);
  });

  it('returns 400 for an empty body or invalid values and 404 for unknown category/tag', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course } = await createReadyCourse(profile.id, category.id);
    const url = `${API}/teacher/courses/${course.id}`;

    expect((await api.patch(url).set(authHeader(user)).send({})).status).toBe(400);
    expect((await api.patch(url).set(authHeader(user)).send({ title: 'abc' })).status).toBe(400);
    expect(
      (await api.patch(url).set(authHeader(user)).send({ thumbnailUrl: 'https://x.test/a.png' }))
        .status,
    ).toBe(400);
    const missingCategory = await api.patch(url).set(authHeader(user)).send({ categoryId: 'nope' });
    expect(missingCategory.status).toBe(404);
    const missingTag = await api
      .patch(url)
      .set(authHeader(user))
      .send({ tagIds: ['nope'] });
    expect(missingTag.status).toBe(404);
  });

  it('edits a REJECTED course and keeps it REJECTED', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course } = await createReadyCourse(profile.id, category.id, { status: 'REJECTED' });
    const res = await api
      .patch(`${API}/teacher/courses/${course.id}`)
      .set(authHeader(user))
      .send({ title: 'Better title now' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'REJECTED', title: 'Better title now' });
  });

  it.each(['PENDING_REVIEW', 'ARCHIVED'] as const)(
    'returns 422 INVALID_COURSE_STATE for a %s course',
    async (status) => {
      const { user, profile, category } = await setupTeacher();
      const { course } = await createReadyCourse(profile.id, category.id, { status });
      const res = await api
        .patch(`${API}/teacher/courses/${course.id}`)
        .set(authHeader(user))
        .send({ subtitle: 'x' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
    },
  );

  it('applies minor fields at once on a PUBLISHED course but refuses major ones (BR-21)', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course } = await createReadyCourse(profile.id, category.id, { status: 'PUBLISHED' });
    const url = `${API}/teacher/courses/${course.id}`;

    const minor = await api
      .patch(url)
      .set(authHeader(user))
      .send({
        subtitle: 'Fresh subtitle',
        description: 'Fresh description',
        benefits: ['New benefit'],
        projectDescription: 'New project',
        thumbnailUrl: '/uploads/courses/new-cover.jpg',
      });
    expect(minor.status).toBe(200);
    expect(minor.body.data).toMatchObject({
      status: 'PUBLISHED',
      subtitle: 'Fresh subtitle',
      description: 'Fresh description',
      benefits: ['New benefit'],
    });

    for (const body of [
      { title: 'Different title' },
      { priceCents: 100 },
      { originalPriceCents: 9900 },
      { categoryId: (await createCategory()).id },
      { tagIds: [(await createTag()).id] },
    ]) {
      const res = await api.patch(url).set(authHeader(user)).send(body);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('REVISION_REQUIRED');
    }
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.title).toBe('A complete course title');
    expect(stored.priceCents).toBe(5900);
  });

  it('ignores a major field sent back unchanged on a PUBLISHED course', async () => {
    const { user, profile, category } = await setupTeacher();
    const tag = await createTag();
    const { course } = await createReadyCourse(profile.id, category.id, {
      status: 'PUBLISHED',
      tagIds: [tag.id],
    });
    const res = await api
      .patch(`${API}/teacher/courses/${course.id}`)
      .set(authHeader(user))
      .send({
        title: 'A complete course title',
        categoryId: category.id,
        tagIds: [tag.id],
        priceCents: 5900,
        subtitle: 'Only this changes',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.subtitle).toBe('Only this changes');
  });
});

describe('DELETE /teacher/courses/:id (BR-22)', () => {
  it.each(['DRAFT', 'REJECTED'] as const)('deletes a never-published %s course', async (status) => {
    const { user, profile, category } = await setupTeacher();
    const { course } = await createReadyCourse(profile.id, category.id, { status });
    const res = await api.delete(`${API}/teacher/courses/${course.id}`).set(authHeader(user));
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await prisma.course.count()).toBe(0);
    expect(await prisma.section.count()).toBe(0);
    expect(await prisma.lesson.count()).toBe(0);
  });

  it('returns 422 for a PENDING_REVIEW course', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course } = await createReadyCourse(profile.id, category.id, {
      status: 'PENDING_REVIEW',
    });
    const res = await api.delete(`${API}/teacher/courses/${course.id}`).set(authHeader(user));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
  });

  it.each(['PUBLISHED', 'ARCHIVED'] as const)(
    'returns 422 INVALID_COURSE_STATE for a %s course nobody bought',
    async (status) => {
      const { user, profile, category } = await setupTeacher();
      const { course } = await createReadyCourse(profile.id, category.id, { status });
      const res = await api.delete(`${API}/teacher/courses/${course.id}`).set(authHeader(user));
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
      expect(await prisma.course.count()).toBe(1);
    },
  );

  it('returns 409 COURSE_HAS_ENROLLMENTS when students are enrolled', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course } = await createReadyCourse(profile.id, category.id, { status: 'PUBLISHED' });
    await createEnrollment((await createUser()).id, course.id);
    const res = await api.delete(`${API}/teacher/courses/${course.id}`).set(authHeader(user));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('COURSE_HAS_ENROLLMENTS');
  });
});

describe('sections and lessons', () => {
  async function draftWithSection() {
    const ctx = await setupTeacher();
    const course = await createCourse({
      teacherId: ctx.profile.id,
      categoryId: ctx.category.id,
      status: 'DRAFT',
    });
    return { ...ctx, course };
  }

  it('creates sections at the end, edits and deletes them with order renumbering', async () => {
    const { user, course } = await draftWithSection();
    const h = authHeader(user);
    const s1 = await api
      .post(`${API}/teacher/courses/${course.id}/sections`)
      .set(h)
      .send({ title: ' One ' });
    const s2 = await api
      .post(`${API}/teacher/courses/${course.id}/sections`)
      .set(h)
      .send({ title: 'Two' });
    const s3 = await api
      .post(`${API}/teacher/courses/${course.id}/sections`)
      .set(h)
      .send({ title: 'Three' });
    expect(s1.status).toBe(201);
    expect(s1.body.data).toMatchObject({ title: 'One', order: 1, lessons: [] });
    expect([s2.body.data.order, s3.body.data.order]).toEqual([2, 3]);

    const renamed = await api
      .patch(`${API}/teacher/sections/${s2.body.data.id}`)
      .set(h)
      .send({ title: 'Deux' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.title).toBe('Deux');

    const removed = await api.delete(`${API}/teacher/sections/${s1.body.data.id}`).set(h);
    expect(removed.status).toBe(204);
    const rows = await prisma.section.findMany({
      where: { courseId: course.id },
      orderBy: { order: 'asc' },
    });
    expect(rows.map((r) => [r.title, r.order])).toEqual([
      ['Deux', 1],
      ['Three', 2],
    ]);
  });

  it('rejects an empty section title and more than 20 sections with 400', async () => {
    const { user, course } = await draftWithSection();
    const h = authHeader(user);
    const url = `${API}/teacher/courses/${course.id}/sections`;
    expect((await api.post(url).set(h).send({ title: ' ' })).status).toBe(400);
    for (let i = 1; i <= 20; i += 1) {
      await prisma.section.create({ data: { courseId: course.id, title: `S${i}`, order: i } });
    }
    const res = await api.post(url).set(h).send({ title: 'Too many' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates lessons with a normalized YouTube link and keeps the course counters in sync', async () => {
    const { user, course } = await draftWithSection();
    const h = authHeader(user);
    const section = await api
      .post(`${API}/teacher/courses/${course.id}/sections`)
      .set(h)
      .send({ title: 'S' });
    const url = `${API}/teacher/sections/${section.body.data.id}/lessons`;

    const first = await api
      .post(url)
      .set(h)
      .send({
        title: 'Intro',
        videoUrl: `${YT_SHORT}?t=30`,
        durationSec: 120,
        isPreview: true,
        content: 'notes',
      });
    const second = await api.post(url).set(h).send({
      title: 'Next',
      videoUrl: YT,
      durationSec: 80,
      isPreview: false,
    });

    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      title: 'Intro',
      order: 1,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=30',
      durationSec: 120,
      isPreview: true,
      content: 'notes',
    });
    expect(second.body.data).toMatchObject({ order: 2, content: '' });
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect([stored.lessonCount, stored.totalDurationSec]).toEqual([2, 200]);
  });

  it.each([
    ['a non-YouTube link', { videoUrl: 'https://vimeo.com/123' }],
    ['a zero duration', { durationSec: 0 }],
    ['a duration over 6 hours', { durationSec: 6 * 3600 + 1 }],
    ['an empty title', { title: '' }],
    ['a missing isPreview', { isPreview: undefined }],
  ])('returns 400 for a lesson with %s', async (_label, patch) => {
    const { user, course } = await draftWithSection();
    const h = authHeader(user);
    const section = await api
      .post(`${API}/teacher/courses/${course.id}/sections`)
      .set(h)
      .send({ title: 'S' });
    const res = await api
      .post(`${API}/teacher/sections/${section.body.data.id}/lessons`)
      .set(h)
      .send({ title: 'Ok', videoUrl: YT, durationSec: 60, isPreview: false, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses the 101st lesson of a course with 400', async () => {
    const { user, course } = await draftWithSection();
    const h = authHeader(user);
    const section = await prisma.section.create({
      data: { courseId: course.id, title: 'Big', order: 1 },
    });
    await prisma.lesson.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({
        sectionId: section.id,
        title: `L${i}`,
        order: i + 1,
        durationSec: 10,
        videoUrl: YT,
      })),
    });
    const res = await api
      .post(`${API}/teacher/sections/${section.id}/lessons`)
      .set(h)
      .send({ title: 'One too many', videoUrl: YT, durationSec: 60, isPreview: false });
    expect(res.status).toBe(400);
    expect(await prisma.lesson.count()).toBe(100);
  });

  it('patches and deletes lessons, renumbering and recounting', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course, lessons } = await createReadyCourse(profile.id, category.id);
    const h = authHeader(user);

    const patched = await api
      .patch(`${API}/teacher/lessons/${lessons[0]!.id}`)
      .set(h)
      .send({ title: 'Edited', durationSec: 300, videoUrl: `${YT_SHORT}`, isPreview: false });
    expect(patched.status).toBe(200);
    expect(patched.body.data).toMatchObject({
      title: 'Edited',
      durationSec: 300,
      isPreview: false,
      videoUrl: YT,
    });
    let stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.totalDurationSec).toBe(600);

    expect(
      (await api.patch(`${API}/teacher/lessons/${lessons[0]!.id}`).set(h).send({})).status,
    ).toBe(400);
    expect(
      (
        await api
          .patch(`${API}/teacher/lessons/${lessons[0]!.id}`)
          .set(h)
          .send({ videoUrl: 'nope' })
      ).status,
    ).toBe(400);

    const removed = await api.delete(`${API}/teacher/lessons/${lessons[0]!.id}`).set(h);
    expect(removed.status).toBe(204);
    const rest = await prisma.lesson.findMany({ where: { sectionId: lessons[0]!.sectionId } });
    expect(rest.map((l) => [l.id, l.order])).toEqual([[lessons[1]!.id, 1]]);
    stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect([stored.lessonCount, stored.totalDurationSec]).toEqual([3, 300]);

    await api.delete(`${API}/teacher/sections/${lessons[2]!.sectionId}`).set(h);
    stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect([stored.lessonCount, stored.totalDurationSec]).toEqual([1, 100]);
  });

  it('returns 404 for unknown section / lesson ids', async () => {
    const { user } = await createTeacher();
    const h = authHeader(user);
    const section = await api.patch(`${API}/teacher/sections/nope`).set(h).send({ title: 'x' });
    const lesson = await api.delete(`${API}/teacher/lessons/nope`).set(h);
    expect(section.status).toBe(404);
    expect(section.body.error.code).toBe('NOT_FOUND');
    expect(lesson.status).toBe(404);
    expect(lesson.body.error.code).toBe('LESSON_NOT_FOUND');
  });

  it('blocks curriculum edits by status: PUBLISHED needs a revision, PENDING/ARCHIVED are invalid', async () => {
    const { user, profile, category } = await setupTeacher();
    const cases = [
      ['PUBLISHED', 'REVISION_REQUIRED'],
      ['PENDING_REVIEW', 'INVALID_COURSE_STATE'],
      ['ARCHIVED', 'INVALID_COURSE_STATE'],
    ] as const;
    for (const [status, code] of cases) {
      const { course, sections, lessons } = await createReadyCourse(profile.id, category.id, {
        status,
      });
      const t = `${API}/teacher`;
      const sid = sections[0]!.id;
      const calls: ReadonlyArray<readonly [Method, string, object | undefined]> = [
        ['post', `${t}/courses/${course.id}/sections`, { title: 'New' }],
        ['patch', `${t}/sections/${sid}`, { title: 'New' }],
        ['delete', `${t}/sections/${sid}`, undefined],
        [
          'post',
          `${t}/sections/${sid}/lessons`,
          { title: 'New', videoUrl: YT, durationSec: 10, isPreview: false },
        ],
        ['patch', `${t}/lessons/${lessons[0]!.id}`, { title: 'New' }],
        ['delete', `${t}/lessons/${lessons[0]!.id}`, undefined],
        [
          'post',
          `${t}/courses/${course.id}/reorder`,
          { target: 'sections', ids: sections.map((s) => s.id).reverse() },
        ],
      ];
      for (const [method, url, body] of calls) {
        const res = await send(method, url, user, body);
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe(code);
      }
    }
  });
});

describe('POST /teacher/courses/:id/reorder', () => {
  it('reorders sections and returns the whole curriculum', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course, sections } = await createReadyCourse(profile.id, category.id);
    const res = await api
      .post(`${API}/teacher/courses/${course.id}/reorder`)
      .set(authHeader(user))
      .send({ target: 'sections', ids: [sections[1]!.id, sections[0]!.id] });

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { id: string; order: number }) => [s.id, s.order])).toEqual([
      [sections[1]!.id, 1],
      [sections[0]!.id, 2],
    ]);
    expect(res.body.data[0].lessons).toHaveLength(2);
  });

  it('reorders the lessons of one section', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course, sections, lessons } = await createReadyCourse(profile.id, category.id);
    const res = await api
      .post(`${API}/teacher/courses/${course.id}/reorder`)
      .set(authHeader(user))
      .send({
        target: 'lessons',
        sectionId: sections[0]!.id,
        ids: [lessons[1]!.id, lessons[0]!.id],
      });

    expect(res.status).toBe(200);
    expect(res.body.data[0].lessons.map((l: { id: string }) => l.id)).toEqual([
      lessons[1]!.id,
      lessons[0]!.id,
    ]);
    expect(res.body.data[1].lessons.map((l: { id: string }) => l.id)).toEqual([
      lessons[2]!.id,
      lessons[3]!.id,
    ]);
  });

  it.each([
    ['a missing id', (s: string[]) => ({ target: 'sections', ids: [s[0]] })],
    ['an extra id', (s: string[]) => ({ target: 'sections', ids: [...s, 'extra'] })],
    ['a foreign id', (s: string[]) => ({ target: 'sections', ids: [s[0], 'foreign'] })],
    ['a duplicated id', (s: string[]) => ({ target: 'sections', ids: [s[0], s[0]] })],
    ['an unknown target', () => ({ target: 'courses', ids: [] })],
  ])('returns 400 for %s', async (_label, build) => {
    const { user, profile, category } = await setupTeacher();
    const { course, sections } = await createReadyCourse(profile.id, category.id);
    const res = await api
      .post(`${API}/teacher/courses/${course.id}/reorder`)
      .set(authHeader(user))
      .send(build(sections.map((s) => s.id)));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when the lessons belong to another section or the section is not in the course', async () => {
    const { user, profile, category } = await setupTeacher();
    const { course, sections, lessons } = await createReadyCourse(profile.id, category.id);
    const another = await createReadyCourse(profile.id, category.id);
    const h = authHeader(user);
    const wrongLessons = await api
      .post(`${API}/teacher/courses/${course.id}/reorder`)
      .set(h)
      .send({
        target: 'lessons',
        sectionId: sections[0]!.id,
        ids: [lessons[2]!.id, lessons[3]!.id],
      });
    const wrongSection = await api
      .post(`${API}/teacher/courses/${course.id}/reorder`)
      .set(h)
      .send({
        target: 'lessons',
        sectionId: another.sections[0]!.id,
        ids: another.lessons.slice(0, 2).map((l) => l.id),
      });
    expect(wrongLessons.status).toBe(400);
    expect(wrongSection.status).toBe(400);
  });
});

describe('POST /teacher/uploads/image', () => {
  function trackUpload(url: string): string {
    const file = path.join(paths.uploads, 'courses', path.basename(new URL(url).pathname));
    createdFiles.push(file);
    return file;
  }

  it('stores a PNG under uploads/courses and the url works as a thumbnail', async () => {
    const { user, category } = await setupTeacher();
    const h = authHeader(user);
    const res = await api
      .post(`${API}/teacher/uploads/image`)
      .set(h)
      .attach('file', PNG, { filename: 'cover.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^https?:\/\/.+\/uploads\/courses\/.+\.png$/);
    expect(fs.existsSync(trackUpload(res.body.data.url))).toBe(true);

    const created = await api
      .post(`${API}/teacher/courses`)
      .set(h)
      .send({ title: 'With a cover', categoryId: category.id, thumbnailUrl: res.body.data.url });
    expect(created.status).toBe(201);
    expect(created.body.data.thumbnailUrl).toBe(res.body.data.url);
  });

  it('accepts a JPEG', async () => {
    const { user } = await createTeacher();
    const res = await api
      .post(`${API}/teacher/uploads/image`)
      .set(authHeader(user))
      .attach('file', PNG, { filename: 'cover.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    trackUpload(res.body.data.url);
    expect(res.body.data.url).toMatch(/\.jpg$/);
  });

  it('returns 415 for a non-image file, 413 above 5 MB and 400 without a file', async () => {
    const { user } = await createTeacher();
    const h = authHeader(user);
    const text = await api
      .post(`${API}/teacher/uploads/image`)
      .set(h)
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    const big = await api
      .post(`${API}/teacher/uploads/image`)
      .set(h)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      });
    const none = await api.post(`${API}/teacher/uploads/image`).set(h);

    expect(text.status).toBe(415);
    expect(text.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('FILE_TOO_LARGE');
    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not store the file when the caller is not authenticated or not a teacher', async () => {
    const student = await createUser();
    const before = fs.existsSync(path.join(paths.uploads, 'courses'))
      ? fs.readdirSync(path.join(paths.uploads, 'courses')).length
      : 0;
    const anonymous = await api
      .post(`${API}/teacher/uploads/image`)
      .attach('file', PNG, { filename: 'c.png', contentType: 'image/png' });
    const asStudent = await api
      .post(`${API}/teacher/uploads/image`)
      .set(authHeader(student))
      .attach('file', PNG, { filename: 'c.png', contentType: 'image/png' });
    const after = fs.existsSync(path.join(paths.uploads, 'courses'))
      ? fs.readdirSync(path.join(paths.uploads, 'courses')).length
      : 0;

    expect(anonymous.status).toBe(401);
    expect(asStudent.status).toBe(403);
    expect(after).toBe(before);
  });
});

describe('GET/PATCH /me/teacher-profile (FR-49)', () => {
  it('returns the profile', async () => {
    const { user, profile } = await createTeacher({ jobTitle: 'Designer' });
    const res = await api.get(`${API}/me/teacher-profile`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: profile.id,
      jobTitle: 'Designer',
      bio: 'Teacher bio for tests.',
      organization: 'Test University',
      location: 'New York',
      timezone: 'America/New_York',
    });
  });

  it('creates an empty profile for a TEACHER account that has none', async () => {
    const promoted = await createUser({ role: 'TEACHER' });
    const res = await api.get(`${API}/me/teacher-profile`).set(authHeader(promoted));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      jobTitle: '',
      bio: '',
      organization: null,
      location: null,
      timezone: null,
    });
    expect(await prisma.teacherProfile.count({ where: { userId: promoted.id } })).toBe(1);
  });

  it('updates some fields, trims, clears with null/empty and keeps the others', async () => {
    const { user } = await createTeacher();
    const res = await api.patch(`${API}/me/teacher-profile`).set(authHeader(user)).send({
      jobTitle: '  Lead engineer ',
      bio: 'About me',
      organization: null,
      timezone: 'Europe/Vienna',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      jobTitle: 'Lead engineer',
      bio: 'About me',
      organization: null,
      location: 'New York',
      timezone: 'Europe/Vienna',
    });

    const cleared = await api
      .patch(`${API}/me/teacher-profile`)
      .set(authHeader(user))
      .send({ location: '', timezone: null });
    expect(cleared.body.data).toMatchObject({
      location: null,
      timezone: null,
      jobTitle: 'Lead engineer',
    });
  });

  it.each([
    ['an empty body', {}],
    ['an empty job title', { jobTitle: '' }],
    ['a bio over 2000 chars', { bio: 'x'.repeat(2001) }],
    ['an invalid time zone', { timezone: 'Mars/Olympus' }],
    ['an organization over 100 chars', { organization: 'x'.repeat(101) }],
  ])('returns 400 for %s', async (_label, body) => {
    const { user } = await createTeacher();
    const res = await api.patch(`${API}/me/teacher-profile`).set(authHeader(user)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

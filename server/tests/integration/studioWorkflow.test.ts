/**
 * Studio giảng viên (TA-02): luồng duyệt BR-19/20 (submit, withdraw, archive, restore) và bản sửa đổi BR-21.
 */
import type { CourseStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createTag, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';
import { createReadyCourse, setupTeacher, YT } from './studioFixtures';

const api = createTestApi();
const t = `${API}/teacher`;

beforeEach(resetDb);

type Ready = Awaited<ReturnType<typeof createReadyCourse>>;
type Ctx = Awaited<ReturnType<typeof setupTeacher>> & Ready;

async function ready(status: CourseStatus = 'DRAFT'): Promise<Ctx> {
  const base = await setupTeacher();
  return { ...base, ...(await createReadyCourse(base.profile.id, base.category.id, { status })) };
}

async function history(courseId: string) {
  const rows = await prisma.courseModeration.findMany({
    where: { courseId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return rows.map((r) => `${r.action}/${r.target}`);
}

describe('POST /teacher/courses/:id/submit (BR-20)', () => {
  it('moves a complete DRAFT to PENDING_REVIEW and records SUBMITTED', async () => {
    const { user, course } = await ready('DRAFT');
    const res = await api.post(`${t}/courses/${course.id}/submit`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: course.id, status: 'PENDING_REVIEW' });
    expect(res.body.data.submittedAt).not.toBeNull();
    expect(res.body.data.moderation[0]).toMatchObject({
      action: 'SUBMITTED',
      target: 'COURSE',
      actor: { id: user.id },
    });
    expect(await history(course.id)).toEqual(['SUBMITTED/COURSE']);
  });

  it('lets a REJECTED course be fixed and submitted again with the reason on the way', async () => {
    const { user, course } = await ready('REJECTED');
    await prisma.courseModeration.create({
      data: {
        courseId: course.id,
        actorId: user.id,
        action: 'REJECTED',
        reason: 'Add more lessons',
      },
    });
    const detail = await api.get(`${t}/courses/${course.id}`).set(authHeader(user));
    expect(detail.body.data.rejectionReason).toBe('Add more lessons');

    const res = await api.post(`${t}/courses/${course.id}/submit`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDING_REVIEW');
    expect(res.body.data.rejectionReason).toBeNull();
  });

  it('returns 422 COURSE_INCOMPLETE with details.missing and changes nothing', async () => {
    const { user, course, lessons } = await ready('DRAFT');
    await prisma.course.update({
      where: { id: course.id },
      data: { description: 'too short', thumbnailUrl: '', priceCents: 50, originalPriceCents: 40 },
    });
    await prisma.lesson.update({
      where: { id: lessons[0]!.id },
      data: { videoUrl: 'https://vimeo.com/1', durationSec: 7 * 3600 },
    });
    await prisma.lesson.updateMany({ data: { isPreview: false } });

    const res = await api.post(`${t}/courses/${course.id}/submit`).set(authHeader(user));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COURSE_INCOMPLETE');
    const codes = res.body.error.details.missing.map((m: { code: string }) => m.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'DESCRIPTION_TOO_SHORT',
        'NO_THUMBNAIL',
        'LESSON_VIDEO_INVALID',
        'LESSON_DURATION_INVALID',
        'PREVIEW_COUNT',
        'PRICE_INVALID',
        'ORIGINAL_PRICE_INVALID',
      ]),
    );
    expect(res.body.error.details.missing).toContainEqual({
      code: 'LESSON_VIDEO_INVALID',
      lessonId: lessons[0]!.id,
      lessonNumber: 1,
    });
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.status).toBe('DRAFT');
    expect(await history(course.id)).toEqual([]);
  });

  it('reports an empty draft as missing section, lessons, thumbnail and description', async () => {
    const { user, profile, category } = await setupTeacher();
    const empty = await prisma.course.create({
      data: {
        title: 'Brand new course',
        description: '',
        thumbnailUrl: '',
        priceCents: 0,
        categoryId: category.id,
        teacherId: profile.id,
      },
    });
    const res = await api.post(`${t}/courses/${empty.id}/submit`).set(authHeader(user));
    expect(res.status).toBe(422);
    const codes = res.body.error.details.missing.map((m: { code: string }) => m.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'DESCRIPTION_TOO_SHORT',
        'NO_THUMBNAIL',
        'NO_SECTION',
        'NOT_ENOUGH_LESSONS',
      ]),
    );
  });

  it.each(['PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'] as const)(
    'returns 422 INVALID_COURSE_STATE for a %s course',
    async (status) => {
      const { user, course } = await ready(status);
      const res = await api.post(`${t}/courses/${course.id}/submit`).set(authHeader(user));
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
    },
  );
});

describe('withdraw / archive / restore (BR-19)', () => {
  it('withdraws a PENDING_REVIEW course back to DRAFT', async () => {
    const { user, course } = await ready('PENDING_REVIEW');
    const res = await api.post(`${t}/courses/${course.id}/withdraw`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DRAFT');
    expect(await history(course.id)).toEqual(['WITHDRAWN/COURSE']);
  });

  it('archives a PUBLISHED course and restores it, newest history first', async () => {
    const { user, course } = await ready('PUBLISHED');
    const archived = await api.post(`${t}/courses/${course.id}/archive`).set(authHeader(user));
    expect(archived.status).toBe(200);
    expect(archived.body.data.status).toBe('ARCHIVED');

    const restored = await api.post(`${t}/courses/${course.id}/restore`).set(authHeader(user));
    expect(restored.status).toBe(200);
    expect(restored.body.data.status).toBe('PUBLISHED');
    expect(restored.body.data.moderation.map((m: { action: string }) => m.action)).toEqual([
      'RESTORED',
      'ARCHIVED',
    ]);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.publishedAt).not.toBeNull();
  });

  it('hides an archived course from the public catalogue and brings it back on restore', async () => {
    const { user, course } = await ready('PUBLISHED');
    await api.post(`${t}/courses/${course.id}/archive`).set(authHeader(user));
    expect((await api.get(`${API}/courses/${course.id}`)).status).toBe(404);
    await api.post(`${t}/courses/${course.id}/restore`).set(authHeader(user));
    expect((await api.get(`${API}/courses/${course.id}`)).status).toBe(200);
  });

  it.each([
    ['withdraw', 'DRAFT'],
    ['withdraw', 'PUBLISHED'],
    ['archive', 'DRAFT'],
    ['archive', 'PENDING_REVIEW'],
    ['archive', 'ARCHIVED'],
    ['restore', 'PUBLISHED'],
    ['restore', 'DRAFT'],
  ] as const)('returns 422 INVALID_COURSE_STATE for %s on a %s course', async (action, status) => {
    const { user, course } = await ready(status);
    const res = await api.post(`${t}/courses/${course.id}/${action}`).set(authHeader(user));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
    expect(await history(course.id)).toEqual([]);
  });
});

describe('course revisions (BR-21)', () => {
  it('creates an OPEN revision copied from the published course', async () => {
    const { user, course, sections, lessons, category } = await ready('PUBLISHED');
    const tag = await createTag();
    await prisma.courseTag.create({ data: { courseId: course.id, tagId: tag.id } });

    const res = await api.post(`${t}/courses/${course.id}/revision`).set(authHeader(user));

    expect(res.status).toBe(201);
    const revision = res.body.data.revision;
    expect(revision).toMatchObject({
      status: 'OPEN',
      submittedAt: null,
      missing: [],
      rejectionReason: null,
    });
    expect(revision.payload).toMatchObject({
      title: course.title,
      priceCents: 5900,
      originalPriceCents: null,
      categoryId: category.id,
      tagIds: [tag.id],
    });
    expect(revision.payload.sections.map((s: { id: string }) => s.id)).toEqual(
      sections.map((s) => s.id),
    );
    expect(revision.payload.sections[0].lessons[0]).toMatchObject({
      id: lessons[0]!.id,
      videoUrl: YT,
      durationSec: 100,
      isPreview: true,
      content: 'Notes 1',
    });
    expect(res.body.data.revisionStatus).toBe('OPEN');
  });

  it('returns 409 REVISION_EXISTS for a second revision and 422 for a non-published course', async () => {
    const { user, course } = await ready('PUBLISHED');
    await api.post(`${t}/courses/${course.id}/revision`).set(authHeader(user));
    const again = await api.post(`${t}/courses/${course.id}/revision`).set(authHeader(user));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('REVISION_EXISTS');

    for (const status of ['DRAFT', 'PENDING_REVIEW', 'ARCHIVED'] as const) {
      const other = await createReadyCourse(
        (await prisma.teacherProfile.findFirstOrThrow({ where: { userId: user.id } })).id,
        (await prisma.category.findFirstOrThrow()).id,
        { status },
      );
      const res = await api.post(`${t}/courses/${other.course.id}/revision`).set(authHeader(user));
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_COURSE_STATE');
    }
  });

  async function openRevision(status: 'PUBLISHED' = 'PUBLISHED') {
    const ctx = await ready(status);
    const res = await api.post(`${t}/courses/${ctx.course.id}/revision`).set(authHeader(ctx.user));
    expect(res.status).toBe(201);
    return { ...ctx, payload: res.body.data.revision.payload };
  }

  it('PUT saves the payload, normalizes links, keeps the status and leaves the live course alone', async () => {
    const { user, course, payload, lessons } = await openRevision();
    const edited = {
      ...payload,
      title: 'A brand new title',
      priceCents: 9900,
      originalPriceCents: 19900,
      sections: [
        ...payload.sections.slice(0, 1),
        {
          title: 'Brand new section',
          lessons: [
            {
              title: 'Fresh lesson',
              videoUrl: 'https://youtu.be/dQw4w9WgXcQ?t=5',
              durationSec: 90,
              isPreview: false,
            },
          ],
        },
      ],
    };

    const res = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send(edited);

    expect(res.status).toBe(200);
    const revision = res.body.data.revision;
    expect(revision.status).toBe('OPEN');
    expect(revision.payload.title).toBe('A brand new title');
    expect(revision.payload.sections[1]).toMatchObject({
      title: 'Brand new section',
      lessons: [{ title: 'Fresh lesson', videoUrl: `${YT}&start=5`, content: '' }],
    });
    expect(revision.payload.sections[1].id).toBeUndefined();
    // checklist của bản sửa đổi: 2 bài của chương 1 + 1 bài mới = 3 bài, 2 xem thử
    expect(revision.missing).toEqual([]);
    const live = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(live.title).toBe(course.title);
    expect(live.priceCents).toBe(5900);
    expect(await prisma.lesson.count({ where: { section: { courseId: course.id } } })).toBe(
      lessons.length,
    );
  });

  it('PUT reports checklist items of the revision in revision.missing', async () => {
    const { user, course, payload } = await openRevision();
    const res = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send({ ...payload, sections: payload.sections.slice(0, 1), originalPriceCents: 100 });
    expect(res.status).toBe(200);
    const codes = res.body.data.revision.missing.map((m: { code: string }) => m.code);
    expect(codes).toEqual(expect.arrayContaining(['NOT_ENOUGH_LESSONS', 'ORIGINAL_PRICE_INVALID']));
    expect(res.body.data.missing).toEqual([]); // khóa đang xuất bản không đổi
  });

  it.each([
    [
      'an unknown section id',
      (p: Payload) => ({ ...p, sections: [{ ...p.sections[0], id: 'nope' }] }),
    ],
    [
      'an unknown lesson id',
      (p: Payload) => ({
        ...p,
        sections: [{ ...p.sections[0], lessons: [{ ...p.sections[0].lessons[0], id: 'nope' }] }],
      }),
    ],
    [
      'a duplicated section id',
      (p: Payload) => ({ ...p, sections: [p.sections[0], p.sections[0]] }),
    ],
    [
      'a non-YouTube link',
      (p: Payload) => ({
        ...p,
        sections: [
          {
            ...p.sections[0],
            lessons: [{ ...p.sections[0].lessons[0], videoUrl: 'https://vimeo.com/1' }],
          },
        ],
      }),
    ],
    ['more than 5 tags', (p: Payload) => ({ ...p, tagIds: ['a', 'b', 'c', 'd', 'e', 'f'] })],
    ['a missing title', (p: Payload) => ({ ...p, title: '' })],
  ])('PUT returns 400 for %s', async (_label, mutate) => {
    const { user, course, payload } = await openRevision();
    const res = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send(mutate(payload));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT accepts lesson ids moved to another section but refuses ids of another course', async () => {
    const { user, profile, category, course, payload, lessons } = await openRevision();
    const foreign = await createReadyCourse(profile.id, category.id, { status: 'PUBLISHED' });
    const moved = {
      ...payload,
      sections: [
        { ...payload.sections[0], lessons: [payload.sections[0].lessons[0]] },
        {
          ...payload.sections[1],
          lessons: [...payload.sections[1].lessons, payload.sections[0].lessons[1]],
        },
      ],
    };
    const ok = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send(moved);
    expect(ok.status).toBe(200);

    const stolen = {
      ...payload,
      sections: [
        {
          ...payload.sections[0],
          lessons: [{ ...payload.sections[0].lessons[0], id: foreign.lessons[0]!.id }],
        },
      ],
    };
    const bad = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send(stolen);
    expect(bad.status).toBe(400);
    void lessons;
  });

  it('PUT returns 404 REVISION_NOT_FOUND when no revision is open', async () => {
    const { user, course } = await ready('PUBLISHED');
    const res = await api.put(`${t}/courses/${course.id}/revision`).set(authHeader(user)).send({
      title: 'Some title',
      priceCents: 0,
      originalPriceCents: null,
      categoryId: course.categoryId,
      tagIds: [],
      sections: [],
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REVISION_NOT_FOUND');
  });

  it('submits a valid revision (PENDING_REVIEW) and then refuses edits while it waits', async () => {
    const { user, course, payload } = await openRevision();
    await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send({ ...payload, title: 'Revised title' });

    const res = await api.post(`${t}/courses/${course.id}/revision/submit`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(res.body.data.revisionStatus).toBe('PENDING_REVIEW');
    expect(res.body.data.revision).toMatchObject({ status: 'PENDING_REVIEW' });
    expect(res.body.data.revision.submittedAt).not.toBeNull();
    expect(await history(course.id)).toEqual(['SUBMITTED/REVISION']);

    const put = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send(payload);
    expect(put.status).toBe(422);
    expect(put.body.error.code).toBe('INVALID_COURSE_STATE');
    const again = await api.post(`${t}/courses/${course.id}/revision/submit`).set(authHeader(user));
    expect(again.status).toBe(422);
    expect(again.body.error.code).toBe('INVALID_COURSE_STATE');
  });

  it('refuses to submit an incomplete revision with 422 COURSE_INCOMPLETE', async () => {
    const { user, course, payload } = await openRevision();
    await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send({ ...payload, sections: payload.sections.slice(0, 1) });
    const res = await api.post(`${t}/courses/${course.id}/revision/submit`).set(authHeader(user));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COURSE_INCOMPLETE');
    expect(res.body.error.details.missing).toContainEqual({ code: 'NOT_ENOUGH_LESSONS' });
    const stored = await prisma.courseRevision.findUniqueOrThrow({
      where: { courseId: course.id },
    });
    expect(stored.status).toBe('OPEN');
  });

  it('checks the minor fields of the live course when submitting a revision', async () => {
    const { user, course } = await openRevision();
    await api
      .patch(`${t}/courses/${course.id}`)
      .set(authHeader(user))
      .send({ description: 'short' });
    const res = await api.post(`${t}/courses/${course.id}/revision/submit`).set(authHeader(user));
    expect(res.status).toBe(422);
    expect(res.body.error.details.missing).toContainEqual({ code: 'DESCRIPTION_TOO_SHORT' });
  });

  it('shows the rejection reason of a REJECTED revision and lets the teacher edit and resubmit it', async () => {
    const { user, course, payload } = await openRevision();
    await prisma.courseRevision.update({
      where: { courseId: course.id },
      data: { status: 'REJECTED' },
    });
    await prisma.courseModeration.create({
      data: {
        courseId: course.id,
        actorId: user.id,
        action: 'REJECTED',
        target: 'REVISION',
        reason: 'Price is too high',
      },
    });

    const detail = await api.get(`${t}/courses/${course.id}`).set(authHeader(user));
    expect(detail.body.data.revision).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Price is too high',
    });
    expect(detail.body.data.rejectionReason).toBeNull();

    const put = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(user))
      .send({ ...payload, priceCents: 4900 });
    expect(put.status).toBe(200);
    expect(put.body.data.revision.status).toBe('REJECTED');
    const submit = await api
      .post(`${t}/courses/${course.id}/revision/submit`)
      .set(authHeader(user));
    expect(submit.status).toBe(200);
    expect(submit.body.data.revision.status).toBe('PENDING_REVIEW');
  });

  it('DELETE removes an open revision (204) and records WITHDRAWN only when it was pending', async () => {
    const { user, course } = await openRevision();
    const open = await api.delete(`${t}/courses/${course.id}/revision`).set(authHeader(user));
    expect(open.status).toBe(204);
    expect(await prisma.courseRevision.count()).toBe(0);
    expect(await history(course.id)).toEqual([]);

    await api.post(`${t}/courses/${course.id}/revision`).set(authHeader(user));
    await api.post(`${t}/courses/${course.id}/revision/submit`).set(authHeader(user));
    const pending = await api.delete(`${t}/courses/${course.id}/revision`).set(authHeader(user));
    expect(pending.status).toBe(204);
    expect(await history(course.id)).toEqual(['SUBMITTED/REVISION', 'WITHDRAWN/REVISION']);

    const none = await api.delete(`${t}/courses/${course.id}/revision`).set(authHeader(user));
    expect(none.status).toBe(404);
    expect(none.body.error.code).toBe('REVISION_NOT_FOUND');
  });

  it('answers 404 REVISION_NOT_FOUND to submit without a revision and 403/404 to outsiders', async () => {
    const { user, course } = await ready('PUBLISHED');
    const none = await api.post(`${t}/courses/${course.id}/revision/submit`).set(authHeader(user));
    expect(none.status).toBe(404);
    expect(none.body.error.code).toBe('REVISION_NOT_FOUND');

    const student = await createUser();
    const asStudent = await api.post(`${t}/courses/${course.id}/revision`).set(authHeader(student));
    expect(asStudent.status).toBe(403);
    const { user: other } = await setupTeacher();
    const asOther = await api
      .put(`${t}/courses/${course.id}/revision`)
      .set(authHeader(other))
      .send({});
    expect(asOther.status).toBe(400); // body validated first
    const asOtherSubmit = await api
      .post(`${t}/courses/${course.id}/revision/submit`)
      .set(authHeader(other));
    expect(asOtherSubmit.status).toBe(404);
    expect(asOtherSubmit.body.error.code).toBe('COURSE_NOT_FOUND');
  });
});

type Payload = {
  title: string;
  sections: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      videoUrl: string;
      durationSec: number;
      isPreview: boolean;
    }[];
  }[];
  [key: string]: unknown;
};

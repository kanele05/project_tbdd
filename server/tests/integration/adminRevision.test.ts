/**
 * Duyệt / từ chối BẢN SỬA ĐỔI của khóa đã xuất bản (BR-21): diff trong chi tiết và việc áp dụng trong 1 transaction.
 */
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createCategory,
  createEnrollment,
  createFollow,
  createLessonProgress,
  createTag,
  createUser,
} from '../helpers/factories';
import { installMailbox, mailbox, uninstallMailbox } from '../helpers/mailbox';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';
import { payloadOf, saveRevision, seedSubmittableCourse, youtubeUrl } from './adminFixtures';

const api = createTestApi();

beforeAll(() => installMailbox());
afterAll(() => uninstallMailbox());
beforeEach(async () => {
  await resetDb();
  mailbox.clear();
});

/**
 * Khóa đã xuất bản: S1 [L1, L2], S2 [L3, L4]; học viên A xong L1+L2 (50 %), B xong L4 (25 %).
 * Bản sửa đổi: S2 lên đầu [L4 sửa nội dung, bài mới N1]; S1 [L1 đổi tên, L3 chuyển sang]; chương mới S3 [N2];
 * bài L2 bị bỏ. Tổng 5 bài.
 */
async function seedScenario() {
  const root = await createUser({ role: 'ADMIN' });
  const seeded = await seedSubmittableCourse({
    status: 'PUBLISHED',
    publishedAt: new Date('2026-09-01'),
  });
  const [s1, s2] = seeded.sections as [
    (typeof seeded.sections)[number],
    (typeof seeded.sections)[number],
  ];
  const [l1, l2] = s1.lessons as [(typeof s1.lessons)[number], (typeof s1.lessons)[number]];
  const [l3, l4] = s2.lessons as [(typeof s2.lessons)[number], (typeof s2.lessons)[number]];

  const studentA = await createUser();
  const studentB = await createUser();
  await createEnrollment(studentA.id, seeded.course.id, { progressPercent: 50 });
  await createEnrollment(studentB.id, seeded.course.id, { progressPercent: 25 });
  await createLessonProgress(studentA.id, l1.id, { isCompleted: true });
  await createLessonProgress(studentA.id, l2.id, { isCompleted: true });
  await createLessonProgress(studentB.id, l4.id, { isCompleted: true });
  await prisma.aiContent.createMany({
    data: [
      { kind: 'COURSE_SUMMARY', refId: seeded.course.id, lang: 'en', content: {}, model: 'mock' },
      { kind: 'LESSON_SUMMARY', refId: l2.id, lang: 'en', content: {}, model: 'mock' },
      { kind: 'QUIZ', refId: l2.id, lang: 'en', content: {}, model: 'mock' },
      { kind: 'LESSON_SUMMARY', refId: l1.id, lang: 'en', content: {}, model: 'mock' },
    ],
  });

  const newCategory = await createCategory();
  const tag = await createTag({ name: 'Revision tag' });
  const base = await payloadOf(seeded.course.id);
  const lessonOf = (id: string) => {
    const found = base.sections.flatMap((s) => s.lessons).find((l) => l.id === id);
    if (!found) throw new Error('lesson missing');
    return found;
  };
  const payload = {
    ...base,
    title: 'Revised course title',
    priceCents: 7900,
    originalPriceCents: 9900,
    categoryId: newCategory.id,
    tagIds: [tag.id],
    sections: [
      {
        id: s2.id,
        title: s2.title,
        lessons: [
          { ...lessonOf(l4.id), content: 'Rewritten notes' },
          {
            title: 'Brand new lesson',
            videoUrl: youtubeUrl(50),
            durationSec: 300,
            isPreview: false,
            content: '',
          },
        ],
      },
      {
        id: s1.id,
        title: 'Renamed section',
        lessons: [{ ...lessonOf(l1.id), title: 'Lesson 1 renamed' }, lessonOf(l3.id)],
      },
      {
        title: 'Section 3',
        lessons: [
          {
            title: 'Last lesson',
            videoUrl: youtubeUrl(51),
            durationSec: 200,
            isPreview: false,
            content: 'x',
          },
        ],
      },
    ],
  };
  await saveRevision(seeded.course.id, payload);
  return { root, seeded, s1, s2, l1, l2, l3, l4, studentA, studentB, newCategory, tag, payload };
}

describe('GET /admin/courses/:id for a course with a pending revision', () => {
  it('returns the revision and a field-level and curriculum diff', async () => {
    const { root, seeded, s1, l1, l2, l4, newCategory, tag } = await seedScenario();

    const res = await api.get(`${API}/admin/courses/${seeded.course.id}`).set(authHeader(root));

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toMatchObject({
      status: 'PUBLISHED',
      reviewTarget: 'REVISION',
      revision: { status: 'PENDING_REVIEW', missing: [], rejectionReason: null },
    });
    expect(data.revision.payload.title).toBe('Revised course title');
    const diff = data.diff;
    expect(diff.hasChanges).toBe(true);
    expect(diff.title).toEqual({ before: seeded.course.title, after: 'Revised course title' });
    expect(diff.priceCents).toEqual({ before: 5900, after: 7900 });
    expect(diff.originalPriceCents).toEqual({ before: null, after: 9900 });
    expect(diff.category.before.id).toBe(seeded.category.id);
    expect(diff.category.after).toEqual({ id: newCategory.id, name: newCategory.name });
    expect(diff.tags.before).toEqual([]);
    expect(diff.tags.after).toEqual([{ id: tag.id, name: 'Revision tag', isHot: false }]);

    const c = diff.curriculum;
    expect(c.sectionsAdded).toEqual(['Section 3']);
    expect(c.sectionsRemoved).toEqual([]);
    expect(c.sectionsRenamed).toEqual([{ before: s1.title, after: 'Renamed section' }]);
    expect(c.isReordered).toBe(true);
    expect(c.lessonsAdded.map((l: { title: string }) => l.title).sort()).toEqual([
      'Brand new lesson',
      'Last lesson',
    ]);
    expect(c.lessonsAdded[0].id).toBeNull();
    expect(c.lessonsRemoved).toEqual([
      { id: l2.id, title: l2.title, sectionTitle: s1.title, durationSec: 600, progressCount: 1 },
    ]);
    const changed = Object.fromEntries(
      c.lessonsChanged.map((l: { id: string; changedFields: string[] }) => [l.id, l.changedFields]),
    );
    expect(changed).toEqual({ [l1.id]: ['title'], [l4.id]: ['content'] });
  });

  it('reports hasChanges false for an identical revision', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { course } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    await saveRevision(course.id, await payloadOf(course.id));
    const res = await api.get(`${API}/admin/courses/${course.id}`).set(authHeader(root));
    expect(res.body.data.diff).toMatchObject({
      hasChanges: false,
      title: null,
      priceCents: null,
      category: null,
      tags: null,
      curriculum: { isReordered: false, lessonsAdded: [], lessonsRemoved: [], lessonsChanged: [] },
    });
  });
});

describe('POST /admin/courses/:id/approve (revision)', () => {
  it('applies every change in one go and keeps the learners progress where it still makes sense', async () => {
    const { root, seeded, s1, s2, l1, l2, l3, l4, studentA, studentB, newCategory, tag, payload } =
      await seedScenario();
    const teacherFan = await createUser();
    await createFollow(teacherFan.id, seeded.teacher.profile.id);
    const publishedAt = (await prisma.course.findUniqueOrThrow({ where: { id: seeded.course.id } }))
      .publishedAt;

    const res = await api
      .post(`${API}/admin/courses/${seeded.course.id}/approve`)
      .set(authHeader(root));

    expect(res.status).toBe(200);
    const course = await prisma.course.findUniqueOrThrow({
      where: { id: seeded.course.id },
      include: {
        tags: true,
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    expect(course).toMatchObject({
      status: 'PUBLISHED',
      title: 'Revised course title',
      priceCents: 7900,
      originalPriceCents: 9900,
      categoryId: newCategory.id,
      lessonCount: 5,
      totalDurationSec: 600 + 300 + 600 + 600 + 200,
    });
    expect(course.publishedAt?.toISOString()).toBe(publishedAt?.toISOString());
    expect(course.tags.map((t) => t.tagId)).toEqual([tag.id]);

    expect(course.sections.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(course.sections.map((s) => s.title)).toEqual([s2.title, 'Renamed section', 'Section 3']);
    const [first, second, third] = course.sections;
    expect(first?.id).toBe(s2.id);
    expect(second?.id).toBe(s1.id);
    expect(first?.lessons.map((l) => [l.id, l.order])).toEqual([
      [l4.id, 1],
      [expect.any(String), 2],
    ]);
    expect(first?.lessons[0]?.content).toBe('Rewritten notes');
    expect(first?.lessons[1]?.title).toBe('Brand new lesson');
    expect(second?.lessons.map((l) => [l.id, l.order, l.title])).toEqual([
      [l1.id, 1, 'Lesson 1 renamed'],
      [l3.id, 2, 'Lesson 3'],
    ]);
    expect(third?.lessons.map((l) => l.title)).toEqual(['Last lesson']);
    expect(await prisma.lesson.findUnique({ where: { id: l2.id } })).toBeNull();

    // Tiến độ: A mất L2 (chỉ còn L1), B giữ L4; tổng 5 bài -> 20 % mỗi người.
    expect(await prisma.lessonProgress.count({ where: { lessonId: l2.id } })).toBe(0);
    const enrollments = await prisma.enrollment.findMany({ orderBy: { enrolledAt: 'asc' } });
    expect(enrollments.map((e) => [e.userId, e.progressPercent])).toEqual([
      [studentA.id, 20],
      [studentB.id, 20],
    ]);

    // Dọn cache AI: tóm tắt khóa + tóm tắt/quiz của bài đã xóa; bài còn lại giữ nguyên.
    const ai = await prisma.aiContent.findMany({ select: { kind: true, refId: true } });
    expect(ai).toEqual([{ kind: 'LESSON_SUMMARY', refId: l1.id }]);

    expect(await prisma.courseRevision.count({ where: { courseId: course.id } })).toBe(0);
    expect(res.body.data).toMatchObject({
      reviewTarget: null,
      revision: null,
      diff: null,
      title: 'Revised course title',
      lessonCount: 5,
    });
    expect(res.body.data.moderation[0]).toMatchObject({ action: 'APPROVED', target: 'REVISION' });

    // Chỉ báo cho giảng viên; không phát NEW_COURSE vì đây không phải lần xuất bản đầu.
    const notes = await prisma.notification.findMany({});
    expect(notes.map((n) => [n.userId, n.type])).toEqual([
      [seeded.teacher.user.id, 'COURSE_APPROVED'],
    ]);
    expect(mailbox.lastTo(seeded.teacher.user.email).text).toContain('Revised course title');
    expect(payload.sections).toHaveLength(3);
  });

  it('sets the progress of a learner who already completed everything to 100 % and stamps completedAt', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { course, sections } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
      lessonsPerSection: 3,
    });
    const learner = await createUser();
    await createEnrollment(learner.id, course.id, { progressPercent: 50 });
    const [s1] = sections as [(typeof sections)[number]];
    for (const lesson of s1.lessons) {
      await createLessonProgress(learner.id, lesson.id, { isCompleted: true });
    }
    const payload = await payloadOf(course.id);
    payload.sections = payload.sections.filter((s) => s.id === s1.id);
    await saveRevision(course.id, payload);

    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));

    expect(res.status).toBe(200);
    const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { userId: learner.id } });
    expect(enrollment.progressPercent).toBe(100);
    expect(enrollment.completedAt).not.toBeNull();
  });

  it('returns 422 COURSE_INCOMPLETE and changes nothing when the revision fails the checklist', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { course, sections } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    const payload = await payloadOf(course.id);
    payload.priceCents = 50; // 1..98 cent không hợp lệ
    payload.sections.splice(1);
    payload.sections[0]!.lessons = payload.sections[0]!.lessons.slice(0, 1);
    await saveRevision(course.id, payload);

    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COURSE_INCOMPLETE');
    const codes = res.body.error.details.missing.map((m: { code: string }) => m.code);
    expect(codes).toEqual(expect.arrayContaining(['NOT_ENOUGH_LESSONS', 'PRICE_INVALID']));
    expect(await prisma.lesson.count({ where: { section: { courseId: course.id } } })).toBe(4);
    expect(await prisma.courseRevision.count({ where: { courseId: course.id } })).toBe(1);
    expect(sections).toHaveLength(2);
  });

  it('rolls everything back and answers 422 when the revision category no longer exists', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { course } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    const doomed = await createCategory();
    const payload = await payloadOf(course.id);
    payload.categoryId = doomed.id;
    payload.title = 'Should not be applied';
    await saveRevision(course.id, payload);
    await prisma.category.delete({ where: { id: doomed.id } });

    const res = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COURSE_INCOMPLETE');
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.title).not.toBe('Should not be applied');
    expect(await prisma.courseRevision.count({ where: { courseId: course.id } })).toBe(1);
    expect(await prisma.courseModeration.count()).toBe(0);
    expect(await prisma.notification.count()).toBe(0);
  });
});

describe('POST /admin/courses/:id/reject (revision)', () => {
  it('rejects only the revision: the course stays published and the teacher sees the reason', async () => {
    const root = await createUser({ role: 'ADMIN' });
    const { course, teacher } = await seedSubmittableCourse({
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
    const payload = await payloadOf(course.id);
    payload.title = 'Edited title for review';
    await saveRevision(course.id, payload);
    const reason = 'The new title is misleading.';

    const res = await api
      .post(`${API}/admin/courses/${course.id}/reject`)
      .set(authHeader(root))
      .send({ reason });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'PUBLISHED',
      title: course.title,
      reviewTarget: null,
      revisionStatus: 'REJECTED',
      revision: { status: 'REJECTED', rejectionReason: reason },
    });
    expect(res.body.data.moderation[0]).toMatchObject({
      action: 'REJECTED',
      target: 'REVISION',
      reason,
    });
    const note = await prisma.notification.findFirstOrThrow({ where: { userId: teacher.user.id } });
    expect(note.type).toBe('COURSE_REJECTED');
    expect(mailbox.lastTo(teacher.user.email).text).toContain(reason);
    // Đã bị từ chối thì không còn chờ duyệt: duyệt / từ chối lại -> 422.
    const again = await api.post(`${API}/admin/courses/${course.id}/approve`).set(authHeader(root));
    expect(again.status).toBe(422);
    expect(again.body.error.code).toBe('INVALID_COURSE_STATE');
  });
});

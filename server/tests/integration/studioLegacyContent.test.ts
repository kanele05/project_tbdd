/**
 * Khóa cũ (dữ liệu seed) trong Studio: ảnh bìa ngoài và video MP4 mẫu không chặn việc sửa khóa đã xuất bản.
 * - PATCH gửi lại đúng ảnh bìa đang lưu (kể cả url ngoài) -> hợp lệ; đổi sang url lạ -> 400.
 * - Bản sửa đổi giữ nguyên video đang lưu (không phải YouTube) -> vẫn gửi duyệt được;
 *   bài đổi sang link không phải YouTube -> 400 khi lưu bản sửa đổi.
 */
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';
import { createReadyCourse, setupTeacher } from './studioFixtures';

const api = createTestApi();
const t = `${API}/teacher`;
const LEGACY_COVER = 'https://picsum.photos/seed/legacy/800/450';
const LEGACY_VIDEO = '/static/videos/sample-1.mp4';

beforeEach(resetDb);

async function legacyCourse() {
  const base = await setupTeacher();
  const ready = await createReadyCourse(base.profile.id, base.category.id, { status: 'PUBLISHED' });
  await prisma.course.update({
    where: { id: ready.course.id },
    data: { thumbnailUrl: LEGACY_COVER },
  });
  await prisma.lesson.updateMany({
    where: { id: { in: ready.lessons.slice(2).map((lesson) => lesson.id) } },
    data: { videoUrl: LEGACY_VIDEO },
  });
  return { ...base, ...ready };
}

describe('Studio with legacy seed content', () => {
  it('accepts the stored external cover when saving minor fields of a published course', async () => {
    const { user, course } = await legacyCourse();
    const url = `${t}/courses/${course.id}`;

    const res = await api
      .patch(url)
      .set(authHeader(user))
      .send({ description: 'An updated description. '.repeat(6), thumbnailUrl: LEGACY_COVER });
    expect(res.status).toBe(200);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.thumbnailUrl).toBe(LEGACY_COVER);
    expect(stored.description).toContain('An updated description.');

    const foreign = await api
      .patch(url)
      .set(authHeader(user))
      .send({ thumbnailUrl: 'https://evil.test/other.png' });
    expect(foreign.status).toBe(400);
    expect(foreign.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lets a revision keep stored non-YouTube videos but rejects a changed non-YouTube link', async () => {
    const { user, course, lessons } = await legacyCourse();
    const created = await api.post(`${t}/courses/${course.id}/revision`).set(authHeader(user));
    expect(created.status).toBe(201);
    expect(created.body.data.revision.missing).toEqual([]);

    const submitted = await api
      .post(`${t}/courses/${course.id}/revision/submit`)
      .set(authHeader(user));
    expect(submitted.status).toBe(200);

    await prisma.courseRevision.update({
      where: { courseId: course.id },
      data: { status: 'OPEN', submittedAt: null },
    });
    const payload = created.body.data.revision.payload;
    const url = `${t}/courses/${course.id}/revision`;

    // Lưu lại nguyên payload (mobile gửi cả form) -> video MP4 đang lưu vẫn hợp lệ.
    const resaved = await api.put(url).set(authHeader(user)).send(payload);
    expect(resaved.status).toBe(200);
    expect(resaved.body.data.revision.missing).toEqual([]);

    // Đổi một bài sang link không phải YouTube -> 400 ngay khi lưu.
    const lastLessonId = lessons[3]?.id;
    const changed = {
      ...payload,
      sections: payload.sections.map(
        (section: { lessons: Array<{ id?: string; videoUrl: string }> }) => ({
          ...section,
          lessons: section.lessons.map((lesson) =>
            lesson.id === lastLessonId
              ? { ...lesson, videoUrl: '/static/videos/other.mp4' }
              : lesson,
          ),
        }),
      ),
    };
    const rejected = await api.put(url).set(authHeader(user)).send(changed);
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.details[0].field).toMatch(/^sections\.\d+\.lessons\.\d+\.videoUrl$/);
  });
});

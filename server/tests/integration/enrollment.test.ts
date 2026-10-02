import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createCourse, createEnrollment, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

async function enrollAt(
  userId: string,
  title: string,
  progressPercent: number,
  lastAccessedAt: string,
) {
  const course = await createCourse({ title, totalDurationSec: 3600 });
  await createEnrollment(userId, course.id, { progressPercent });
  await prisma.enrollment.update({
    where: { userId_courseId: { userId, courseId: course.id } },
    data: { lastAccessedAt: new Date(lastAccessedAt) },
  });
  return course;
}

type Item = { course: { title: string }; progressPercent: number };
const titles = (items: Item[]) => items.map((item) => item.course.title);

describe('GET /me/courses', () => {
  it('returns every enrolled course, most recently accessed first (BR-05)', async () => {
    const user = await createUser();
    await enrollAt(user.id, 'Old', 30, '2026-09-01T00:00:00Z');
    await enrollAt(user.id, 'Newest', 100, '2026-09-30T00:00:00Z');
    await enrollAt(user.id, 'Middle', 0, '2026-09-15T00:00:00Z');

    const res = await api.get(`${API}/me/courses`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(titles(res.body.data)).toEqual(['Newest', 'Middle', 'Old']);
  });

  it('returns the MyCourseItem shape', async () => {
    const user = await createUser();
    const course = await enrollAt(user.id, 'Shape', 45, '2026-09-20T10:00:00Z');

    const res = await api.get(`${API}/me/courses?status=all`).set(authHeader(user));

    expect(res.body.data).toEqual([
      {
        course: { id: course.id, title: 'Shape', thumbnailUrl: course.thumbnailUrl },
        totalDurationSec: 3600,
        progressPercent: 45,
        lastLessonId: null,
        lastAccessedAt: '2026-09-20T10:00:00.000Z',
      },
    ]);
  });

  it('status=ongoing keeps only courses below 100 %', async () => {
    const user = await createUser();
    await enrollAt(user.id, 'Started', 30, '2026-09-10T00:00:00Z');
    await enrollAt(user.id, 'Not started', 0, '2026-09-11T00:00:00Z');
    await enrollAt(user.id, 'Done', 100, '2026-09-12T00:00:00Z');

    const res = await api.get(`${API}/me/courses?status=ongoing`).set(authHeader(user));

    expect(titles(res.body.data)).toEqual(['Not started', 'Started']);
  });

  it('status=completed keeps only courses at 100 %', async () => {
    const user = await createUser();
    await enrollAt(user.id, 'Started', 99, '2026-09-10T00:00:00Z');
    await enrollAt(user.id, 'Done', 100, '2026-09-12T00:00:00Z');

    const res = await api.get(`${API}/me/courses?status=completed`).set(authHeader(user));

    expect(titles(res.body.data)).toEqual(['Done']);
  });

  it('only returns the enrollments of the caller', async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    await enrollAt(me.id, 'Mine', 10, '2026-09-10T00:00:00Z');
    await enrollAt(other.id, 'Theirs', 10, '2026-09-10T00:00:00Z');

    const res = await api.get(`${API}/me/courses`).set(authHeader(me));

    expect(titles(res.body.data)).toEqual(['Mine']);
  });

  it('returns an empty list when the user has no enrollment', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/me/courses`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it('returns 400 VALIDATION_ERROR for an unknown status', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/me/courses?status=archived`).set(authHeader(user));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without a token', async () => {
    const res = await api.get(`${API}/me/courses`);
    expect(res.status).toBe(401);
  });
});

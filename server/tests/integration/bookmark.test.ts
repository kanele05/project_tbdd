import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createBookmark, createCourse, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

describe('PUT /courses/:id/bookmark', () => {
  it('saves the course and returns 204', async () => {
    const user = await createUser();
    const course = await createCourse();

    const res = await api.put(`${API}/courses/${course.id}/bookmark`).set(authHeader(user));

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(await prisma.bookmark.count({ where: { userId: user.id } })).toBe(1);
  });

  it('is idempotent: saving twice keeps a single bookmark', async () => {
    const user = await createUser();
    const course = await createCourse();

    const first = await api.put(`${API}/courses/${course.id}/bookmark`).set(authHeader(user));
    const second = await api.put(`${API}/courses/${course.id}/bookmark`).set(authHeader(user));

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(await prisma.bookmark.count({ where: { userId: user.id, courseId: course.id } })).toBe(
      1,
    );
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown course', async () => {
    const user = await createUser();
    const res = await api.put(`${API}/courses/does-not-exist/bookmark`).set(authHeader(user));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it('returns 404 for an unpublished course', async () => {
    const user = await createUser();
    const course = await createCourse({ isPublished: false });
    const res = await api.put(`${API}/courses/${course.id}/bookmark`).set(authHeader(user));
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await api.put(`${API}/courses/${course.id}/bookmark`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('DELETE /courses/:id/bookmark', () => {
  it('removes the bookmark and returns 204', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createBookmark(user.id, course.id);

    const res = await api.delete(`${API}/courses/${course.id}/bookmark`).set(authHeader(user));

    expect(res.status).toBe(204);
    expect(await prisma.bookmark.count()).toBe(0);
  });

  it('is idempotent when the course was not saved', async () => {
    const user = await createUser();
    const course = await createCourse();
    const res = await api.delete(`${API}/courses/${course.id}/bookmark`).set(authHeader(user));
    expect(res.status).toBe(204);
  });

  it('only removes the bookmark of the caller', async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();
    await createBookmark(me.id, course.id);
    await createBookmark(other.id, course.id);

    await api.delete(`${API}/courses/${course.id}/bookmark`).set(authHeader(me));

    expect(await prisma.bookmark.findMany({ select: { userId: true } })).toEqual([
      { userId: other.id },
    ]);
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await api.delete(`${API}/courses/${course.id}/bookmark`);
    expect(res.status).toBe(401);
  });
});

describe('GET /me/bookmarks', () => {
  it('returns an empty page when nothing is saved', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/me/bookmarks`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it('lists the saved courses newest-saved first with isBookmarked = true', async () => {
    const user = await createUser();
    const [a, b, c] = [
      await createCourse({ title: 'Course A' }),
      await createCourse({ title: 'Course B' }),
      await createCourse({ title: 'Course C' }),
    ];
    const at = (minutes: number) => new Date(Date.UTC(2026, 9, 1, 0, minutes));
    await prisma.bookmark.createMany({
      data: [
        { userId: user.id, courseId: a.id, createdAt: at(1) },
        { userId: user.id, courseId: b.id, createdAt: at(3) },
        { userId: user.id, courseId: c.id, createdAt: at(2) },
      ],
    });

    const res = await api.get(`${API}/me/bookmarks`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data.map((course: { title: string }) => course.title)).toEqual([
      'Course B',
      'Course C',
      'Course A',
    ]);
    expect(res.body.data.every((course: { isBookmarked: boolean }) => course.isBookmarked)).toBe(
      true,
    );
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: b.id,
        priceCents: 5900,
        teacher: { id: b.teacherId, fullName: 'Test Teacher' },
        badge: null,
      }),
    );
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it('paginates and never shows bookmarks of other users', async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    const courses = [await createCourse(), await createCourse(), await createCourse()];
    for (const course of courses) await createBookmark(me.id, course.id);
    await createBookmark(other.id, (await createCourse()).id);

    const res = await api.get(`${API}/me/bookmarks?page=2&limit=2`).set(authHeader(me));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('hides unpublished courses', async () => {
    const user = await createUser();
    const hidden = await createCourse({ isPublished: false });
    await createBookmark(user.id, hidden.id);

    const res = await api.get(`${API}/me/bookmarks`).set(authHeader(user));

    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('rejects an invalid limit with 400 VALIDATION_ERROR', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/me/bookmarks?limit=500`).set(authHeader(user));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without a token', async () => {
    const res = await api.get(`${API}/me/bookmarks`);
    expect(res.status).toBe(401);
  });
});

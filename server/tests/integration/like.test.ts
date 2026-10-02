import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createCourse, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

describe('PUT /courses/:id/like', () => {
  it('likes the course and returns the new count', async () => {
    const user = await createUser();
    const course = await createCourse();

    const res = await api.put(`${API}/courses/${course.id}/like`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { likeCount: 1, isLiked: true } });
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.likeCount).toBe(1);
  });

  it('is idempotent: liking twice counts once', async () => {
    const user = await createUser();
    const course = await createCourse();

    await api.put(`${API}/courses/${course.id}/like`).set(authHeader(user));
    const second = await api.put(`${API}/courses/${course.id}/like`).set(authHeader(user));

    expect(second.body.data).toEqual({ likeCount: 1, isLiked: true });
    expect(await prisma.courseLike.count()).toBe(1);
  });

  it('keeps the counter exact when the same like arrives twice at the same time', async () => {
    const user = await createUser();
    const course = await createCourse();

    const results = await Promise.all([
      api.put(`${API}/courses/${course.id}/like`).set(authHeader(user)),
      api.put(`${API}/courses/${course.id}/like`).set(authHeader(user)),
    ]);

    expect(results.map((res) => res.status)).toEqual([200, 200]);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.likeCount).toBe(1);
    expect(await prisma.courseLike.count()).toBe(1);
  });

  it('counts likes of different users', async () => {
    const [a, b] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();

    await api.put(`${API}/courses/${course.id}/like`).set(authHeader(a));
    const res = await api.put(`${API}/courses/${course.id}/like`).set(authHeader(b));

    expect(res.body.data).toEqual({ likeCount: 2, isLiked: true });
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown course', async () => {
    const user = await createUser();
    const res = await api.put(`${API}/courses/nope/like`).set(authHeader(user));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await api.put(`${API}/courses/${course.id}/like`);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /courses/:id/like', () => {
  it('unlikes the course and decrements the count', async () => {
    const user = await createUser();
    const course = await createCourse();
    await api.put(`${API}/courses/${course.id}/like`).set(authHeader(user));

    const res = await api.delete(`${API}/courses/${course.id}/like`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { likeCount: 0, isLiked: false } });
    expect(await prisma.courseLike.count()).toBe(0);
  });

  it('is idempotent and never drops the count below the real number of likes', async () => {
    const [a, b] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();
    await api.put(`${API}/courses/${course.id}/like`).set(authHeader(a));

    const first = await api.delete(`${API}/courses/${course.id}/like`).set(authHeader(b));
    const second = await api.delete(`${API}/courses/${course.id}/like`).set(authHeader(b));

    expect(first.body.data).toEqual({ likeCount: 1, isLiked: false });
    expect(second.body.data).toEqual({ likeCount: 1, isLiked: false });
  });

  it('returns 404 for an unknown course', async () => {
    const user = await createUser();
    const res = await api.delete(`${API}/courses/nope/like`).set(authHeader(user));
    expect(res.status).toBe(404);
  });
});

describe('POST /courses/:id/share', () => {
  it('increments shareCount on every call', async () => {
    const user = await createUser();
    const course = await createCourse();

    const first = await api.post(`${API}/courses/${course.id}/share`).set(authHeader(user));
    const second = await api.post(`${API}/courses/${course.id}/share`).set(authHeader(user));

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ data: { shareCount: 1 } });
    expect(second.body).toEqual({ data: { shareCount: 2 } });
  });

  it('returns 404 for an unknown course and 401 without a token', async () => {
    const user = await createUser();
    const notFound = await api.post(`${API}/courses/nope/share`).set(authHeader(user));
    const anonymous = await api.post(`${API}/courses/nope/share`);
    expect(notFound.status).toBe(404);
    expect(anonymous.status).toBe(401);
  });
});

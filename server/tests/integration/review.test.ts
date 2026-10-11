import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createCourse, createEnrollment, createReview, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

const validBody = { rating: 5, content: 'Great course, I learned a lot from it.' };

describe('GET /courses/:id/reviews', () => {
  it('returns an empty list with a zeroed summary', async () => {
    const course = await createCourse();

    const res = await api.get(`${API}/courses/${course.id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        summary: { avg: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      },
    });
  });

  it('lists reviews newest first with the average, count and distribution', async () => {
    const course = await createCourse();
    const [a, b, c] = await Promise.all([createUser(), createUser(), createUser()]);
    await createReview(a.id, course.id, {
      rating: 5,
      content: 'Oldest review of the three.',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    await createReview(b.id, course.id, {
      rating: 4,
      content: 'Newest review of the three.',
      createdAt: new Date('2026-09-03T00:00:00Z'),
    });
    await createReview(c.id, course.id, {
      rating: 4,
      content: 'Middle review of the three.',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });

    const res = await api.get(`${API}/courses/${course.id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { content: string }) => r.content)).toEqual([
      'Newest review of the three.',
      'Middle review of the three.',
      'Oldest review of the three.',
    ]);
    expect(res.body.data[0]).toEqual({
      id: expect.any(String),
      rating: 4,
      content: 'Newest review of the three.',
      createdAt: '2026-09-03T00:00:00.000Z',
      user: { id: b.id, fullName: 'Test User', avatarUrl: null },
      teacherReply: null,
      teacherRepliedAt: null,
    });
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
      summary: { avg: 4.3, count: 3, distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 } },
    });
  });

  it('filters by rating but keeps the summary of the whole course', async () => {
    const course = await createCourse();
    const users = await Promise.all([createUser(), createUser(), createUser()]);
    await createReview(users[0]!.id, course.id, { rating: 5 });
    await createReview(users[1]!.id, course.id, { rating: 4 });
    await createReview(users[2]!.id, course.id, { rating: 4 });

    const res = await api.get(`${API}/courses/${course.id}/reviews?rating=4`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((r: { rating: number }) => r.rating === 4)).toBe(true);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.summary.count).toBe(3);
  });

  it('returns an empty page when no review has the requested rating', async () => {
    const course = await createCourse();
    const user = await createUser();
    await createReview(user.id, course.id, { rating: 5 });

    const res = await api.get(`${API}/courses/${course.id}/reviews?rating=1`);

    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual(expect.objectContaining({ total: 0, totalPages: 0 }));
  });

  it('paginates', async () => {
    const course = await createCourse();
    for (let i = 0; i < 3; i += 1) await createReview((await createUser()).id, course.id);

    const res = await api.get(`${API}/courses/${course.id}/reviews?page=2&limit=2`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual(
      expect.objectContaining({ page: 2, limit: 2, total: 3, totalPages: 2 }),
    );
  });

  it('works with a valid token too', async () => {
    const user = await createUser();
    const course = await createCourse();
    const res = await api.get(`${API}/courses/${course.id}/reviews`).set(authHeader(user));
    expect(res.status).toBe(200);
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown course', async () => {
    const res = await api.get(`${API}/courses/nope/reviews`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it('returns 400 VALIDATION_ERROR for a rating outside 1-5', async () => {
    const course = await createCourse();
    const res = await api.get(`${API}/courses/${course.id}/reviews?rating=6`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /courses/:id/reviews/me', () => {
  it('returns null when the user has not reviewed the course', async () => {
    const user = await createUser();
    const course = await createCourse();

    const res = await api.get(`${API}/courses/${course.id}/reviews/me`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: null });
  });

  it('returns my review (and not the review of somebody else)', async () => {
    const [me, other] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();
    await createReview(other.id, course.id, { content: 'Review written by someone else.' });
    const mine = await createReview(me.id, course.id, {
      rating: 3,
      content: 'My own review of this course.',
    });

    const res = await api.get(`${API}/courses/${course.id}/reviews/me`).set(authHeader(me));

    expect(res.body.data).toEqual(
      expect.objectContaining({ id: mine.id, rating: 3, content: 'My own review of this course.' }),
    );
  });

  it('returns 404 for an unknown course and 401 without a token', async () => {
    const user = await createUser();
    const notFound = await api.get(`${API}/courses/nope/reviews/me`).set(authHeader(user));
    const anonymous = await api.get(`${API}/courses/nope/reviews/me`);
    expect(notFound.status).toBe(404);
    expect(anonymous.status).toBe(401);
  });
});

describe('PUT /courses/:id/reviews/me', () => {
  it('creates the review and updates ratingAvg / ratingCount of the course (BR-08)', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createEnrollment(user.id, course.id);

    const res = await api
      .put(`${API}/courses/${course.id}/reviews/me`)
      .set(authHeader(user))
      .send({ rating: 4, content: '  Solid content and clear explanations.  ' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: expect.any(String),
      rating: 4,
      content: 'Solid content and clear explanations.',
      createdAt: expect.any(String),
      user: { id: user.id, fullName: 'Test User', avatarUrl: null },
      teacherReply: null,
      teacherRepliedAt: null,
    });
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.ratingCount).toBe(1);
    expect(stored.ratingAvg).toBe(4);
  });

  it('edits the existing review instead of creating a second one', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createEnrollment(user.id, course.id);

    const first = await api
      .put(`${API}/courses/${course.id}/reviews/me`)
      .set(authHeader(user))
      .send({ rating: 2, content: 'Not what I expected at all.' });
    const second = await api
      .put(`${API}/courses/${course.id}/reviews/me`)
      .set(authHeader(user))
      .send({ rating: 5, content: 'After finishing it I changed my mind.' });

    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(second.body.data.createdAt).toBe(first.body.data.createdAt);
    expect(await prisma.review.count()).toBe(1);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.ratingCount).toBe(1);
    expect(stored.ratingAvg).toBe(5);
  });

  it('recomputes the average over all reviews of the course (rounded to 1 decimal)', async () => {
    const [me, a, b] = await Promise.all([createUser(), createUser(), createUser()]);
    const course = await createCourse();
    await createEnrollment(me.id, course.id);
    await createReview(a.id, course.id, { rating: 5 });
    await createReview(b.id, course.id, { rating: 4 });

    await api
      .put(`${API}/courses/${course.id}/reviews/me`)
      .set(authHeader(me))
      .send({ rating: 4, content: 'Good overall, a few parts were long.' });

    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.ratingCount).toBe(3);
    expect(stored.ratingAvg).toBe(4.3); // (5 + 4 + 4) / 3 = 4.33
  });

  it('keeps ratingCount / ratingAvg exact when two users review at the same time', async () => {
    const [a, b] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();
    await createEnrollment(a.id, course.id);
    await createEnrollment(b.id, course.id);

    const results = await Promise.all([
      api
        .put(`${API}/courses/${course.id}/reviews/me`)
        .set(authHeader(a))
        .send({ rating: 5, content: 'Review from the first student.' }),
      api
        .put(`${API}/courses/${course.id}/reviews/me`)
        .set(authHeader(b))
        .send({ rating: 2, content: 'Review from the second student.' }),
    ]);

    expect(results.map((res) => res.status)).toEqual([200, 200]);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.ratingCount).toBe(2);
    expect(stored.ratingAvg).toBe(3.5);
  });

  it('shows up in GET /courses/:id/reviews right away', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createEnrollment(user.id, course.id);
    await api.put(`${API}/courses/${course.id}/reviews/me`).set(authHeader(user)).send(validBody);

    const res = await api.get(`${API}/courses/${course.id}/reviews`);

    expect(res.body.meta.summary).toEqual({
      avg: 5,
      count: 1,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    });
  });

  it('returns 403 NOT_ENROLLED and writes nothing when the user is not enrolled', async () => {
    const user = await createUser();
    const course = await createCourse();

    const res = await api
      .put(`${API}/courses/${course.id}/reviews/me`)
      .set(authHeader(user))
      .send(validBody);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(await prisma.review.count()).toBe(0);
    const stored = await prisma.course.findUniqueOrThrow({ where: { id: course.id } });
    expect(stored.ratingCount).toBe(0);
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown course', async () => {
    const user = await createUser();
    const res = await api
      .put(`${API}/courses/nope/reviews/me`)
      .set(authHeader(user))
      .send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it.each([
    ['rating below 1', { rating: 0, content: validBody.content }],
    ['rating above 5', { rating: 6, content: validBody.content }],
    ['non-integer rating', { rating: 3.5, content: validBody.content }],
    ['rating sent as a string', { rating: '5', content: validBody.content }],
    ['missing rating', { content: validBody.content }],
    ['content shorter than 10 characters', { rating: 5, content: 'Too short' }],
    ['whitespace-only content', { rating: 5, content: '            ' }],
    ['content longer than 1000 characters', { rating: 5, content: 'x'.repeat(1001) }],
    ['missing content', { rating: 5 }],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, body) => {
    const user = await createUser();
    const course = await createCourse();
    await createEnrollment(user.id, course.id);

    const res = await api
      .put(`${API}/courses/${course.id}/reviews/me`)
      .set(authHeader(user))
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.review.count()).toBe(0);
  });

  it('accepts content of exactly 10 and 1000 characters', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createEnrollment(user.id, course.id);
    const put = (content: string) =>
      api
        .put(`${API}/courses/${course.id}/reviews/me`)
        .set(authHeader(user))
        .send({ rating: 3, content });

    expect((await put('x'.repeat(10))).status).toBe(200);
    expect((await put('x'.repeat(1000))).status).toBe(200);
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await api.put(`${API}/courses/${course.id}/reviews/me`).send(validBody);
    expect(res.status).toBe(401);
  });
});

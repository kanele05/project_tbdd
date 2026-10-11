import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createBookmark,
  createCartItem,
  createCourse,
  createEnrollment,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

describe('GET /cart', () => {
  it('returns an empty cart with total 0', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/cart`).set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ items: [], totalCents: 0 });
  });

  it('lists items newest first with course summaries and the total of current prices', async () => {
    const user = await createUser();
    const a = await createCourse({ title: 'A', priceCents: 4900 });
    const b = await createCourse({ title: 'B', priceCents: 1900 });
    const hidden = await createCourse({ title: 'Hidden', priceCents: 700, status: 'ARCHIVED' });
    await createCartItem(user.id, a.id, new Date('2026-09-01T00:00:00Z'));
    await createCartItem(user.id, b.id, new Date('2026-09-02T00:00:00Z'));
    await createCartItem(user.id, hidden.id);
    await createBookmark(user.id, b.id);

    const res = await api.get(`${API}/cart`).set(authHeader(user));

    expect(res.body.data.items.map((i: { course: { title: string } }) => i.course.title)).toEqual([
      'B',
      'A',
    ]);
    expect(res.body.data.items[0]).toMatchObject({
      addedAt: '2026-09-02T00:00:00.000Z',
      course: { id: b.id, priceCents: 1900, isBookmarked: true },
    });
    expect(res.body.data.totalCents).toBe(6800);
  });

  it('only shows the cart of the current user', async () => {
    const [mine, theirs] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();
    await createCartItem(theirs.id, course.id);

    const res = await api.get(`${API}/cart`).set(authHeader(mine));

    expect(res.body.data.items).toEqual([]);
  });

  it('returns 401 without a token', async () => {
    const res = await api.get(`${API}/cart`);
    expect(res.status).toBe(401);
  });
});

describe('POST /cart/items (BR-06)', () => {
  it('adds a paid course and returns 201', async () => {
    const user = await createUser();
    const course = await createCourse({ priceCents: 4900 });

    const res = await api
      .post(`${API}/cart/items`)
      .set(authHeader(user))
      .send({ courseId: course.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ courseId: course.id, addedAt: expect.any(String) });
    expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(1);
  });

  it('returns 409 ALREADY_IN_CART for a duplicate', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createCartItem(user.id, course.id);

    const res = await api
      .post(`${API}/cart/items`)
      .set(authHeader(user))
      .send({ courseId: course.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_IN_CART');
  });

  it('returns 409 ALREADY_ENROLLED when the user already owns the course', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createEnrollment(user.id, course.id);

    const res = await api
      .post(`${API}/cart/items`)
      .set(authHeader(user))
      .send({ courseId: course.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ENROLLED');
  });

  it('returns 422 FREE_COURSE for a free course', async () => {
    const user = await createUser();
    const course = await createCourse({ priceCents: 0 });

    const res = await api
      .post(`${API}/cart/items`)
      .set(authHeader(user))
      .send({ courseId: course.id });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('FREE_COURSE');
  });

  it('returns 404 COURSE_NOT_FOUND for unknown or unpublished courses', async () => {
    const user = await createUser();
    const hidden = await createCourse({ status: 'ARCHIVED' });

    const missing = await api
      .post(`${API}/cart/items`)
      .set(authHeader(user))
      .send({ courseId: 'nope' });
    const unpublished = await api
      .post(`${API}/cart/items`)
      .set(authHeader(user))
      .send({ courseId: hidden.id });

    for (const res of [missing, unpublished]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
    }
  });

  it('returns 400 VALIDATION_ERROR when courseId is missing', async () => {
    const user = await createUser();
    const res = await api.post(`${API}/cart/items`).set(authHeader(user)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /cart/items/:courseId', () => {
  it('removes the item with 204 and is idempotent', async () => {
    const user = await createUser();
    const course = await createCourse();
    await createCartItem(user.id, course.id);

    const first = await api.delete(`${API}/cart/items/${course.id}`).set(authHeader(user));
    const second = await api.delete(`${API}/cart/items/${course.id}`).set(authHeader(user));

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(0);
  });

  it("does not remove another user's cart item", async () => {
    const [mine, theirs] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();
    await createCartItem(theirs.id, course.id);

    await api.delete(`${API}/cart/items/${course.id}`).set(authHeader(mine)).expect(204);

    expect(await prisma.cartItem.count({ where: { userId: theirs.id } })).toBe(1);
  });
});

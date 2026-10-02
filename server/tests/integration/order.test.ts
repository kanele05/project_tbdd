import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import { createCartItem, createCourse, createEnrollment, createUser } from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

describe('POST /orders/checkout (BR-07)', () => {
  it('pays the cart: order PAID, enrollments, enrollmentCount, empty cart, notification', async () => {
    const user = await createUser();
    const a = await createCourse({ title: 'Course A', priceCents: 4900, enrollmentCount: 3 });
    const b = await createCourse({ title: 'Course B', priceCents: 1900 });
    await createCartItem(user.id, a.id, new Date('2026-09-01T00:00:00Z'));
    await createCartItem(user.id, b.id, new Date('2026-09-02T00:00:00Z'));

    const res = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_CARD' });

    expect(res.status).toBe(201);
    expect(res.body.data.enrolledCourseIds).toEqual([a.id, b.id]);
    expect(res.body.data.order).toMatchObject({
      totalCents: 6800,
      status: 'PAID',
      paymentMethod: 'MOCK_CARD',
      paidAt: expect.any(String),
    });
    expect(res.body.data.order.items).toHaveLength(2);
    expect(res.body.data.order.items[0]).toMatchObject({
      priceCents: expect.any(Number),
      course: { title: expect.any(String), thumbnailUrl: expect.any(String) },
    });

    expect(await prisma.enrollment.count({ where: { userId: user.id } })).toBe(2);
    expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: a.id } })).enrollmentCount).toBe(
      4,
    );
    expect((await prisma.course.findUniqueOrThrow({ where: { id: b.id } })).enrollmentCount).toBe(
      1,
    );
    const notifications = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'ORDER_PAID',
      isRead: false,
      data: { courseId: a.id },
    });
  });

  it('charges the CURRENT price of each course', async () => {
    const user = await createUser();
    const course = await createCourse({ priceCents: 5000 });
    await createCartItem(user.id, course.id);
    await prisma.course.update({ where: { id: course.id }, data: { priceCents: 3000 } });

    const res = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_EWALLET' });

    expect(res.body.data.order.totalCents).toBe(3000);
    expect(res.body.data.order.items[0].priceCents).toBe(3000);
  });

  it('simulateFailure: 402 PAYMENT_FAILED, order FAILED, cart kept, no enrollment', async () => {
    const user = await createUser();
    const course = await createCourse({ priceCents: 4900 });
    await createCartItem(user.id, course.id);

    const res = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_CARD', simulateFailure: true });

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PAYMENT_FAILED');
    const orders = await prisma.order.findMany({ where: { userId: user.id } });
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ status: 'FAILED', totalCents: 4900, paidAt: null });
    expect(res.body.error.details).toEqual({ orderId: orders[0].id });
    expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.enrollment.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
    expect(
      (await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).enrollmentCount,
    ).toBe(0);
  });

  it('returns 422 CART_EMPTY when the cart is empty and creates no order', async () => {
    const user = await createUser();

    const res = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_CARD' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CART_EMPTY');
    expect(await prisma.order.count()).toBe(0);
  });

  it('does not charge twice for a course the user already owns', async () => {
    const user = await createUser();
    const owned = await createCourse({ priceCents: 4900 });
    const fresh = await createCourse({ priceCents: 1000 });
    await createCartItem(user.id, owned.id);
    await createCartItem(user.id, fresh.id);
    await createEnrollment(user.id, owned.id);

    const res = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_CARD' });

    expect(res.status).toBe(201);
    expect(res.body.data.order.totalCents).toBe(1000);
    expect(res.body.data.enrolledCourseIds).toEqual([fresh.id]);
    expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(0);
  });

  it('only buys the cart of the current user', async () => {
    const [mine, theirs] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse();
    await createCartItem(theirs.id, course.id);

    const res = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(mine))
      .send({ paymentMethod: 'MOCK_CARD' });

    expect(res.status).toBe(422);
    expect(await prisma.cartItem.count({ where: { userId: theirs.id } })).toBe(1);
  });

  it('validates the body and requires a token', async () => {
    const user = await createUser();
    const badMethod = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'PAYPAL' });
    const badFlag = await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_CARD', simulateFailure: 'yes' });
    const anonymous = await api.post(`${API}/orders/checkout`).send({ paymentMethod: 'MOCK_CARD' });

    expect(badMethod.status).toBe(400);
    expect(badFlag.status).toBe(400);
    expect(anonymous.status).toBe(401);
  });
});

describe('POST /courses/:id/enroll', () => {
  it('enrolls in a free course (201) and increments enrollmentCount', async () => {
    const user = await createUser();
    const course = await createCourse({ priceCents: 0 });

    const res = await api.post(`${API}/courses/${course.id}/enroll`).set(authHeader(user));

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ courseId: course.id, progressPercent: 0, lastLessonId: null });
    expect(await prisma.enrollment.count({ where: { userId: user.id } })).toBe(1);
    expect(
      (await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).enrollmentCount,
    ).toBe(1);
  });

  it('returns 422 PAID_COURSE for a course that costs money', async () => {
    const user = await createUser();
    const course = await createCourse({ priceCents: 100 });

    const res = await api.post(`${API}/courses/${course.id}/enroll`).set(authHeader(user));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PAID_COURSE');
    expect(await prisma.enrollment.count()).toBe(0);
  });

  it('returns 409 ALREADY_ENROLLED on a second enroll and keeps the count', async () => {
    const user = await createUser();
    const course = await createCourse({ priceCents: 0 });
    await api.post(`${API}/courses/${course.id}/enroll`).set(authHeader(user)).expect(201);

    const res = await api.post(`${API}/courses/${course.id}/enroll`).set(authHeader(user));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ENROLLED');
    expect(
      (await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).enrollmentCount,
    ).toBe(1);
  });

  it('returns 404 COURSE_NOT_FOUND and 401 without a token', async () => {
    const user = await createUser();
    const missing = await api.post(`${API}/courses/nope/enroll`).set(authHeader(user));
    const anonymous = await api.post(`${API}/courses/nope/enroll`);

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('COURSE_NOT_FOUND');
    expect(anonymous.status).toBe(401);
  });
});

describe('GET /orders', () => {
  it('lists my orders newest first, including failed ones', async () => {
    const [user, other] = await Promise.all([createUser(), createUser()]);
    const course = await createCourse({ priceCents: 2000 });
    await createCartItem(user.id, course.id);
    await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_CARD', simulateFailure: true })
      .expect(402);
    await api
      .post(`${API}/orders/checkout`)
      .set(authHeader(user))
      .send({ paymentMethod: 'MOCK_EWALLET' })
      .expect(201);
    await prisma.order.create({
      data: { userId: other.id, totalCents: 1, status: 'PAID', paymentMethod: 'MOCK_CARD' },
    });

    const res = await api.get(`${API}/orders`).set(authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, total: 2, totalPages: 1 });
    expect(res.body.data.map((o: { status: string }) => o.status)).toEqual(['PAID', 'FAILED']);
  });

  it('returns 401 without a token', async () => {
    const res = await api.get(`${API}/orders`);
    expect(res.status).toBe(401);
  });
});

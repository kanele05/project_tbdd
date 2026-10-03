import { buildPaidNotification, checkout, enrollInFreeCourse, listOrders } from './order.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    course: { findFirst: jest.fn() },
    order: { count: jest.fn(), findMany: jest.fn() },
  },
  Prisma: jest.requireActual('@/generated/prisma/client').Prisma,
}));
jest.mock('@/lib/notify', () => ({ notify: jest.fn() }));
jest.mock('@/modules/home/home.service', () => ({ invalidateHomeCache: jest.fn() }));

type Fn = jest.Mock;
const { prisma } = jest.requireMock('@/lib/prisma') as {
  prisma: { $transaction: Fn; course: { findFirst: Fn }; order: { count: Fn; findMany: Fn } };
};
const { notify } = jest.requireMock('@/lib/notify') as { notify: Fn };
const { invalidateHomeCache } = jest.requireMock('@/modules/home/home.service') as {
  invalidateHomeCache: Fn;
};

const orderRow = (status: 'PAID' | 'FAILED') => ({
  id: 'o1',
  totalCents: 6800,
  status,
  paymentMethod: 'MOCK_CARD',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  paidAt: status === 'PAID' ? new Date('2026-09-01T00:00:01Z') : null,
  items: [
    {
      courseId: 'a',
      priceCents: 4900,
      course: { id: 'a', title: 'A', thumbnailUrl: 'https://img/a.jpg' },
    },
    {
      courseId: 'b',
      priceCents: 1900,
      course: { id: 'b', title: 'B', thumbnailUrl: 'https://img/b.jpg' },
    },
  ],
});

/** tx giả: chạy callback của `$transaction` với các bảng mock. */
function makeTx(overrides: { cart?: unknown[]; enrolled?: string[]; status?: 'PAID' | 'FAILED' }) {
  const tx = {
    cartItem: {
      findMany: jest.fn().mockResolvedValue(overrides.cart ?? []),
      deleteMany: jest.fn(),
    },
    enrollment: {
      findMany: jest
        .fn()
        .mockResolvedValue((overrides.enrolled ?? []).map((courseId) => ({ courseId }))),
      createMany: jest.fn(),
    },
    order: { create: jest.fn().mockResolvedValue(orderRow(overrides.status ?? 'PAID')) },
    course: { updateMany: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));
  return tx;
}

const line = (courseId: string, priceCents: number) => ({
  courseId,
  course: { title: courseId.toUpperCase(), priceCents },
});

beforeEach(() => jest.clearAllMocks());

describe('checkout (BR-07)', () => {
  it('pays everything inside ONE transaction and invalidates the home cache', async () => {
    const tx = makeTx({ cart: [line('a', 4900), line('b', 1900)] });

    const result = await checkout('u1', { paymentMethod: 'MOCK_CARD' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', totalCents: 6800, status: 'PAID' }),
      }),
    );
    expect(tx.enrollment.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u1', courseId: 'a' },
        { userId: 'u1', courseId: 'b' },
      ],
      skipDuplicates: true,
    });
    expect(tx.course.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
      data: { enrollmentCount: { increment: 1 } },
    });
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(notify).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ userId: 'u1', type: 'ORDER_PAID', data: { courseId: 'a' } }),
    );
    expect(invalidateHomeCache).toHaveBeenCalledTimes(1);
    expect(result.enrolledCourseIds).toEqual(['a', 'b']);
    expect(result.order).toMatchObject({ id: 'o1', status: 'PAID', totalCents: 6800 });
  });

  it('simulateFailure: stores a FAILED order, keeps the cart and throws 402', async () => {
    const tx = makeTx({ cart: [line('a', 4900)], status: 'FAILED' });

    await expect(
      checkout('u1', { paymentMethod: 'MOCK_CARD', simulateFailure: true }),
    ).rejects.toMatchObject({ status: 402, code: 'PAYMENT_FAILED', details: { orderId: 'o1' } });

    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', paidAt: null }),
      }),
    );
    expect(tx.enrollment.createMany).not.toHaveBeenCalled();
    expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(invalidateHomeCache).not.toHaveBeenCalled();
  });

  it('throws 422 CART_EMPTY for an empty cart and creates no order', async () => {
    const tx = makeTx({ cart: [] });
    await expect(checkout('u1', { paymentMethod: 'MOCK_CARD' })).rejects.toMatchObject({
      status: 422,
      code: 'CART_EMPTY',
    });
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('drops courses the user already owns and clears a cart that only had those', async () => {
    const tx = makeTx({ cart: [line('a', 4900)], enrolled: ['a'] });
    await expect(checkout('u1', { paymentMethod: 'MOCK_CARD' })).rejects.toMatchObject({
      code: 'CART_EMPTY',
    });
    expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});

describe('buildPaidNotification', () => {
  it('names the course for a single purchase and counts courses otherwise', () => {
    expect(buildPaidNotification([line('a', 1)])).toEqual({
      title: 'Payment successful',
      body: 'You are now enrolled in A. Start learning today!',
      courseId: 'a',
    });
    expect(buildPaidNotification([line('a', 1), line('b', 1)]).body).toBe(
      'You are now enrolled in 2 courses. Start learning today!',
    );
  });
});

describe('enrollInFreeCourse', () => {
  it('throws 422 PAID_COURSE for a course with a price', async () => {
    prisma.course.findFirst.mockResolvedValue({ id: 'c1', priceCents: 100 });
    await expect(enrollInFreeCourse('u1', 'c1')).rejects.toMatchObject({
      status: 422,
      code: 'PAID_COURSE',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws 404 COURSE_NOT_FOUND for an unknown course', async () => {
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(enrollInFreeCourse('u1', 'x')).rejects.toMatchObject({ status: 404 });
  });

  it('maps a duplicate enrollment (P2002) to 409 ALREADY_ENROLLED', async () => {
    const { Prisma } = jest.requireActual('@/generated/prisma/client');
    prisma.course.findFirst.mockResolvedValue({ id: 'c1', priceCents: 0 });
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    await expect(enrollInFreeCourse('u1', 'c1')).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_ENROLLED',
    });
    expect(invalidateHomeCache).not.toHaveBeenCalled();
  });
});

describe('enrollInFreeCourse (success and unexpected errors)', () => {
  it('enrolls in one transaction, bumps enrollmentCount and invalidates the home cache', async () => {
    const tx = {
      enrollment: { create: jest.fn() },
      course: { update: jest.fn() },
    };
    prisma.course.findFirst.mockResolvedValue({ id: 'c1', priceCents: 0 });
    prisma.$transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

    await expect(enrollInFreeCourse('u1', 'c1')).resolves.toEqual({
      courseId: 'c1',
      progressPercent: 0,
      lastLessonId: null,
    });
    expect(tx.enrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'u1', courseId: 'c1' } }),
    );
    expect(tx.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { enrollmentCount: { increment: 1 } } }),
    );
    expect(invalidateHomeCache).toHaveBeenCalledTimes(1);
  });

  it('rethrows unexpected database errors unchanged', async () => {
    const boom = new Error('connection lost');
    prisma.course.findFirst.mockResolvedValue({ id: 'c1', priceCents: 0 });
    prisma.$transaction.mockRejectedValue(boom);
    await expect(enrollInFreeCourse('u1', 'c1')).rejects.toBe(boom);
  });
});

describe('listOrders', () => {
  it('returns newest-first orders with pagination meta', async () => {
    prisma.order.count.mockResolvedValue(25);
    prisma.order.findMany.mockResolvedValue([orderRow('PAID'), orderRow('FAILED')]);

    const { orders, meta } = await listOrders('u1', { page: 2, limit: 10 });

    expect(orders.map((o) => o.status)).toEqual(['PAID', 'FAILED']);
    expect(orders[0]?.items).toHaveLength(2);
    expect(meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 10,
        take: 10,
      }),
    );
  });

  it('returns an empty page when the user never ordered', async () => {
    prisma.order.count.mockResolvedValue(0);
    prisma.order.findMany.mockResolvedValue([]);
    const { orders, meta } = await listOrders('u1', {});
    expect(orders).toEqual([]);
    expect(meta.total).toBe(0);
  });
});

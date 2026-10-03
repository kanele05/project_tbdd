import { addToCart, getCart, removeFromCart } from './cart.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findFirst: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    cartItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
  Prisma: jest.requireActual('@/generated/prisma/client').Prisma,
}));
jest.mock('@/lib/bookmarkedIds', () => ({ getBookmarkedIds: jest.fn(async () => new Set()) }));

type Fn = jest.Mock;
const db = (jest.requireMock('@/lib/prisma') as { prisma: Record<string, Record<string, Fn>> })
  .prisma;
const { Prisma } = jest.requireActual('@/generated/prisma/client');

beforeEach(() => {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
  db.course.findFirst.mockResolvedValue({ id: 'c1', priceCents: 4900 });
  db.enrollment.findUnique.mockResolvedValue(null);
  db.cartItem.findUnique.mockResolvedValue(null);
});

describe('addToCart (BR-06)', () => {
  it('creates the cart item for a paid, not-enrolled, not-yet-in-cart course', async () => {
    const addedAt = new Date('2026-09-01T00:00:00Z');
    db.cartItem.create.mockResolvedValue({ courseId: 'c1', addedAt });

    await expect(addToCart('u1', 'c1')).resolves.toEqual({
      courseId: 'c1',
      addedAt: '2026-09-01T00:00:00.000Z',
    });
    expect(db.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'u1', courseId: 'c1' } }),
    );
  });

  it.each([
    ['missing course', () => db.course.findFirst.mockResolvedValue(null), 404, 'COURSE_NOT_FOUND'],
    [
      'enrolled',
      () => db.enrollment.findUnique.mockResolvedValue({ id: 'e' }),
      409,
      'ALREADY_ENROLLED',
    ],
    [
      'free',
      () => db.course.findFirst.mockResolvedValue({ id: 'c1', priceCents: 0 }),
      422,
      'FREE_COURSE',
    ],
    [
      'in cart',
      () => db.cartItem.findUnique.mockResolvedValue({ userId: 'u1' }),
      409,
      'ALREADY_IN_CART',
    ],
  ])('throws %s with status/code and does not write', async (_name, arrange, status, code) => {
    arrange();
    await expect(addToCart('u1', 'c1')).rejects.toMatchObject({ status, code });
    expect(db.cartItem.create).not.toHaveBeenCalled();
  });

  it('reports ALREADY_ENROLLED before FREE_COURSE for an owned free course', async () => {
    db.course.findFirst.mockResolvedValue({ id: 'c1', priceCents: 0 });
    db.enrollment.findUnique.mockResolvedValue({ id: 'e' });
    await expect(addToCart('u1', 'c1')).rejects.toMatchObject({ code: 'ALREADY_ENROLLED' });
  });

  it('maps a unique-key race (P2002) to 409 ALREADY_IN_CART', async () => {
    db.cartItem.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    await expect(addToCart('u1', 'c1')).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_IN_CART',
    });
  });
});

describe('getCart', () => {
  it('sums the current price of every item', async () => {
    const course = (id: string, priceCents: number) => ({
      id,
      title: id,
      thumbnailUrl: 'https://img/x.jpg',
      priceCents,
      originalPriceCents: null,
      isBestSeller: false,
      ratingAvg: 0,
      ratingCount: 0,
      lessonCount: 0,
      totalDurationSec: 0,
      teacher: { id: 't', user: { fullName: 'T' } },
    });
    db.cartItem.findMany.mockResolvedValue([
      { addedAt: new Date('2026-09-02T00:00:00Z'), course: course('a', 1000) },
      { addedAt: new Date('2026-09-01T00:00:00Z'), course: course('b', 250) },
    ]);

    const cart = await getCart('u1');

    expect(cart.totalCents).toBe(1250);
    expect(cart.items.map((i) => i.course.id)).toEqual(['a', 'b']);
  });
});

describe('removeFromCart', () => {
  it('deletes only the row of this user (idempotent deleteMany)', async () => {
    await removeFromCart('u1', 'c1');
    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', courseId: 'c1' },
    });
  });
});

describe('addToCart (unexpected errors)', () => {
  it('rethrows database errors that are not a unique violation', async () => {
    const boom = new Error('connection lost');
    db.cartItem.create.mockRejectedValue(boom);
    await expect(addToCart('u1', 'c1')).rejects.toBe(boom);
  });
});

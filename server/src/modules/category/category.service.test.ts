import { CATEGORIES_CACHE_KEY, listCategories } from './category.service';

jest.mock('@/lib/prisma', () => ({
  prisma: { category: { findMany: jest.fn() } },
}));

const findMany = (
  jest.requireMock('@/lib/prisma') as { prisma: { category: { findMany: jest.Mock } } }
).prisma.category.findMany;

beforeEach(() => findMany.mockReset());

describe('listCategories', () => {
  it('orders by order then name and maps courseCount from published courses', async () => {
    findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Design',
        slug: 'design',
        icon: 'pen-tool',
        color: '#8353E2',
        _count: { courses: 7 },
      },
    ]);

    const result = await listCategories();

    expect(result).toEqual([
      {
        id: 'c1',
        name: 'Design',
        slug: 'design',
        icon: 'pen-tool',
        color: '#8353E2',
        courseCount: 7,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    );
  });

  it('returns an empty list when there are no categories', async () => {
    findMany.mockResolvedValue([]);
    await expect(listCategories()).resolves.toEqual([]);
  });

  it('uses a stable cache key', () => {
    expect(CATEGORIES_CACHE_KEY).toBe('categories');
  });
});

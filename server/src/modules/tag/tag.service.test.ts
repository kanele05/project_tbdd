import { HOT_TAGS_CACHE_KEY, listHotTags } from './tag.service';

jest.mock('@/lib/prisma', () => ({
  prisma: { tag: { findMany: jest.fn() } },
}));

const findMany = (jest.requireMock('@/lib/prisma') as { prisma: { tag: { findMany: jest.Mock } } })
  .prisma.tag.findMany;

beforeEach(() => findMany.mockReset());

describe('listHotTags', () => {
  it('queries only hot tags sorted by name and maps them to DTOs', async () => {
    findMany.mockResolvedValue([
      { id: 't1', name: 'Figma', isHot: true, extra: 'ignored' },
      { id: 't2', name: 'UX', isHot: true },
    ]);

    const result = await listHotTags();

    expect(result).toEqual([
      { id: 't1', name: 'Figma', isHot: true },
      { id: 't2', name: 'UX', isHot: true },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isHot: true }, orderBy: { name: 'asc' } }),
    );
  });

  it('returns an empty list when no tag is hot', async () => {
    findMany.mockResolvedValue([]);
    await expect(listHotTags()).resolves.toEqual([]);
  });

  it('uses a stable cache key', () => {
    expect(HOT_TAGS_CACHE_KEY).toBe('tags:hot');
  });
});

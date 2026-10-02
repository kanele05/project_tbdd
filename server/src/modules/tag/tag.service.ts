import { cache } from '@/lib/cache';
import { tagDtoSelect, toTagDto } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import type { TagDto } from '@/types/dto';

export const HOT_TAGS_CACHE_KEY = 'tags:hot';
const HOT_TAGS_TTL_MS = 60_000;

/** Các tag `isHot` (gợi ý "Hot topics" ở màn Search), sắp theo tên. Cache server 60 s. */
export function listHotTags(): Promise<TagDto[]> {
  return cache.wrap(HOT_TAGS_CACHE_KEY, HOT_TAGS_TTL_MS, async () => {
    const rows = await prisma.tag.findMany({
      where: { isHot: true },
      orderBy: { name: 'asc' },
      select: tagDtoSelect,
    });
    return rows.map(toTagDto);
  });
}

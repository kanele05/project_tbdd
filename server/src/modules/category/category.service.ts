import { cache } from '@/lib/cache';
import { categoryDtoSelect, toCategoryDto } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import type { CategoryDto } from '@/types/dto';

export const CATEGORIES_CACHE_KEY = 'categories';
const CATEGORIES_TTL_MS = 60_000;

/** 6 danh mục sắp theo `order`, kèm `courseCount` (chỉ khóa đã publish). Cache server 60 s. */
export function listCategories(): Promise<CategoryDto[]> {
  return cache.wrap(CATEGORIES_CACHE_KEY, CATEGORIES_TTL_MS, async () => {
    const rows = await prisma.category.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: categoryDtoSelect,
    });
    return rows.map(toCategoryDto);
  });
}

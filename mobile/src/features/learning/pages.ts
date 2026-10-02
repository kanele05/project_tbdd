/**
 * Flatten the pages of an infinite query into one list, dropping duplicate ids (a new item
 * created while the user scrolls shifts the following pages, so the same row can come twice).
 */
export function flattenPages<T extends { id: string }>(
  pages: readonly { data: readonly T[] }[] | undefined,
): T[] {
  if (!pages) return [];
  const seen = new Set<string>();
  const items: T[] = [];
  for (const page of pages) {
    for (const item of page.data) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

/** `getNextPageParam` for endpoints answering `{ data, meta: { page, totalPages } }`. */
export function getNextPageNumber(lastPage: {
  meta: { page: number; totalPages: number };
}): number | undefined {
  return lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined;
}

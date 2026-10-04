import { flattenPages } from '@/features/learning/pages';
import type { AiChatMessageDto } from '@/types/api';

/**
 * The history endpoint answers newest first, page by page. The chat shows the oldest message at
 * the top and the newest at the bottom, so flatten the pages (dropping a message that moved from
 * one page to the next while a new one arrived) and reverse them.
 */
export function toChronological(
  pages: readonly { data: readonly AiChatMessageDto[] }[] | undefined,
): AiChatMessageDto[] {
  return flattenPages(pages).reverse();
}

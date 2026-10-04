import type { AiLang } from '@/lib/ai/types';

import { fallbackReason } from './ai.mock';
import { RECOMMENDATION_MIN, type RecommendationsOutput } from './ai.schema';
import type { RecommendationCandidate } from './ai.types';

/**
 * Làm sạch kết quả gợi ý của AI (model có thể bịa id, lặp khóa hoặc trả thiếu):
 * 1. chỉ giữ `courseId` nằm trong danh sách ứng viên, bỏ trùng, tối đa `maxItems`;
 * 2. nếu còn ít hơn `min(3, số ứng viên)` thì bổ sung các ứng viên đứng đầu theo thứ hạng BR-12
 *    (kèm lý do dự phòng) để lộ trình luôn đủ 3-5 khóa khi có đủ ứng viên.
 */
export function normalizeRecommendationItems(
  items: RecommendationsOutput['items'],
  candidates: readonly RecommendationCandidate[],
  lang: AiLang,
  maxItems: number,
): RecommendationsOutput['items'] {
  const allowed = new Set(candidates.map((c) => c.id));
  const chosen: RecommendationsOutput['items'] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (chosen.length >= maxItems) break;
    if (!allowed.has(item.courseId) || seen.has(item.courseId)) continue;
    seen.add(item.courseId);
    chosen.push({ courseId: item.courseId, reason: item.reason });
  }

  const target = Math.min(RECOMMENDATION_MIN, candidates.length, maxItems);
  for (const candidate of candidates) {
    if (chosen.length >= target) break;
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    chosen.push({ courseId: candidate.id, reason: fallbackReason(candidate, lang) });
  }
  return chosen;
}

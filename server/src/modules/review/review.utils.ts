import type { ReviewSummaryDto } from '@/types/dto';

/**
 * Điểm trung bình làm tròn 1 chữ số, tính bằng số nguyên (`round(sum * 10 / count) / 10`) để khớp với
 * `ROUND(AVG(rating), 1)` của PostgreSQL (làm tròn .5 lên) mà không dính sai số dấu phẩy động.
 * `count = 0` -> 0.
 */
export function averageRating(sum: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round((sum * 10) / count) / 10;
}

/** Gộp kết quả `groupBy(rating)` thành `meta.summary` (đủ 5 mức sao, mức không có = 0). */
export function buildReviewSummary(
  groups: ReadonlyArray<{ rating: number; count: number }>,
): ReviewSummaryDto {
  const distribution: ReviewSummaryDto['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let count = 0;
  for (const group of groups) {
    if (group.rating < 1 || group.rating > 5) continue;
    distribution[group.rating as 1 | 2 | 3 | 4 | 5] = group.count;
    sum += group.rating * group.count;
    count += group.count;
  }
  return { avg: averageRating(sum, count), count, distribution };
}

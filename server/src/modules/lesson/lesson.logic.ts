/**
 * Logic thuần (không truy vấn DB) của học tập: trạng thái bài (BR-02), % khóa học (BR-04),
 * vị trí xem (BR-03). Tách riêng để unit test dễ dàng.
 */
import type { CurriculumLessonDto, CurriculumSectionDto, LessonStatus } from '@/types/dto';

export type StatusInput = {
  /** Có `LessonProgress.isCompleted = true`. */
  isCompleted: boolean;
  /** Bài này là `enrollment.lastLessonId`. */
  isLastLesson: boolean;
  isEnrolled: boolean;
  isPreview: boolean;
};

/**
 * BR-02: COMPLETED (đã hoàn thành) > IN_PROGRESS (là `lastLessonId`, chưa xong) >
 * UNLOCKED (đã ghi danh hoặc preview) > LOCKED.
 */
export function computeLessonStatus(input: StatusInput): LessonStatus {
  if (input.isCompleted) return 'COMPLETED';
  if (input.isEnrolled && input.isLastLesson) return 'IN_PROGRESS';
  if (input.isEnrolled || input.isPreview) return 'UNLOCKED';
  return 'LOCKED';
}

export type CurriculumSectionRow = {
  id: string;
  title: string;
  order: number;
  lessons: ReadonlyArray<{
    id: string;
    title: string;
    durationSec: number;
    isPreview: boolean;
  }>;
};

export type CurriculumViewer = {
  isEnrolled: boolean;
  lastLessonId: string | null;
  completedLessonIds: ReadonlySet<string>;
};

/** Khách / chưa ghi danh: không có bài nào hoàn thành hay đang học. */
export const ANONYMOUS_VIEWER: CurriculumViewer = {
  isEnrolled: false,
  lastLessonId: null,
  completedLessonIds: new Set(),
};

/**
 * Dựng `CurriculumSection[]` đã sắp theo `order`; `number` đánh liên tục toàn khóa (1, 2, 3...) xuyên qua
 * các chương (design: "01. Introduction ...").
 */
export function buildCurriculum(
  sections: readonly CurriculumSectionRow[],
  viewer: CurriculumViewer,
): CurriculumSectionDto[] {
  let number = 0;
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    lessons: section.lessons.map((lesson): CurriculumLessonDto => {
      number += 1;
      return {
        id: lesson.id,
        number,
        title: lesson.title,
        durationSec: lesson.durationSec,
        isPreview: lesson.isPreview,
        status: computeLessonStatus({
          isCompleted: viewer.completedLessonIds.has(lesson.id),
          isLastLesson: viewer.lastLessonId === lesson.id,
          isEnrolled: viewer.isEnrolled,
          isPreview: lesson.isPreview,
        }),
      };
    }),
  }));
}

/** BR-04: `round(số bài hoàn thành / tổng số bài * 100)`, kẹp [0, 100]; khóa không có bài -> 0. */
export function computeProgressPercent(completedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const percent = Math.round((completedCount * 100) / totalCount);
  return Math.min(100, Math.max(0, percent));
}

/** BR-03: làm tròn và kẹp vị trí xem trong [0, durationSec]. */
export function clampPosition(positionSec: number, durationSec: number): number {
  if (!Number.isFinite(positionSec)) return 0;
  return Math.min(Math.max(0, durationSec), Math.max(0, Math.round(positionSec)));
}

/** Dữ liệu khóa học đã đọc từ DB để AI kiểm duyệt (admin) đọc - xem courseAi.material.ts. */
import type { ModerationTarget } from '@/types/teacherAdminDto';

export type ReviewLessonMaterial = {
  title: string;
  durationSec: number;
  isPreview: boolean;
  /** Link video là YouTube hợp lệ (không đưa URL vào prompt). */
  hasValidVideo: boolean;
  /** Ghi chú chữ của bài, đã cắt ngắn (`REVIEW_NOTE_CHARS`). */
  notes: string;
};

export type ReviewSectionMaterial = { title: string; lessons: ReviewLessonMaterial[] };

/** Nội dung đang chờ duyệt: bản sửa đổi (`REVISION`) hoặc chính khóa (`COURSE`). */
export type ReviewMaterial = {
  target: ModerationTarget;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  tags: string[];
  priceCents: number;
  originalPriceCents: number | null;
  benefits: string[];
  projectDescription: string;
  sections: ReviewSectionMaterial[];
};

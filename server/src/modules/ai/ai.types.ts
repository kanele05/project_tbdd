/** Dữ liệu khóa học/bài học đã đọc từ DB, dùng để dựng prompt (ai.prompts) và nội dung mock (ai.mock). */

export type LessonMaterial = {
  id: string;
  title: string;
  durationSec: number;
  /** Ghi chú chữ của bài (`Lesson.content`); null nếu bài chưa có. */
  content: string | null;
};

export type SectionMaterial = { title: string; lessons: LessonMaterial[] };

export type CourseMaterial = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  category: string;
  teacher: string;
  benefits: string[];
  /** Theo thứ tự chương -> bài. */
  sections: SectionMaterial[];
};

/** Một bài học cùng ngữ cảnh khóa/chương của nó (tóm tắt bài, quiz). */
export type LessonFocus = {
  id: string;
  title: string;
  content: string | null;
  sectionTitle: string;
  courseTitle: string;
};

/** Khóa học ứng viên cho gợi ý (BR-12: chưa ghi danh, đã xếp thứ tự ưu tiên). */
export type RecommendationCandidate = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  teacher: string;
  ratingAvg: number;
  ratingCount: number;
  lessonCount: number;
  priceCents: number;
  tags: string[];
};

export type LearnerProfile = {
  enrolled: { title: string; category: string; progressPercent: number }[];
  saved: { title: string; category: string }[];
};

/** Prompt đã dựng: `system` (vai trò + luật + dữ liệu) và `prompt` (nhiệm vụ cụ thể). */
export type PromptParts = { system: string; prompt: string };

/** Chuẩn hóa output của model về đúng giới hạn của DTO (hàm thuần): cắt chuỗi/mảng quá dài, sắp issue theo mức nặng. */
import {
  type CourseDraftModelOutput,
  type CourseDraftOutput,
  type CourseReviewModelOutput,
  type CourseReviewOutput,
  DRAFT_LIMITS,
  REVIEW_LIMITS,
} from './courseAi.schema';

/** Cắt chuỗi về tối đa `max` ký tự (thêm dấu "…" nếu bị cắt). */
export function clip(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function normalizeDraft(raw: CourseDraftModelOutput): CourseDraftOutput {
  const L = DRAFT_LIMITS;
  return {
    subtitle: clip(raw.subtitle, L.subtitleMax),
    description: clip(raw.description, L.descriptionMax),
    benefits: raw.benefits.slice(0, L.benefitsMax).map((b) => clip(b, L.benefitMax)),
    sections: raw.sections.slice(0, L.sectionsMax).map((section) => ({
      title: clip(section.title, L.sectionTitleMax),
      lessons: section.lessons.slice(0, L.lessonsMax).map((lesson) => ({
        title: clip(lesson.title, L.lessonTitleMax),
        summary: clip(lesson.summary, L.lessonSummaryMax),
      })),
    })),
  };
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 } as const;

export function normalizeReview(raw: CourseReviewModelOutput): CourseReviewOutput {
  const issues = raw.issues
    .map((issue, index) => ({ issue, index }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.issue.severity] - SEVERITY_RANK[b.issue.severity] || a.index - b.index,
    )
    .slice(0, REVIEW_LIMITS.issuesMax)
    .map(({ issue }) => ({
      severity: issue.severity,
      area: issue.area,
      message: clip(issue.message, REVIEW_LIMITS.messageMax),
    }));
  // Có vấn đề từ mức vừa trở lên thì không thể "LOOKS_OK" (model đôi khi tự mâu thuẫn).
  const hasSerious = issues.some((i) => i.severity !== 'low');
  return {
    verdict: hasSerious ? 'NEEDS_ATTENTION' : raw.verdict,
    summary: clip(raw.summary, REVIEW_LIMITS.summaryMax),
    issues,
  };
}

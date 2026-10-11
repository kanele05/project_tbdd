/**
 * Schema zod cho AI soạn khóa (`POST /teacher/ai/course-draft`) và AI kiểm duyệt (`GET /admin/courses/:id/ai-review`).
 *
 * Output của model có 2 lớp: schema "model" (số phần tử tối thiểu chặt, tối đa nới) gửi cho Gemini và dùng kiểm tra
 * kết quả; sau đó `courseAi.normalize.ts` cắt về đúng giới hạn của DTO rồi kiểm tra bằng schema "final" (cũng là
 * schema kiểm tra bản cache trong `AiContent`). Nhờ vậy model dài dòng một chút thì cắt chứ không lỗi 503.
 */
import { z } from 'zod';

import { COURSE_LIMITS } from '@/lib/courseChecklist';

// ---------------------------------------------------------------- Request

export const DRAFT_TOPIC_MIN = 3;
export const DRAFT_TOPIC_MAX = 200;

export const AI_COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const draftBody = z.object({
  topic: z
    .string({ error: 'topic is required' })
    .trim()
    .min(DRAFT_TOPIC_MIN, `topic must be at least ${DRAFT_TOPIC_MIN} characters`)
    .max(DRAFT_TOPIC_MAX, `topic must be at most ${DRAFT_TOPIC_MAX} characters`),
  level: z.enum(AI_COURSE_LEVELS, { error: 'level must be beginner, intermediate or advanced' }),
  /** Thiếu thì dùng header `Accept-Language`, mặc định `en`. */
  lang: z.enum(['vi', 'en'], { error: 'lang must be "vi" or "en"' }).optional(),
});
export type DraftBody = z.infer<typeof draftBody>;

// ---------------------------------------------------------------- Giới hạn của DTO

export const DRAFT_LIMITS = {
  subtitleMax: COURSE_LIMITS.subtitleMax,
  descriptionMin: COURSE_LIMITS.descriptionMin,
  descriptionMax: 1500,
  benefitsMin: 3,
  benefitsMax: 6,
  benefitMax: COURSE_LIMITS.benefitMax,
  sectionsMin: 3,
  sectionsMax: 6,
  sectionTitleMax: COURSE_LIMITS.sectionTitleMax,
  lessonsMin: 2,
  lessonsMax: 5,
  lessonTitleMax: COURSE_LIMITS.lessonTitleMax,
  lessonSummaryMax: 300,
} as const;

export const REVIEW_LIMITS = { issuesMax: 10, summaryMax: 600, messageMax: 400 } as const;

/** Số phần tử nới thêm mà model được phép trả (sẽ cắt về `*Max` ở bước chuẩn hóa). */
const SLACK = { benefits: 10, sections: 10, lessons: 8, issues: 20 } as const;

const text = (description: string) => z.string().trim().min(1).describe(description);

// ---------------------------------------------------------------- Output của model: gợi ý khóa

const D = DRAFT_LIMITS;

export const courseDraftModelOutput = z.object({
  subtitle: text(`One-line subtitle of the course, at most ${D.subtitleMax} characters`),
  description: z
    .string()
    .trim()
    .min(D.descriptionMin)
    .max(3000)
    .describe(
      `Course description of ${D.descriptionMin}-${D.descriptionMax} characters: who it is for, what it covers, how it is taught`,
    ),
  benefits: z
    .array(text(`One concrete outcome starting with a verb, at most ${D.benefitMax} characters`))
    .min(D.benefitsMin)
    .max(SLACK.benefits),
  sections: z
    .array(
      z.object({
        title: text(`Section title, at most ${D.sectionTitleMax} characters`),
        lessons: z
          .array(
            z.object({
              title: text(`Lesson title, at most ${D.lessonTitleMax} characters`),
              summary: text(
                `One sentence on what the lesson covers, at most ${D.lessonSummaryMax} characters`,
              ),
            }),
          )
          .min(D.lessonsMin)
          .max(SLACK.lessons),
      }),
    )
    .min(D.sectionsMin)
    .max(SLACK.sections),
});
export type CourseDraftModelOutput = z.infer<typeof courseDraftModelOutput>;

/** Output đã chuẩn hóa = phần nội dung của `AiCourseDraftDto` (cache `COURSE_DRAFT` lưu đúng dạng này). */
export const courseDraftOutput = z.object({
  subtitle: z.string().min(1).max(D.subtitleMax),
  description: z.string().min(D.descriptionMin).max(D.descriptionMax),
  benefits: z.array(z.string().min(1).max(D.benefitMax)).min(D.benefitsMin).max(D.benefitsMax),
  sections: z
    .array(
      z.object({
        title: z.string().min(1).max(D.sectionTitleMax),
        lessons: z
          .array(
            z.object({
              title: z.string().min(1).max(D.lessonTitleMax),
              summary: z.string().min(1).max(D.lessonSummaryMax),
            }),
          )
          .min(D.lessonsMin)
          .max(D.lessonsMax),
      }),
    )
    .min(D.sectionsMin)
    .max(D.sectionsMax),
});
export type CourseDraftOutput = z.infer<typeof courseDraftOutput>;

// ---------------------------------------------------------------- Output của model: kiểm duyệt

export const REVIEW_SEVERITIES = ['low', 'medium', 'high'] as const;
export const REVIEW_AREAS = [
  'title',
  'description',
  'curriculum',
  'pricing',
  'media',
  'policy',
  'other',
] as const;

const issueOutput = z.object({
  severity: z.enum(REVIEW_SEVERITIES).describe('high = should not be approved as is'),
  area: z.enum(REVIEW_AREAS).describe('Which part of the course the issue is about'),
  message: text(
    'One or two specific sentences, mention the section or lesson number when relevant',
  ),
});

export const courseReviewModelOutput = z.object({
  verdict: z
    .enum(['LOOKS_OK', 'NEEDS_ATTENTION'])
    .describe('NEEDS_ATTENTION when at least one medium or high issue exists'),
  summary: text('2-3 sentence summary of the review for the administrator'),
  issues: z.array(issueOutput).max(SLACK.issues),
});
export type CourseReviewModelOutput = z.infer<typeof courseReviewModelOutput>;

export const courseReviewOutput = z.object({
  verdict: z.enum(['LOOKS_OK', 'NEEDS_ATTENTION']),
  summary: z.string().min(1).max(REVIEW_LIMITS.summaryMax),
  issues: z
    .array(
      z.object({
        severity: z.enum(REVIEW_SEVERITIES),
        area: z.string().min(1).max(40),
        message: z.string().min(1).max(REVIEW_LIMITS.messageMax),
      }),
    )
    .max(REVIEW_LIMITS.issuesMax),
});
export type CourseReviewOutput = z.infer<typeof courseReviewOutput>;

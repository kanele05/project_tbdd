import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

// ---------------------------------------------------------------- Request (validate middleware)

const idParam = z.string().trim().min(1).max(100);

export const idParams = z.object({ id: idParam });

/** `?lang=vi|en` (không bắt buộc: thiếu thì dùng header `Accept-Language`, mặc định `en`). */
export const langQuery = z.object({
  lang: z.enum(['vi', 'en'], { error: 'lang must be "vi" or "en"' }).optional(),
});

export const CHAT_MESSAGE_MAX_LENGTH = 1000;

export const chatBody = z.object({
  message: z
    .string({ error: 'message is required' })
    .trim()
    .min(1, 'message must not be empty')
    .max(CHAT_MESSAGE_MAX_LENGTH, `message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`),
});

export const chatHistoryQuery = paginationQuery;

export type IdParams = z.infer<typeof idParams>;
export type LangQuery = z.infer<typeof langQuery>;
export type ChatBody = z.infer<typeof chatBody>;

// ---------------------------------------------------------------- Output của model (structured output)
// Cùng một schema dùng cho: JSON Schema gửi Gemini, kiểm tra kết quả, và kiểm tra bản cache trong AiContent.

const text = (description: string) => z.string().trim().min(1).describe(description);

/** Số chương tối đa trong bản tóm tắt khóa (khóa nhiều chương hơn: chỉ tóm tắt các chương đầu). */
export const COURSE_SUMMARY_MAX_SECTIONS = 15;

export const courseSummaryOutput = z.object({
  overview: text('2-3 sentence overview of the course'),
  objectives: z.array(text('One learning objective')).min(3).max(6),
  sections: z
    .array(
      z.object({
        title: text('Exact section title from the curriculum, in the original wording'),
        summary: text('One or two sentences on what this section teaches'),
      }),
    )
    .min(1)
    .max(COURSE_SUMMARY_MAX_SECTIONS),
  targetAudience: z.array(text('One type of learner who should take the course')).min(2).max(5),
  outcomes: z.array(text('One concrete skill or result after finishing the course')).min(3).max(6),
});
export type CourseSummaryOutput = z.infer<typeof courseSummaryOutput>;

export const lessonSummaryOutput = z.object({
  summary: text('2-4 sentence summary of the lesson'),
  keyPoints: z.array(text('One key takeaway')).min(3).max(6),
});
export type LessonSummaryOutput = z.infer<typeof lessonSummaryOutput>;

export const QUIZ_QUESTION_COUNT = 5;
export const QUIZ_OPTION_COUNT = 4;

export const quizOutput = z.object({
  questions: z
    .array(
      z.object({
        question: text('The question text'),
        options: z
          .array(text('One answer option, without a leading letter or number'))
          .length(QUIZ_OPTION_COUNT),
        correctIndex: z
          .number()
          .int()
          .min(0)
          .max(QUIZ_OPTION_COUNT - 1)
          .describe('Zero-based index of the single correct option'),
        explanation: text('One or two sentences explaining why the answer is correct'),
      }),
    )
    .length(QUIZ_QUESTION_COUNT),
});
export type QuizOutput = z.infer<typeof quizOutput>;

export const RECOMMENDATION_MIN = 3;
export const RECOMMENDATION_MAX = 5;

export const recommendationsOutput = z.object({
  encouragement: text('One short motivating sentence addressed to the learner'),
  items: z
    .array(
      z.object({
        courseId: text('The id of one candidate course, copied exactly'),
        reason: text('Short reason (at most 25 words) why this course fits the learner'),
      }),
    )
    .min(1)
    .max(RECOMMENDATION_MAX),
});
export type RecommendationsOutput = z.infer<typeof recommendationsOutput>;

import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

const idParam = z.string().trim().min(1).max(100);

export const courseIdParams = z.object({ id: idParam });
export const questionIdParams = z.object({ id: idParam });

export const listQuery = paginationQuery;

/** BR-09: nội dung câu hỏi / trả lời 1-1000 ký tự (sau khi trim). */
function content(label: string) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(1000, `${label} must be at most 1000 characters`);
}

export const createQuestionBody = z.object({ content: content('Question') });
export const createAnswerBody = z.object({ content: content('Answer') });

export type CourseIdParams = z.infer<typeof courseIdParams>;
export type QuestionIdParams = z.infer<typeof questionIdParams>;
export type ListQuery = z.infer<typeof listQuery>;
export type CreateQuestionBody = z.infer<typeof createQuestionBody>;
export type CreateAnswerBody = z.infer<typeof createAnswerBody>;

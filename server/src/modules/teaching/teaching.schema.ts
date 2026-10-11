import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';
import type { GradeSubmissionRequest, ReviewReplyRequest } from '@/types/teacherAdminDto';

const idParam = z.string().trim().min(1).max(100);

export const idParams = z.object({ id: idParam });

/** `GET /teacher/courses/:id/submissions?status=all|graded|ungraded&page&limit`. */
export const submissionsQuery = paginationQuery.extend({
  status: z.enum(['all', 'graded', 'ungraded']).default('all'),
});

/** BR-26: điểm nguyên 0-100, nhận xét 1-2000 ký tự (sau khi trim). */
export const gradeBody = z.object({
  grade: z
    .number({ error: 'Grade must be a number' })
    .int('Grade must be an integer')
    .min(0, 'Grade must be at least 0')
    .max(100, 'Grade must be at most 100'),
  feedback: z
    .string({ error: 'Feedback is required' })
    .trim()
    .min(1, 'Feedback is required')
    .max(2000, 'Feedback must be at most 2000 characters'),
}) satisfies z.ZodType<GradeSubmissionRequest>;

/** BR-25: phản hồi 1-1000 ký tự (sau khi trim). */
export const replyBody = z.object({
  reply: z
    .string({ error: 'Reply is required' })
    .trim()
    .min(1, 'Reply is required')
    .max(1000, 'Reply must be at most 1000 characters'),
}) satisfies z.ZodType<ReviewReplyRequest>;

export type IdParams = z.infer<typeof idParams>;
export type SubmissionsQuery = z.infer<typeof submissionsQuery>;
export type GradeBody = z.infer<typeof gradeBody>;
export type ReplyBody = z.infer<typeof replyBody>;

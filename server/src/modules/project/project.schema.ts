import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

export const courseIdParams = z.object({ id: z.string().trim().min(1).max(64) });

export const listSubmissionsQuery = paginationQuery;

/** Phần text của form multipart (file / image do multer xử lý). */
export const submissionBody = z.object({
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(100, 'Title must be at most 100 characters'),
  /** Rỗng = không có mô tả. */
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be at most 1000 characters')
    .optional()
    .transform((value) => value || undefined),
});

export type SubmissionInput = z.infer<typeof submissionBody>;

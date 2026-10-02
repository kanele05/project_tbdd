import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

export const courseIdParams = z.object({ id: z.string().trim().min(1).max(100) });
export const listBookmarksQuery = paginationQuery;

export type CourseIdParams = z.infer<typeof courseIdParams>;
export type ListBookmarksQuery = z.infer<typeof listBookmarksQuery>;

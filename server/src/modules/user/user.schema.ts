import { z } from 'zod';

export const updateMeBody = z
  .object({
    fullName: z
      .string({ error: 'Full name must be a string' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(60, 'Full name must be at most 60 characters')
      .optional(),
    /** Chuỗi rỗng / null = xóa headline. */
    headline: z
      .string({ error: 'Headline must be a string' })
      .trim()
      .max(100, 'Headline must be at most 100 characters')
      .nullable()
      .optional(),
  })
  .refine((body) => body.fullName !== undefined || body.headline !== undefined, {
    message: 'Provide at least one of fullName or headline',
  });

export type UpdateMeInput = z.infer<typeof updateMeBody>;

/** Avatar: chỉ png/jpg, tối đa 5 MB (PLAN §9.2). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

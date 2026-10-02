import { z } from 'zod';

export const addCartItemBody = z.object({
  courseId: z
    .string({ error: 'courseId is required' })
    .trim()
    .min(1, 'courseId is required')
    .max(64, 'courseId is too long'),
});

export const cartItemParams = z.object({ courseId: z.string().trim().min(1).max(64) });

export type AddCartItemInput = z.infer<typeof addCartItemBody>;

import { z } from 'zod';

/** Client-side validation of the Submit project form (PLAN.md SC-17). The file is checked apart. */
export const submitProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(100, 'Title must be at most 100 characters'),
  description: z.string().trim().max(1000, 'Description must be at most 1000 characters'),
});

export type SubmitProjectFormValues = z.infer<typeof submitProjectSchema>;

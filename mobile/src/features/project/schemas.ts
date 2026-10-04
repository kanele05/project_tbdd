import { z } from 'zod';

import { i18n } from '@/i18n';

/**
 * Client-side validation of the Submit project form (PLAN.md SC-17). The file is checked apart.
 * Messages are lazy (`error: () => ...`) so they are translated when the form is validated.
 */
export const submitProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('project:validation.titleRequired') })
    .max(100, { error: () => i18n.t('project:validation.titleMax') }),
  description: z
    .string()
    .trim()
    .max(1000, { error: () => i18n.t('project:validation.descriptionMax') }),
});

export type SubmitProjectFormValues = z.infer<typeof submitProjectSchema>;

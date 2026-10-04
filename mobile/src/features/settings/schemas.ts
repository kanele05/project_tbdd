import { z } from 'zod';

import { passwordRules } from '@/features/auth/schemas';
import { i18n } from '@/i18n';

/** Validation of the "Change password" form: same rules as sign-up, plus "different from now". */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: () => i18n.t('auth:validation.passwordRequired') }),
    newPassword: passwordRules,
    confirmPassword: z.string().min(1, { error: () => i18n.t('auth:validation.confirmRequired') }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: () => i18n.t('auth:validation.passwordMismatch'),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    error: () => i18n.t('settings:security.password.sameAsCurrent'),
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

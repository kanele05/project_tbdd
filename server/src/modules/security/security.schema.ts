import { z } from 'zod';

import {
  exactlyOneFactorIssue,
  existingPassword,
  hasExactlyOneFactor,
  newPassword,
  otpCode,
  secondFactorFields,
} from '@/modules/auth/auth.schema';

export const changePasswordBody = z
  .object({ currentPassword: existingPassword, newPassword })
  .refine((body) => body.currentPassword !== body.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export const enableTwoFactorBody = z.object({ code: otpCode });

/** Tắt 2FA: mật khẩu + (mã TOTP hoặc mã khôi phục). */
export const disableTwoFactorBody = z
  .object({ password: existingPassword, ...secondFactorFields })
  .refine(hasExactlyOneFactor, exactlyOneFactorIssue);

/** Tạo lại mã khôi phục: cần mã TOTP hoặc một mã khôi phục còn dùng được. */
export const recoveryCodesBody = z
  .object(secondFactorFields)
  .refine(hasExactlyOneFactor, exactlyOneFactorIssue);

export const sessionParams = z.object({
  id: z.string({ error: 'Session id is required' }).min(1).max(64),
});

export type ChangePasswordInput = z.infer<typeof changePasswordBody>;
export type EnableTwoFactorInput = z.infer<typeof enableTwoFactorBody>;
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorBody>;
export type RecoveryCodesInput = z.infer<typeof recoveryCodesBody>;
export type SessionParams = z.infer<typeof sessionParams>;

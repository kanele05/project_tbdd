import { z } from 'zod';

export const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email('Invalid email address'));

/** Mật khẩu mới: ≥ 8 ký tự, có chữ và số (FR-01); tối đa 72 vì bcrypt chỉ dùng 72 byte đầu. */
export const newPassword = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

/** Mật khẩu khi đăng nhập / xác nhận lại: không kiểm độ mạnh. */
export const existingPassword = z
  .string({ error: 'Password is required' })
  .min(1, 'Password is required')
  .max(72, 'Password must be at most 72 characters');

/** Token CAPTCHA do widget phía client trả về (Turnstile hoặc reCAPTCHA v2; token reCAPTCHA có thể dài hơn 2048 ký tự). */
const captchaToken = z
  .string({ error: 'CAPTCHA token must be a string' })
  .trim()
  .min(1, 'CAPTCHA token must not be empty')
  .max(8192, 'CAPTCHA token is too long')
  .optional();

/** Ngôn ngữ email (`vi`/`en`); giá trị khác bị bỏ qua và dùng `Accept-Language`. */
const lang = z.string().max(10).optional();

/** Tên thiết bị do app gửi (vd. "Pixel 7 · Expo Go"); thiếu thì server đoán từ User-Agent. */
const deviceName = z
  .string({ error: 'Device name must be a string' })
  .trim()
  .min(1)
  .max(80, 'Device name is too long')
  .optional();

/** Mã OTP 6 số gửi qua email. */
export const otpCode = z
  .string({ error: 'Code is required' })
  .trim()
  .regex(/^\d{6}$/, 'Code must be 6 digits');

/** Yếu tố thứ hai: mã TOTP 6 số HOẶC mã khôi phục (đúng một trong hai). */
export const secondFactorFields = {
  code: otpCode.optional(),
  recoveryCode: z
    .string({ error: 'Recovery code must be a string' })
    .trim()
    .min(1, 'Recovery code must not be empty')
    .max(32, 'Recovery code is too long')
    .optional(),
};

export function hasExactlyOneFactor(body: { code?: string; recoveryCode?: string }): boolean {
  return (body.code !== undefined) !== (body.recoveryCode !== undefined);
}

export const exactlyOneFactorIssue = {
  message: 'Provide either code or recoveryCode',
  path: ['code'],
};

export const registerBody = z.object({
  fullName: z
    .string({ error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(60, 'Full name must be at most 60 characters'),
  email,
  password: newPassword,
  role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
  captchaToken,
  lang,
});

export const loginBody = z.object({
  email,
  password: existingPassword,
  captchaToken,
  deviceName,
});

export const twoFactorLoginBody = z
  .object({
    challengeToken: z
      .string({ error: 'Challenge token is required' })
      .min(1, 'Challenge token is required')
      .max(2048),
    ...secondFactorFields,
    deviceName,
  })
  .refine(hasExactlyOneFactor, exactlyOneFactorIssue);

export const verifyEmailBody = z.object({ email, code: otpCode, deviceName });

export const resendVerificationBody = z.object({ email, lang });

export const forgotPasswordBody = z.object({ email, captchaToken, lang });

export const resetPasswordBody = z.object({ email, code: otpCode, newPassword });

export const refreshBody = z.object({
  refreshToken: z
    .string({ error: 'Refresh token is required' })
    .min(20, 'Invalid refresh token')
    .max(200, 'Invalid refresh token'),
});

/**
 * `refreshToken` tùy chọn: khi access token đã hết hạn app vẫn đăng xuất được bằng refresh token.
 * Cho phép không gửi body (Express để `req.body` = undefined) -> coi như `{}`.
 */
export const logoutBody = z.preprocess(
  (value) => value ?? {},
  z.object({ refreshToken: z.string().min(1).max(200).optional() }),
);

export type RegisterInput = z.infer<typeof registerBody>;
export type LoginInput = z.infer<typeof loginBody>;
export type TwoFactorLoginInput = z.infer<typeof twoFactorLoginBody>;
export type VerifyEmailInput = z.infer<typeof verifyEmailBody>;
export type ResendVerificationInput = z.infer<typeof resendVerificationBody>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBody>;
export type RefreshInput = z.infer<typeof refreshBody>;
export type LogoutInput = z.infer<typeof logoutBody>;

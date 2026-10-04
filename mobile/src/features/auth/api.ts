import { api } from '@/lib/apiClient';
import type {
  AuthSessionDto,
  ForgotPasswordRequest,
  LoginRequestV2,
  LoginResultDto,
  RegisterRequestV2,
  RegisterResultDto,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SentCodeDto,
  TwoFactorVerifyRequest,
  UserDto,
  VerifyEmailRequest,
} from '@/types/api';

/** Shorter timeout for the bootstrap call so a dead server does not hold the splash for long. */
const BOOTSTRAP_TIMEOUT_MS = 8000;
/** Logging out must never keep the user waiting for a slow server. */
const LOGOUT_TIMEOUT_MS = 5000;

export const authApi = {
  /**
   * `POST /auth/login` - a session, or `{ twoFactorRequired, challengeToken }`.
   * 401 INVALID_CREDENTIALS (`details.captchaRequired`), 403 EMAIL_NOT_VERIFIED, 423 ACCOUNT_LOCKED.
   */
  login: (body: LoginRequestV2) => api.post<LoginResultDto>('/auth/login', body),

  /** `POST /auth/register` - no tokens: the email OTP must be verified first. 409 EMAIL_TAKEN. */
  register: (body: RegisterRequestV2) => api.post<RegisterResultDto>('/auth/register', body),

  /** `POST /auth/verify-email` - the OTP is right => the session. 400 INVALID_CODE / CODE_EXPIRED. */
  verifyEmail: (body: VerifyEmailRequest) => api.post<AuthSessionDto>('/auth/verify-email', body),

  /** `POST /auth/resend-verification` - 429 RESEND_TOO_SOON. */
  resendVerification: (body: ResendVerificationRequest) =>
    api.post<SentCodeDto>('/auth/resend-verification', body),

  /** `POST /auth/2fa/verify` - second login step: TOTP code or recovery code. 401 INVALID_CHALLENGE. */
  verifyTwoFactor: (body: TwoFactorVerifyRequest) =>
    api.post<AuthSessionDto>('/auth/2fa/verify', body),

  /** `POST /auth/forgot-password` - always 200 (does not reveal whether the email exists). */
  forgotPassword: (body: ForgotPasswordRequest) =>
    api.post<SentCodeDto>('/auth/forgot-password', body),

  /** `POST /auth/reset-password` - 204; every session of the user is revoked. */
  resetPassword: (body: ResetPasswordRequest) => api.post<void>('/auth/reset-password', body),

  /** `POST /auth/logout` - revokes the session of `refreshToken` (idempotent, 204). */
  logout: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }, { timeout: LOGOUT_TIMEOUT_MS }),

  /** `GET /auth/me`. */
  me: () => api.get<UserDto>('/auth/me'),

  /** `GET /auth/me` used by the bootstrap (SC-01) with a short timeout. */
  meForBootstrap: () => api.get<UserDto>('/auth/me', undefined, { timeout: BOOTSTRAP_TIMEOUT_MS }),
};

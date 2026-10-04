import { api } from '@/lib/apiClient';
import type {
  ChangePasswordRequest,
  DisableTwoFactorRequest,
  EnableTwoFactorRequest,
  RecoveryCodesDto,
  RecoveryCodesRequest,
  SecurityOverviewDto,
  SessionDto,
  TwoFactorSetupDto,
} from '@/types/api';

/** Account security (AUTH-09, PLAN.md §9.2 "Security"): everything lives under `/me`. */
export const securityApi = {
  /** `GET /me/security`. */
  overview: () => api.get<SecurityOverviewDto>('/me/security'),

  /** `POST /me/password` - 204, every OTHER device is signed out. 422 INVALID_PASSWORD. */
  changePassword: (body: ChangePasswordRequest) => api.post<void>('/me/password', body),

  /** `GET /me/sessions` - signed-in devices, `isCurrent` marks this one. */
  sessions: () => api.get<SessionDto[]>('/me/sessions'),

  /** `DELETE /me/sessions/:id` - remote sign-out of one device. 404 SESSION_NOT_FOUND. */
  revokeSession: (id: string) => api.delete<void>(`/me/sessions/${encodeURIComponent(id)}`),

  /** `DELETE /me/sessions` - sign out every device except this one. */
  revokeOtherSessions: () => api.delete<{ revokedCount: number }>('/me/sessions'),

  /** `POST /me/2fa/setup` - a fresh secret + `otpauthUrl` for the QR code (2FA still off). */
  setupTwoFactor: () => api.post<TwoFactorSetupDto>('/me/2fa/setup'),

  /** `POST /me/2fa/enable` - the first valid code turns 2FA on and returns the recovery codes ONCE. */
  enableTwoFactor: (body: EnableTwoFactorRequest) =>
    api.post<RecoveryCodesDto>('/me/2fa/enable', body),

  /** `POST /me/2fa/disable` - password + (code | recovery code). */
  disableTwoFactor: (body: DisableTwoFactorRequest) => api.post<void>('/me/2fa/disable', body),

  /** `POST /me/2fa/recovery-codes` - new set of 10 codes (the old ones stop working). */
  regenerateRecoveryCodes: (body: RecoveryCodesRequest) =>
    api.post<RecoveryCodesDto>('/me/2fa/recovery-codes', body),
};

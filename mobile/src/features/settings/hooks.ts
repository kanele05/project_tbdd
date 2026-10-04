import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
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

import { securityApi } from './api';

/** `GET /me/security` - always fresh (2FA can change on another device). */
export function useSecurityOverview() {
  return useQuery<SecurityOverviewDto, Error>({
    queryKey: queryKeys.meSecurity(),
    queryFn: securityApi.overview,
    staleTime: 0,
  });
}

/** `GET /me/sessions` - the devices that are signed in. */
export function useSessions() {
  return useQuery<SessionDto[], Error>({
    queryKey: queryKeys.meSessions(),
    queryFn: securityApi.sessions,
    staleTime: 0,
  });
}

/** `POST /me/password` - other devices are signed out, so the device list changes too. */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, ChangePasswordRequest>({
    mutationFn: securityApi.changePassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.meSessions() }),
  });
}

/** `DELETE /me/sessions/:id`. */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: securityApi.revokeSession,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.meSessions() }),
  });
}

/** `DELETE /me/sessions` - "sign out all other devices". */
export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation<{ revokedCount: number }, Error, void>({
    mutationFn: securityApi.revokeOtherSessions,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.meSessions() }),
  });
}

/** `POST /me/2fa/setup` - a new secret every time it is called (until 2FA is enabled). */
export function useSetupTwoFactor() {
  return useMutation<TwoFactorSetupDto, Error, void>({ mutationFn: securityApi.setupTwoFactor });
}

/** `POST /me/2fa/enable` - returns the recovery codes (shown once, never cached by the query layer). */
export function useEnableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation<RecoveryCodesDto, Error, EnableTwoFactorRequest>({
    mutationFn: securityApi.enableTwoFactor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.meSecurity() }),
  });
}

/** `POST /me/2fa/disable`. */
export function useDisableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DisableTwoFactorRequest>({
    mutationFn: securityApi.disableTwoFactor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.meSecurity() }),
  });
}

/** `POST /me/2fa/recovery-codes`. */
export function useRegenerateRecoveryCodes() {
  const queryClient = useQueryClient();
  return useMutation<RecoveryCodesDto, Error, RecoveryCodesRequest>({
    mutationFn: securityApi.regenerateRecoveryCodes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.meSecurity() }),
  });
}

import { useMutation } from '@tanstack/react-query';

import { getCurrentLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
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
  VerifyEmailRequest,
} from '@/types/api';
import { getDeviceName } from '@/utils/deviceName';

import { authApi } from './api';

/** The app adds the device name and the UI language itself; screens only pass what the user typed. */
type WithoutDevice<T> = Omit<T, 'deviceName'>;
type WithoutLang<T> = Omit<T, 'lang'>;
/** `Omit` on a union keeps only the shared keys, so distribute it. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * `POST /auth/login`. A plain session is stored right away; a `twoFactorRequired` result is handed
 * back to the screen, which continues with `useTwoFactorLogin`.
 */
export function useLogin() {
  const login = useAuthStore((state) => state.login);
  return useMutation<LoginResultDto, Error, WithoutDevice<LoginRequestV2>>({
    mutationFn: (body) => authApi.login({ ...body, deviceName: getDeviceName() }),
    onSuccess: async (result) => {
      if (!result.twoFactorRequired) await login(result);
    },
  });
}

/** `POST /auth/register`: no session yet - the email OTP has to be verified first. */
export function useRegister() {
  return useMutation<RegisterResultDto, Error, WithoutLang<RegisterRequestV2>>({
    mutationFn: (body) => authApi.register({ ...body, lang: getCurrentLanguage() }),
  });
}

/** `POST /auth/verify-email`: the right OTP logs the user in. */
export function useVerifyEmail() {
  const login = useAuthStore((state) => state.login);
  return useMutation<AuthSessionDto, Error, WithoutDevice<VerifyEmailRequest>>({
    mutationFn: (body) => authApi.verifyEmail({ ...body, deviceName: getDeviceName() }),
    onSuccess: (session) => login(session),
  });
}

/** `POST /auth/resend-verification` (429 RESEND_TOO_SOON when asked again before the cooldown). */
export function useResendVerification() {
  return useMutation<SentCodeDto, Error, WithoutLang<ResendVerificationRequest>>({
    mutationFn: (body) => authApi.resendVerification({ ...body, lang: getCurrentLanguage() }),
  });
}

/** `POST /auth/2fa/verify`: second login step (TOTP code or recovery code). */
export function useTwoFactorLogin() {
  const login = useAuthStore((state) => state.login);
  return useMutation<AuthSessionDto, Error, DistributiveOmit<TwoFactorVerifyRequest, 'deviceName'>>(
    {
      mutationFn: (body) => authApi.verifyTwoFactor({ ...body, deviceName: getDeviceName() }),
      onSuccess: (session) => login(session),
    },
  );
}

/** `POST /auth/forgot-password` (always succeeds, whether or not the email has an account). */
export function useForgotPassword() {
  return useMutation<SentCodeDto, Error, WithoutLang<ForgotPasswordRequest>>({
    mutationFn: (body) => authApi.forgotPassword({ ...body, lang: getCurrentLanguage() }),
  });
}

/** `POST /auth/reset-password`: all sessions of the user are revoked on the server. */
export function useResetPassword() {
  return useMutation<void, Error, ResetPasswordRequest>({
    mutationFn: authApi.resetPassword,
  });
}

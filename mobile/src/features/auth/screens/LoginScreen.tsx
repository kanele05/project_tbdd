import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, View, type TextInput } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import { layout, makeStyles, spacing } from '@/theme';

import { applyAuthError, getAuthErrorDetails } from '../authErrors';
import { useAuthFlowStore } from '../authFlowStore';
import { nowMs } from '../clock';
import { AuthLayout } from '../components/AuthLayout';
import { CaptchaWidget } from '../components/CaptchaWidget';
import { FormError } from '../components/FormError';
import { FormNotice } from '../components/FormNotice';
import { LockoutBanner } from '../components/LockoutBanner';
import { useLogin } from '../hooks';
import { loginSchema, type LoginFormValues } from '../schemas';
import { useCaptcha } from '../useCaptcha';
import { useCountdown } from '../useCountdown';

const FIELDS = ['email', 'password'] as const;

/**
 * SC-02 Login: email + password. Depending on the answer it continues to Home, to the 2FA step,
 * to email verification, shows the CAPTCHA (after repeated failures) or counts down an account lock.
 */
export function LoginScreen() {
  const { t } = useTranslation(['auth', 'errors']);
  const toast = useToast();
  const login = useLogin();
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const loginNotice = useAuthFlowStore((state) => state.loginNotice);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const lockSecondsLeft = useCountdown(lockedUntil);
  const isLocked = lockSecondsLeft > 0;
  const captcha = useCaptcha();
  const passwordRef = useRef<TextInput>(null);
  const styles = useStyles();

  const { control, handleSubmit, setError, setValue } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    // Tell the user why they landed here after a forced logout (refresh token refused).
    if (sessionExpired) toast.info(t('errors:sessionExpired'));
  }, [sessionExpired, toast, t]);

  useEffect(() => {
    // Coming back from "reset password": pre-fill the email they just reset.
    if (loginNotice === 'passwordReset') {
      const { resetEmail, clearReset } = useAuthFlowStore.getState();
      if (resetEmail) setValue('email', resetEmail);
      clearReset();
    }
  }, [loginNotice, setValue]);

  const handleError = (error: unknown, email: string) => {
    const appError = toAppError(error);
    const details = getAuthErrorDetails(appError);

    if (appError.code === 'ACCOUNT_LOCKED') {
      setLockedUntil(nowMs() + (details.retryAfterSec ?? 900) * 1000);
      return;
    }
    if (appError.code === 'EMAIL_NOT_VERIFIED') {
      useAuthFlowStore
        .getState()
        .startVerifyEmail(details.email ?? email, details.resendAfter ?? 0);
      router.push('/verify-email');
      return;
    }
    if (details.captchaRequired) setIsCaptchaRequired(true);
    setFormError(applyAuthError(error, setError, FIELDS));
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    useAuthFlowStore.getState().setLoginNotice(null);
    if (isCaptchaRequired && !captcha.token) {
      setFormError(t('captcha.required'));
      return;
    }
    const email = values.email.trim();
    try {
      const result = await login.mutateAsync({
        email,
        password: values.password,
        captchaToken: captcha.token ?? undefined,
      });
      if (result.twoFactorRequired) {
        useAuthFlowStore
          .getState()
          .startTwoFactor(result.challengeToken, result.challengeExpiresIn);
        setValue('password', '');
        router.push('/two-factor');
        return;
      }
      router.replace('/');
    } catch (error) {
      handleError(error, email);
    } finally {
      // The token is single-use: a failed attempt needs a fresh challenge.
      if (captcha.token) captcha.reset();
    }
  });

  return (
    <AuthLayout
      title={t('welcomeBack')}
      subtitle={t('loginSubtitle')}
      footer={
        <>
          <AppText variant="body" color="textSecondary">
            {t('noAccount')}
          </AppText>
          <Pressable
            onPress={() => router.push('/register')}
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            accessibilityRole="link"
            accessibilityLabel={t('signUp')}
          >
            <AppText variant="label" color="primaryText">
              {t('signUp')}
            </AppText>
          </Pressable>
        </>
      }
    >
      {loginNotice === 'passwordReset' ? (
        <FormNotice message={t('loginScreen.passwordResetDone')} tone="success" />
      ) : null}
      <FormTextField
        control={control}
        name="email"
        label={t('email')}
        placeholder={t('placeholders.email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <View style={styles.passwordGroup}>
        <FormTextField
          ref={passwordRef}
          control={control}
          name="password"
          label={t('password')}
          placeholder={t('placeholders.password')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
        <Pressable
          onPress={() => router.push('/forgot-password')}
          hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
          accessibilityRole="link"
          accessibilityLabel={t('loginScreen.forgotPassword')}
          style={styles.forgot}
          testID="login-forgot"
        >
          <AppText variant="label" color="primaryText">
            {t('loginScreen.forgotPassword')}
          </AppText>
        </Pressable>
      </View>
      {isCaptchaRequired && !isLocked ? (
        <CaptchaWidget
          onToken={captcha.onToken}
          onExpire={captcha.onExpire}
          onError={captcha.onError}
          resetKey={captcha.resetKey}
        />
      ) : null}
      <LockoutBanner secondsLeft={lockSecondsLeft} />
      <FormError message={formError} />
      <Button
        title={t('login')}
        onPress={onSubmit}
        loading={login.isPending}
        disabled={isLocked}
        fullWidth
        testID="login-submit"
      />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  passwordGroup: { gap: spacing.sm },
  // Aligned with the input's right edge; the 48 dp touch target comes from hitSlop + min height.
  forgot: {
    alignSelf: 'flex-end',
    minHeight: layout.minTouchTarget - 16,
    justifyContent: 'center',
  },
}));

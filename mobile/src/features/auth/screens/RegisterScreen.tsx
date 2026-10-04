import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, type TextInput } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { useTranslation } from '@/i18n';

import { applyAuthError } from '../authErrors';
import { useAuthFlowStore } from '../authFlowStore';
import { AuthLayout } from '../components/AuthLayout';
import { FormError } from '../components/FormError';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { useRegister } from '../hooks';
import { registerSchema, type RegisterFormValues } from '../schemas';
import { useCaptcha } from '../useCaptcha';

const FIELDS = ['fullName', 'email', 'password', 'confirmPassword'] as const;

function goToLogin(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}

/**
 * SC-03 Register: needs a CAPTCHA token; on success the server emails a 6-digit code and the user
 * continues to "Verify email" (no session is created before the email is confirmed).
 */
export function RegisterScreen() {
  const { t } = useTranslation('auth');
  const register = useRegister();
  const captcha = useCaptcha();
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { control, handleSubmit, setError } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!captcha.token) {
      setFormError(t('captcha.required'));
      return;
    }
    const email = values.email.trim();
    try {
      const result = await register.mutateAsync({
        fullName: values.fullName.trim(),
        email,
        password: values.password,
        captchaToken: captcha.token,
      });
      useAuthFlowStore.getState().startVerifyEmail(email, result.resendAfter);
      router.replace('/verify-email');
    } catch (error) {
      setFormError(applyAuthError(error, setError, FIELDS));
    } finally {
      // The token is single-use: a failed attempt needs a fresh challenge.
      captcha.reset();
    }
  });

  return (
    <AuthLayout
      title={t('createAccountTitle')}
      subtitle={t('createAccountSubtitle')}
      footer={
        <>
          <AppText variant="body" color="textSecondary">
            {t('haveAccount')}
          </AppText>
          <Pressable
            onPress={goToLogin}
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            accessibilityRole="link"
            accessibilityLabel={t('login')}
          >
            <AppText variant="label" color="primaryText">
              {t('login')}
            </AppText>
          </Pressable>
        </>
      }
    >
      <FormTextField
        control={control}
        name="fullName"
        label={t('fullName')}
        placeholder={t('placeholders.fullName')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <FormTextField
        ref={emailRef}
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
      <FormTextField
        ref={passwordRef}
        control={control}
        name="password"
        label={t('password')}
        placeholder={t('placeholders.newPassword')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <FormTextField
        ref={confirmRef}
        control={control}
        name="confirmPassword"
        label={t('confirmPassword')}
        placeholder={t('placeholders.confirmPassword')}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <TurnstileWidget
        onToken={captcha.onToken}
        onExpire={captcha.onExpire}
        resetKey={captcha.resetKey}
      />
      <FormError message={formError} />
      <Button
        title={t('register')}
        onPress={onSubmit}
        loading={register.isPending}
        fullWidth
        testID="register-submit"
      />
    </AuthLayout>
  );
}

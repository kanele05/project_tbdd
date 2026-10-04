import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';

import { applyAuthError } from '../authErrors';
import { useAuthFlowStore } from '../authFlowStore';
import { AuthLayout } from '../components/AuthLayout';
import { FormError } from '../components/FormError';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { useForgotPassword } from '../hooks';
import { goToLogin } from '../navigation';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas';
import { useCaptcha } from '../useCaptcha';

const FIELDS = ['email'] as const;

/**
 * Forgot password: email + CAPTCHA. The answer is always the same ("if the email has an account, a
 * code was sent"), so the screen never reveals which emails are registered.
 */
export function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const toast = useToast();
  const forgot = useForgotPassword();
  const captcha = useCaptcha();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!captcha.token) {
      setFormError(t('captcha.required'));
      return;
    }
    const email = values.email.trim();
    try {
      await forgot.mutateAsync({ email, captchaToken: captcha.token });
      useAuthFlowStore.getState().startReset(email);
      toast.info(t('forgotPassword.sent'));
      router.push('/reset-password');
    } catch (error) {
      setFormError(applyAuthError(error, setError, FIELDS));
    } finally {
      // The token is single-use: a failed attempt needs a fresh challenge.
      captcha.reset();
    }
  });

  return (
    <AuthLayout
      icon="key"
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      onBack={goToLogin}
    >
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
        title={t('forgotPassword.submit')}
        onPress={onSubmit}
        loading={forgot.isPending}
        fullWidth
        testID="forgot-submit"
      />
    </AuthLayout>
  );
}

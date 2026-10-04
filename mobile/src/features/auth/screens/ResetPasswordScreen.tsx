import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View, type TextInput } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/appError';
import { makeStyles, spacing } from '@/theme';

import { applyAuthError, getAuthErrorMessage } from '../authErrors';
import { useAuthFlowStore } from '../authFlowStore';
import { AuthLayout } from '../components/AuthLayout';
import { FormError } from '../components/FormError';
import { OtpInput } from '../components/OtpInput';
import { useResetPassword } from '../hooks';
import { goBackOrLogin, goToLogin } from '../navigation';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas';

const FIELDS = ['code', 'password', 'confirmPassword'] as const;

/**
 * Reset password: the 6-digit code from the email + the new password (8-72 characters, a letter and
 * a digit). Success signs the account out everywhere and returns to Login with a confirmation.
 */
export function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const styles = useStyles();
  const email = useAuthFlowStore((state) => state.resetEmail);
  // The flow lives in memory only: after a reload there is no email to reset, back to Login.
  const hadFlow = useRef(email !== null);
  const reset = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const [isCodeDead, setIsCodeDead] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { control, handleSubmit, setError, setValue } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!hadFlow.current) goToLogin();
  }, []);

  if (!email) return null;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setIsCodeDead(false);
    try {
      await reset.mutateAsync({ email, code: values.code, newPassword: values.password });
      useAuthFlowStore.getState().setLoginNotice('passwordReset');
      goToLogin();
    } catch (error) {
      const { code } = toAppError(error);
      if (code === 'INVALID_CODE') {
        setError('code', { type: 'server', message: getAuthErrorMessage(error) });
        setValue('code', '');
        return;
      }
      if (code === 'CODE_EXPIRED' || code === 'TOO_MANY_ATTEMPTS') setIsCodeDead(true);
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  return (
    <AuthLayout
      icon="lock"
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle', { email })}
      onBack={goBackOrLogin}
      footer={
        <>
          <AppText variant="body" color="textSecondary">
            {t('resetPassword.noCode')}
          </AppText>
          <Button
            title={t('resetPassword.requestNew')}
            variant={isCodeDead ? 'outline' : 'ghost'}
            size="sm"
            onPress={goBackOrLogin}
            testID="reset-request-new"
          />
        </>
      }
    >
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <View style={styles.codeField}>
            <AppText variant="label">{t('resetPassword.codeLabel')}</AppText>
            <OtpInput
              value={field.value}
              onChange={field.onChange}
              label={t('otp.label')}
              autoFocus
              hasError={Boolean(fieldState.error)}
              testID="reset-otp"
            />
            {fieldState.error ? (
              <AppText
                variant="caption"
                color="dangerText"
                accessibilityLiveRegion="polite"
                testID="reset-code-error"
              >
                {fieldState.error.message}
              </AppText>
            ) : null}
          </View>
        )}
      />
      <FormTextField
        ref={passwordRef}
        control={control}
        name="password"
        label={t('resetPassword.newPassword')}
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
      <FormError message={formError} />
      <Button
        title={t('resetPassword.submit')}
        onPress={onSubmit}
        loading={reset.isPending}
        fullWidth
        testID="reset-submit"
      />
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  codeField: { gap: spacing.sm },
}));

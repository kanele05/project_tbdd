import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, type TextInput } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { useToast } from '@/components/ui/Toast';
import { ERROR_MESSAGES, STRINGS } from '@/constants/strings';
import { useAuthStore } from '@/stores/authStore';

import { applyAuthError } from '../authErrors';
import { AuthLayout } from '../components/AuthLayout';
import { FormError } from '../components/FormError';
import { useLogin } from '../hooks';
import { loginSchema, type LoginFormValues } from '../schemas';

const FIELDS = ['email', 'password'] as const;

/** SC-02 Login: email + password, server errors under the form, link to Register. */
export function LoginScreen() {
  const toast = useToast();
  const login = useLogin();
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const { control, handleSubmit, setError } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    // Tell the user why they landed here after a forced logout (401).
    if (sessionExpired) toast.info(ERROR_MESSAGES.UNAUTHORIZED);
  }, [sessionExpired, toast]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync({ email: values.email.trim(), password: values.password });
      router.replace('/');
    } catch (error) {
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  return (
    <AuthLayout
      title={STRINGS.auth.welcomeBack}
      subtitle={STRINGS.auth.loginSubtitle}
      footer={
        <>
          <AppText variant="body" color="textSecondary">
            {STRINGS.auth.noAccount}
          </AppText>
          <Pressable
            onPress={() => router.push('/register')}
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            accessibilityRole="link"
            accessibilityLabel={STRINGS.auth.signUp}
          >
            <AppText variant="label" color="primaryText">
              {STRINGS.auth.signUp}
            </AppText>
          </Pressable>
        </>
      }
    >
      <FormTextField
        control={control}
        name="email"
        label={STRINGS.auth.email}
        placeholder="you@example.com"
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
        label={STRINGS.auth.password}
        placeholder="Enter your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <FormError message={formError} />
      <Button
        title={STRINGS.auth.login}
        onPress={onSubmit}
        loading={login.isPending}
        fullWidth
        testID="login-submit"
      />
    </AuthLayout>
  );
}

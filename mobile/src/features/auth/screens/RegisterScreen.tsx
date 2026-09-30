import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, type TextInput } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { STRINGS } from '@/constants/strings';

import { applyAuthError } from '../authErrors';
import { AuthLayout } from '../components/AuthLayout';
import { FormError } from '../components/FormError';
import { useRegister } from '../hooks';
import { registerSchema, type RegisterFormValues } from '../schemas';

const FIELDS = ['fullName', 'email', 'password', 'confirmPassword'] as const;

function goToLogin(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}

/** SC-03 Register: on success the user is logged in and lands on Home. */
export function RegisterScreen() {
  const register = useRegister();
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
    try {
      await register.mutateAsync({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      router.replace('/');
    } catch (error) {
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  return (
    <AuthLayout
      title={STRINGS.auth.createAccountTitle}
      subtitle={STRINGS.auth.createAccountSubtitle}
      footer={
        <>
          <AppText variant="body" color="textSecondary">
            {STRINGS.auth.haveAccount}
          </AppText>
          <Pressable
            onPress={goToLogin}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="link"
            accessibilityLabel={STRINGS.auth.login}
          >
            <AppText variant="label" color="primary">
              {STRINGS.auth.login}
            </AppText>
          </Pressable>
        </>
      }
    >
      <FormTextField
        control={control}
        name="fullName"
        label={STRINGS.auth.fullName}
        placeholder="Your full name"
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
        placeholder="At least 8 characters, letters and numbers"
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
        label={STRINGS.auth.confirmPassword}
        placeholder="Re-enter your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <FormError message={formError} />
      <Button
        title={STRINGS.auth.register}
        onPress={onSubmit}
        loading={register.isPending}
        fullWidth
        testID="register-submit"
      />
    </AuthLayout>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { useToast } from '@/components/ui/Toast';
import { applyAuthError, getAuthErrorMessage } from '@/features/auth/authErrors';
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/appError';
import { makeStyles, spacing } from '@/theme';

import { useChangePassword } from '../hooks';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas';
import { SecurityCard } from './SecurityCard';

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const;
const EMPTY: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/** "Change password": a collapsed card that opens an inline form. Other devices are signed out. */
export function ChangePasswordCard() {
  const { t } = useTranslation(['settings', 'auth']);
  const toast = useToast();
  const styles = useStyles();
  const change = useChangePassword();
  const [isOpen, setIsOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { control, handleSubmit, setError, reset } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const close = () => {
    setIsOpen(false);
    setFormError(null);
    reset(EMPTY);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      close();
      toast.success(t('settings:security.password.success'));
    } catch (error) {
      if (toAppError(error).code === 'INVALID_PASSWORD') {
        setError('currentPassword', { type: 'server', message: getAuthErrorMessage(error) });
        return;
      }
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  return (
    <SecurityCard
      icon="lock"
      title={t('settings:security.password.title')}
      description={t('settings:security.password.description')}
      testID="change-password-card"
    >
      {isOpen ? (
        <View style={styles.form}>
          <FormTextField
            control={control}
            name="currentPassword"
            label={t('settings:security.password.current')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="next"
            onSubmitEditing={() => newRef.current?.focus()}
          />
          <FormTextField
            ref={newRef}
            control={control}
            name="newPassword"
            label={t('settings:security.password.new')}
            placeholder={t('auth:placeholders.newPassword')}
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
            label={t('settings:security.password.confirm')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
          <FormError message={formError} />
          <View style={styles.actions}>
            <Button
              title={t('settings:security.password.submit')}
              onPress={onSubmit}
              loading={change.isPending}
              testID="change-password-submit"
            />
            <Button title={t('settings:security.cancel')} variant="ghost" onPress={close} />
          </View>
        </View>
      ) : (
        <Button
          title={t('settings:security.password.change')}
          variant="secondary"
          leftIcon="edit-2"
          onPress={() => setIsOpen(true)}
          testID="change-password-open"
        />
      )}
    </SecurityCard>
  );
}

const useStyles = makeStyles(() => ({
  form: { gap: spacing.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
}));

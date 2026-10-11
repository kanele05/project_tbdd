import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { z } from 'zod';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';

import { REASON_MAX_LENGTH } from '../adminMeta';
import type { ReasonFormValues } from '../schemas';

export type ReasonModalProps = {
  isVisible: boolean;
  title: string;
  message?: string;
  label: string;
  submitLabel: string;
  /** zod schema of `{ reason }` (required or optional variant). */
  schema: z.ZodType<ReasonFormValues, ReasonFormValues>;
  isSubmitting?: boolean;
  /** Error of the last attempt, shown inside the dialog (a toast would sit behind the modal). */
  errorMessage?: string | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
};

/**
 * Dialog with one multiline "reason" field (reject a course, archive it, disable a user). Built on
 * react-hook-form + zod; the error of a failed request is shown in the dialog itself.
 */
export function ReasonModal({
  isVisible,
  title,
  message,
  label,
  submitLabel,
  schema,
  isSubmitting = false,
  errorMessage,
  onSubmit,
  onClose,
}: ReasonModalProps) {
  const { t } = useTranslation(['admin', 'common']);
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { control, handleSubmit, reset } = useForm<ReasonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });
  const length = (useWatch({ control, name: 'reason' }) ?? '').trim().length;

  useEffect(() => {
    if (isVisible) reset({ reason: '' });
  }, [isVisible, reset]);

  const submit = handleSubmit((values) => onSubmit(values.reason));

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={isSubmitting ? undefined : onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={isSubmitting ? undefined : onClose}
          accessible={false}
          importantForAccessibility="no"
        />
        <View style={[styles.sheet, { marginBottom: insets.bottom + spacing.lg }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <AppText variant="h3" accessibilityRole="header">
              {title}
            </AppText>
            {message ? (
              <AppText variant="body" color="textSecondary">
                {message}
              </AppText>
            ) : null}
            <FormTextField
              control={control}
              name="reason"
              label={label}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              helperText={t('reason.counter', { count: length, max: REASON_MAX_LENGTH })}
              autoFocus
              editable={!isSubmitting}
              testID="reason-input"
            />
            {errorMessage ? (
              <AppText variant="caption" color="dangerText" accessibilityRole="alert">
                {errorMessage}
              </AppText>
            ) : null}
            <View style={styles.actions}>
              <Button
                title={t('common:actions.cancel')}
                variant="secondary"
                onPress={onClose}
                disabled={isSubmitting}
              />
              <Button
                title={submitLabel}
                onPress={() => void submit()}
                loading={isSubmitting}
                testID="reason-submit"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: t.colors.overlay },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    marginHorizontal: layout.screenPaddingX,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  content: { gap: spacing.md, padding: spacing.xl },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
}));

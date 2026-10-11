import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { FormError } from '@/features/auth/components/FormError';
import { i18n, useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import { STUDIO_LIMITS } from '../limits';
import { BottomSheet } from './BottomSheet';

const sectionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t('studio:validation.sectionTitleRequired') })
    .max(STUDIO_LIMITS.sectionTitleMax, {
      error: () =>
        i18n.t('studio:validation.sectionTitleMax', { count: STUDIO_LIMITS.sectionTitleMax }),
    }),
});

type SectionValues = z.infer<typeof sectionSchema>;

export type SectionTitleSheetProps = {
  visible: boolean;
  /** `null` = a new section. */
  initialTitle: string | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (title: string) => void;
};

function SectionForm({
  initialTitle,
  isSaving,
  error,
  onSubmit,
}: Omit<SectionTitleSheetProps, 'visible' | 'onClose'>) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const { control, handleSubmit } = useForm<SectionValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: { title: initialTitle ?? '' },
  });
  return (
    <View style={styles.form}>
      <FormTextField
        control={control}
        name="title"
        label={t('section.title')}
        placeholder={t('section.titlePlaceholder')}
        maxLength={STUDIO_LIMITS.sectionTitleMax}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void handleSubmit((values) => onSubmit(values.title.trim()))()}
      />
      <FormError message={error} />
      <Button
        title={t('section.save')}
        onPress={() => void handleSubmit((values) => onSubmit(values.title.trim()))()}
        loading={isSaving}
        fullWidth
        testID="section-save"
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({ form: { gap: spacing.lg } }));

/** Small bottom sheet to name a new section or rename one. */
export function SectionTitleSheet({ visible, onClose, ...formProps }: SectionTitleSheetProps) {
  const { t } = useTranslation('studio');
  return (
    <BottomSheet
      visible={visible}
      title={formProps.initialTitle === null ? t('section.addTitle') : t('section.editTitle')}
      onClose={onClose}
      testID="section-sheet"
    >
      <SectionForm {...formProps} />
    </BottomSheet>
  );
}

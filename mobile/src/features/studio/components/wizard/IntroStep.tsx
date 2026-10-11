import { Controller, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme';

import { STUDIO_LIMITS } from '../../limits';
import { BenefitsEditor } from '../BenefitsEditor';
import { CoverPicker } from '../CoverPicker';
import type { StepProps } from './stepTypes';

export type IntroStepProps = StepProps & {
  /** Opens the AI draft sheet (SC-27) limited to the subtitle and the description. */
  onHelpWrite: () => void;
};

/** Step 2 - what learners read: subtitle, description, learning points, project and cover. */
export function IntroStep({ form, mode, isBusy, onHelpWrite }: IntroStepProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  const { control } = form;
  const isDisabled = isBusy || !mode.canEditMinor;
  const descriptionLength = (useWatch({ control, name: 'description' }) ?? '').trim().length;
  return (
    <>
      <FormTextField
        control={control}
        name="subtitle"
        label={t('edit.fields.subtitle')}
        placeholder={t('edit.fields.subtitlePlaceholder')}
        maxLength={STUDIO_LIMITS.subtitleMax}
        editable={!isDisabled}
      />
      <View style={styles.descriptionBlock}>
        <View style={styles.labelRow}>
          <AppText variant="label">{t('edit.fields.description')}</AppText>
          {!isDisabled ? (
            <Button
              title={t('wizard.intro.helpWrite')}
              variant="ghost"
              size="sm"
              leftAdornment={<SparklesIcon size={16} color={colors.primaryText} />}
              onPress={onHelpWrite}
              testID="intro-help-write"
            />
          ) : null}
        </View>
        <FormTextField
          control={control}
          name="description"
          accessibilityLabel={t('edit.fields.description')}
          placeholder={t('edit.fields.descriptionPlaceholder')}
          multiline
          numberOfLines={7}
          textAlignVertical="top"
          maxLength={STUDIO_LIMITS.descriptionMax}
          helperText={t('edit.fields.descriptionHelper', {
            count: descriptionLength,
            min: STUDIO_LIMITS.descriptionMin,
          })}
          editable={!isDisabled}
        />
      </View>
      <Controller
        control={control}
        name="benefits"
        render={({ field }) => (
          <BenefitsEditor
            value={field.value}
            onChange={(items) => field.onChange(items)}
            disabled={isDisabled}
          />
        )}
      />
      <Controller
        control={control}
        name="thumbnailUrl"
        render={({ field, fieldState }) => (
          <CoverPicker
            value={field.value}
            onChange={(url) => field.onChange(url)}
            disabled={isDisabled}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormTextField
        control={control}
        name="projectDescription"
        label={t('edit.fields.project')}
        placeholder={t('edit.fields.projectPlaceholder')}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        maxLength={STUDIO_LIMITS.projectDescriptionMax}
        editable={!isDisabled}
      />
    </>
  );
}

const useStyles = makeStyles(() => ({
  descriptionBlock: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));

import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { FormTextField } from '@/components/ui/FormTextField';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { TagDto } from '@/types/api';

import type { CourseFormValues } from '../courseForm';
import type { CourseEditMode } from '../editMode';
import { STUDIO_LIMITS } from '../limits';
import { BenefitsEditor } from './BenefitsEditor';
import { CoverPicker } from './CoverPicker';
import { StatusChip } from './StatusChip';
import { CategoryPicker, TagPicker } from './TaxonomyPickers';

/** Window width from which the editor puts basic info and details side by side (web). */
export const TWO_COLUMN_MIN_WIDTH = 900;

export type CourseInfoFieldsProps = {
  form: UseFormReturn<CourseFormValues>;
  mode: CourseEditMode;
  knownTags: readonly TagDto[];
  isBusy: boolean;
};

/**
 * The fields of SC-24. Left column "Basic info" holds the MAJOR fields (title, category, tags,
 * price): on a published course they belong to the revision and are marked as such. Right column
 * "Details" holds the MINOR ones (cover, subtitle, description, benefits, project) that always
 * save directly. Two columns from 900 dp wide, one column below.
 */
export function CourseInfoFields({ form, mode, knownTags, isBusy }: CourseInfoFieldsProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const isTwoColumn = width >= TWO_COLUMN_MIN_WIDTH;
  const { control } = form;
  const isMajorDisabled = isBusy || !mode.canEditMajor;
  const isMinorDisabled = isBusy || !mode.canEditMinor;
  const descriptionLength = (useWatch({ control, name: 'description' }) ?? '').trim().length;
  const isRevisionPart = mode.kind === 'published';

  return (
    <View style={[styles.columns, isTwoColumn ? styles.columnsWide : null]}>
      <View style={styles.column} testID="edit-basic-section">
        <View style={styles.sectionHeader}>
          <AppText variant="h3" accessibilityRole="header">
            {t('edit.basic')}
          </AppText>
          {isRevisionPart && mode.canEditMajor ? <StatusChip revision="OPEN" /> : null}
        </View>
        <FormTextField
          control={control}
          name="title"
          label={t('edit.fields.title')}
          placeholder={t('edit.fields.titlePlaceholder')}
          maxLength={STUDIO_LIMITS.titleMax}
          returnKeyType="next"
          editable={!isMajorDisabled}
        />
        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <CategoryPicker
              label={t('edit.fields.category')}
              value={field.value}
              onChange={(id) => field.onChange(id)}
              disabled={isMajorDisabled}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="tagIds"
          render={({ field, fieldState }) => (
            <TagPicker
              label={t('edit.fields.tags')}
              value={field.value}
              onChange={(ids) => field.onChange(ids)}
              knownTags={knownTags}
              disabled={isMajorDisabled}
              error={fieldState.error?.message}
              helper={t('edit.fields.tagsHelper')}
            />
          )}
        />
        <View style={styles.priceRow}>
          <FormTextField
            control={control}
            name="price"
            label={t('edit.fields.price')}
            placeholder="0"
            keyboardType="decimal-pad"
            leftIcon="dollar-sign"
            helperText={t('edit.fields.priceHelper')}
            containerStyle={styles.priceField}
            editable={!isMajorDisabled}
          />
          <FormTextField
            control={control}
            name="originalPrice"
            label={t('edit.fields.originalPrice')}
            placeholder="0"
            keyboardType="decimal-pad"
            leftIcon="dollar-sign"
            helperText={t('edit.fields.originalPriceHelper')}
            containerStyle={styles.priceField}
            editable={!isMajorDisabled}
          />
        </View>
      </View>

      <View style={styles.column} testID="edit-details-section">
        <AppText variant="h3" accessibilityRole="header">
          {t('edit.details')}
        </AppText>
        <Controller
          control={control}
          name="thumbnailUrl"
          render={({ field, fieldState }) => (
            <CoverPicker
              value={field.value}
              onChange={(url) => form.setValue('thumbnailUrl', url, { shouldDirty: true })}
              disabled={isMinorDisabled}
              error={fieldState.error?.message}
            />
          )}
        />
        <FormTextField
          control={control}
          name="subtitle"
          label={t('edit.fields.subtitle')}
          placeholder={t('edit.fields.subtitlePlaceholder')}
          maxLength={STUDIO_LIMITS.subtitleMax}
          editable={!isMinorDisabled}
        />
        <FormTextField
          control={control}
          name="description"
          label={t('edit.fields.description')}
          placeholder={t('edit.fields.descriptionPlaceholder')}
          multiline
          numberOfLines={7}
          textAlignVertical="top"
          maxLength={STUDIO_LIMITS.descriptionMax}
          helperText={t('edit.fields.descriptionHelper', {
            count: descriptionLength,
            min: STUDIO_LIMITS.descriptionMin,
          })}
          editable={!isMinorDisabled}
        />
        <Controller
          control={control}
          name="benefits"
          render={({ field }) => (
            <BenefitsEditor
              value={field.value}
              onChange={(items) => field.onChange(items)}
              disabled={isMinorDisabled}
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
          editable={!isMinorDisabled}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  columns: { gap: spacing.xxl },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, gap: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceRow: { flexDirection: 'row', gap: spacing.md },
  priceField: { flex: 1 },
}));

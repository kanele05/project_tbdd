import { Controller } from 'react-hook-form';

import { AiCard } from '@/components/ui/AiCard';
import { FormTextField } from '@/components/ui/FormTextField';
import { useTranslation } from '@/i18n';

import { STUDIO_LIMITS } from '../../limits';
import { CategoryPicker } from '../TaxonomyPickers';
import type { StepProps } from './stepTypes';

export type IdeaStepProps = StepProps & {
  /** Opens the AI draft sheet (SC-27) with the typed title as topic. */
  onSuggest: () => void;
};

/** Step 1 - title and category (the two things a draft needs), plus the AI suggestion card. */
export function IdeaStep({ form, mode, isBusy, onSuggest }: IdeaStepProps) {
  const { t } = useTranslation('studio');
  const isMajorDisabled = isBusy || !mode.canEditMajor;
  return (
    <>
      <FormTextField
        control={form.control}
        name="title"
        label={t('edit.fields.title')}
        placeholder={t('edit.fields.titlePlaceholder')}
        maxLength={STUDIO_LIMITS.titleMax}
        returnKeyType="done"
        editable={!isMajorDisabled}
      />
      <Controller
        control={form.control}
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
      {mode.kind !== 'locked' ? (
        <AiCard
          title={t('edit.aiSuggest')}
          subtitle={t('edit.aiHint')}
          onPress={isBusy ? undefined : onSuggest}
          testID="edit-ai-suggest"
        />
      ) : null}
    </>
  );
}

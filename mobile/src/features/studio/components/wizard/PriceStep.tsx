import { Controller } from 'react-hook-form';

import { AppText } from '@/components/ui/AppText';
import { FormTextField } from '@/components/ui/FormTextField';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { useTranslation } from '@/i18n';
import type { TagDto } from '@/types/api';

import { TagPicker } from '../TaxonomyPickers';
import type { StepProps } from './stepTypes';

export type PriceStepProps = StepProps & {
  isPaid: boolean;
  onPaidChange: (isPaid: boolean) => void;
  knownTags: readonly TagDto[];
};

/** Step 3 - Free / Paid, the price (USD) and the tags. */
export function PriceStep({ form, mode, isBusy, isPaid, onPaidChange, knownTags }: PriceStepProps) {
  const { t } = useTranslation('studio');
  const { control } = form;
  const isDisabled = isBusy || !mode.canEditMajor;
  return (
    <>
      <SegmentedTabs
        tabs={[
          { key: 'free', label: t('wizard.price.free') },
          { key: 'paid', label: t('wizard.price.paid') },
        ]}
        value={isPaid ? 'paid' : 'free'}
        onChange={(key) => {
          if (!isDisabled) onPaidChange(key === 'paid');
        }}
      />
      {isPaid ? (
        <>
          <FormTextField
            control={control}
            name="price"
            label={t('edit.fields.price')}
            placeholder="29.99"
            keyboardType="decimal-pad"
            leftIcon="dollar-sign"
            helperText={t('edit.fields.priceHelper')}
            editable={!isDisabled}
          />
          <FormTextField
            control={control}
            name="originalPrice"
            label={t('edit.fields.originalPrice')}
            placeholder="49.99"
            keyboardType="decimal-pad"
            leftIcon="dollar-sign"
            helperText={t('edit.fields.originalPriceHelper')}
            editable={!isDisabled}
          />
        </>
      ) : (
        <AppText color="textSecondary">{t('wizard.price.freeNote')}</AppText>
      )}
      <Controller
        control={control}
        name="tagIds"
        render={({ field, fieldState }) => (
          <TagPicker
            label={t('edit.fields.tags')}
            value={field.value}
            onChange={(ids) => field.onChange(ids)}
            knownTags={knownTags}
            disabled={isDisabled}
            error={fieldState.error?.message}
            helper={t('edit.fields.tagsHelper')}
          />
        )}
      />
    </>
  );
}

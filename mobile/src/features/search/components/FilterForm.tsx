import { StyleSheet, View } from 'react-native';

import { Chip, Skeleton, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatFixed } from '@/i18n/format';
import { getErrorMessage } from '@/lib/appError';
import type { PriceType, SearchFilterValues } from '@/stores/searchFilterStore';
import { radius, spacing } from '@/theme';
import type { CourseSort } from '@/types/api';

import { RATING_OPTIONS, SORT_VALUES } from '../filterUtils';
import { useCategories } from '../hooks';
import { ChipRow, FilterSection } from './FilterSection';
import { InlineError } from './InlineError';
import { RadioRow } from './RadioRow';

const PRICE_OPTIONS: readonly PriceType[] = ['all', 'free', 'paid'];

export type FilterFormProps = {
  draft: SearchFilterValues;
  minText: string;
  maxText: string;
  hasRangeError: boolean;
  onToggleCategory: (categoryId: string) => void;
  onChangePrice: (price: PriceType) => void;
  onChangeMin: (text: string) => void;
  onChangeMax: (text: string) => void;
  onChangeRating: (minRating: number | null) => void;
  onChangeSort: (sort: CourseSort) => void;
};

function CategoryChips({
  selectedIds,
  onToggle,
}: {
  selectedIds: readonly string[];
  onToggle: (categoryId: string) => void;
}) {
  const { data, isPending, isError, error, refetch } = useCategories();
  if (isPending) {
    return (
      <ChipRow>
        {[88, 72, 64, 80, 72, 88].map((width, index) => (
          <Skeleton key={index} width={width} height={40} borderRadius={radius.pill} />
        ))}
      </ChipRow>
    );
  }
  if (isError)
    return <InlineError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  return (
    <ChipRow>
      {data.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          selected={selectedIds.includes(category.id)}
          onPress={() => onToggle(category.id)}
        />
      ))}
    </ChipRow>
  );
}

/** The 4 groups of SC-07: Category (multi), Price (+ Min/Max), Rating, Sort by. */
export function FilterForm({
  draft,
  minText,
  maxText,
  hasRangeError,
  onToggleCategory,
  onChangePrice,
  onChangeMin,
  onChangeMax,
  onChangeRating,
  onChangeSort,
}: FilterFormProps) {
  const { t } = useTranslation('search');
  return (
    <View style={styles.form}>
      <FilterSection title={t('filter.category')}>
        <CategoryChips selectedIds={draft.categoryIds} onToggle={onToggleCategory} />
      </FilterSection>

      <FilterSection title={t('filter.price')}>
        <ChipRow>
          {PRICE_OPTIONS.map((price) => (
            <Chip
              key={price}
              label={t(`filter.priceOptions.${price}`)}
              selected={draft.price === price}
              onPress={() => onChangePrice(price)}
            />
          ))}
        </ChipRow>
        {draft.price === 'paid' ? (
          <View style={styles.range}>
            <TextField
              label={t('filter.minPrice')}
              value={minText}
              onChangeText={onChangeMin}
              placeholder="0"
              keyboardType="decimal-pad"
              containerStyle={styles.rangeField}
            />
            <TextField
              label={t('filter.maxPrice')}
              value={maxText}
              onChangeText={onChangeMax}
              placeholder="200"
              keyboardType="decimal-pad"
              error={hasRangeError ? t('filter.rangeError') : undefined}
              containerStyle={styles.rangeField}
            />
          </View>
        ) : null}
      </FilterSection>

      <FilterSection title={t('filter.rating')}>
        <ChipRow>
          {RATING_OPTIONS.map((rating) => (
            <Chip
              key={rating}
              label={`${formatFixed(rating, 1)}+`}
              leftIcon="star"
              selected={draft.minRating === rating}
              onPress={() => onChangeRating(draft.minRating === rating ? null : rating)}
            />
          ))}
        </ChipRow>
      </FilterSection>

      <FilterSection title={t('filter.sortBy')}>
        <View accessibilityRole="radiogroup">
          {SORT_VALUES.map((value) => (
            <RadioRow
              key={value}
              label={t(`sort.${value}`)}
              isSelected={draft.sort === value}
              onPress={() => onChangeSort(value)}
            />
          ))}
        </View>
      </FilterSection>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xxl },
  range: { flexDirection: 'row', gap: spacing.lg },
  rangeField: { flex: 1 },
});

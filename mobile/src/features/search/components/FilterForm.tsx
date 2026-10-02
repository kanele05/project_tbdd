import { StyleSheet, View } from 'react-native';

import { Chip, Skeleton, TextField } from '@/components/ui';
import { getErrorMessage } from '@/lib/appError';
import type { PriceType, SearchFilterValues } from '@/stores/searchFilterStore';
import { radius, spacing } from '@/theme';
import type { CourseSort } from '@/types/api';

import { PRICE_RANGE_ERROR, RATING_OPTIONS, SORT_OPTIONS } from '../filterUtils';
import { useCategories } from '../hooks';
import { ChipRow, FilterSection } from './FilterSection';
import { InlineError } from './InlineError';
import { RadioRow } from './RadioRow';

const PRICE_OPTIONS: readonly { value: PriceType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

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
          <Skeleton key={index} width={width} height={36} borderRadius={radius.pill} />
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
  return (
    <View style={styles.form}>
      <FilterSection title="Category">
        <CategoryChips selectedIds={draft.categoryIds} onToggle={onToggleCategory} />
      </FilterSection>

      <FilterSection title="Price">
        <ChipRow>
          {PRICE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={draft.price === option.value}
              onPress={() => onChangePrice(option.value)}
            />
          ))}
        </ChipRow>
        {draft.price === 'paid' ? (
          <View style={styles.range}>
            <TextField
              label="Min ($)"
              value={minText}
              onChangeText={onChangeMin}
              placeholder="0"
              keyboardType="decimal-pad"
              containerStyle={styles.rangeField}
            />
            <TextField
              label="Max ($)"
              value={maxText}
              onChangeText={onChangeMax}
              placeholder="200"
              keyboardType="decimal-pad"
              error={hasRangeError ? PRICE_RANGE_ERROR : undefined}
              containerStyle={styles.rangeField}
            />
          </View>
        ) : null}
      </FilterSection>

      <FilterSection title="Rating">
        <ChipRow>
          {RATING_OPTIONS.map((rating) => (
            <Chip
              key={rating}
              label={`${rating.toFixed(1)}+`}
              leftIcon="star"
              selected={draft.minRating === rating}
              onPress={() => onChangeRating(draft.minRating === rating ? null : rating)}
            />
          ))}
        </ChipRow>
      </FilterSection>

      <FilterSection title="Sort by">
        <View accessibilityRole="radiogroup">
          {SORT_OPTIONS.map((option) => (
            <RadioRow
              key={option.value}
              label={option.label}
              isSelected={draft.sort === option.value}
              onPress={() => onChangeSort(option.value)}
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

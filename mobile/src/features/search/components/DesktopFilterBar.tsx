import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AppText, Button, Chip } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatFixed } from '@/i18n/format';
import {
  countActiveFilters,
  useSearchFilterStore,
  type PriceType,
} from '@/stores/searchFilterStore';
import { spacing } from '@/theme';

import { RATING_OPTIONS, SORT_VALUES } from '../filterUtils';
import { useAppliedFilters, useCategories } from '../hooks';
import { ChipRow } from './FilterSection';

const PRICE_OPTIONS: readonly PriceType[] = ['all', 'free', 'paid'];

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group} accessibilityLabel={label} accessibilityRole="radiogroup">
      <AppText variant="caption" family="bodySemiBold">
        {label}
      </AppText>
      <ChipRow>{children}</ChipRow>
    </View>
  );
}

/**
 * Filters of the wide Search page as one toolbar above the grid (instead of the full-screen
 * Filter modal of phones): sort, price, minimum rating and categories, all writing straight to
 * `searchFilterStore`. Min / max price stay in the modal route.
 */
export function DesktopFilterBar() {
  const { t } = useTranslation('search');
  const filters = useAppliedFilters();
  const { data: categories } = useCategories();
  const { setSort, setPrice, setMinRating, toggleCategory, reset } = useSearchFilterStore(
    useShallow((state) => ({
      setSort: state.setSort,
      setPrice: state.setPrice,
      setMinRating: state.setMinRating,
      toggleCategory: state.toggleCategory,
      reset: state.reset,
    })),
  );
  const activeCount = countActiveFilters(filters);

  return (
    <View style={styles.bar} testID="desktop-filter-bar">
      <Group label={t('filter.sortBy')}>
        {SORT_VALUES.map((value) => (
          <Chip
            key={value}
            size="sm"
            label={t(`sortChip.${value}`)}
            selected={filters.sort === value}
            onPress={() => setSort(value)}
          />
        ))}
      </Group>
      <Group label={t('filter.price')}>
        {PRICE_OPTIONS.map((price) => (
          <Chip
            key={price}
            size="sm"
            label={t(`filter.priceOptions.${price}`)}
            selected={filters.price === price}
            onPress={() => setPrice(price)}
          />
        ))}
      </Group>
      <Group label={t('filter.rating')}>
        {RATING_OPTIONS.map((rating) => (
          <Chip
            key={rating}
            size="sm"
            leftIcon="star"
            label={`${formatFixed(rating, 1)}+`}
            selected={filters.minRating === rating}
            onPress={() => setMinRating(filters.minRating === rating ? null : rating)}
          />
        ))}
      </Group>
      {categories && categories.length > 0 ? (
        <Group label={t('filter.category')}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              size="sm"
              label={category.name}
              selected={filters.categoryIds.includes(category.id)}
              onPress={() => toggleCategory(category.id)}
            />
          ))}
        </Group>
      ) : null}
      {activeCount > 0 ? (
        <Button
          title={t('filter.reset')}
          variant="ghost"
          size="sm"
          onPress={reset}
          accessibilityLabel={t('filter.resetLabel')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: spacing.xxl,
    rowGap: spacing.md,
    marginBottom: spacing.xl,
  },
  group: { gap: spacing.xs },
});

import { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Chip } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useSearchFilterStore } from '@/stores/searchFilterStore';
import { layout, spacing } from '@/theme';

import { SORT_VALUES } from '../filterUtils';

/** Quick sort row above the search results (the same value as "Sort by" in the Filter modal). */
function SortChipsBase() {
  const { t } = useTranslation('search');
  const { sort, setSort } = useSearchFilterStore(
    useShallow((state) => ({ sort: state.sort, setSort: state.setSort })),
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('filter.sortBy')}
    >
      {SORT_VALUES.map((value) => (
        <Chip
          key={value}
          label={t(`sortChip.${value}`)}
          size="sm"
          selected={sort === value}
          onPress={() => setSort(value)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleed to both screen edges so the chips scroll under the 20 dp gutters of the list.
  scroll: { marginHorizontal: -layout.screenPaddingX, flexGrow: 0 },
  row: { gap: spacing.sm, paddingHorizontal: layout.screenPaddingX },
});

export const SortChips = memo(SortChipsBase);

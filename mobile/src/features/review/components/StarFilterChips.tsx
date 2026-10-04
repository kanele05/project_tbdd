import { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';

import { REVIEW_FILTERS, type ReviewFilter } from '../hooks';

export type StarFilterChipsProps = {
  value: ReviewFilter;
  onChange: (filter: ReviewFilter) => void;
  /** Horizontal inset of the first/last chip. Default: the screen padding (20). */
  inset?: number;
};

/** The `Chip` hitSlop (8 dp above/below) has to stay inside the scroll view to be tappable. */
const HIT_SLOP_ROOM = 8;

/** Filter row "All · 5 · 4 · 3 · 2 · 1" (a star icon in every chip). */
function StarFilterChipsBase({
  value,
  onChange,
  inset = layout.screenPaddingX,
}: StarFilterChipsProps) {
  const { t } = useTranslation('review');
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
      accessibilityRole="radiogroup"
    >
      {REVIEW_FILTERS.map((filter) => (
        <Chip
          key={filter}
          label={filter === 'all' ? t('filterAll') : String(filter)}
          leftIcon="star"
          size="sm"
          selected={filter === value}
          onPress={() => onChange(filter)}
          testID={`review-filter-${filter}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The padding keeps the chip's own hitSlop inside the scroll view; the negative margin gives
  // the layout back, so the row takes only the chip height (32 dp).
  scroll: { flexGrow: 0, marginVertical: -HIT_SLOP_ROOM },
  row: { gap: spacing.sm, alignItems: 'center', paddingVertical: HIT_SLOP_ROOM },
});

export const StarFilterChips = memo(StarFilterChipsBase);

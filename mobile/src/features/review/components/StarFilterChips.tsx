import { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { layout, spacing } from '@/theme';

import { REVIEW_FILTERS, type ReviewFilter } from '../hooks';
import { REVIEW_STRINGS } from '../strings';

export type StarFilterChipsProps = {
  value: ReviewFilter;
  onChange: (filter: ReviewFilter) => void;
  /** Horizontal inset of the first/last chip. Default: the screen padding (20). */
  inset?: number;
};

/** Filter row "All · 5 · 4 · 3 · 2 · 1" (a star icon in every chip, like the design). */
function StarFilterChipsBase({
  value,
  onChange,
  inset = layout.screenPaddingX,
}: StarFilterChipsProps) {
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
          label={filter === 'all' ? REVIEW_STRINGS.allFilter : String(filter)}
          leftIcon="star"
          selected={filter === value}
          onPress={() => onChange(filter)}
          style={styles.chip}
          testID={`review-filter-${filter}`}
        />
      ))}
    </ScrollView>
  );
}

/** The `Chip` hitSlop (6 dp above/below) has to stay inside the scroll view to be tappable. */
const HIT_SLOP_ROOM = 6;

const styles = StyleSheet.create({
  // Design chips are 28 dp tall and fit all six in one row (44 dp wide, 12 dp apart). The 6 dp
  // padding keeps the chip's own hitSlop inside the scroll view; the negative margin gives the
  // layout back, so the row takes 28 dp. The touch target is 40 dp.
  scroll: { flexGrow: 0, marginVertical: -HIT_SLOP_ROOM },
  row: { gap: spacing.md, alignItems: 'center', paddingVertical: HIT_SLOP_ROOM },
  chip: { minHeight: 28, paddingHorizontal: spacing.sm },
});

export const StarFilterChips = memo(StarFilterChipsBase);

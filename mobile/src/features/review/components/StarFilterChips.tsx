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
          testID={`review-filter-${filter}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md, alignItems: 'center' },
});

export const StarFilterChips = memo(StarFilterChipsBase);

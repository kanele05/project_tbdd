import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { spacing } from '@/theme';

import { AppText } from './AppText';

export type SectionHeaderProps = {
  title: string;
  /** When provided, a "View more" link is shown on the right. */
  onViewMore?: () => void;
  viewMoreLabel?: string;
  /** "View more" size: `sm` = 12 px (default, most sections), `md` = 14 px (Home "Categories"). */
  viewMoreSize?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/** Section title (Epilogue 16) on the left, optional primary "View more" link on the right. */
function SectionHeaderBase({
  title,
  onViewMore,
  viewMoreLabel = STRINGS.common.viewMore,
  viewMoreSize = 'sm',
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant="title" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {onViewMore ? (
        <Pressable
          onPress={onViewMore}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="link"
          accessibilityLabel={`${viewMoreLabel}, ${title}`}
          style={styles.link}
        >
          <AppText variant={viewMoreSize === 'md' ? 'body' : 'caption'} color="primaryText">
            {viewMoreLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    gap: spacing.md,
  },
  title: { flexShrink: 1 },
  // Design: the link ends 9 dp before the content edge (x = 346 of 375) - 8 dp of padding that is
  // also part of the touch target.
  link: { minHeight: 32, justifyContent: 'center', paddingHorizontal: spacing.sm },
});

export const SectionHeader = memo(SectionHeaderBase);

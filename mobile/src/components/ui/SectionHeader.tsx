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
  style?: StyleProp<ViewStyle>;
};

/** Section title on the left, optional primary "View more" link on the right (Home / Search). */
function SectionHeaderBase({
  title,
  onViewMore,
  viewMoreLabel = STRINGS.common.viewMore,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant="h3" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {onViewMore ? (
        <Pressable
          onPress={onViewMore}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityRole="link"
          accessibilityLabel={`${viewMoreLabel}, ${title}`}
        >
          <AppText variant="body" color="primary" family="bodyMedium">
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
});

export const SectionHeader = memo(SectionHeaderBase);

import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { colors } from '@/theme';
import type { ColorToken } from '@/theme';

export type BookmarkButtonProps = {
  isBookmarked: boolean;
  /** When omitted the icon is a non-interactive indicator of the saved state. */
  onPress?: () => void;
  size?: number;
  /** Color of the not-saved icon. Default `textMuted`. */
  idleColor?: ColorToken;
};

/**
 * Presentational bookmark icon. The design always draws the outline: primary = saved, and
 * `idleColor` (muted gray in lists, dark on the Home / Search cards) = not saved. The saved state is
 * also announced through `accessibilityState.selected`.
 * State/optimistic update live in the bookmark hook (owned by the bookmark feature).
 */
function BookmarkButtonBase({
  isBookmarked,
  onPress,
  size = 24,
  idleColor = 'textMuted',
}: BookmarkButtonProps) {
  const icon = (
    <Ionicons
      name="bookmark-outline"
      size={size}
      color={isBookmarked ? colors.primary : colors[idleColor]}
    />
  );
  if (!onPress) {
    return <View importantForAccessibility="no">{icon}</View>;
  }
  const slop = Math.max(0, Math.ceil((48 - size) / 2));
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? STRINGS.common.removeBookmark : STRINGS.common.bookmark}
      accessibilityState={{ selected: isBookmarked }}
      style={styles.button}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});

export const BookmarkButton = memo(BookmarkButtonBase);

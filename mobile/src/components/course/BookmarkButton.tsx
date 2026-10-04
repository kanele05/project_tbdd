import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassSurface } from '@/components/ui/GlassSurface';
import { useTranslation } from '@/i18n';
import { darkPalette, resolveColor, useTheme } from '@/theme';
import type { ColorToken } from '@/theme';

export type BookmarkButtonProps = {
  isBookmarked: boolean;
  /** When omitted the icon is a non-interactive indicator of the saved state. */
  onPress?: () => void;
  size?: number;
  /** Color of the not-saved icon. Default `textMuted`. Ignored when `isOnPhoto`. */
  idleColor?: ColorToken;
  /** Sits on a course photo: frosted dark glass disc, white glyph, neon + filled when saved. */
  isOnPhoto?: boolean;
};

/** Diameter of the glass disc behind the glyph when `isOnPhoto`. */
const PHOTO_DISC = 36;

/**
 * Presentational bookmark icon. Saved = accent color (filled on photos), not saved = `idleColor`
 * (muted in lists) or white on a glass disc (on a photo). The saved state is also announced through
 * `accessibilityState.selected`.
 * State/optimistic update live in the bookmark hook (owned by the bookmark feature).
 */
function BookmarkButtonBase({
  isBookmarked,
  onPress,
  size = 24,
  idleColor = 'textMuted',
  isOnPhoto = false,
}: BookmarkButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const glyphSize = isOnPhoto ? 20 : size;
  let glyphColor: string;
  if (isOnPhoto) glyphColor = isBookmarked ? darkPalette.primary : darkPalette.white;
  else glyphColor = isBookmarked ? colors.primaryText : resolveColor(colors, idleColor);
  const glyph = (
    <Ionicons
      name={isOnPhoto && isBookmarked ? 'bookmark' : 'bookmark-outline'}
      size={glyphSize}
      color={glyphColor}
    />
  );
  const icon = isOnPhoto ? (
    <GlassSurface tone="photo" intensity={30} radius={PHOTO_DISC / 2} contentStyle={styles.disc}>
      {glyph}
    </GlassSurface>
  ) : (
    glyph
  );
  if (!onPress) {
    return <View importantForAccessibility="no">{icon}</View>;
  }
  const slop = Math.max(0, Math.ceil((48 - (isOnPhoto ? PHOTO_DISC : size)) / 2));
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? t('bookmark.remove') : t('bookmark.save')}
      accessibilityState={{ selected: isBookmarked }}
      style={styles.button}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  disc: {
    width: PHOTO_DISC,
    height: PHOTO_DISC,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const BookmarkButton = memo(BookmarkButtonBase);

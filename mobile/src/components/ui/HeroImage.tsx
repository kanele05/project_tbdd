import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, spacing, useTheme, withAlpha } from '@/theme';

export type HeroImageProps = {
  /** Remote image. Use `source` for a bundled asset. */
  uri?: string | null;
  source?: ImageSource | number;
  /** Total height in dp (the hero is full-bleed: edge to edge, behind the status bar). */
  height?: number;
  /** Top row over the photo (back / share / bookmark buttons). Sits below the status bar. */
  top?: ReactNode;
  /** Content over the bottom scrim (badge, title, meta, actions). Text here must be white. */
  children?: ReactNode;
  /** Round the bottom corners (default: light mode only - in dark the scrim melts into the page). */
  isRoundedBottom?: boolean;
  /** Add the status-bar inset above `top`. Default true. */
  withTopInset?: boolean;
  /** Describes the photo for screen readers; omit when the image is purely decorative. */
  imageLabel?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

const TOP_SCRIM_EXTRA = 90;

/**
 * Full-bleed photo with a scrim, the signature of concept B: the first thing on Home and Course
 * details. The bottom scrim ends in the `scrim` token (the page background in dark mode) so white
 * text stays >= 4,5:1 on any photograph and the photo melts into the screen below it.
 */
function HeroImageBase({
  uri,
  source,
  height = 420,
  top,
  children,
  isRoundedBottom,
  withTopInset = true,
  imageLabel,
  style,
  contentStyle,
  testID,
}: HeroImageProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const hasRoundedBottom = isRoundedBottom ?? !isDark;
  const topInset = withTopInset ? insets.top : 0;
  const imageSource = source ?? (uri ? { uri } : undefined);
  const scrimEnd = isDark ? colors.scrim : withAlpha(colors.scrim, 0.96);

  return (
    <View
      testID={testID}
      style={[
        styles.hero,
        { height, backgroundColor: colors.surface },
        hasRoundedBottom
          ? { borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet }
          : null,
        style,
      ]}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          accessibilityIgnoresInvertColors
          accessible={Boolean(imageLabel)}
          accessibilityLabel={imageLabel}
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : null}
      <LinearGradient
        colors={['rgba(8, 8, 12, 0.65)', 'rgba(8, 8, 12, 0)']}
        style={[styles.topScrim, { height: topInset + TOP_SCRIM_EXTRA }]}
      />
      <LinearGradient
        colors={['rgba(8, 8, 12, 0)', 'rgba(8, 8, 12, 0.72)', scrimEnd]}
        locations={[0, 0.5, 1]}
        style={[styles.bottomScrim, { height: Math.round(height * 0.7) }]}
      />
      {top ? <View style={[styles.top, { paddingTop: topInset + spacing.sm }]}>{top}</View> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { justifyContent: 'flex-end', overflow: 'hidden' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
    pointerEvents: 'box-none',
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
});

export const HeroImage = memo(HeroImageBase);

import { BlurView } from 'expo-blur';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GLASS_ALPHA, radius as radiusTokens, shadows, useTheme, withAlpha } from '@/theme';

export type GlassSurfaceProps = {
  children?: ReactNode;
  /**
   * `chrome` follows the theme (floating tab bar, bottom CTA bar).
   * `photo` is always dark glass with a white glyph - for controls that sit on photography.
   */
  tone?: 'chrome' | 'photo';
  /** Blur strength 0-100 (expo-blur). Android shows no real blur by default; the fill still works. */
  intensity?: number;
  /** Corner radius. Default `radius.bar` (32). */
  radius?: number;
  /** Hairline border around the glass. Default true. */
  isBordered?: boolean;
  /** Soft drop shadow under the glass (floating chrome). Default false. */
  hasShadow?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Layout / padding of the content inside the glass. */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Fill laid over the blur for `photo` glass: dark, so a white glyph reads on any photograph. */
const PHOTO_FILL = 'rgba(8, 8, 12, 0.45)';
const PHOTO_BORDER = 'rgba(255, 255, 255, 0.22)';

/**
 * Frosted glass: blur + translucent fill + hairline. The BLUR IS ONLY DECORATION - the fill
 * (`tabBar` token at `GLASS_ALPHA`) is what guarantees text contrast (checked in `contrast.ts`),
 * which also keeps Android usable where `BlurView` draws no real blur.
 */
function GlassSurfaceBase({
  children,
  tone = 'chrome',
  intensity = 50,
  radius = radiusTokens.bar,
  isBordered = true,
  hasShadow = false,
  style,
  contentStyle,
  testID,
}: GlassSurfaceProps) {
  const { colors, isDark } = useTheme();
  const isPhoto = tone === 'photo';
  const fill = isPhoto ? PHOTO_FILL : withAlpha(colors.tabBar, GLASS_ALPHA);
  const borderColor = isPhoto ? PHOTO_BORDER : colors.glassBorder;
  const tint = isPhoto || isDark ? 'dark' : 'light';
  return (
    <View
      testID={testID}
      style={[{ borderRadius: radius }, hasShadow ? shadows.chrome : null, style]}
    >
      <View
        style={[
          styles.clip,
          { borderRadius: radius, borderWidth: isBordered ? 1 : 0, borderColor },
        ]}
      >
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[styles.layer, { borderRadius: radius }]}
        />
        <View style={[styles.layer, { backgroundColor: fill, borderRadius: radius }]} />
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});

export const GlassSurface = memo(GlassSurfaceBase);

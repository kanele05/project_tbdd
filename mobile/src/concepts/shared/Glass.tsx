import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type GlassProps = {
  children?: ReactNode;
  /** Blur strength 0-100 (expo-blur). */
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  /**
   * Translucent colour laid over the blur. This (not the blur) is what guarantees text contrast,
   * so pick it for the worst background that can scroll underneath.
   */
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  /** CSS-style box shadow, e.g. '0 10px 30px rgba(20,30,80,0.18)'. */
  shadow?: string;
  style?: StyleProp<ViewStyle>;
  /** Padding / layout for the content inside the glass. */
  contentStyle?: StyleProp<ViewStyle>;
};

/** Frosted-glass surface: blur + tinted fill + hairline border + soft shadow. */
export function Glass({
  children,
  intensity = 40,
  tint = 'default',
  fill,
  borderColor,
  borderWidth = 1,
  radius = 24,
  shadow,
  style,
  contentStyle,
}: GlassProps) {
  return (
    <View style={[{ borderRadius: radius, boxShadow: shadow }, style]}>
      <View style={[styles.clip, { borderRadius: radius, borderWidth, borderColor: borderColor }]}>
        <BlurView
          intensity={intensity}
          tint={tint}
          style={[styles.fill, { borderRadius: radius }]}
        />
        {fill ? (
          <View style={[styles.fill, { backgroundColor: fill, borderRadius: radius }]} />
        ) : null}
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});

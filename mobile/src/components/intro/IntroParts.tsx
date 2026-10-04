import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { darkPalette, fontFamily, withAlpha } from '@/theme';

import {
  easeInOutCubic,
  easeOutCubic,
  LETTERS_START_MS,
  LETTER_MS,
  LETTER_STAGGER_MS,
  progressOf,
  RIBBONS_END_MS,
  RIBBONS_START_MS,
  STREAK_MS,
  SWEEP_MS,
  SWEEP_START_MS,
} from './introTimeline';

// The intro is always black + neon (brand), whatever the theme is: dark palette tokens.
const NEON = darkPalette.primary;
const VIOLET = darkPalette.secondary;
const WHITE = darkPalette.white;
const NEON_CLEAR = withAlpha(NEON, 0);

const SWEEP_W = 200;
const SWEEP_H = 110;

type TimeProps = { t: SharedValue<number> };

/** The neon dot on the first frame (continues the native splash) that opens into a streak of light. */
export const IntroStreak = memo(function IntroStreak({ t, width }: TimeProps & { width: number }) {
  const lineStyle = useAnimatedStyle(() => {
    const open = easeOutCubic(progressOf(t.value, 0, STREAK_MS));
    const fade = 1 - progressOf(t.value, 700, 500);
    return { opacity: open > 0 ? fade : 0, transform: [{ scaleX: Math.max(0.001, open) }] };
  });
  const dotStyle = useAnimatedStyle(() => {
    const p = progressOf(t.value, 80, 360);
    return { opacity: 1 - p, transform: [{ scale: 1 + p * 1.4 }] };
  });
  return (
    <>
      <Animated.View style={[styles.line, { width }, lineStyle]}>
        <LinearGradient
          colors={[NEON_CLEAR, NEON, WHITE, NEON, NEON_CLEAR]}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.dot, dotStyle]} />
    </>
  );
});

/** Soft neon halo behind the wordmark; `breath` (0-1) makes it pulse while the app is loading. */
export const IntroGlow = memo(function IntroGlow({
  t,
  breath,
}: TimeProps & { breath: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const grow = easeInOutCubic(progressOf(t.value, 500, 900));
    return {
      opacity: grow * (0.72 + 0.28 * breath.value),
      transform: [{ scale: 0.8 + grow * 0.2 }],
    };
  });
  return (
    <Animated.View style={[styles.glow, style]}>
      <Svg width={360} height={220}>
        <Defs>
          <RadialGradient id="introGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={NEON} stopOpacity={0.3} />
            <Stop offset="0.55" stopColor={VIOLET} stopOpacity={0.1} />
            <Stop offset="1" stopColor={NEON} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={180} cy={110} rx={180} ry={110} fill="url(#introGlow)" />
      </Svg>
    </Animated.View>
  );
});

/** [x offset from the center in dp, height, gradient color, delay ms] of each ribbon of light. */
const RIBBONS = [
  [-118, 170, NEON, 0],
  [-74, 240, VIOLET, 70],
  [-30, 190, NEON, 140],
  [22, 260, WHITE, 40],
  [66, 200, VIOLET, 110],
  [114, 160, NEON, 180],
] as const;

type RibbonProps = TimeProps & { x: number; height: number; color: string; delay: number };

const Ribbon = memo(function Ribbon({ t, x, height, color, delay }: RibbonProps) {
  const style = useAnimatedStyle(() => {
    const rise = easeOutCubic(progressOf(t.value, RIBBONS_START_MS + delay, 520));
    const fade = 1 - progressOf(t.value, RIBBONS_END_MS - 320, 320);
    return { opacity: rise * fade * 0.85, transform: [{ scaleY: Math.max(0.001, rise) }] };
  });
  return (
    <Animated.View style={[styles.ribbon, { left: x, height }, style]}>
      <LinearGradient
        colors={[withAlpha(color, 0), withAlpha(color, 0.9), withAlpha(color, 0)]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

export const IntroRibbons = memo(function IntroRibbons({ t }: TimeProps) {
  return (
    <View style={styles.ribbons}>
      {RIBBONS.map(([x, height, color, delay]) => (
        <Ribbon key={x} t={t} x={x} height={height} color={color} delay={delay} />
      ))}
    </View>
  );
});

/** A soft flare of light that crosses the wordmark from left to right. */
export const IntroSweep = memo(function IntroSweep({ t, span }: TimeProps & { span: number }) {
  const style = useAnimatedStyle(() => {
    const p = progressOf(t.value, SWEEP_START_MS, SWEEP_MS);
    const eased = easeInOutCubic(p);
    return {
      opacity: Math.sin(p * Math.PI),
      transform: [{ translateX: -span / 2 + eased * span }],
    };
  });
  return (
    <Animated.View style={[styles.sweep, style]}>
      <Svg width={SWEEP_W} height={SWEEP_H}>
        <Defs>
          <RadialGradient id="introSweep" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={WHITE} stopOpacity={0.95} />
            <Stop offset="0.25" stopColor={NEON} stopOpacity={0.55} />
            <Stop offset="1" stopColor={NEON} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={SWEEP_W / 2}
          cy={SWEEP_H / 2}
          rx={SWEEP_W / 2}
          ry={SWEEP_H / 2}
          fill="url(#introSweep)"
        />
      </Svg>
    </Animated.View>
  );
});

type LetterProps = TimeProps & { char: string; index: number; size: number };

/** One character of the wordmark: rises, grows and turns from neon to white (staggered by index). */
export const IntroLetter = memo(function IntroLetter({ t, char, index, size }: LetterProps) {
  const style = useAnimatedStyle(() => {
    const p = easeOutCubic(
      progressOf(t.value, LETTERS_START_MS + index * LETTER_STAGGER_MS, LETTER_MS),
    );
    return {
      opacity: p,
      color: interpolateColor(p, [0, 1], [NEON, WHITE]),
      transform: [{ translateY: (1 - p) * size * 0.28 }, { scale: 0.9 + 0.1 * p }],
    };
  });
  return (
    <Animated.Text
      // A logo does not scale with the system font size.
      allowFontScaling={false}
      style={[
        {
          fontFamily: fontFamily.displayItalic,
          fontSize: size,
          lineHeight: Math.round(size * 1.25),
          letterSpacing: -size / 56,
        },
        style,
      ]}
    >
      {char}
    </Animated.Text>
  );
});

/** The neon dot that ends the wordmark; same entrance as a letter. */
export const IntroDot = memo(function IntroDot({ t, index, size }: Omit<LetterProps, 'char'>) {
  const dot = Math.max(5, Math.round(size / 4));
  const style = useAnimatedStyle(() => {
    const p = easeOutCubic(
      progressOf(t.value, LETTERS_START_MS + index * LETTER_STAGGER_MS, LETTER_MS),
    );
    return { opacity: p, transform: [{ scale: 0.4 + 0.6 * p }] };
  });
  return (
    <Animated.View
      style={[
        {
          width: dot,
          height: dot,
          borderRadius: dot,
          marginBottom: Math.round(size * 0.3),
          marginLeft: Math.round(size / 9),
          backgroundColor: NEON,
        },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  line: { position: 'absolute', height: 2, borderRadius: 1 },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NEON,
    boxShadow: '0 0 28px 8px rgba(46, 242, 255, 0.55)',
  },
  glow: { position: 'absolute', width: 360, height: 220, pointerEvents: 'none' },
  ribbons: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  ribbon: { position: 'absolute', width: 3, borderRadius: 2 },
  sweep: { position: 'absolute', width: SWEEP_W, height: SWEEP_H, pointerEvents: 'none' },
});

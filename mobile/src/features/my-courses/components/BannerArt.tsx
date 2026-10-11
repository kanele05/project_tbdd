import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The rising trend line (viewBox 240 x 110) and its approximate length for the dash trick. */
const LINE_PATH = 'M8 92 L48 74 L78 82 L118 52 L150 60 L188 26 L226 14';
const AREA_PATH = `${LINE_PATH} L226 110 L8 110 Z`;
const LINE_LENGTH = 260;
const END_POINT = { x: 226, y: 14 };
const GRID_ROWS = [30, 60, 90] as const;
/** One loop: draw the line, hold it, fade it out (ms). */
const LOOP_MS = 6400;
const DRIFT_MS = 7000;
/** Progress shown when the animation is off: the line is fully drawn. */
const STATIC_PROGRESS = 0.6;
/** Share of the loop spent drawing the line. */
const DRAW_END = 0.45;

export type BannerGlowProps = { size: number };

/**
 * Soft accent glow that drifts slowly behind the banner. Static under Reduce Motion. Painted with
 * an SVG radial gradient (no blur filter, so it costs nothing on a phone).
 */
export function BannerGlow({ size }: BannerGlowProps) {
  const { colors } = useTheme();
  const isReducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (isReducedMotion) return undefined;
    drift.set(
      withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(drift);
  }, [drift, isReducedMotion]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-18, 18]) },
      { translateY: interpolate(drift.value, [0, 1], [8, -8]) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, { width: size, height: size }, style]}
      testID="banner-glow"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="bannerGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.3} />
            <Stop offset="0.55" stopColor={colors.secondary} stopOpacity={0.12} />
            <Stop offset="1" stopColor={colors.secondary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill="url(#bannerGlow)" />
      </Svg>
    </Animated.View>
  );
}

export type TrendArtProps = { width: number; height: number };

/**
 * A trend line that draws itself in a loop (stroke-dashoffset), with a soft area under it and a dot
 * at the tip. One shared value drives everything. Reduce Motion shows the finished frame.
 */
export function TrendArt({ width, height }: TrendArtProps) {
  const { colors } = useTheme();
  const isReducedMotion = useReducedMotion();
  const progress = useSharedValue(STATIC_PROGRESS);
  useEffect(() => {
    if (isReducedMotion) {
      progress.set(STATIC_PROGRESS);
      return undefined;
    }
    progress.set(0);
    progress.set(withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1));
    return () => cancelAnimation(progress);
  }, [isReducedMotion, progress]);

  const lineProps = useAnimatedProps(() => {
    const x = Math.min(progress.value / DRAW_END, 1);
    const eased = 1 - (1 - x) * (1 - x);
    return {
      strokeDashoffset: LINE_LENGTH * (1 - eased),
      opacity: interpolate(progress.value, [0, 0.04, 0.86, 1], [0, 1, 1, 0], 'clamp'),
    };
  });
  const areaProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0.3, 0.5, 0.86, 1], [0, 1, 1, 0], 'clamp'),
  }));
  const dotProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.value, [0.4, 0.5, 0.86, 1], [0, 1, 1, 0], 'clamp'),
  }));

  return (
    <View
      style={{ width, height }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="banner-trend"
    >
      <Svg width="100%" height="100%" viewBox="0 0 240 110">
        <Defs>
          <SvgLinearGradient id="bannerArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {GRID_ROWS.map((y) => (
          <Line key={y} x1="0" x2="240" y1={y} y2={y} stroke={colors.border} strokeWidth={1} />
        ))}
        <AnimatedPath d={AREA_PATH} fill="url(#bannerArea)" animatedProps={areaProps} />
        <AnimatedPath
          d={LINE_PATH}
          fill="none"
          stroke={colors.primary}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={LINE_LENGTH}
          animatedProps={lineProps}
        />
        <AnimatedCircle
          cx={END_POINT.x}
          cy={END_POINT.y}
          r={6}
          fill={colors.primary}
          animatedProps={dotProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', right: -70, top: -90 },
});

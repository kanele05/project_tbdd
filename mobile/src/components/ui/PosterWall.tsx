import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { POSTERS } from '@/constants/posters';
import { darkPalette, radius, withAlpha } from '@/theme';

export type PosterWallProps = {
  /** `wall` = crisp posters under a lighter scrim; `soft` = blurred, darker (OTP / reset steps). */
  variant?: 'wall' | 'soft';
  /** Stop the drifting (also automatic with Reduce Motion). */
  isPaused?: boolean;
  testID?: string;
};

/** The wall is tilted by this angle (degrees, negative = counter-clockwise). */
export const WALL_TILT_DEG = -10;
const GAP = 8;
const TARGET_COLUMN_WIDTH = 132;
const POSTER_RATIO = 1.5;
/** Distinct posters per column before the pattern repeats (the drift loops over exactly one cycle). */
const CYCLE_POSTERS = 4;
/** Drift speed in dp per second: slow enough to feel like a backdrop. */
const DRIFT_SPEED = 14;

export type WallGeometry = {
  columns: number;
  columnWidth: number;
  posterHeight: number;
  /** Height of one repeat of the column pattern. */
  cycleHeight: number;
  /** Number of posters rendered per column (covers the wall + one cycle of drift). */
  postersPerColumn: number;
  wallWidth: number;
  wallHeight: number;
};

/**
 * Size of the tilted wall that still covers a `width` x `height` container after rotating by
 * `WALL_TILT_DEG` (bounding box of the rotated container + a small margin).
 */
export function getWallGeometry(width: number, height: number): WallGeometry {
  const radians = (Math.abs(WALL_TILT_DEG) * Math.PI) / 180;
  const wallWidth = Math.ceil(width * Math.cos(radians) + height * Math.sin(radians)) + 24;
  const wallHeight = Math.ceil(width * Math.sin(radians) + height * Math.cos(radians)) + 24;
  const columns = Math.max(3, Math.ceil(wallWidth / (TARGET_COLUMN_WIDTH + GAP)));
  const columnWidth = Math.floor(wallWidth / columns) - GAP;
  const posterHeight = Math.round(columnWidth * POSTER_RATIO);
  const item = posterHeight + GAP;
  const cycleHeight = item * CYCLE_POSTERS;
  const postersPerColumn = Math.ceil((wallHeight + cycleHeight) / item) + 1;
  return {
    columns,
    columnWidth,
    posterHeight,
    cycleHeight,
    postersPerColumn,
    wallWidth,
    wallHeight,
  };
}

type ColumnProps = {
  index: number;
  geometry: WallGeometry;
  clock: SharedValue<number>;
  blurRadius: number;
};

const Column = memo(function Column({ index, geometry, clock, blurRadius }: ColumnProps) {
  const { columnWidth, posterHeight, cycleHeight, postersPerColumn } = geometry;
  const isUp = index % 2 === 0;
  const phase = (index * 0.37 * cycleHeight) % cycleHeight;
  const style = useAnimatedStyle(() => {
    const offset = (clock.value * cycleHeight + phase) % cycleHeight;
    return { transform: [{ translateY: isUp ? -offset : offset - cycleHeight }] };
  });
  const posters = useMemo(
    () =>
      Array.from({ length: postersPerColumn }, (_, row) => {
        const poster = POSTERS[(index * CYCLE_POSTERS + (row % CYCLE_POSTERS)) % POSTERS.length];
        return { key: row, poster };
      }),
    [index, postersPerColumn],
  );
  return (
    <Animated.View style={[{ width: columnWidth, marginHorizontal: GAP / 2, gap: GAP }, style]}>
      {posters.map(({ key, poster }) => (
        <Image
          key={key}
          source={poster}
          style={{ width: columnWidth, height: posterHeight, borderRadius: radius.badge + 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          blurRadius={blurRadius}
          transition={0}
          accessibilityIgnoresInvertColors
          accessible={false}
          testID="poster"
        />
      ))}
    </Animated.View>
  );
});

const scrimColors = (a: [number, number, number, number]) =>
  [
    withAlpha(darkPalette.scrim, a[0]),
    withAlpha(darkPalette.scrim, a[1]),
    withAlpha(darkPalette.scrim, a[2]),
    withAlpha(darkPalette.scrim, a[3]),
  ] as const;

/** Scrim (top to bottom) per variant; dark enough under the text for WCAG AA. */
const SCRIMS = {
  wall: { colors: scrimColors([0.32, 0.6, 0.9, 0.97]), locations: [0, 0.3, 0.58, 1] as const },
  soft: { colors: scrimColors([0.4, 0.62, 0.9, 0.97]), locations: [0, 0.3, 0.6, 1] as const },
};

/**
 * Netflix-style sign-in background: a wall of course posters, tilted ~10 degrees, whose columns
 * drift slowly in opposite directions, under a dark gradient scrim so text and the form on top
 * always have enough contrast. Always dark (cinematic) in both themes. Decorative: hidden from
 * screen readers; the drift stops with Reduce Motion or `isPaused`. Fill its parent
 * (`position: absolute`), render the screen content on top.
 */
function PosterWallBase({ variant = 'wall', isPaused = false, testID }: PosterWallProps) {
  const isReducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const clock = useSharedValue(0);
  const geometry = useMemo(
    () => (size.width > 0 ? getWallGeometry(size.width, size.height) : null),
    [size],
  );
  const cycleHeight = geometry?.cycleHeight ?? 0;
  const isDrifting = !isPaused && !isReducedMotion && cycleHeight > 0;

  useEffect(() => {
    if (!isDrifting) return undefined;
    clock.set(
      withRepeat(
        withTiming(1, { duration: (cycleHeight / DRIFT_SPEED) * 1000, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    return () => clock.set(0);
  }, [isDrifting, cycleHeight, clock]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) =>
      previous.width === width && previous.height === height ? previous : { width, height },
    );
  };

  const scrim = SCRIMS[variant];
  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={styles.root}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {geometry ? (
        <View
          style={[
            styles.wall,
            {
              width: geometry.wallWidth,
              height: geometry.wallHeight,
              left: (size.width - geometry.wallWidth) / 2,
              top: (size.height - geometry.wallHeight) / 2,
              transform: [{ rotate: `${WALL_TILT_DEG}deg` }],
            },
          ]}
        >
          {Array.from({ length: geometry.columns }, (_, index) => (
            <Column
              key={index}
              index={index}
              geometry={geometry}
              clock={clock}
              blurRadius={variant === 'soft' ? 8 : 0}
            />
          ))}
        </View>
      ) : null}
      <LinearGradient
        colors={scrim.colors}
        locations={scrim.locations}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: darkPalette.scrim,
    pointerEvents: 'none',
  },
  wall: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    overflow: 'visible',
  },
});

export const PosterWall = memo(PosterWallBase);

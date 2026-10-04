import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type RingProps = {
  size: number;
  strokeWidth: number;
  /** 0..1 */
  progress: number;
  trackColor: string;
  /** One colour, or two for a gradient along the arc. */
  colors: readonly [string] | readonly [string, string];
  children?: ReactNode;
  /** Unique per ring on screen (SVG gradient id). */
  gradientId?: string;
};

/** Circular progress indicator, starts at 12 o'clock. Children are centred inside the ring. */
export function Ring({
  size,
  strokeWidth,
  progress,
  trackColor,
  colors,
  children,
  gradientId = 'ring',
}: RingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(Math.max(progress, 0), 1);
  const [from, to] = colors;
  const stroke = to ? `url(#${gradientId})` : from;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {to ? (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { usePaletteC } from './theme';

type Hue = 'violet' | 'teal' | 'pink';
type Blob = { dy: number; x: number; isRight: boolean; size: number; hue: Hue };

/** One repeating "period" of glows; stamped down the page so any screen height is covered. */
const PERIOD = 1000;
const REPEATS = 7;
const PATTERN: Blob[] = [
  { dy: -150, x: -150, isRight: false, size: 470, hue: 'violet' },
  { dy: 40, x: -190, isRight: true, size: 420, hue: 'teal' },
  { dy: 470, x: -130, isRight: true, size: 380, hue: 'pink' },
  { dy: 680, x: -210, isRight: false, size: 430, hue: 'teal' },
];

type GlowProps = { id: string; color: string; opacity: number; size: number };

function Glow({ id, color, opacity, size }: GlowProps) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * The aurora: a pastel (light) or deep-indigo (dark) vertical gradient with soft violet, teal and
 * pink glows drifting behind the glass cards, plus one tilted ribbon of light at the top.
 * Drawn once inside `ScreenShell.background`, so it scrolls with the content.
 */
export function AuroraBackground() {
  const p = usePaletteC();
  const colors: Record<Hue, string> = {
    violet: p.glowViolet,
    teal: p.glowTeal,
    pink: p.glowPink,
  };
  const blobs: { key: string; blob: Blob; top: number }[] = [];
  for (let i = 0; i < REPEATS; i += 1) {
    PATTERN.forEach((blob, j) => {
      blobs.push({ key: `${i}-${j}`, blob, top: i * PERIOD + blob.dy });
    });
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={p.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.ribbon}>
        <Svg width={760} height={220}>
          <Defs>
            <RadialGradient id="auroraRibbon" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={p.glowTeal} stopOpacity={p.isDark ? 0.5 : 0.55} />
              <Stop offset="0.5" stopColor={p.glowViolet} stopOpacity={p.isDark ? 0.3 : 0.3} />
              <Stop offset="1" stopColor={p.glowViolet} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width={760} height={220} fill="url(#auroraRibbon)" />
        </Svg>
      </View>
      {blobs.map(({ key, blob, top }) => (
        <View
          key={key}
          style={[
            styles.blob,
            { top, width: blob.size, height: blob.size },
            blob.isRight ? { right: blob.x } : { left: blob.x },
          ]}
        >
          <Glow
            id={`aurora-${key}`}
            color={colors[blob.hue]}
            opacity={p.glowOpacity}
            size={blob.size}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
  ribbon: {
    position: 'absolute',
    top: 70,
    left: -190,
    transform: [{ rotate: '-14deg' }],
  },
});

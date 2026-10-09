import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTranslation } from '@/i18n';
import { darkPalette } from '@/theme';

import {
  IntroDot,
  IntroGlow,
  IntroLetter,
  IntroRibbons,
  IntroStreak,
  IntroSweep,
} from './IntroParts';
import {
  easeInCubic,
  easeInOutCubic,
  EXIT_MS,
  EXIT_START_MS,
  progressOf,
  REDUCED_FADE_MS,
  REDUCED_HOLD_MS,
  TOTAL_MS,
} from './introTimeline';

export type AppIntroProps = {
  /** The app (fonts, preferences, session) is ready: the intro may exit once its animation ended. */
  isReady: boolean;
  /** Start playing (fonts loaded, so the wordmark is drawn in Playfair). Default true. */
  isActive?: boolean;
  /** Called once the overlay is fully transparent: unmount it. */
  onFinish: () => void;
  /** Dev / screenshots: freeze the animation at this time (ms) and never finish. */
  freezeAtMs?: number;
};

const WORD = 'elearn';
const WORD_SIZE = 68;
const SWEEP_SPAN = Math.round(WORD_SIZE * 3.6) + 120;

/**
 * Netflix-style launch intro: a black overlay over the app while it boots. A neon dot opens into a
 * streak of light, ribbons of light rise, the wordmark "elearn." appears letter by letter, a bright
 * sweep crosses it and the logo shrinks away to reveal the app (~2.15 s). It ends only when BOTH the
 * animation and the app bootstrap are done; while the app is still loading the logo breathes.
 * Everything runs on the UI thread (reanimated worklets). Reduce Motion: a short fade only.
 */
export function AppIntro({ isReady, isActive = true, onFinish, freezeAtMs }: AppIntroProps) {
  const { t: translate } = useTranslation();
  const isReducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const t = useSharedValue(0);
  const breath = useSharedValue(0);
  const fadeIn = useSharedValue(isReducedMotion ? 0 : 1);
  const [isPlayed, setIsPlayed] = useState(false);
  const isFrozen = freezeAtMs !== undefined;

  const markPlayed = useCallback(() => setIsPlayed(true), []);
  const finish = useCallback(() => onFinish(), [onFinish]);

  // Phase 1: play the animation up to the "hold" frame.
  useEffect(() => {
    if (!isActive) return undefined;
    if (isFrozen) {
      t.set(freezeAtMs);
      return undefined;
    }
    if (isReducedMotion) {
      t.set(EXIT_START_MS);
      fadeIn.set(withTiming(1, { duration: REDUCED_FADE_MS }));
      const timer = setTimeout(markPlayed, REDUCED_HOLD_MS);
      return () => clearTimeout(timer);
    }
    t.set(
      withTiming(
        EXIT_START_MS,
        { duration: EXIT_START_MS, easing: Easing.linear },
        (isFinished) => {
          if (isFinished) scheduleOnRN(markPlayed);
        },
      ),
    );
    return undefined;
  }, [isActive, isFrozen, freezeAtMs, isReducedMotion, t, fadeIn, markPlayed]);

  // Phase 2: leave once the app is ready; until then the logo breathes.
  useEffect(() => {
    if (!isPlayed || isFrozen) return;
    if (isReady) {
      t.set(
        withTiming(
          TOTAL_MS,
          { duration: isReducedMotion ? REDUCED_FADE_MS : EXIT_MS, easing: Easing.linear },
          (isFinished) => {
            if (isFinished) scheduleOnRN(finish);
          },
        ),
      );
    } else if (!isReducedMotion) {
      breath.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
    }
  }, [isPlayed, isReady, isFrozen, isReducedMotion, t, breath, finish]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - easeInOutCubic(progressOf(t.value, EXIT_START_MS, EXIT_MS)),
  }));
  const logoStyle = useAnimatedStyle(() => {
    const out = easeInCubic(progressOf(t.value, EXIT_START_MS, EXIT_MS));
    return {
      opacity: (1 - out) * fadeIn.value * (0.9 + 0.1 * breath.value),
      transform: [{ scale: isReducedMotion ? 1 : 1 - 0.14 * out }],
    };
  });

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      accessible
      accessibilityViewIsModal
      accessibilityRole="image"
      accessibilityLabel={translate('appName')}
      testID="app-intro"
    >
      <IntroGlow t={t} breath={breath} />
      <IntroRibbons t={t} />
      <IntroStreak t={t} width={width} />
      <Animated.View
        style={logoStyle}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={styles.row}>
          {WORD.split('').map((char, index) => (
            // Letters are positional and never reorder, so the index is a stable key.
            <IntroLetter
              key={`${char}-${index}`}
              t={t}
              char={char}
              index={index}
              size={WORD_SIZE}
            />
          ))}
          <IntroDot t={t} index={WORD.length} size={WORD_SIZE} />
        </View>
      </Animated.View>
      <IntroSweep t={t} span={SWEEP_SPAN} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: darkPalette.background,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});

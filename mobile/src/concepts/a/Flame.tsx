import { useEffect, useState } from 'react';
import { Animated, AccessibilityInfo, Easing, Platform } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const OUTER =
  'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z';
const INNER =
  'M12 21a3.6 3.6 0 0 0 3.6-3.6c0-1.6-1.2-2.6-2.1-3.7-.6-.7-1-1.5-1.5-2.4-1.8 1.7-3.6 3.4-3.6 6.1A3.6 3.6 0 0 0 12 21z';

type FlameProps = { size?: number; isLit?: boolean; idSuffix?: string };

/** Gradient streak flame. Lit = full colour; unlit = flat grey. Gently pulses unless motion is reduced. */
export function Flame({ size = 48, isLit = true, idSuffix = 'a' }: FlameProps) {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!isLit) return undefined;
    let isActive = true;
    let loop: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      if (!isActive || isReduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      );
      loop.start();
    });
    return () => {
      isActive = false;
      loop?.stop();
    };
  }, [isLit, scale]);

  const outerId = `flameOuter${idSuffix}`;
  const innerId = `flameInner${idSuffix}`;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id={outerId} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#FFB020" />
            <Stop offset="1" stopColor="#FF4E1A" />
          </LinearGradient>
          <LinearGradient id={innerId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF3B0" />
            <Stop offset="1" stopColor="#FFC53D" />
          </LinearGradient>
        </Defs>
        <Path
          d={OUTER}
          fill={isLit ? `url(#${outerId})` : '#B7B3D6'}
          stroke={isLit ? '#E5470F' : '#8F8AB8'}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        {isLit ? <Path d={INNER} fill={`url(#${innerId})`} /> : null}
      </Svg>
    </Animated.View>
  );
}

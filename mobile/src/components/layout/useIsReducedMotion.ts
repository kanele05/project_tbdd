import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** `true` when the user turned on "Reduce motion" (live value, updates when they change it). */
export function useIsReducedMotion(): boolean {
  const [isReduced, setIsReduced] = useState(false);
  useEffect(() => {
    let isActive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (isActive) setIsReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReduced);
    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);
  return isReduced;
}

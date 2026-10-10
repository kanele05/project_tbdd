import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

/** The video frame never takes more than this share of the window height (the rest is for the tabs). */
export const PLAYER_MAX_HEIGHT_RATIO = 0.35;

/** Max height of the 16:9 video frame for a window: on a phone 16:9 is already shorter than this. */
export function getPlayerMaxHeight(windowHeight: number): number {
  return Math.round(windowHeight * PLAYER_MAX_HEIGHT_RATIO);
}

export function usePlayerMaxHeight(): number {
  return getPlayerMaxHeight(useWindowDimensions().height);
}

/** True while the soft keyboard is open (never on web: there is no keyboard event there). */
export function useIsKeyboardVisible(): boolean {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () => setIsVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setIsVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return isVisible;
}

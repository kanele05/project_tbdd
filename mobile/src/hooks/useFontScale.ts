import { useWindowDimensions } from 'react-native';

/** From this system font scale ("Large" on Android, ~130 %) layouts switch to their roomy variant. */
export const LARGE_TEXT_SCALE = 1.3;

/** The user's system font scale (1 = default). Updates when the setting changes while the app runs. */
export function useFontScale(): number {
  return useWindowDimensions().fontScale;
}

/** True when the system font is large enough that side-by-side rows (price + button) must wrap. */
export function useIsLargeText(): boolean {
  return useFontScale() >= LARGE_TEXT_SCALE;
}

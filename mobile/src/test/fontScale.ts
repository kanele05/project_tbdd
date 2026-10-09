import { act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

/**
 * Pretend the user set a system font size (jest-expo's default window has `fontScale: 2`).
 * `await setFontScale(1)` in `afterEach` gives the next test the normal size back.
 */
export async function setFontScale(fontScale: number): Promise<void> {
  const window = { width: 390, height: 844, scale: 2, fontScale };
  await act(async () => {
    Dimensions.set({ window, screen: window });
  });
}

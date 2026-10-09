import { renderHook } from '@testing-library/react-native';

import { setFontScale } from '@/test/fontScale';

import { LARGE_TEXT_SCALE, useFontScale, useIsLargeText } from './useFontScale';

describe('useFontScale', () => {
  afterEach(async () => {
    await setFontScale(1);
  });

  it('returns the system font scale', async () => {
    await setFontScale(1.15);
    const { result } = await renderHook(() => useFontScale());
    expect(result.current).toBe(1.15);
  });

  it('is "large text" from 130 % on, not below', async () => {
    await setFontScale(LARGE_TEXT_SCALE - 0.05);
    const below = await renderHook(() => useIsLargeText());
    expect(below.result.current).toBe(false);

    await setFontScale(LARGE_TEXT_SCALE);
    const at = await renderHook(() => useIsLargeText());
    expect(at.result.current).toBe(true);
  });
});

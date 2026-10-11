import { act, renderHook } from '@testing-library/react-native';

import {
  isWideRoute,
  useDesktopNavStore,
  useTransparentNav,
  useTransparentNavOnScroll,
} from './desktopLayout';

const scrollEvent = (y: number) =>
  ({ nativeEvent: { contentOffset: { x: 0, y } } }) as Parameters<
    ReturnType<typeof useTransparentNavOnScroll>
  >[0];

describe('desktopLayout', () => {
  afterEach(() => {
    useDesktopNavStore.getState().setTransparent(false);
  });

  it('treats routes without a desktop layout as narrow', () => {
    expect(isWideRoute('/studio/ai-draft')).toBe(false);
  });

  it('toggles the transparent nav state', () => {
    useDesktopNavStore.getState().setTransparent(true);
    expect(useDesktopNavStore.getState().isTransparent).toBe(true);
    useDesktopNavStore.getState().setTransparent(false);
    expect(useDesktopNavStore.getState().isTransparent).toBe(false);
  });

  describe('useTransparentNav', () => {
    it('sets the state while mounted and gives the solid bar back on unmount', async () => {
      const { unmount } = await renderHook(() => useTransparentNav(true));
      expect(useDesktopNavStore.getState().isTransparent).toBe(true);
      await unmount();
      expect(useDesktopNavStore.getState().isTransparent).toBe(false);
    });

    it('follows the flag', async () => {
      const { rerender } = await renderHook(
        ({ isTransparent }: { isTransparent: boolean }) => useTransparentNav(isTransparent),
        { initialProps: { isTransparent: true } },
      );
      await rerender({ isTransparent: false });
      expect(useDesktopNavStore.getState().isTransparent).toBe(false);
    });
  });

  describe('useTransparentNavOnScroll', () => {
    it('is transparent at the top, solid once scrolled past the threshold, and resets on unmount', async () => {
      const { result, unmount } = await renderHook(() => useTransparentNavOnScroll(40));
      expect(useDesktopNavStore.getState().isTransparent).toBe(true);

      await act(async () => result.current(scrollEvent(120)));
      expect(useDesktopNavStore.getState().isTransparent).toBe(false);
      await act(async () => result.current(scrollEvent(10)));
      expect(useDesktopNavStore.getState().isTransparent).toBe(true);

      await unmount();
      expect(useDesktopNavStore.getState().isTransparent).toBe(false);
    });
  });
});

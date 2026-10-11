import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { useDesktopNavStore } from '@/components/layout/desktopLayout';

/** The PC nav bar turns solid once the page has scrolled this far (dp). */
export const NAV_SOLID_SCROLL_Y = 96;

/**
 * PC layout (PLAN §2.5): the nav bar is transparent while a full-bleed hero is at the top of the
 * page and solid once the page scrolls. Returns the `onScroll` handler of the page's ScrollView.
 * The nav goes back to solid when the screen loses focus or unmounts.
 */
export function useTransparentNav(threshold: number = NAV_SOLID_SCROLL_Y) {
  const setTransparent = useDesktopNavStore((state) => state.setTransparent);
  const scrollY = useRef(0);
  const isFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      setTransparent(scrollY.current < threshold);
      return () => {
        isFocused.current = false;
        setTransparent(false);
      };
    }, [setTransparent, threshold]),
  );

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
      if (isFocused.current) setTransparent(scrollY.current < threshold);
    },
    [setTransparent, threshold],
  );
}

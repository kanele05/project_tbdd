import { usePathname } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DESKTOP_NAV_HEIGHT,
  NARROW_FALLBACK_WIDTH,
  isWideRoute,
} from '@/components/layout/desktopLayout';
import { useIsDesktopNavVisible } from '@/components/layout/useIsDesktopNavVisible';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { MAX_CONTENT_WIDTH } from '@/constants/config';
import { startPendingProgressSync } from '@/features/learning/progressSync';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useIsOnline } from '@/hooks/useIsOnline';
import { selectIsLoggedIn, useAuthStore } from '@/stores/authStore';
import { makeStyles } from '@/theme';

export type AppFrameProps = {
  children: ReactNode;
  /** The desktop top bar (`DesktopTopNav`): drawn over the content, renders nothing on phones. */
  topNav?: ReactNode;
};

/**
 * Root frame around the navigator: shows the offline banner on top and, while it is visible,
 * tells the screens below that the status-bar inset is already consumed (so headers built with
 * `useSafeAreaInsets` do not add the top padding twice).
 *
 * Layout by window width (PLAN §2.5):
 * - phone (< 768): a column of at most `MAX_CONTENT_WIDTH` dp, centered (as before, PLT-01);
 * - wide (>= 768) and signed out (auth screens): full width, the auth layout draws its own
 *   full-bleed background and centered card (WEB-05a);
 * - wide (>= 768) and signed in: full width with the desktop top bar. Screens that registered a
 *   desktop layout (`WIDE_ROUTE_PATTERNS`) fill the window and manage their own top spacing; the
 *   others sit in a centered `NARROW_FALLBACK_WIDTH` column below the bar.
 * The children are always rendered in the same place of the tree, only their style changes, so
 * switching between a wide and a narrow route never remounts the navigator.
 */
export function AppFrame({ children, topNav }: AppFrameProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const isOnline = useIsOnline();
  const { width } = useWindowDimensions();
  const hasDesktopNav = useIsDesktopNavVisible();
  const { isWide } = useBreakpoint();
  const isLoggedIn = useAuthStore(selectIsLoggedIn);
  // Signed out on a wide window = the auth screens: no phone column around them.
  const isAuthFullWidth = isWide && !isLoggedIn;
  const isFullWidth = hasDesktopNav || isAuthFullWidth;
  const pathname = usePathname();
  const isNarrowRoute = hasDesktopNav && !isWideRoute(pathname);
  // Flush lesson progress saved while offline as soon as the app is back online (FR-24/NFR-10).
  useEffect(() => {
    startPendingProgressSync();
  }, []);
  const contextInsets = useMemo(
    () => ({ ...insets, top: isOnline ? insets.top : 0 }),
    [insets, isOnline],
  );

  return (
    <View style={styles.outer} testID="app-frame">
      <View
        style={[
          styles.column,
          isFullWidth ? styles.columnFull : null,
          !isFullWidth && width > MAX_CONTENT_WIDTH ? styles.columnEdges : null,
        ]}
        testID="app-frame-column"
      >
        <OfflineBanner withTopInset />
        <SafeAreaInsetsContext.Provider value={contextInsets}>
          <View style={styles.content}>
            <View
              style={[styles.stage, isNarrowRoute ? styles.stageNarrow : null]}
              testID="app-frame-stage"
            >
              {children}
            </View>
            {topNav}
          </View>
        </SafeAreaInsetsContext.Provider>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // Fills the window; the margins around the column are a slightly different shade on wide screens.
  outer: { flex: 1, alignItems: 'center', backgroundColor: t.colors.surface },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: t.colors.background,
  },
  // Desktop / tablet web, signed in: the whole window is the app.
  columnFull: { maxWidth: '100%' },
  columnEdges: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: t.colors.border,
  },
  content: { flex: 1, backgroundColor: t.colors.background },
  stage: { flex: 1 },
  // Screens without a desktop layout: centered column below the top bar.
  stageNarrow: {
    width: '100%',
    maxWidth: NARROW_FALLBACK_WIDTH,
    alignSelf: 'center',
    paddingTop: DESKTOP_NAV_HEIGHT,
  },
}));

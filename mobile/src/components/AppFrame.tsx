import { useEffect, useMemo, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { MAX_CONTENT_WIDTH } from '@/constants/config';
import { startPendingProgressSync } from '@/features/learning/progressSync';
import { useIsOnline } from '@/hooks/useIsOnline';
import { makeStyles } from '@/theme';

/**
 * Root frame around the navigator: shows the offline banner on top and, while it is visible,
 * tells the screens below that the status-bar inset is already consumed (so headers built with
 * `useSafeAreaInsets` do not add the top padding twice).
 *
 * On wide windows (web in a desktop browser, tablets) the content is a centered column of at most
 * `MAX_CONTENT_WIDTH` dp so a phone layout never stretches across a monitor (PLT-01).
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const isOnline = useIsOnline();
  const { width } = useWindowDimensions();
  const isWide = width > MAX_CONTENT_WIDTH;
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
      <View style={[styles.column, isWide ? styles.columnWide : null]} testID="app-frame-column">
        <OfflineBanner withTopInset />
        <SafeAreaInsetsContext.Provider value={contextInsets}>
          <View style={styles.content}>{children}</View>
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
  columnWide: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: t.colors.border,
  },
  content: { flex: 1, backgroundColor: t.colors.background },
}));

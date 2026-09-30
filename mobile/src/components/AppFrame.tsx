import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useIsOnline } from '@/hooks/useIsOnline';
import { colors } from '@/theme';

/**
 * Root frame around the navigator: shows the offline banner on top and, while it is visible,
 * tells the screens below that the status-bar inset is already consumed (so headers built with
 * `useSafeAreaInsets` do not add the top padding twice).
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const isOnline = useIsOnline();
  const contextInsets = useMemo(
    () => ({ ...insets, top: isOnline ? insets.top : 0 }),
    [insets, isOnline],
  );

  return (
    <View style={styles.container}>
      <OfflineBanner withTopInset />
      <SafeAreaInsetsContext.Provider value={contextInsets}>
        <View style={styles.container}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

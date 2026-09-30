import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STRINGS } from '@/constants/strings';
import { useIsOnline } from '@/hooks/useIsOnline';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

export type OfflineBannerProps = {
  /** Add the status-bar inset above the banner (when it is the top-most element). */
  withTopInset?: boolean;
  /** Force visibility (tests / previews). By default follows the network state. */
  visible?: boolean;
};

/** Thin bar shown while the device is offline: "You're offline - showing saved data". */
export function OfflineBanner({ withTopInset = false, visible }: OfflineBannerProps) {
  const isOnline = useIsOnline();
  const insets = useSafeAreaInsets();
  const isVisible = visible ?? !isOnline;
  if (!isVisible) return null;

  return (
    <View
      style={[styles.container, { paddingTop: (withTopInset ? insets.top : 0) + spacing.xs }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Feather name="wifi-off" size={14} color={colors.white} />
      <AppText variant="caption" color="white" family="bodyMedium">
        {STRINGS.offline.banner}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.textSecondary,
  },
});

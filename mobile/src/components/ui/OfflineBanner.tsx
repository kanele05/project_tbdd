import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsOnline } from '@/hooks/useIsOnline';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

export type OfflineBannerProps = {
  /** Add the status-bar inset above the banner (when it is the top-most element). */
  withTopInset?: boolean;
  /** Force visibility (tests / previews). By default follows the network state. */
  visible?: boolean;
};

/** Thin bar shown while the device is offline: "You're offline - showing saved data". */
export function OfflineBanner({ withTopInset = false, visible }: OfflineBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const isOnline = useIsOnline();
  const insets = useSafeAreaInsets();
  const isVisible = visible ?? !isOnline;
  if (!isVisible) return null;

  return (
    <View
      style={[styles.container, { paddingTop: (withTopInset ? insets.top : 0) + spacing.xs }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="offline-banner"
    >
      <Feather name="wifi-off" size={14} color={colors.onBanner} />
      <AppText variant="caption" color="onBanner" family="bodyMedium">
        {t('offline.banner')}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    backgroundColor: t.colors.banner,
  },
}));

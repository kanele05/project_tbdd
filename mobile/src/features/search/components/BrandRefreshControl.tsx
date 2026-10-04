import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useTheme } from '@/theme';

type BrandRefreshControlProps = Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> & {
  isRefreshing: boolean;
  onRefresh: () => void;
};

/**
 * Pull-to-refresh spinner in the accent color (iOS `tintColor`, Android `colors`). It uses
 * `primaryText`, not the neon `primary`: neon on the cream light background is barely visible.
 *
 * Must forward every other prop: on Android and web, `ScrollView` clones its `refreshControl`
 * element and passes the scroll view itself as `children` (plus `style`). Dropping them renders
 * an empty screen.
 */
export function BrandRefreshControl({
  isRefreshing,
  onRefresh,
  ...rest
}: BrandRefreshControlProps) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      {...rest}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={colors.primaryText}
      colors={[colors.primaryText]}
      progressBackgroundColor={colors.card}
    />
  );
}

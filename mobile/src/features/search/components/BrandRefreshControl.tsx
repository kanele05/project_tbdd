import { RefreshControl, type RefreshControlProps } from 'react-native';

import { colors } from '@/theme';

type BrandRefreshControlProps = Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> & {
  isRefreshing: boolean;
  onRefresh: () => void;
};

/**
 * Pull-to-refresh spinner in the primary color (iOS `tintColor`, Android `colors`).
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
  return (
    <RefreshControl
      {...rest}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );
}

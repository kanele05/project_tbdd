import { RefreshControl } from 'react-native';

import { colors } from '@/theme';

type BrandRefreshControlProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

/** Pull-to-refresh spinner in the primary color (iOS `tintColor`, Android `colors`). */
export function BrandRefreshControl({ isRefreshing, onRefresh }: BrandRefreshControlProps) {
  return (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );
}

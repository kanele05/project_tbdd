import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

export type TableLoadMoreProps = {
  /** More pages exist on the server; renders nothing otherwise. */
  hasMore: boolean;
  isLoading: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * Footer of a paged table: a "See more" button (a mouse user pages explicitly instead of pulling
 * to refresh / scrolling a nested list).
 */
export function TableLoadMore({ hasMore, isLoading, onPress, testID }: TableLoadMoreProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  if (!hasMore) return null;
  return (
    <View style={styles.wrap}>
      <Button
        title={t('actions.seeMore')}
        variant="secondary"
        size="sm"
        leftIcon="chevron-down"
        loading={isLoading}
        onPress={onPress}
        testID={testID ?? 'table-load-more'}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl },
}));

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, SearchBar } from '@/components/ui';
import { colors, layout, spacing } from '@/theme';

type SearchTopBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  /** Number of active filters (badge on the Filter button). */
  filterCount: number;
  onPressFilter: () => void;
};

/** Search field + Filter button (primary, with a badge of the active-filter count) - SC-05/06. */
export function SearchTopBar({
  value,
  onChangeText,
  onSubmit,
  filterCount,
  onPressFilter,
}: SearchTopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <SearchBar
        value={value}
        onChangeText={onChangeText}
        onSubmit={onSubmit}
        placeholder="Search course"
        style={styles.search}
      />
      <View>
        <Button
          title="Filter"
          size="sm"
          leftAdornment={
            <MaterialIcons name="filter-list" size={18} color={colors.textOnPrimary} />
          }
          onPress={onPressFilter}
          accessibilityLabel={filterCount > 0 ? `Filter, ${filterCount} active` : 'Filter'}
        />
        {filterCount > 0 ? (
          <View
            style={styles.badge}
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
          >
            <Badge count={filterCount} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  search: { flex: 1 },
  badge: { position: 'absolute', top: -6, right: -6 },
});

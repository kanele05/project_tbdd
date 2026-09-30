import { StyleSheet, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';

export type SegmentedTab<K extends string> = { key: K; label: string };

export type SegmentedTabsProps<K extends string> = {
  tabs: readonly SegmentedTab<K>[];
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Equal-width text tabs with a primary underline under the active one
 * (OVERVIEW | LESSONS | REVIEW, ALL | ON GOING | COMPLETED...).
 */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  style,
}: SegmentedTabsProps<K>) {
  return (
    <View style={[styles.row, style]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={[styles.tab, isActive ? styles.tabActive : null]}
          >
            <AppText
              variant="tab"
              uppercase
              color={isActive ? 'primary' : 'textSecondary'}
              family={isActive ? 'bodySemiBold' : 'bodyMedium'}
              numberOfLines={1}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    // Overlap the row's bottom border so the active underline replaces it.
    marginBottom: -2,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: { borderBottomColor: colors.primary },
});

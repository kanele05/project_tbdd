import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

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
  const styles = useStyles();
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
              color={isActive ? 'primaryText' : 'textSecondary'}
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

/** Design: 2 dp gray track under all tabs, 4 dp primary underline under the active one. */
const TRACK_WIDTH = 2;
const UNDERLINE_WIDTH = 4;

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    borderBottomWidth: TRACK_WIDTH,
    borderBottomColor: t.colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    // Overlap the row's bottom border so the active underline replaces it.
    marginBottom: -TRACK_WIDTH,
    borderBottomWidth: UNDERLINE_WIDTH,
    borderBottomColor: t.colors.transparent,
  },
  tabActive: { borderBottomColor: t.colors.primary },
}));

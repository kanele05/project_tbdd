import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

import { AppText } from './AppText';

export type SegmentedTab<K extends string> = { key: K; label: string };

export type SegmentedTabsProps<K extends string> = {
  tabs: readonly SegmentedTab<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Upper-case the labels (old design). Concept B uses sentence case. Default false. */
  isUppercase?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Equal-width text tabs on a hairline with a neon underline under the active one
 * (Overview | Lessons | Reviews | Q&A). Active label = `text`, inactive = `textMuted`.
 */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  isUppercase = false,
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
              uppercase={isUppercase}
              color={isActive ? 'text' : 'textMuted'}
              family={isActive ? 'bodyBold' : 'bodySemiBold'}
              align="center"
              numberOfLines={2}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 1 dp hairline under all tabs, 3 dp neon underline under the active one. */
const TRACK_WIDTH = 1;
const UNDERLINE_WIDTH = 3;

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

import { Pressable, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { AppText } from '@/components/ui/AppText';
import type { SegmentedTab } from '@/components/ui/SegmentedTabs';
import { makeStyles, radius, spacing } from '@/theme';

export type MyCoursesPillTabsProps<K extends string> = {
  tabs: readonly SegmentedTab<K>[];
  value: K;
  onChange: (key: K) => void;
};

type PillProps = { label: string; isActive: boolean; onPress: () => void };

function Pill({ label, isActive, onPress }: PillProps) {
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={[styles.pill, isActive ? styles.active : isHovered ? styles.hover : null]}
    >
      <AppText
        variant="label"
        family="bodySemiBold"
        color={isActive ? 'onPrimary' : 'text'}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/** Pill-shaped filter tabs (All | On going | Completed) for the desktop My Courses page. */
export function MyCoursesPillTabs<K extends string>({
  tabs,
  value,
  onChange,
}: MyCoursesPillTabsProps<K>) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => (
        <Pill
          key={tab.key}
          label={tab.label}
          isActive={tab.key === value}
          onPress={() => onChange(tab.key)}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.transparent,
    cursor: 'pointer',
  },
  active: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  hover: { backgroundColor: t.colors.surface },
}));

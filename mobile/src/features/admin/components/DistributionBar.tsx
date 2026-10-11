import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { makeStyles, radius, spacing } from '@/theme';

import { toPercent } from '../adminMeta';

export type DistributionItem = { key: string; label: string; value: number; color: string };

export type DistributionBarProps = {
  title: string;
  items: readonly DistributionItem[];
  testID?: string;
};

const BAR_HEIGHT = 12;

/**
 * Stacked horizontal bar (react-native-svg) + a legend that repeats every number as text, so the
 * chart is never the only carrier of the information (color-blind users, screen readers).
 */
function DistributionBarBase({ title, items, testID }: DistributionBarProps) {
  const styles = useStyles();
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const summary = items.map((item) => `${item.label} ${item.value}`).join(', ');
  let offset = 0;
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {total}
        </AppText>
      </View>
      <View
        style={styles.track}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${title}: ${summary}`}
      >
        <Svg width="100%" height={BAR_HEIGHT}>
          {total > 0
            ? items.map((item) => {
                const width = (item.value / total) * 100;
                const x = offset;
                offset += width;
                return item.value > 0 ? (
                  <Rect
                    key={item.key}
                    x={`${x}%`}
                    y={0}
                    width={`${width}%`}
                    height={BAR_HEIGHT}
                    fill={item.color}
                  />
                ) : null;
              })
            : null}
        </Svg>
      </View>
      <View style={styles.legend}>
        {items.map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: item.color }]} />
            <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.label}>
              {item.label}
            </AppText>
            <AppText variant="caption" color="text" family="bodySemiBold">
              {item.value}
              {total > 0 ? ` (${toPercent(item.value, total)}%)` : ''}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: t.colors.surface,
  },
  legend: { gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: radius.badge },
  label: { flex: 1 },
}));

export const DistributionBar = memo(DistributionBarBase);

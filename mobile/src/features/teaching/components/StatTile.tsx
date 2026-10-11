import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { makeStyles, radius, spacing } from '@/theme';

export type StatTileProps = {
  label: string;
  value: string;
  /** Small line under the value ("12 completed", "Simulated payments"). */
  note?: string;
  /** Extra style, e.g. a fixed basis for the 4-up row of the PC layout. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** One KPI of the course statistics (SC-28): caption, big serif number, optional note. */
function StatTileBase({ label, value, note, style, testID }: StatTileProps) {
  const styles = useStyles();
  return (
    <View
      style={[styles.tile, style]}
      accessible
      accessibilityLabel={[label, value, note].filter(Boolean).join(', ')}
      testID={testID}
    >
      <AppText variant="caption" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="h2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </AppText>
      {note ? (
        <AppText variant="caption" numberOfLines={2}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));

export const StatTile = memo(StatTileBase);

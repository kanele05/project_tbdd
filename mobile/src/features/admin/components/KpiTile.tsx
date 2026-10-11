import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type KpiTileProps = {
  icon: FeatherIconName;
  label: string;
  value: string;
  /** Small line under the value ("3 disabled"). */
  hint?: string;
  testID?: string;
};

/** One number of the dashboard: icon, big value, label (+ optional hint). Read as a single sentence by screen readers. */
function KpiTileBase({ icon, label, value, hint, testID }: KpiTileProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={hint ? `${label}: ${value}. ${hint}` : `${label}: ${value}`}
      testID={testID}
    >
      <View style={styles.iconWrap}>
        <Feather name={icon} size={18} color={colors.primaryText} />
      </View>
      <AppText variant="h2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </AppText>
      <AppText variant="caption" color="textSecondary" numberOfLines={2}>
        {label}
      </AppText>
      {hint ? (
        <AppText variant="micro" color="textMuted" numberOfLines={2}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    // Two per row on a phone; wraps to a third column when the container is wider.
    flexGrow: 1,
    flexBasis: '45%',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    backgroundColor: t.colors.primarySoft,
  },
}));

export const KpiTile = memo(KpiTileBase);

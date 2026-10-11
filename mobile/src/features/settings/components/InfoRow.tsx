import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { layout, makeStyles, spacing } from '@/theme';

export type InfoRowProps = {
  label: string;
  value: string;
  /** Long values (email): label on its own line, value below it and allowed to wrap. */
  isStacked?: boolean;
};

/** A read-only "label ... value" row of the Settings cards (app name, version, signed-in email). */
export function InfoRow({ label, value, isStacked = false }: InfoRowProps) {
  const styles = useStyles();
  return (
    <View
      style={[styles.infoRow, isStacked ? styles.infoRowStacked : null]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <AppText variant="body">{label}</AppText>
      <AppText
        variant="body"
        color="textSecondary"
        numberOfLines={isStacked ? 2 : 1}
        ellipsizeMode={isStacked ? 'middle' : 'tail'}
        style={isStacked ? styles.infoValueStacked : styles.infoValue}
      >
        {value}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  infoRow: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  infoRowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  infoValue: { flexShrink: 1 },
  infoValueStacked: { alignSelf: 'stretch' },
}));

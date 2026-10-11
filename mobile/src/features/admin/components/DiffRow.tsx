import Feather from '@expo/vector-icons/Feather';
import { memo, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type DiffKind = 'added' | 'removed' | 'changed' | 'info';

const ICONS: Record<DiffKind, FeatherIconName> = {
  added: 'plus-circle',
  removed: 'minus-circle',
  changed: 'edit-2',
  info: 'shuffle',
};

export type DiffRowProps = {
  kind: DiffKind;
  /** Short word that names the change ("Lesson added"): the meaning never depends on the color. */
  label: string;
  children?: ReactNode;
  testID?: string;
};

/** One line of the revision diff: icon (shape + color) + label + details. */
function DiffRowBase({ kind, label, children, testID }: DiffRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const iconColor =
    kind === 'added' ? colors.success : kind === 'removed' ? colors.danger : colors.primaryText;
  return (
    <View style={styles.row} accessible={false} testID={testID}>
      <Feather name={ICONS[kind]} size={20} color={iconColor} style={styles.icon} />
      <View style={styles.body}>
        <AppText variant="label">{label}</AppText>
        {children}
      </View>
    </View>
  );
}

/** "before -> after" pair of one field, with explicit Before / After captions. */
export function BeforeAfter({
  beforeLabel,
  afterLabel,
  before,
  after,
}: {
  beforeLabel: string;
  afterLabel: string;
  before: string;
  after: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.pair}>
      <View style={styles.pairLine}>
        <AppText variant="caption" color="textMuted" style={styles.pairLabel}>
          {beforeLabel}
        </AppText>
        <AppText variant="body" color="textMuted" style={[styles.value, styles.strike]}>
          {before}
        </AppText>
      </View>
      <View style={styles.pairLine}>
        <AppText variant="caption" color="textSecondary" style={styles.pairLabel}>
          {afterLabel}
        </AppText>
        <AppText variant="body" family="bodySemiBold" style={styles.value}>
          {after}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderSubtle,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: spacing.xs },
  pair: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.badge,
    backgroundColor: t.colors.surface,
  },
  pairLine: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  pairLabel: { minWidth: 52 },
  value: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
}));

export const DiffRow = memo(DiffRowBase);

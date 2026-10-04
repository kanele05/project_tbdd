import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type SecurityCardProps = {
  icon: FeatherIconName;
  title: string;
  description?: string;
  /** Status chip at the end of the title row ("On"). */
  right?: ReactNode;
  children?: ReactNode;
  testID?: string;
};

/** Titled card of the Security screen: tinted icon + title (+ status) + description + content. */
export function SecurityCard({
  icon,
  title,
  description,
  right,
  children,
  testID,
}: SecurityCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <View style={styles.iconDisc}>
          <Feather name={icon} size={20} color={colors.primaryText} />
        </View>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {right}
      </View>
      {description ? (
        <AppText variant="body" color="textSecondary">
          {description}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconDisc: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: t.colors.primarySoft,
  },
  title: { flex: 1 },
}));

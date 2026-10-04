import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { makeStyles, radius, spacing } from '@/theme';

export type SettingsSectionProps = {
  title: string;
  children: ReactNode;
  /** Group the rows as a radio group for screen readers. */
  isRadioGroup?: boolean;
};

/** Titled card that holds the rows of one settings group, separated by hairlines. */
export function SettingsSection({ title, children, isRadioGroup = false }: SettingsSectionProps) {
  const styles = useStyles();
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.card} accessibilityRole={isRadioGroup ? 'radiogroup' : undefined}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: spacing.sm },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  divider: { height: 1, marginHorizontal: spacing.lg, backgroundColor: t.colors.borderSubtle },
}));

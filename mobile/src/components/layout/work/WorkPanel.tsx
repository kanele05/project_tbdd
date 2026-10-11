import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { makeStyles, radius, spacing } from '@/theme';

export type WorkPanelProps = {
  /** Optional section heading inside the card. */
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A bordered card that groups one block of a PC work page (actions, history, a chart...). */
export function WorkPanel({ title, children, style, testID }: WorkPanelProps) {
  const styles = useStyles();
  return (
    <View style={[styles.panel, style]} testID={testID}>
      {title ? (
        <AppText variant="h3" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  panel: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));

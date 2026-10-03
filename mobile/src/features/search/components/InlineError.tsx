import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { colors, radius, spacing } from '@/theme';

type InlineErrorProps = {
  message: string;
  onRetry: () => void;
};

/** Compact error with a Retry button, for one failed section of a screen that has other content. */
export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <AppText variant="body" color="textSecondary" style={styles.message}>
        {message}
      </AppText>
      <Button title={STRINGS.common.retry} onPress={onRetry} variant="outline" size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
  },
  message: { flex: 1 },
});

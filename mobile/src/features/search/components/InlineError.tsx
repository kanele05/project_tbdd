import { View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

type InlineErrorProps = {
  message: string;
  onRetry: () => void;
};

/** Compact error with a Retry button, for one failed section of a screen that has other content. */
export function InlineError({ message, onRetry }: InlineErrorProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <View style={styles.container} accessibilityRole="alert">
      <AppText variant="body" color="textSecondary" style={styles.message}>
        {message}
      </AppText>
      <Button title={t('actions.retry')} onPress={onRetry} variant="outline" size="sm" />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  message: { flex: 1 },
}));

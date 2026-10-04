import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme';

export type PlayerPlaceholderProps = {
  /** `loading` spinner, or a `message` (offline / error) with an optional Retry. */
  message?: string;
  onRetry?: () => void;
};

/** Dark box in the video slot while the lesson loads, or when it cannot be played. */
export function PlayerPlaceholder({ message, onRetry }: PlayerPlaceholderProps) {
  const { t } = useTranslation(['learning', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container} testID="player-placeholder">
      {message ? (
        <>
          <AppText variant="body" color="white" align="center">
            {message}
          </AppText>
          {onRetry ? (
            <Button
              title={t('common:actions.retry')}
              variant="outline"
              size="sm"
              leftIcon="refresh-cw"
              onPress={onRetry}
            />
          ) : null}
        </>
      ) : (
        <ActivityIndicator color={colors.white} accessibilityLabel={t('loadingVideo')} />
      )}
    </View>
  );
}

/** The video slot is always dark (like a cinema screen), in light mode too. */
const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: t.colors.scrim,
  },
}));

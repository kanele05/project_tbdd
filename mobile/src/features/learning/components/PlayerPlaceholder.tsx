import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { STRINGS } from '@/constants/strings';
import { colors, spacing } from '@/theme';

export type PlayerPlaceholderProps = {
  /** `loading` spinner, or a `message` (offline / error) with an optional Retry. */
  message?: string;
  onRetry?: () => void;
};

/** Dark box in the video slot while the lesson loads, or when it cannot be played. */
export function PlayerPlaceholder({ message, onRetry }: PlayerPlaceholderProps) {
  return (
    <View style={styles.container} testID="player-placeholder">
      {message ? (
        <>
          <AppText variant="body" color="white" align="center">
            {message}
          </AppText>
          {onRetry ? (
            <Button
              title={STRINGS.common.retry}
              variant="outline"
              size="sm"
              leftIcon="refresh-cw"
              onPress={onRetry}
            />
          ) : null}
        </>
      ) : (
        <ActivityIndicator color={colors.white} accessibilityLabel="Loading video" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.textPrimary,
  },
});

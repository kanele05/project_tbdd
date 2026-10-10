import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { makeStyles, spacing, useTheme } from '@/theme';

export type PlayerStatusProps = {
  /** `loading` spinner + label, or `error` icon + short message + optional Retry. */
  kind: 'loading' | 'error';
  label: string;
  retryLabel?: string;
  onRetry?: () => void;
  testID?: string;
};

/**
 * Loading / error content that fills a `PlayerStage` (absolute, so it cannot make the stage taller).
 * It is always on the dark stage, so text and icon are white and Retry is the primary pill. A long
 * message or a large system font scrolls inside the box instead of pushing the tabs down.
 */
export function PlayerStatus({ kind, label, retryLabel, onRetry, testID }: PlayerStatusProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  if (kind === 'loading') {
    return (
      <View style={styles.fill} accessibilityLiveRegion="polite" testID={testID}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.white} />
          <AppText variant="caption" color="white" align="center">
            {label}
          </AppText>
        </View>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.center}
      nestedScrollEnabled
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Feather name="alert-circle" size={24} color={colors.white} />
      <AppText variant="body" color="white" align="center">
        {label}
      </AppText>
      {onRetry && retryLabel ? (
        <Button
          title={retryLabel}
          variant="primary"
          size="sm"
          leftIcon="refresh-cw"
          onPress={onRetry}
        />
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
}));

import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { STRINGS } from '@/constants/strings';
import { getErrorMessage, toAppError } from '@/lib/appError';
import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export type ErrorStateProps = {
  /** The caught error; its friendly message is shown unless `message` is given. */
  error?: unknown;
  title?: string;
  message?: string;
  /** Renders the "Retry" button when provided (refetch / reset). */
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Error placeholder with a Retry button - the "error" state of every data screen. */
export function ErrorState({
  error,
  title = STRINGS.errors.loadFailedTitle,
  message,
  onRetry,
  retryLabel = STRINGS.common.retry,
  style,
}: ErrorStateProps) {
  const resolvedMessage =
    message ?? (error !== undefined ? getErrorMessage(error) : STRINGS.errors.generic);
  const isNetwork = error !== undefined && toAppError(error).isNetworkError;

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Feather name={isNetwork ? 'wifi-off' : 'alert-circle'} size={32} color={colors.danger} />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {resolvedMessage}
      </AppText>
      {onRetry ? (
        <Button title={retryLabel} onPress={onRetry} leftIcon="refresh-cw" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.dangerLight,
  },
  action: { marginTop: spacing.md },
});

import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { getErrorMessage, toAppError } from '@/lib/appError';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

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
export function ErrorState({ error, title, message, onRetry, retryLabel, style }: ErrorStateProps) {
  const { t } = useTranslation(['common', 'errors']);
  const { colors } = useTheme();
  const themed = useStyles();
  const resolvedMessage =
    message ?? (error !== undefined ? getErrorMessage(error) : t('errors:generic'));
  const isNetwork = error !== undefined && toAppError(error).isNetworkError;

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={[styles.iconWrap, themed.iconWrap]}>
        <Feather
          name={isNetwork ? 'wifi-off' : 'alert-circle'}
          size={32}
          color={colors.dangerText}
        />
      </View>
      <AppText variant="h3" align="center">
        {title ?? t('errors:loadFailedTitle')}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {resolvedMessage}
      </AppText>
      {onRetry ? (
        <Button
          title={retryLabel ?? t('actions.retry')}
          onPress={onRetry}
          leftIcon="refresh-cw"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  iconWrap: { backgroundColor: t.colors.dangerSoft },
}));

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
  },
  // The Button is `alignSelf: 'flex-start'` by default; centre it under the centred texts.
  action: { marginTop: spacing.md, alignSelf: 'center' },
});

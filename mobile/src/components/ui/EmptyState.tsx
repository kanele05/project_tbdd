import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import type { FeatherIconName } from './icons';

export type EmptyStateProps = {
  title?: string;
  message?: string;
  icon?: FeatherIconName;
  /** Primary call to action, e.g. "Explore courses". */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** "Nothing here" placeholder: icon, title, optional message and CTA. */
export function EmptyState({
  title,
  message,
  icon = 'inbox',
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themed = useStyles();
  return (
    <View style={[styles.container, style]} accessibilityRole="summary">
      <View style={[styles.iconWrap, themed.iconWrap]}>
        <Feather name={icon} size={32} color={colors.primary} />
      </View>
      <AppText variant="title" align="center">
        {title ?? t('empty.defaultTitle')}
      </AppText>
      {message ? (
        <AppText variant="body" color="textSecondary" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  iconWrap: { backgroundColor: t.colors.primarySoft },
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

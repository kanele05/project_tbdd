import Feather from '@expo/vector-icons/Feather';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

export type NoticeProps = {
  tone?: NoticeTone;
  icon?: FeatherIconName;
  title?: string;
  message?: string;
  /** Extra content under the text (a button, a list). */
  children?: ReactNode;
  testID?: string;
};

const DEFAULT_ICON: Record<NoticeTone, FeatherIconName> = {
  info: 'info',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  success: 'check-circle',
};

/**
 * Inline callout used all over the Studio to say which mode the teacher is in ("you are editing a
 * revision", "this course is locked while it is in review", a rejection reason...). Text uses the
 * regular text colors on a soft tint, the icon carries the tone, so contrast holds in both themes.
 */
export function Notice({ tone = 'info', icon, title, message, children, testID }: NoticeProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const accent =
    tone === 'danger'
      ? colors.dangerText
      : tone === 'success'
        ? colors.success
        : tone === 'warning'
          ? colors.goldText
          : colors.primaryText;
  const background =
    tone === 'danger'
      ? colors.dangerSoft
      : tone === 'info'
        ? colors.primarySoft
        : colors.surfaceAlt;
  return (
    <View
      style={[styles.box, { backgroundColor: background, borderColor: accent }]}
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      testID={testID}
    >
      <Feather name={icon ?? DEFAULT_ICON[tone]} size={20} color={accent} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <AppText variant="label" family="bodySemiBold">
            {title}
          </AppText>
        ) : null}
        {message ? (
          <AppText variant="body" color="textSecondary">
            {message}
          </AppText>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  box: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  icon: { marginTop: 2 },
  body: { flex: 1, gap: spacing.xs },
}));

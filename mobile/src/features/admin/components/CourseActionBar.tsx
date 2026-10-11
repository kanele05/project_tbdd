import { memo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { CourseStatus, ModerationTarget } from '@/types/api';

export type CourseActionBarProps = {
  status: CourseStatus;
  /** What an approval would publish; `null` when nothing is waiting for a decision. */
  reviewTarget: ModerationTarget | null;
  isApproving: boolean;
  isRestoring: boolean;
  onApprove: () => void;
  onReject: () => void;
  onArchive: () => void;
  onRestore: () => void;
  /** `panel` = vertical buttons in a card for the side column of the PC layout (default `bar`). */
  variant?: 'bar' | 'panel';
};

/** Whether the bar has any action for this course (nothing for drafts or an already decided course). */
export function hasCourseActions(
  status: CourseStatus,
  reviewTarget: ModerationTarget | null,
): boolean {
  return reviewTarget !== null || status === 'PUBLISHED' || status === 'ARCHIVED';
}

/**
 * Decision bar of SC-33: Approve / Reject while a submission waits, Archive for a published course,
 * Restore for a hidden one. Sits below the scroll area so it never covers the content. The `panel`
 * variant is the same decision as a card with stacked buttons (side column on a PC window).
 */
function CourseActionBarBase({
  status,
  reviewTarget,
  isApproving,
  isRestoring,
  onApprove,
  onReject,
  onArchive,
  onRestore,
  variant = 'bar',
}: CourseActionBarProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!hasCourseActions(status, reviewTarget)) return null;
  const isPanel = variant === 'panel';
  const buttonFlex = isPanel ? null : styles.flex;
  return (
    <View
      style={isPanel ? styles.panel : [styles.bar, { paddingBottom: insets.bottom + spacing.md }]}
      testID="action-bar"
    >
      {isPanel ? (
        <AppText variant="h3" accessibilityRole="header">
          {t('detail.decisionTitle')}
        </AppText>
      ) : null}
      {reviewTarget ? (
        <View style={isPanel ? styles.column : styles.row}>
          <Button
            title={t('actions.reject')}
            variant="outline"
            leftIcon="x"
            onPress={onReject}
            disabled={isApproving}
            style={buttonFlex}
            testID="action-reject"
          />
          <Button
            title={t('actions.approve')}
            leftIcon="check"
            onPress={onApprove}
            loading={isApproving}
            style={buttonFlex}
            testID="action-approve"
          />
        </View>
      ) : null}
      {status === 'PUBLISHED' ? (
        <Button
          title={t('actions.archive')}
          variant={reviewTarget ? 'ghost' : 'secondary'}
          leftIcon="archive"
          onPress={onArchive}
          fullWidth
          testID="action-archive"
        />
      ) : null}
      {status === 'ARCHIVED' ? (
        <Button
          title={t('actions.restore')}
          leftIcon="rotate-ccw"
          onPress={onRestore}
          loading={isRestoring}
          fullWidth
          testID="action-restore"
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  column: { gap: spacing.sm },
  panel: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  flex: { flex: 1 },
}));

export const CourseActionBar = memo(CourseActionBarBase);

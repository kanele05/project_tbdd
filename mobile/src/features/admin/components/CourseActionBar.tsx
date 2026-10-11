import { memo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
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
 * Restore for a hidden one. Sits below the scroll area so it never covers the content.
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
}: CourseActionBarProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!hasCourseActions(status, reviewTarget)) return null;
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]} testID="action-bar">
      {reviewTarget ? (
        <View style={styles.row}>
          <Button
            title={t('actions.reject')}
            variant="outline"
            leftIcon="x"
            onPress={onReject}
            disabled={isApproving}
            style={styles.flex}
            testID="action-reject"
          />
          <Button
            title={t('actions.approve')}
            leftIcon="check"
            onPress={onApprove}
            loading={isApproving}
            style={styles.flex}
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
  flex: { flex: 1 },
}));

export const CourseActionBar = memo(CourseActionBarBase);

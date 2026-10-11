import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { CourseMissingItemDto, StudioCourseDetailDto } from '@/types/api';

import type { useCourseStatusActions } from '../useCourseStatusActions';
import { MissingList } from './MissingList';
import { Notice } from './Notice';

type Actions = ReturnType<typeof useCourseStatusActions>;

export type StatusActionsSectionProps = {
  detail: StudioCourseDetailDto;
  actions: Actions;
  /** Unmet BR-20 items to show (live checklist, or the ones a failed submit reported). */
  missing: readonly CourseMissingItemDto[];
};

/**
 * Main action(s) of a course by status (BR-19): DRAFT / REJECTED -> checklist + Submit (+ Delete),
 * PENDING_REVIEW -> Withdraw, PUBLISHED -> Hide, ARCHIVED -> Restore. Submit stays disabled while
 * the checklist has open items.
 */
export function StatusActionsSection({ detail, actions, missing }: StatusActionsSectionProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const { status } = detail;

  if (status === 'DRAFT' || status === 'REJECTED') {
    const isReady = missing.length === 0;
    return (
      <View style={styles.block} testID="status-actions-draft">
        <AppText variant="h3" accessibilityRole="header">
          {t('status.checklistTitle')}
        </AppText>
        {isReady ? (
          <Notice tone="success" message={t('status.ready')} testID="status-ready" />
        ) : (
          <>
            <AppText variant="caption">
              {t('status.missingIntro', { count: missing.length })}
            </AppText>
            <MissingList courseId={detail.id} items={missing} />
          </>
        )}
        <Button
          title={status === 'REJECTED' ? t('status.resubmit') : t('status.submit')}
          leftIcon="send"
          onPress={() => void actions.submit()}
          disabled={!isReady || actions.isBusy}
          loading={actions.isBusy}
          fullWidth
          testID="status-submit"
        />
        <Button
          title={t('status.delete')}
          variant="ghost"
          leftIcon="trash-2"
          onPress={() => void actions.deleteCourse()}
          disabled={actions.isBusy}
          testID="status-delete"
        />
      </View>
    );
  }

  if (status === 'PENDING_REVIEW') {
    return (
      <View style={styles.block} testID="status-actions-pending">
        <Notice tone="warning" icon="clock" message={t('status.pendingMessage')} />
        <Button
          title={t('status.withdraw')}
          variant="secondary"
          leftIcon="corner-up-left"
          onPress={() => void actions.withdraw()}
          loading={actions.isBusy}
          fullWidth
          testID="status-withdraw"
        />
      </View>
    );
  }

  if (status === 'PUBLISHED') {
    return (
      <View style={styles.block} testID="status-actions-published">
        <Notice tone="success" message={t('status.publishedMessage')} />
        <Button
          title={t('status.archive')}
          variant="secondary"
          leftIcon="eye-off"
          onPress={() => void actions.archive()}
          loading={actions.isBusy}
          fullWidth
          testID="status-archive"
        />
      </View>
    );
  }

  return (
    <View style={styles.block} testID="status-actions-archived">
      <Notice tone="info" icon="eye-off" message={t('status.archivedMessage')} />
      <Button
        title={t('status.restore')}
        leftIcon="eye"
        onPress={() => void actions.restore()}
        loading={actions.isBusy}
        fullWidth
        testID="status-restore"
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({ block: { gap: spacing.md } }));

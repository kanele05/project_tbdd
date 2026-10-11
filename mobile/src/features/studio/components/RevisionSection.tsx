import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { formatDate } from '@/i18n/format';
import { makeStyles, spacing } from '@/theme';
import type { StudioCourseDetailDto } from '@/types/api';

import type { useCourseStatusActions } from '../useCourseStatusActions';
import { MissingList } from './MissingList';
import { Notice } from './Notice';
import { StatusChip } from './StatusChip';

export type RevisionSectionProps = {
  detail: StudioCourseDetailDto;
  actions: ReturnType<typeof useCourseStatusActions>;
};

function openEditor(path: '/studio/[id]/edit' | '/studio/[id]/curriculum', id: string): void {
  router.push({ pathname: path, params: { id } });
}

/**
 * Revision of a PUBLISHED course (BR-21): create one, keep editing it, submit it for review or
 * throw it away. Students keep seeing the published version until an admin approves the revision.
 */
export function RevisionSection({ detail, actions }: RevisionSectionProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const revision = detail.revision;

  if (!revision) {
    return (
      <View style={styles.block} testID="revision-none">
        <AppText variant="h3" accessibilityRole="header">
          {t('revision.title')}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {t('revision.noneMessage')}
        </AppText>
        <Button
          title={t('revision.start')}
          variant="outline"
          leftIcon="edit-3"
          onPress={() => void actions.createRevision()}
          loading={actions.isBusy}
          fullWidth
          testID="revision-start"
        />
      </View>
    );
  }

  const isPending = revision.status === 'PENDING_REVIEW';
  const canSubmit = !isPending && revision.missing.length === 0;
  return (
    <View style={styles.block} testID={`revision-${revision.status}`}>
      <View style={styles.titleRow}>
        <AppText variant="h3" accessibilityRole="header" style={styles.title}>
          {t('revision.title')}
        </AppText>
        <StatusChip revision={revision.status} />
      </View>
      <AppText variant="caption">
        {t('revision.updated', { date: formatDate(revision.updatedAt) })}
      </AppText>
      {revision.status === 'REJECTED' && revision.rejectionReason ? (
        <Notice
          tone="danger"
          title={t('revision.rejectedTitle')}
          message={revision.rejectionReason}
          testID="revision-rejection"
        />
      ) : null}
      {isPending ? (
        <Notice tone="warning" icon="clock" message={t('revision.pendingMessage')} />
      ) : (
        <>
          {revision.missing.length > 0 ? (
            <>
              <AppText variant="caption">
                {t('status.missingIntro', { count: revision.missing.length })}
              </AppText>
              <MissingList courseId={detail.id} items={revision.missing} />
            </>
          ) : (
            <Notice tone="success" message={t('revision.ready')} />
          )}
          <View style={styles.buttons}>
            <Button
              title={t('revision.editInfo')}
              variant="secondary"
              size="sm"
              leftIcon="edit-2"
              onPress={() => openEditor('/studio/[id]/edit', detail.id)}
            />
            <Button
              title={t('revision.editCurriculum')}
              variant="secondary"
              size="sm"
              leftIcon="list"
              onPress={() => openEditor('/studio/[id]/curriculum', detail.id)}
            />
          </View>
          <Button
            title={revision.status === 'REJECTED' ? t('status.resubmit') : t('revision.submit')}
            leftIcon="send"
            onPress={() => void actions.submitRevision()}
            disabled={!canSubmit || actions.isBusy}
            loading={actions.isBusy}
            fullWidth
            testID="revision-submit"
          />
        </>
      )}
      <Button
        title={isPending ? t('revision.withdraw') : t('revision.discard')}
        variant="ghost"
        leftIcon={isPending ? 'corner-up-left' : 'trash-2'}
        onPress={() => void actions.discardRevision()}
        disabled={actions.isBusy}
        testID="revision-discard"
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  block: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));

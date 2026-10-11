import { View } from 'react-native';

import { TwoColumn, WorkPanel } from '@/components/layout/work';
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { StudioCourseDetailDto } from '@/types/api';

import { useCourseStatusActions } from '../../useCourseStatusActions';
import { StatusHero, StatusLinks } from '../CourseStatusParts';
import { ModerationTimeline } from '../ModerationTimeline';
import { Notice } from '../Notice';
import { RevisionSection } from '../RevisionSection';
import { StatusActionsSection } from '../StatusActionsSection';

/**
 * SC-26 on a PC window: the course header on top, then the main column (rejection reason, checklist
 * and status actions, revision) next to a side column with the shortcuts and the review history.
 */
export function CourseStatusDesktop({ detail }: { detail: StudioCourseDetailDto }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const actions = useCourseStatusActions(detail);
  const missing = actions.missingFromError ?? detail.missing;
  return (
    <View style={styles.page} testID="status-desktop">
      <StatusHero detail={detail} isLarge />
      <TwoColumn
        testID="status-columns"
        main={
          <>
            {detail.status === 'REJECTED' && detail.rejectionReason ? (
              <Notice
                tone="danger"
                title={t('status.rejectedTitle')}
                message={detail.rejectionReason}
                testID="status-rejection"
              />
            ) : null}
            <FormError message={actions.error} />
            <WorkPanel>
              <StatusActionsSection detail={detail} actions={actions} missing={missing} />
            </WorkPanel>
            {detail.status === 'PUBLISHED' ? (
              <WorkPanel>
                <RevisionSection detail={detail} actions={actions} />
              </WorkPanel>
            ) : null}
          </>
        }
        side={
          <>
            <WorkPanel title={t('status.linksTitle')}>
              <StatusLinks detail={detail} />
            </WorkPanel>
            <WorkPanel title={t('history.title')}>
              <ModerationTimeline entries={detail.moderation} />
            </WorkPanel>
          </>
        }
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({ page: { gap: spacing.xxl } }));

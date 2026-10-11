import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkHeader, WorkShell } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { FormError } from '@/features/auth/components/FormError';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { StudioCourseDetailDto } from '@/types/api';

import { StatusHero, StatusLinks } from '../components/CourseStatusParts';
import { CourseStatusDesktop } from '../components/desktop/CourseStatusDesktop';
import { ModerationTimeline } from '../components/ModerationTimeline';
import { Notice } from '../components/Notice';
import { RevisionSection } from '../components/RevisionSection';
import { StatusActionsSection } from '../components/StatusActionsSection';
import { useStudioCourse } from '../hooks';
import { useCourseStatusActions } from '../useCourseStatusActions';

function StatusContent({ detail }: { detail: StudioCourseDetailDto }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const actions = useCourseStatusActions(detail);
  const missing = actions.missingFromError ?? detail.missing;
  return (
    <View style={styles.stack}>
      <StatusHero detail={detail} />
      {detail.status === 'REJECTED' && detail.rejectionReason ? (
        <Notice
          tone="danger"
          title={t('status.rejectedTitle')}
          message={detail.rejectionReason}
          testID="status-rejection"
        />
      ) : null}
      <FormError message={actions.error} />
      <StatusActionsSection detail={detail} actions={actions} missing={missing} />
      {detail.status === 'PUBLISHED' ? <RevisionSection detail={detail} actions={actions} /> : null}
      <StatusLinks detail={detail} />
      <View style={styles.history}>
        <AppText variant="h3" accessibilityRole="header">
          {t('history.title')}
        </AppText>
        <ModerationTimeline entries={detail.moderation} />
      </View>
    </View>
  );
}

/**
 * SC-26 Course status (FR-41 / FR-42 / FR-43): where the course is in its life cycle, what is
 * missing before it can be submitted, the buttons that move it forward (submit, withdraw, hide,
 * restore, delete), the revision of a published course, links to the editors / stats / project
 * submissions, and the review history with the admin's reasons. On a PC window it is two columns
 * (actions | shortcuts + history).
 */
export function CourseStatusScreen({ courseId }: { courseId: string }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const query = useStudioCourse(courseId);

  let body;
  if (isOfflineWithoutData(query)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void query.refetch()} />;
  } else if (query.isPending) {
    body = (
      <View style={styles.stack} testID="status-skeleton">
        <Skeleton height={88} />
        <Skeleton height={120} />
        <Skeleton height={52} />
      </View>
    );
  } else if (query.isError) {
    body = (
      <ErrorState
        error={query.error}
        title={t('loadFailed')}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (isWide) {
    body = <CourseStatusDesktop detail={query.data} />;
  } else {
    body = <StatusContent detail={query.data} />;
  }

  if (isWide) {
    return (
      <WorkShell maxWidth={STATUS_MAX_WIDTH} testID="course-status-desktop">
        <WorkHeader title={t('status.title')} hasBack />
        {body}
      </WorkShell>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('status.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isPending}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        {body}
      </ScrollView>
    </View>
  );
}

const STATUS_MAX_WIDTH = 1100;

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md },
  stack: { gap: spacing.xl },
  history: { gap: spacing.md },
}));

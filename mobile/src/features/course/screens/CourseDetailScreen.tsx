import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { ErrorState, GlassIconButton, ScreenHeader } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { AppError } from '@/lib/appError';
import { layout, makeStyles, spacing } from '@/theme';

import { CourseDetailBody } from '../components/CourseDetailBody';
import { CourseDetailSkeleton } from '../components/CourseDetailSkeleton';
import { CourseDesktopBody } from '../components/desktop/CourseDesktopBody';
import { CourseDesktopSkeleton } from '../components/desktop/CourseDesktopSkeleton';
import { PreviewPlayerModal } from '../components/PreviewPlayerModal';
import { useCourseDetail } from '../hooks';

export type CourseDetailScreenProps = { courseId: string };

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * SC-09 Course details (concept B). This screen owns the course query, the four data states
 * (skeleton / error with Retry / success) and the preview player; the loaded layout lives in
 * `CourseDetailBody`.
 */
export function CourseDetailScreen({ courseId }: CourseDetailScreenProps) {
  const { t } = useTranslation(['course', 'common', 'errors']);
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const { data: course, isError, error, fetchStatus, refetch } = useCourseDetail(courseId);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);
  const handleClosePreview = useCallback(() => setPreviewLessonId(null), []);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const isOfflineWithoutData = !course && fetchStatus === 'paused';
  const failure = isOfflineWithoutData
    ? new AppError({ status: 0, code: 'OFFLINE', message: t('errors:offline') })
    : error;

  let body;
  if (course && isWide) {
    body = <CourseDesktopBody course={course} onPlayPreview={setPreviewLessonId} />;
  } else if (course) {
    body = (
      <CourseDetailBody
        course={course}
        isRefreshing={isRefreshing}
        onRefresh={() => void handleRefresh()}
        onPlayPreview={setPreviewLessonId}
      />
    );
  } else if (isError || isOfflineWithoutData) {
    const failed = (
      <>
        <ScreenHeader />
        <ErrorState error={failure} onRetry={handleRetry} />
      </>
    );
    body = isWide ? <View style={styles.belowNav}>{failed}</View> : failed;
  } else if (isWide) {
    body = (
      <View style={styles.belowNav}>
        <CourseDesktopSkeleton />
      </View>
    );
  } else {
    body = (
      <>
        <ScrollView scrollEnabled={false}>
          <CourseDetailSkeleton />
        </ScrollView>
        <View style={[styles.floatingBack, { top: insets.top + spacing.sm }]}>
          <GlassIconButton
            icon="chevron-left"
            accessibilityLabel={t('common:actions.back')}
            onPress={goBack}
          />
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      {/* The hero photo is dark in both themes: light status-bar icons while it is on screen. */}
      <StatusBar style={course ? 'light' : 'auto'} />
      {body}
      <PreviewPlayerModal lessonId={previewLessonId} onClose={handleClosePreview} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  // On a wide window the fixed nav bar covers the top DESKTOP_NAV_HEIGHT dp of the page.
  belowNav: { flex: 1, paddingTop: DESKTOP_NAV_HEIGHT },
  floatingBack: { position: 'absolute', left: layout.screenPaddingX },
}));

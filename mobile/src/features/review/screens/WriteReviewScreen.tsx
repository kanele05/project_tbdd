import { router } from 'expo-router';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogFrame } from '@/components/layout/DialogFrame';
import { CinematicHeader } from '@/components/ui/CinematicHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { GlassIconButton } from '@/components/ui/GlassIconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { getCachedCourseImage } from '@/features/course/cachedCourseImage';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';

import { ReviewForm } from '../components/ReviewForm';
import { useMyReview } from '../hooks';

export type WriteReviewScreenProps = { courseId: string };

function closeModal(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * SC-11 Write review (modal). Loads the user's existing review first, so the form opens
 * pre-filled to edit it (`PUT` creates or updates, BR-08).
 */
export function WriteReviewScreen({ courseId }: WriteReviewScreenProps) {
  const { t } = useTranslation('review');
  const themed = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const myReview = useMyReview(courseId);

  let content;
  if (isOfflineWithoutData(myReview)) {
    content = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void myReview.refetch()} />;
  } else if (myReview.isPending) {
    content = (
      <View style={styles.skeleton}>
        <Skeleton width="40%" height={20} />
        <Skeleton width="60%" height={36} />
        <Skeleton height={140} />
      </View>
    );
  } else if (myReview.isError) {
    content = (
      <ErrorState
        error={myReview.error}
        title={t('loadMineFailed')}
        onRetry={() => void myReview.refetch()}
      />
    );
  } else {
    content = <ReviewForm courseId={courseId} initialReview={myReview.data} />;
  }

  if (isWide) {
    return (
      <DialogFrame
        title={t('write.title')}
        closeLabel={t('write.close')}
        onClose={closeModal}
        width={600}
        testID="write-review-dialog"
      >
        {content}
      </DialogFrame>
    );
  }

  return (
    <KeyboardAvoidingView style={themed.screen} behavior="padding">
      <CinematicHeader
        title={t('write.title')}
        uri={getCachedCourseImage(courseId)}
        posterIndex={3}
        showBack={false}
        right={
          <GlassIconButton icon="x" onPress={closeModal} accessibilityLabel={t('write.close')} />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.lg },
  skeleton: { gap: spacing.xl },
});

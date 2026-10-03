import { router } from 'expo-router';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { colors, layout, spacing } from '@/theme';

import { ReviewForm } from '../components/ReviewForm';
import { useMyReview } from '../hooks';
import { REVIEW_STRINGS } from '../strings';

export type WriteReviewScreenProps = { courseId: string };

function closeModal(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * SC-11 Write review (modal, M-15b). Loads the user's existing review first, so the form opens
 * pre-filled to edit it (`PUT` creates or updates, BR-08).
 */
export function WriteReviewScreen({ courseId }: WriteReviewScreenProps) {
  const insets = useSafeAreaInsets();
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
        title={REVIEW_STRINGS.loadMyReviewFailed}
        onRetry={() => void myReview.refetch()}
      />
    );
  } else {
    content = <ReviewForm courseId={courseId} initialReview={myReview.data} />;
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader
        title={REVIEW_STRINGS.writeTitle}
        showBack={false}
        right={
          <IconButton icon="x" onPress={closeModal} accessibilityLabel={REVIEW_STRINGS.closeForm} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.lg },
  skeleton: { gap: spacing.xl },
});

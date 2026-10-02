import { FlashList } from '@shopify/flash-list';
import { useCallback, type ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CourseCardHorizontal } from '@/components/course';
import { colors, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

import { BrandRefreshControl } from './BrandRefreshControl';

export type CourseResultListProps = {
  courses: readonly CourseSummary[];
  /** Keep stable (`useCallback`): the cards are memoized. */
  onPressCourse: (course: CourseSummary) => void;
  onToggleBookmark: (course: CourseSummary) => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  /** Pull-to-refresh is enabled when `onRefresh` is given. */
  onRefresh?: () => void;
  isRefreshing?: boolean;
  ListHeaderComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
  /** Shown at the bottom while no next page is loading (e.g. a "load more failed" Retry). */
  ListFooterComponent?: ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

function keyExtractor(course: CourseSummary): string {
  return course.id;
}

function Separator() {
  return <View style={styles.separator} />;
}

/**
 * Vertical list of `CourseCardHorizontal` with infinite scroll, pull-to-refresh and a footer
 * spinner - shared by Search results (SC-06), Course list (SC-08) and Saved courses (SC-20).
 */
export function CourseResultList({
  courses,
  onPressCourse,
  onToggleBookmark,
  onEndReached,
  isFetchingNextPage = false,
  onRefresh,
  isRefreshing = false,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  contentContainerStyle,
}: CourseResultListProps) {
  const renderItem = useCallback(
    ({ item }: { item: CourseSummary }) => (
      <CourseCardHorizontal
        course={item}
        onPress={onPressCourse}
        onToggleBookmark={onToggleBookmark}
      />
    ),
    [onPressCourse, onToggleBookmark],
  );

  return (
    <FlashList
      data={courses}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          (ListFooterComponent ?? null)
        )
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        onRefresh ? (
          <BrandRefreshControl isRefreshing={isRefreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentContainerStyle]}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  separator: { height: spacing.lg },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
});

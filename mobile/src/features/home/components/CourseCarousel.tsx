import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { CourseCardVertical } from '@/components/course';
import { layout, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

type CourseCarouselProps = {
  courses: readonly CourseSummary[];
  /** Keep stable (`useCallback`): the cards are memoized. */
  onPressCourse: (course: CourseSummary) => void;
  onToggleBookmark: (course: CourseSummary) => void;
};

function keyExtractor(course: CourseSummary): string {
  return course.id;
}

function Separator() {
  return <View style={styles.separator} />;
}

/** Horizontally scrolling `CourseCardVertical` list (Popular, Recommended). The next card peeks. */
export function CourseCarousel({ courses, onPressCourse, onToggleBookmark }: CourseCarouselProps) {
  const renderItem = useCallback(
    ({ item }: { item: CourseSummary }) => (
      <CourseCardVertical
        course={item}
        onPress={onPressCourse}
        onToggleBookmark={onToggleBookmark}
      />
    ),
    [onPressCourse, onToggleBookmark],
  );

  return (
    <FlatList
      horizontal
      data={courses}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPaddingX },
  separator: { width: spacing.md },
});

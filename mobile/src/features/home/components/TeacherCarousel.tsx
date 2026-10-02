import { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { TeacherCard } from '@/features/teacher/components/TeacherCard';
import { layout, spacing } from '@/theme';
import type { TeacherSummary } from '@/types/api';

type TeacherItemProps = {
  teacher: TeacherSummary;
  onPressTeacher: (teacherId: string) => void;
};

/** Binds the teacher id so `TeacherCard` (props: `teacher`, `onPress: () => void`) stays memoized. */
const TeacherItem = memo(function TeacherItem({ teacher, onPressTeacher }: TeacherItemProps) {
  const handlePress = useCallback(() => onPressTeacher(teacher.id), [onPressTeacher, teacher.id]);
  return <TeacherCard teacher={teacher} onPress={handlePress} />;
});

type TeacherCarouselProps = {
  teachers: readonly TeacherSummary[];
  /** Keep stable (`useCallback`). */
  onPressTeacher: (teacherId: string) => void;
};

function keyExtractor(teacher: TeacherSummary): string {
  return teacher.id;
}

function Separator() {
  return <View style={styles.separator} />;
}

/** Horizontally scrolling "Top teachers" list (SC-04). */
export function TeacherCarousel({ teachers, onPressTeacher }: TeacherCarouselProps) {
  const renderItem = useCallback(
    ({ item }: { item: TeacherSummary }) => (
      <TeacherItem teacher={item} onPressTeacher={onPressTeacher} />
    ),
    [onPressTeacher],
  );

  return (
    <FlatList
      horizontal
      data={teachers}
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

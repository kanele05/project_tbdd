import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Accordion } from '@/components/ui/Accordion';
import { spacing } from '@/theme';
import type { CurriculumLesson, CurriculumSection } from '@/types/api';

import { LessonRow } from './LessonRow';

export type SectionAccordionProps = {
  section: CurriculumSection;
  /** Lesson highlighted as "being studied". */
  activeLessonId: string | null;
  isExpanded: boolean;
  /** Receives the section id and the new expanded state. */
  onToggle: (sectionId: string, isExpanded: boolean) => void;
  onLessonPress: (lesson: CurriculumLesson) => void;
};

/** A curriculum chapter ("I - Introduction" + chevron) that expands into its lesson rows. */
function SectionAccordionBase({
  section,
  activeLessonId,
  isExpanded,
  onToggle,
  onLessonPress,
}: SectionAccordionProps) {
  const handleToggle = useCallback(
    (next: boolean) => onToggle(section.id, next),
    [onToggle, section.id],
  );

  return (
    <Accordion
      title={section.title}
      expanded={isExpanded}
      onToggle={handleToggle}
      style={styles.section}
    >
      <View style={styles.rows}>
        {section.lessons.map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            isActive={lesson.id === activeLessonId}
            onPress={onLessonPress}
          />
        ))}
      </View>
    </Accordion>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.sm },
  // The active row's border spans the full width, while the title keeps its 8 dp indent.
  rows: { marginHorizontal: -spacing.sm },
});

export const SectionAccordion = memo(SectionAccordionBase);

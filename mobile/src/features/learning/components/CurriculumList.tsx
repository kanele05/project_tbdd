import { memo, useCallback, useState } from 'react';
import { View } from 'react-native';

import type { CurriculumLesson, CurriculumSection } from '@/types/api';

import { SectionAccordion } from './SectionAccordion';

export type CurriculumListProps = {
  sections: readonly CurriculumSection[];
  /**
   * Lesson to highlight. Omit it to highlight the lesson the server marked `IN_PROGRESS`
   * (course details); the Learning screen passes the lesson that is playing.
   */
  activeLessonId?: string | null;
  onLessonPress: (lesson: CurriculumLesson) => void;
};

function findInProgressLessonId(sections: readonly CurriculumSection[]): string | null {
  for (const section of sections) {
    const lesson = section.lessons.find((item) => item.status === 'IN_PROGRESS');
    if (lesson) return lesson.id;
  }
  return null;
}

function findSectionIdOfLesson(
  sections: readonly CurriculumSection[],
  lessonId: string | null,
): string | null {
  if (!lessonId) return null;
  return (
    sections.find((section) => section.lessons.some((lesson) => lesson.id === lessonId))?.id ?? null
  );
}

/** The first chapter and the one holding the highlighted lesson start open (like the design). */
function getInitialExpanded(
  sections: readonly CurriculumSection[],
  highlightedId: string | null,
): Set<string> {
  const ids = new Set<string>();
  const first = sections[0];
  if (first) ids.add(first.id);
  const highlightedSectionId = findSectionIdOfLesson(sections, highlightedId);
  if (highlightedSectionId) ids.add(highlightedSectionId);
  return ids;
}

/**
 * M-14: the curriculum as accordion sections of lesson rows (SC-09 Lessons tab, SC-15 Lessons
 * tab). Presentational: the screen decides what a press does (toast, preview, open the lesson).
 */
function CurriculumListBase({ sections, activeLessonId, onLessonPress }: CurriculumListProps) {
  const highlightedId =
    activeLessonId === undefined ? findInProgressLessonId(sections) : activeLessonId;
  const [expandedIds, setExpandedIds] = useState(() => getInitialExpanded(sections, highlightedId));
  const [seenHighlightedId, setSeenHighlightedId] = useState(highlightedId);

  // When the highlight moves (next lesson auto-plays) make sure its chapter is open.
  if (highlightedId !== seenHighlightedId) {
    setSeenHighlightedId(highlightedId);
    const sectionId = findSectionIdOfLesson(sections, highlightedId);
    if (sectionId && !expandedIds.has(sectionId))
      setExpandedIds(new Set(expandedIds).add(sectionId));
  }

  const handleToggle = useCallback((sectionId: string, isExpanded: boolean) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (isExpanded) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
  }, []);

  return (
    <View>
      {sections.map((section) => (
        <SectionAccordion
          key={section.id}
          section={section}
          activeLessonId={highlightedId}
          isExpanded={expandedIds.has(section.id)}
          onToggle={handleToggle}
          onLessonPress={onLessonPress}
        />
      ))}
    </View>
  );
}

export const CurriculumList = memo(CurriculumListBase);

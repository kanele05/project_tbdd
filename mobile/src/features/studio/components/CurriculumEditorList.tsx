import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

import type { PlannedLesson } from '../aiDraftStore';
import type { EditableLesson, EditableSection } from '../curriculumModel';
import { STUDIO_LIMITS } from '../limits';
import { CurriculumLessonRow } from './CurriculumLessonRow';

export type CurriculumEditorListProps = {
  sections: readonly EditableSection[];
  isBusy: boolean;
  /** Lessons proposed by the AI outline and not created yet, by section key. */
  planned: Record<string, PlannedLesson[]>;
  onAddSection: () => void;
  onRenameSection: (section: EditableSection) => void;
  onDeleteSection: (section: EditableSection) => void;
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onAddLesson: (section: EditableSection) => void;
  onAddPlanned: (section: EditableSection, plannedIndex: number) => void;
  onEditLesson: (section: EditableSection, lesson: EditableLesson) => void;
  onMoveLesson: (section: EditableSection, index: number, direction: -1 | 1) => void;
  onDeleteLesson: (section: EditableSection, lesson: EditableLesson) => void;
};

/** Sections and lessons with add / rename / delete / move up-down (no drag and drop, FR-40). */
export function CurriculumEditorList(props: CurriculumEditorListProps) {
  const { sections, isBusy, planned } = props;
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const canAddSection = sections.length < STUDIO_LIMITS.maxSections;
  return (
    <View style={styles.list}>
      {sections.length === 0 ? (
        <EmptyState
          icon="layers"
          title={t('curriculum.empty.title')}
          message={t('curriculum.empty.message')}
        />
      ) : null}
      {sections.map((section, sectionIndex) => (
        <View key={section.key} style={styles.section} testID={`section-${section.key}`}>
          <AppText variant="h3" accessibilityRole="header">
            {t('curriculum.sectionTitle', { number: sectionIndex + 1, title: section.title })}
          </AppText>
          <View style={styles.actions}>
            <IconButton
              icon="chevron-up"
              size={20}
              disabled={isBusy || sectionIndex === 0}
              onPress={() => props.onMoveSection(sectionIndex, -1)}
              accessibilityLabel={t('section.moveUp', { title: section.title })}
            />
            <IconButton
              icon="chevron-down"
              size={20}
              disabled={isBusy || sectionIndex === sections.length - 1}
              onPress={() => props.onMoveSection(sectionIndex, 1)}
              accessibilityLabel={t('section.moveDown', { title: section.title })}
            />
            <IconButton
              icon="edit-2"
              size={20}
              disabled={isBusy}
              onPress={() => props.onRenameSection(section)}
              accessibilityLabel={t('section.rename', { title: section.title })}
              testID={`section-rename-${section.key}`}
            />
            <IconButton
              icon="trash-2"
              size={20}
              color="dangerText"
              disabled={isBusy}
              onPress={() => props.onDeleteSection(section)}
              accessibilityLabel={t('section.delete', { title: section.title })}
              testID={`section-delete-${section.key}`}
            />
          </View>
          {section.lessons.map((lesson, lessonIndex) => (
            <CurriculumLessonRow
              key={lesson.key}
              lesson={lesson}
              index={lessonIndex}
              count={section.lessons.length}
              isBusy={isBusy}
              onEdit={() => props.onEditLesson(section, lesson)}
              onMove={(direction) => props.onMoveLesson(section, lessonIndex, direction)}
              onDelete={() => props.onDeleteLesson(section, lesson)}
            />
          ))}
          {(planned[section.key] ?? []).map((lesson, plannedIndex) => (
            <View key={`${lesson.title}-${plannedIndex}`} style={styles.planned}>
              <View style={styles.plannedText}>
                <AppText variant="caption" color="primaryText" family="bodySemiBold">
                  {t('curriculum.plannedTag')}
                </AppText>
                <AppText variant="body" numberOfLines={2}>
                  {lesson.title}
                </AppText>
              </View>
              <Button
                title={t('curriculum.plannedAdd')}
                variant="outline"
                size="sm"
                disabled={isBusy}
                onPress={() => props.onAddPlanned(section, plannedIndex)}
                testID={`planned-add-${section.key}-${plannedIndex}`}
              />
            </View>
          ))}
          <Button
            title={t('curriculum.addLesson')}
            variant="secondary"
            size="sm"
            leftIcon="plus"
            disabled={isBusy}
            onPress={() => props.onAddLesson(section)}
            testID={`add-lesson-${section.key}`}
          />
        </View>
      ))}
      {canAddSection ? (
        <Button
          title={t('curriculum.addSection')}
          variant="outline"
          leftIcon="plus"
          disabled={isBusy}
          onPress={props.onAddSection}
          testID="add-section"
        />
      ) : (
        <AppText variant="caption">
          {t('curriculum.maxSections', { max: STUDIO_LIMITS.maxSections })}
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.lg },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  actions: { flexDirection: 'row', marginLeft: -spacing.sm },
  planned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.primaryText,
    backgroundColor: t.colors.primarySoft,
  },
  plannedText: { flex: 1, gap: spacing.xxs },
}));

import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { showToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { makeStyles, spacing } from '@/theme';
import { confirmAction } from '@/utils/confirmAction';
import { formatDuration } from '@/utils/formatDuration';

import { useAiDraftStore } from '../aiDraftStore';
import {
  countLessons,
  countPreviews,
  totalDurationSec,
  type EditableLesson,
  type EditableSection,
  type LessonDraft,
} from '../curriculumModel';
import { STUDIO_LIMITS } from '../limits';
import type { CurriculumActions } from '../useCurriculumEditor';
import { CurriculumEditorList } from './CurriculumEditorList';
import { LessonFormSheet } from './LessonFormSheet';
import { SectionTitleSheet } from './SectionTitleSheet';

export type CurriculumBodyProps = {
  sections: readonly EditableSection[];
  actions: CurriculumActions;
  /** An API call is running (direct mode): buttons are disabled. */
  isBusy: boolean;
};

type SectionSheet = { section: EditableSection | null } | null;
type LessonSheet = {
  section: EditableSection;
  lesson: EditableLesson | null;
  plannedIndex?: number;
} | null;

/**
 * The curriculum editor of SC-25 without its data source: summary line, the list, and the two
 * bottom sheets (section title, lesson form). Deleting asks for confirmation; a failing action
 * shows its message in the sheet (saves) or in a toast (moves, deletes).
 */
export function CurriculumBody({ sections, actions, isBusy }: CurriculumBodyProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const planned = useAiDraftStore((state) => state.plannedLessons);
  const removePlanned = useAiDraftStore((state) => state.removePlannedLesson);
  const [sectionSheet, setSectionSheet] = useState<SectionSheet>(null);
  const [lessonSheet, setLessonSheet] = useState<LessonSheet>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [isSheetSaving, setIsSheetSaving] = useState(false);

  const closeSheets = useCallback(() => {
    setSectionSheet(null);
    setLessonSheet(null);
    setSheetError(null);
  }, []);

  const runInSheet = useCallback(
    async (task: () => Promise<void>, onDone?: () => void) => {
      setIsSheetSaving(true);
      setSheetError(null);
      try {
        await task();
        onDone?.();
        closeSheets();
      } catch (error) {
        setSheetError(getErrorMessage(error));
      } finally {
        setIsSheetSaving(false);
      }
    },
    [closeSheets],
  );

  const runWithToast = useCallback(async (task: () => Promise<void>) => {
    try {
      await task();
    } catch (error) {
      showToast(getErrorMessage(error), { type: 'error' });
    }
  }, []);

  const submitSection = (title: string) => {
    const target = sectionSheet?.section;
    void runInSheet(() =>
      target ? actions.renameSection(target, title) : actions.addSection(title),
    );
  };

  const submitLesson = (draft: LessonDraft) => {
    if (!lessonSheet) return;
    const { section, lesson, plannedIndex } = lessonSheet;
    void runInSheet(
      () => actions.saveLesson(section, lesson, draft),
      () => {
        if (plannedIndex !== undefined) removePlanned(section.key, plannedIndex);
      },
    );
  };

  const confirmDelete = async (
    kind: 'section' | 'lesson',
    title: string,
    task: () => Promise<void>,
  ) => {
    const isConfirmed = await confirmAction({
      title: t(`${kind}.deleteConfirmTitle`),
      message: t(`${kind}.deleteConfirmMessage`, { title }),
      confirmLabel: t('actions.delete'),
      cancelLabel: t('actions.cancel'),
      isDestructive: true,
    });
    if (isConfirmed) await runWithToast(task);
  };

  const plannedSource =
    lessonSheet?.plannedIndex === undefined
      ? undefined
      : planned[lessonSheet.section.key]?.[lessonSheet.plannedIndex];
  const otherPreviews = countPreviews(sections) - (lessonSheet?.lesson?.isPreview ? 1 : 0);

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" testID="curriculum-summary">
        {t('curriculum.summary', {
          sections: sections.length,
          lessons: countLessons(sections),
          duration: formatDuration(totalDurationSec(sections)),
          previews: countPreviews(sections),
          maxPreviews: STUDIO_LIMITS.maxPreviewLessons,
        })}
      </AppText>
      <CurriculumEditorList
        sections={sections}
        isBusy={isBusy || isSheetSaving}
        planned={planned}
        onAddSection={() => setSectionSheet({ section: null })}
        onRenameSection={(section) => setSectionSheet({ section })}
        onDeleteSection={(section) =>
          void confirmDelete('section', section.title, () => actions.deleteSection(section))
        }
        onMoveSection={(index, direction) =>
          void runWithToast(() => actions.moveSection(index, direction))
        }
        onAddLesson={(section) => setLessonSheet({ section, lesson: null })}
        onAddPlanned={(section, plannedIndex) =>
          setLessonSheet({ section, lesson: null, plannedIndex })
        }
        onEditLesson={(section, lesson) => setLessonSheet({ section, lesson })}
        onMoveLesson={(section, index, direction) =>
          void runWithToast(() => actions.moveLesson(section, index, direction))
        }
        onDeleteLesson={(section, lesson) =>
          void confirmDelete('lesson', lesson.title, () => actions.deleteLesson(section, lesson))
        }
      />
      <SectionTitleSheet
        visible={sectionSheet !== null}
        initialTitle={sectionSheet?.section?.title ?? null}
        isSaving={isSheetSaving}
        error={sheetError}
        onClose={closeSheets}
        onSubmit={submitSection}
      />
      <LessonFormSheet
        visible={lessonSheet !== null}
        initial={lessonSheet?.lesson ?? null}
        prefill={
          plannedSource ? { title: plannedSource.title, content: plannedSource.summary } : undefined
        }
        otherPreviewCount={otherPreviews}
        isSaving={isSheetSaving}
        error={sheetError}
        onClose={closeSheets}
        onSubmit={submitLesson}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({ wrap: { gap: spacing.lg } }));

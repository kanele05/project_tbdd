import { router } from 'expo-router';
import { useState } from 'react';

import { showToast } from '@/components/ui/Toast';
import { useCategories } from '@/features/search/hooks';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import type { AiCourseDraftDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { cleanOutline } from './aiDraftOutline';
import { useAiDraftStore } from './aiDraftStore';
import { ALL_PARTS, TEXT_PARTS, type DraftPart } from './components/aiDraft/draftParts';
import { cleanBenefits } from './courseForm';
import {
  CREATE_MODE,
  getCourseEditMode,
  getCurriculumTarget,
  NEW_COURSE_ID,
  type CourseEditMode,
} from './editMode';
import { useCurriculumMutations, useStudioCourse } from './hooks';
import { STUDIO_LIMITS } from './limits';

export function closeAiDraftSheet(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/studio');
}

/**
 * State of the AI draft sheet (SC-27) below the form: the (editable) draft, which parts were
 * applied, what each part may do on this course, and the "apply" actions. Editing a part clears
 * its applied flag so it can be applied again.
 */
export function useAiDraftSheet(courseId: string, scope: 'all' | 'text') {
  const { t } = useTranslation('studio');
  const [draft, setDraft] = useState<AiCourseDraftDto | null>(null);
  const [applied, setApplied] = useState<ReadonlySet<DraftPart>>(new Set());
  const [isApplyingOutline, setIsApplyingOutline] = useState(false);
  const queueFields = useAiDraftStore((state) => state.queueFields);
  const setPlanned = useAiDraftStore((state) => state.setPlannedLessons);
  const requestAdvance = useAiDraftStore((state) => state.requestAdvance);
  const categories = useCategories();

  const hasCourse = courseId !== '' && courseId !== NEW_COURSE_ID;
  const course = useStudioCourse(courseId, { enabled: hasCourse });
  const mutations = useCurriculumMutations(hasCourse ? courseId : '');
  const mode: CourseEditMode | null = hasCourse
    ? course.data
      ? getCourseEditMode(course.data)
      : null
    : CREATE_MODE;

  const canApplyOutline = hasCourse && course.data && getCurriculumTarget(course.data) === 'course';
  const categoryName =
    categories.data?.find((category) => category.id === draft?.categoryId)?.name ?? null;

  const hints: Partial<Record<DraftPart, string>> = {};
  if (!canApplyOutline) {
    hints.outline = hasCourse ? t('ai.outlineNeedsDraft') : t('ai.outlineNeedsCourse');
  }
  if (!categoryName) hints.category = t('ai.categoryNone');
  else if (!mode?.canEditMajor) hints.category = t('ai.categoryLocked');

  const parts = scope === 'text' ? TEXT_PARTS : ALL_PARTS;

  const isApplicable = (part: DraftPart): boolean => {
    if (!draft) return false;
    switch (part) {
      case 'category':
        return hints.category === undefined;
      case 'subtitle':
        return draft.subtitle.trim().length > 0;
      case 'description':
        return draft.description.trim().length > 0;
      case 'benefits':
        return cleanBenefits(draft.benefits).length > 0;
      case 'outline':
        return Boolean(canApplyOutline) && cleanOutline(draft.sections).length > 0;
    }
  };

  /** Every part that can be applied is applied: the sheet offers "Continue to the next step". */
  const isAllApplied = parts.every((part) => applied.has(part) || !isApplicable(part));

  /** A new draft replaces everything (edits and applied flags are lost). */
  const receiveDraft = (next: AiCourseDraftDto) => {
    setDraft(next);
    setApplied(new Set());
  };

  const editDraft = (part: DraftPart, patch: Partial<AiCourseDraftDto>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setApplied((current) => {
      const next = new Set(current);
      next.delete(part);
      return next;
    });
  };

  const markApplied = (part: DraftPart) => setApplied((current) => new Set(current).add(part));

  const applyOutline = async (sections: AiCourseDraftDto['sections']) => {
    const isConfirmed = await confirmAction({
      title: t('ai.outlineConfirm.title'),
      message: t('ai.outlineConfirm.message', { count: sections.length }),
      confirmLabel: t('ai.outlineConfirm.confirm'),
      cancelLabel: t('actions.cancel'),
    });
    if (!isConfirmed) return;
    setIsApplyingOutline(true);
    try {
      const planned: Record<string, { title: string; summary: string }[]> = {};
      for (const section of sections) {
        const created = await mutations.addSection.mutateAsync({ title: section.title });
        planned[created.id] = section.lessons;
      }
      setPlanned({ ...useAiDraftStore.getState().plannedLessons, ...planned });
      markApplied('outline');
      showToast(t('ai.outlineApplied'), { type: 'success' });
      // The wizard under this sheet shows the Lessons step as soon as planned lessons appear.
      closeAiDraftSheet();
    } catch (error) {
      showToast(getErrorMessage(error), { type: 'error' });
    } finally {
      setIsApplyingOutline(false);
    }
  };

  const apply = (part: DraftPart) => {
    if (!draft || !isApplicable(part)) return;
    switch (part) {
      case 'outline':
        void applyOutline(cleanOutline(draft.sections));
        return;
      case 'category':
        if (draft.categoryId) queueFields({ categoryId: draft.categoryId });
        break;
      case 'subtitle':
        queueFields({ subtitle: draft.subtitle.trim().slice(0, STUDIO_LIMITS.subtitleMax) });
        break;
      case 'description':
        queueFields({ description: draft.description.trim() });
        break;
      case 'benefits':
        queueFields({ benefits: cleanBenefits(draft.benefits) });
        break;
    }
    markApplied(part);
    showToast(t('ai.appliedToast'), { type: 'success' });
  };

  /** Back to the wizard, which presses Next (the topic fills an empty title first). */
  const goToNextStep = (topic: string) => {
    const title = topic.trim();
    if (title) queueFields({ title });
    requestAdvance();
    closeAiDraftSheet();
  };

  return {
    draft,
    parts,
    applied,
    categoryName,
    hints,
    isApplicable,
    isAllApplied,
    isApplyingOutline,
    receiveDraft,
    editDraft,
    apply,
    goToNextStep,
  };
}

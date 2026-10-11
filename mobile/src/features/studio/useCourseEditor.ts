import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { showToast } from '@/components/ui/Toast';
import { i18n } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';

import { useAiDraftStore } from './aiDraftStore';
import {
  courseFormSchema,
  EMPTY_COURSE_FORM,
  hasInfoChanges,
  mergeUntouched,
  valuesFromDetail,
  type CourseFormValues,
} from './courseForm';
import { CREATE_MODE, getCourseEditMode, NEW_COURSE_ID, type CourseEditMode } from './editMode';
import { useCourseWorkflow, useStudioCourse } from './hooks';
import { parseUsdToCents } from './money';
import { useCourseSave } from './useCourseSave';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

/**
 * Data side of the course wizard (SC-24): loads the course (unless it is a new one), works out
 * which fields may be edited (`mode`, BR-21), keeps one form for all steps in sync with the
 * server, and exposes `saveFields` (see `useCourseSave`). AI suggestions queued by SC-27 are
 * poured into the form as soon as they arrive; nothing is saved until the teacher presses Next.
 */
export function useCourseEditor(routeCourseId: string) {
  // `new` becomes the real id once the first step created the draft (the route param follows).
  const [createdId, setCreatedId] = useState<string | null>(null);
  const courseId = routeCourseId === NEW_COURSE_ID && createdId ? createdId : routeCourseId;
  const isCreate = courseId === NEW_COURSE_ID;
  const detailQuery = useStudioCourse(courseId, { enabled: !isCreate });
  const detail = detailQuery.data;

  const mode: CourseEditMode | null = isCreate
    ? CREATE_MODE
    : detail
      ? getCourseEditMode(detail)
      : null;

  // Errors appear after the teacher leaves a field or presses Next, never on the first render.
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: EMPTY_COURSE_FORM,
    mode: 'onTouched',
  });
  const watched = useWatch({ control: form.control });
  const values = useMemo<CourseFormValues>(() => ({ ...EMPTY_COURSE_FORM, ...watched }), [watched]);
  const saved = detail ? valuesFromDetail(detail) : EMPTY_COURSE_FORM;
  const isDirty = hasInfoChanges(saved, values);
  useUnsavedChangesGuard(isDirty);

  // Free / Paid is a UI choice; until the teacher picks one it follows the price in the form.
  const [paidChoice, setPaidChoice] = useState<boolean | null>(null);
  const isPaid = paidChoice ?? parseUsdToCents(values.price, 0) > 0;
  const setPaid = (isNowPaid: boolean) => {
    setPaidChoice(isNowPaid);
    if (isNowPaid) return;
    form.setValue('price', '');
    form.setValue('originalPrice', '');
    form.clearErrors(['price', 'originalPrice']);
  };

  const save = useCourseSave({ courseId, detail, mode, form, isPaid, onCreated: setCreatedId });
  const workflow = useCourseWorkflow(courseId);

  // Load the server values into the form when the course arrives or changes underneath us,
  // but keep every field the teacher edited since the last load.
  const loadedKey = detail ? `${detail.id}:${detail.updatedAt}:${detail.revision?.updatedAt}` : '';
  const lastLoadedKey = useRef('');
  const lastLoaded = useRef<CourseFormValues>(EMPTY_COURSE_FORM);
  useEffect(() => {
    if (!detail || loadedKey === lastLoadedKey.current) return;
    lastLoadedKey.current = loadedKey;
    const next = valuesFromDetail(detail);
    form.reset(mergeUntouched(lastLoaded.current, form.getValues(), next), { keepErrors: true });
    lastLoaded.current = next;
  }, [detail, form, loadedKey]);

  // Pour AI suggestions (SC-27) into the form.
  const pendingFields = useAiDraftStore((state) => state.pendingFields);
  const takeFields = useAiDraftStore((state) => state.takeFields);
  useEffect(() => {
    if (!pendingFields) return;
    const fields = takeFields();
    if (!fields) return;
    if (fields.subtitle !== undefined) form.setValue('subtitle', fields.subtitle);
    if (fields.description !== undefined) form.setValue('description', fields.description);
    if (fields.benefits !== undefined) form.setValue('benefits', fields.benefits);
  }, [form, pendingFields, takeFields]);

  const startRevision = async () => {
    save.setFormError(null);
    try {
      await workflow.mutateAsync('createRevision');
      showToast(i18n.t('studio:revision.created'), { type: 'success' });
    } catch (error) {
      save.setFormError(getErrorMessage(error));
    }
  };

  const knownTags = useMemo(() => detail?.tags ?? [], [detail]);

  return {
    courseId,
    isCreate,
    detailQuery,
    detail,
    mode,
    form,
    values,
    isDirty,
    isPaid,
    setPaid,
    isSaving: save.isSaving,
    isStartingRevision: workflow.isPending,
    formError: save.formError,
    setFormError: save.setFormError,
    knownTags,
    saveFields: save.saveFields,
    startRevision,
  };
}

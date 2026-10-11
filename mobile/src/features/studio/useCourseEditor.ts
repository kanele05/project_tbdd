import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { showToast } from '@/components/ui/Toast';
import { i18n } from '@/i18n';
import { getErrorMessage, getFieldErrors, toAppError } from '@/lib/appError';
import type { StudioCourseDetailDto } from '@/types/api';

import { useAiDraftStore } from './aiDraftStore';
import {
  courseFormSchema,
  EMPTY_COURSE_FORM,
  getInfoChanges,
  mapServerFieldErrors,
  toCreateRequest,
  toRevisionInput,
  valuesFromDetail,
  type CourseFormValues,
} from './courseForm';
import { CREATE_MODE, getCourseEditMode, type CourseEditMode } from './editMode';
import {
  useCourseWorkflow,
  useCreateCourse,
  useSaveRevision,
  useStudioCourse,
  useUpdateCourse,
} from './hooks';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

export const NEW_COURSE_ID = 'new';

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/studio');
}

/**
 * Logic of SC-24 (course info editor). It loads the course (unless it is a new one), works out
 * which fields may be edited (`mode`, BR-21), keeps the form in sync with the server, and saves:
 * - new course: `POST /teacher/courses`, then opens its status screen;
 * - DRAFT / REJECTED: `PATCH` with the changed fields;
 * - PUBLISHED: minor fields by `PATCH`, major fields by `PUT .../revision` (the stored revision
 *   payload with the major fields replaced).
 * AI suggestions queued by SC-27 are poured into the form as soon as they arrive.
 */
export function useCourseEditor(courseId: string) {
  const isCreate = courseId === NEW_COURSE_ID;
  const detailQuery = useStudioCourse(courseId, { enabled: !isCreate });
  const detail = detailQuery.data;

  const mode: CourseEditMode | null = isCreate
    ? CREATE_MODE
    : detail
      ? getCourseEditMode(detail)
      : null;

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: EMPTY_COURSE_FORM,
  });
  const { isDirty } = form.formState;
  const { allowLeave } = useUnsavedChangesGuard(isDirty);
  const [formError, setFormError] = useState<string | null>(null);

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(courseId);
  const saveRevision = useSaveRevision(courseId);
  const workflow = useCourseWorkflow(courseId);
  const isSaving = createCourse.isPending || updateCourse.isPending || saveRevision.isPending;

  // Load the server values into the form when the course arrives or changes underneath us,
  // but never over the teacher's unsaved edits.
  const loadedKey = detail ? `${detail.id}:${detail.updatedAt}:${detail.revision?.updatedAt}` : '';
  const lastLoadedKey = useRef('');
  useEffect(() => {
    if (!detail || loadedKey === lastLoadedKey.current) return;
    if (lastLoadedKey.current !== '' && form.formState.isDirty) return;
    lastLoadedKey.current = loadedKey;
    form.reset(valuesFromDetail(detail));
  }, [detail, form, loadedKey]);

  // Pour AI suggestions (SC-27) into the form.
  const pendingFields = useAiDraftStore((state) => state.pendingFields);
  const takeFields = useAiDraftStore((state) => state.takeFields);
  useEffect(() => {
    if (!pendingFields) return;
    const fields = takeFields();
    if (!fields) return;
    const options = { shouldDirty: true, shouldValidate: true } as const;
    if (fields.subtitle !== undefined) form.setValue('subtitle', fields.subtitle, options);
    if (fields.description !== undefined) form.setValue('description', fields.description, options);
    if (fields.benefits !== undefined) form.setValue('benefits', fields.benefits, options);
  }, [form, pendingFields, takeFields]);

  const handleSaveError = (error: unknown) => {
    const mapped = mapServerFieldErrors(getFieldErrors(error));
    const keys = Object.keys(mapped) as (keyof CourseFormValues)[];
    for (const key of keys) form.setError(key, { message: mapped[key] });
    setFormError(
      toAppError(error).code === 'VALIDATION_ERROR' && keys.length > 0
        ? null
        : getErrorMessage(error),
    );
  };

  const save = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (isCreate) {
        const created = await createCourse.mutateAsync(toCreateRequest(values));
        allowLeave();
        showToast(i18n.t('studio:edit.created'), { type: 'success' });
        router.replace({ pathname: '/studio/[id]', params: { id: created.id } });
        return;
      }
      if (!detail || !mode) return;
      const saved = await saveExisting(detail, mode, values);
      form.reset(valuesFromDetail(saved));
      allowLeave();
      showToast(i18n.t('studio:edit.saved'), { type: 'success' });
      goBack();
    } catch (error) {
      handleSaveError(error);
    }
  });

  async function saveExisting(
    current: StudioCourseDetailDto,
    editMode: CourseEditMode,
    values: CourseFormValues,
  ): Promise<StudioCourseDetailDto> {
    const initial = valuesFromDetail(current);
    if (editMode.kind === 'direct') {
      const changes = getInfoChanges(initial, values);
      return Object.keys(changes).length > 0 ? updateCourse.mutateAsync(changes) : current;
    }
    let latest = current;
    if (editMode.kind !== 'published') return latest;
    const minor = getInfoChanges(initial, values, 'minor');
    if (Object.keys(minor).length > 0) latest = await updateCourse.mutateAsync(minor);
    const revision = latest.revision ?? current.revision;
    const hasMajor = Object.keys(getInfoChanges(initial, values, 'major')).length > 0;
    if (editMode.revisionState === 'editable' && revision && hasMajor) {
      latest = await saveRevision.mutateAsync(toRevisionInput(revision.payload, values));
    }
    return latest;
  }

  const startRevision = async () => {
    setFormError(null);
    try {
      await workflow.mutateAsync('createRevision');
      showToast(i18n.t('studio:revision.created'), { type: 'success' });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const knownTags = useMemo(() => detail?.tags ?? [], [detail]);

  return {
    isCreate,
    detailQuery,
    detail,
    mode,
    form,
    isDirty,
    isSaving,
    isStartingRevision: workflow.isPending,
    formError,
    knownTags,
    save,
    startRevision,
  };
}

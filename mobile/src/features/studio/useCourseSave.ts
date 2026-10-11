import { router } from 'expo-router';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { showToast } from '@/components/ui/Toast';
import { i18n } from '@/i18n';
import { getErrorMessage, getFieldErrors, toAppError } from '@/lib/appError';
import type { StudioCourseDetailDto } from '@/types/api';

import {
  EMPTY_COURSE_FORM,
  getInfoChanges,
  getPriceErrors,
  mapServerFieldErrors,
  toCreateRequest,
  toRevisionInput,
  valuesFromDetail,
  withFields,
  type CourseFormValues,
} from './courseForm';
import { NEW_COURSE_ID, type CourseEditMode } from './editMode';
import { useCreateCourse, useSaveRevision, useUpdateCourse } from './hooks';

type FormField = keyof CourseFormValues;

export type UseCourseSaveArgs = {
  courseId: string;
  detail: StudioCourseDetailDto | undefined;
  mode: CourseEditMode | null;
  form: UseFormReturn<CourseFormValues>;
  isPaid: boolean;
  /** The draft was created: the wizard continues with this id. */
  onCreated: (id: string) => void;
};

/**
 * Saves the fields of one wizard step ("autosave on Next", FR-39 / FR-42):
 * - new course: `POST /teacher/courses` with the step's fields (title + category);
 * - DRAFT / REJECTED: `PATCH` with the changed fields of the step;
 * - PUBLISHED: minor fields by `PATCH`, major fields by `PUT .../revision` (the stored revision
 *   payload with the major fields replaced).
 * Fields are validated first; the errors show under the fields. A locked course saves nothing.
 */
export function useCourseSave({
  courseId,
  detail,
  mode,
  form,
  isPaid,
  onCreated,
}: UseCourseSaveArgs) {
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(courseId);
  const saveRevision = useSaveRevision(courseId);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createCourse.isPending || updateCourse.isPending || saveRevision.isPending;

  const validate = async (fields: readonly FormField[]): Promise<boolean> => {
    const isValid = await form.trigger([...fields]);
    if (!fields.includes('price') || !mode?.canEditMajor) return isValid;
    const priceErrors = getPriceErrors(form.getValues(), isPaid);
    for (const [name, message] of Object.entries(priceErrors)) {
      form.setError(name as 'price' | 'originalPrice', { message });
    }
    return isValid && Object.keys(priceErrors).length === 0;
  };

  const handleSaveError = (error: unknown) => {
    const mapped = mapServerFieldErrors(getFieldErrors(error));
    const keys = Object.keys(mapped) as FormField[];
    for (const key of keys) form.setError(key, { message: mapped[key] });
    const isFieldError = toAppError(error).code === 'VALIDATION_ERROR' && keys.length > 0;
    setFormError(isFieldError ? null : getErrorMessage(error));
  };

  async function saveExisting(
    current: StudioCourseDetailDto,
    editMode: CourseEditMode,
    values: CourseFormValues,
  ): Promise<void> {
    const initial = valuesFromDetail(current);
    if (editMode.kind === 'direct') {
      const changes = getInfoChanges(initial, values);
      if (Object.keys(changes).length > 0) await updateCourse.mutateAsync(changes);
      return;
    }
    if (editMode.kind !== 'published') return;
    let latest = current;
    const minor = getInfoChanges(initial, values, 'minor');
    if (Object.keys(minor).length > 0) latest = await updateCourse.mutateAsync(minor);
    const revision = latest.revision ?? current.revision;
    const hasMajor = Object.keys(getInfoChanges(initial, values, 'major')).length > 0;
    if (editMode.revisionState === 'editable' && revision && hasMajor) {
      await saveRevision.mutateAsync(toRevisionInput(revision.payload, values));
    }
  }

  /** Validates and saves `fields`; `false` means the step must not be left (errors are shown). */
  const saveFields = async (fields: readonly FormField[]): Promise<boolean> => {
    setFormError(null);
    if (fields.length === 0 || mode?.kind === 'locked') return true;
    if (!mode || !(await validate(fields))) return false;
    const values = form.getValues();
    try {
      if (courseId === NEW_COURSE_ID) {
        const created = await createCourse.mutateAsync(
          toCreateRequest(withFields(EMPTY_COURSE_FORM, values, fields)),
        );
        showToast(i18n.t('studio:edit.created'), { type: 'success' });
        onCreated(created.id);
        router.setParams({ id: created.id });
        return true;
      }
      if (!detail) return false;
      await saveExisting(detail, mode, withFields(valuesFromDetail(detail), values, fields));
      return true;
    } catch (error) {
      handleSaveError(error);
      return false;
    }
  };

  return { saveFields, isSaving, formError, setFormError };
}

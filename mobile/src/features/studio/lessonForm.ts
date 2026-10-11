import { z } from 'zod';

import { tr } from '@/i18n';

import type { LessonDraft } from './curriculumModel';
import { formatDurationInput, parseDurationInput } from './duration';
import { STUDIO_LIMITS } from './limits';
import { normalizeYouTubeUrl } from './youtube';

/** What the lesson form edits: the duration is the "mm:ss" text the teacher types. */
export type LessonFormValues = {
  title: string;
  videoUrl: string;
  duration: string;
  isPreview: boolean;
  content: string;
};

const msg = (key: string, options?: Record<string, unknown>) => () =>
  tr(`studio:validation.${key}`, options);

export const lessonFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: msg('lessonTitleRequired') })
    .max(STUDIO_LIMITS.lessonTitleMax, {
      error: msg('lessonTitleMax', { count: STUDIO_LIMITS.lessonTitleMax }),
    }),
  videoUrl: z.string().refine((value) => normalizeYouTubeUrl(value) !== null, {
    error: msg('videoInvalid'),
  }),
  duration: z.string().refine((value) => parseDurationInput(value) !== null, {
    error: msg('durationInvalid'),
  }),
  isPreview: z.boolean(),
  content: z.string().max(STUDIO_LIMITS.lessonContentMax, {
    error: msg('lessonContentMax', { count: STUDIO_LIMITS.lessonContentMax }),
  }),
});

export const EMPTY_LESSON_FORM: LessonFormValues = {
  title: '',
  videoUrl: '',
  duration: '',
  isPreview: false,
  content: '',
};

export function lessonToFormValues(lesson: LessonDraft): LessonFormValues {
  return {
    title: lesson.title,
    videoUrl: lesson.videoUrl,
    duration: formatDurationInput(lesson.durationSec),
    isPreview: lesson.isPreview,
    content: lesson.content,
  };
}

/** Validated form values -> the lesson as it is saved (normalized link, seconds). */
export function formValuesToLesson(values: LessonFormValues): LessonDraft {
  return {
    title: values.title.trim(),
    videoUrl: normalizeYouTubeUrl(values.videoUrl) ?? values.videoUrl.trim(),
    durationSec: parseDurationInput(values.duration) ?? 0,
    isPreview: values.isPreview,
    content: values.content,
  };
}

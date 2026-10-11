import { z } from 'zod';

import { i18n } from '@/i18n';
import type { AiCourseLevel, AiLang } from '@/types/api';

export const AI_LEVELS: readonly AiCourseLevel[] = ['beginner', 'intermediate', 'advanced'];
export const AI_LANGS: readonly AiLang[] = ['vi', 'en'];

export const TOPIC_MIN = 3;
export const TOPIC_MAX = 200;

export const aiDraftSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(TOPIC_MIN, { error: () => i18n.t('studio:validation.topicMin', { count: TOPIC_MIN }) })
    .max(TOPIC_MAX, { error: () => i18n.t('studio:validation.topicMax', { count: TOPIC_MAX }) }),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  lang: z.enum(['vi', 'en']),
});

export type AiDraftFormValues = z.infer<typeof aiDraftSchema>;

/**
 * AI soạn khóa (FR-44) và AI kiểm duyệt sơ bộ (FR-51): dùng lại provider, cache `AiContent` và rate limit của module AI.
 * Kết quả chỉ là GỢI Ý - không ghi vào khóa, không chặn thao tác duyệt/soạn tay (BR-29).
 * Không log nội dung giảng viên nhập hay nội dung khóa (chỉ nhãn tác vụ ở lớp provider).
 */
import { AiProviderError, getAiProvider } from '@/lib/ai';
import type { AiLang } from '@/lib/ai/types';
import type { AiCourseDraftDto, AiCourseReviewDto } from '@/types/teacherAdminDto';

import { getOrCreateAiContent } from './ai.cache';
import { runAi } from './ai.service';
import { loadReviewMaterial } from './courseAi.material';
import { mockCourseDraft, mockCourseReview } from './courseAi.mock';
import { normalizeDraft, normalizeReview } from './courseAi.normalize';
import {
  buildCourseDraftPrompt,
  buildCourseReviewPrompt,
  draftCacheRefId,
  reviewCacheRefId,
} from './courseAi.prompts';
import {
  courseDraftModelOutput,
  type CourseDraftOutput,
  courseDraftOutput,
  courseReviewModelOutput,
  type CourseReviewOutput,
  courseReviewOutput,
  type DraftBody,
} from './courseAi.schema';

// ---------------------------------------------------------------- POST /teacher/ai/course-draft

export async function createCourseDraft(
  userId: string,
  input: Pick<DraftBody, 'topic' | 'level'> & { lang: AiLang },
): Promise<AiCourseDraftDto> {
  const { topic, level, lang } = input;
  const result = await getOrCreateAiContent<CourseDraftOutput>({
    kind: 'COURSE_DRAFT',
    refId: draftCacheRefId(topic, level),
    lang,
    schema: courseDraftOutput,
    generate: () =>
      runAi(userId, 'general', async () => {
        const { system, prompt } = buildCourseDraftPrompt(topic, level, lang);
        const generated = await getAiProvider().generateJson({
          label: 'course_draft',
          system,
          prompt,
          schema: courseDraftModelOutput,
          mock: () => mockCourseDraft(topic, level, lang),
        });
        // Cắt về đúng giới hạn DTO; vẫn sai (hiếm) thì coi như model trả sai -> 503, hoàn lượt, không cache.
        const checked = courseDraftOutput.safeParse(normalizeDraft(generated.data));
        if (!checked.success) {
          throw new AiProviderError('bad_output', 'Course draft does not fit the DTO limits');
        }
        return { data: checked.data, model: generated.model };
      }),
  });
  return {
    topic,
    level,
    lang,
    ...result.data,
    model: result.model,
    generatedAt: result.generatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------- GET /admin/courses/:id/ai-review

export async function getCourseReview(
  userId: string,
  courseId: string,
  lang: AiLang,
): Promise<AiCourseReviewDto> {
  const material = await loadReviewMaterial(courseId); // 404 COURSE_NOT_FOUND nếu không có khóa
  const result = await getOrCreateAiContent<CourseReviewOutput>({
    kind: 'COURSE_REVIEW',
    refId: reviewCacheRefId(courseId, material),
    lang,
    schema: courseReviewOutput,
    generate: () =>
      runAi(userId, 'general', async () => {
        const { system, prompt } = buildCourseReviewPrompt(material, lang);
        const generated = await getAiProvider().generateJson({
          label: 'course_review',
          system,
          prompt,
          schema: courseReviewModelOutput,
          mock: () => mockCourseReview(material, lang),
        });
        const checked = courseReviewOutput.safeParse(normalizeReview(generated.data));
        if (!checked.success) {
          throw new AiProviderError('bad_output', 'Course review does not fit the DTO limits');
        }
        return { data: checked.data, model: generated.model };
      }),
  });
  return {
    courseId,
    target: material.target,
    lang,
    ...result.data,
    model: result.model,
    generatedAt: result.generatedAt.toISOString(),
  };
}

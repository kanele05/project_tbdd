import { AI_REQUEST_TIMEOUT_MS } from '@/constants/config';
import { api } from '@/lib/apiClient';
import type {
  AiChatMessageDto,
  AiCourseSummaryDto,
  AiLang,
  AiLessonSummaryDto,
  AiQuizDto,
  AiRecommendationsDto,
  Paginated,
} from '@/types/api';

/**
 * HTTP calls of the AI features (PLAN §9.2 "AI"). `lang` is sent explicitly so the cached answer
 * always matches the UI language (the server would otherwise fall back to `Accept-Language`).
 * The streamed AI Tutor reply (`POST /courses/:id/ai/chat`, SSE) is not an axios call - it lives in
 * `chatStream.ts`.
 */
export const aiApi = {
  /** `GET /courses/:id/ai/summary` - any signed-in user. */
  courseSummary: (courseId: string, lang: AiLang) =>
    api.get<AiCourseSummaryDto>(
      `/courses/${courseId}/ai/summary`,
      { lang },
      { timeout: AI_REQUEST_TIMEOUT_MS },
    ),

  /** `GET /lessons/:id/ai/summary` - enrolled, or a preview lesson (403 `NOT_ENROLLED`). */
  lessonSummary: (lessonId: string, lang: AiLang) =>
    api.get<AiLessonSummaryDto>(
      `/lessons/${lessonId}/ai/summary`,
      { lang },
      { timeout: AI_REQUEST_TIMEOUT_MS },
    ),

  /** `POST /lessons/:id/ai/quiz` - enrolled only; 5 questions, cached per lesson + language. */
  lessonQuiz: (lessonId: string, lang: AiLang) =>
    api.post<AiQuizDto>(`/lessons/${lessonId}/ai/quiz`, undefined, {
      params: { lang },
      timeout: AI_REQUEST_TIMEOUT_MS,
    }),

  /** `GET /me/ai/recommendations` - personalised learning path. */
  recommendations: (lang: AiLang) =>
    api.get<AiRecommendationsDto>(
      '/me/ai/recommendations',
      { lang },
      { timeout: AI_REQUEST_TIMEOUT_MS },
    ),

  /** `GET /courses/:id/ai/chat` - AI Tutor history, newest first. */
  chatHistory: (courseId: string, page = 1, limit = 20) =>
    api.getPage<AiChatMessageDto>(`/courses/${courseId}/ai/chat`, { page, limit }),

  /** `DELETE /courses/:id/ai/chat` - clears my AI Tutor history of that course. */
  clearChat: (courseId: string) => api.delete<void>(`/courses/${courseId}/ai/chat`),
};

export type AiChatPage = Paginated<AiChatMessageDto>;

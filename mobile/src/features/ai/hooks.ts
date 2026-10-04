import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import { useLanguage } from '@/i18n/useLanguage';
import { queryKeys } from '@/lib/queryKeys';
import type { AiQuizDto } from '@/types/api';

import { aiApi, type AiChatPage } from './api';

/**
 * AI hooks shared by Home (recommendations), Course details (course summary) and Learning
 * (lesson summary, quiz, AI Tutor). Keys include the UI language, so switching vi/en refetches.
 * AI answers are cached on the server, so `staleTime` is long; errors such as 429
 * `AI_RATE_LIMITED` / 503 `AI_UNAVAILABLE` are not retried (a retry would only burn the quota).
 */
const NO_AI_RETRY = { retry: false } as const;

/** `GET /courses/:id/ai/summary`. Pass `isEnabled=false` to load it only when the user asks. */
export function useAiCourseSummary(courseId: string, isEnabled = true) {
  const { language } = useLanguage();
  return useQuery({
    queryKey: queryKeys.aiCourseSummary(courseId, language),
    queryFn: () => aiApi.courseSummary(courseId, language),
    enabled: isEnabled,
    staleTime: STALE_TIME.ai,
    ...NO_AI_RETRY,
  });
}

/** `GET /lessons/:id/ai/summary`. */
export function useAiLessonSummary(lessonId: string, isEnabled = true) {
  const { language } = useLanguage();
  return useQuery({
    queryKey: queryKeys.aiLessonSummary(lessonId, language),
    queryFn: () => aiApi.lessonSummary(lessonId, language),
    enabled: isEnabled,
    staleTime: STALE_TIME.ai,
    ...NO_AI_RETRY,
  });
}

/** `GET /me/ai/recommendations` - the "AI picks for you" card on Home. */
export function useAiRecommendations(isEnabled = true) {
  const { language } = useLanguage();
  return useQuery({
    queryKey: queryKeys.aiRecommendations(language),
    queryFn: () => aiApi.recommendations(language),
    enabled: isEnabled,
    staleTime: STALE_TIME.ai,
    ...NO_AI_RETRY,
  });
}

/**
 * `POST /lessons/:id/ai/quiz`. A mutation because it is a POST that may call the model; the result
 * is also written to the query cache so reopening the quiz is instant.
 */
export function useAiLessonQuiz(lessonId: string) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation<AiQuizDto, Error, void>({
    mutationFn: () => aiApi.lessonQuiz(lessonId, language),
    onSuccess: (quiz) => {
      queryClient.setQueryData(queryKeys.aiLessonQuiz(lessonId, language), quiz);
    },
  });
}

/** `GET /courses/:id/ai/chat` (infinite, newest first). */
export function useAiChatHistory(courseId: string) {
  return useInfiniteQuery<
    AiChatPage,
    Error,
    InfiniteData<AiChatPage>,
    ReturnType<typeof queryKeys.aiChat>,
    number
  >({
    queryKey: queryKeys.aiChat(courseId),
    queryFn: ({ pageParam }) => aiApi.chatHistory(courseId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    staleTime: 0,
  });
}

/** `DELETE /courses/:id/ai/chat`. */
export function useClearAiChat(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => aiApi.clearChat(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiChat(courseId) });
    },
  });
}

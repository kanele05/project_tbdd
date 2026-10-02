import { PAGE_SIZE } from '@/constants/config';
import { api } from '@/lib/apiClient';
import type { AnswerDto, LikeResponse, QuestionDto } from '@/types/api';

/** HTTP calls of the Q&A feature (SC-15 Q&A tab, SC-16). All of them need an enrollment (BR-09). */
export const qaApi = {
  /** `GET /courses/:id/questions` - newest first. */
  questions: (courseId: string, page: number) =>
    api.getPage<QuestionDto>(`/courses/${courseId}/questions`, { page, limit: PAGE_SIZE }),

  /** `POST /courses/:id/questions` - `{ content }` 1-1000 characters. */
  createQuestion: (courseId: string, content: string) =>
    api.post<QuestionDto>(`/courses/${courseId}/questions`, { content }),

  /** `GET /questions/:id`. */
  question: (questionId: string) => api.get<QuestionDto>(`/questions/${questionId}`),

  /** `GET /questions/:id/answers`. */
  answers: (questionId: string, page: number) =>
    api.getPage<AnswerDto>(`/questions/${questionId}/answers`, { page, limit: PAGE_SIZE }),

  /** `POST /questions/:id/answers` - `{ content }`; notifies the asker (`NEW_ANSWER`). */
  createAnswer: (questionId: string, content: string) =>
    api.post<AnswerDto>(`/questions/${questionId}/answers`, { content }),

  /** `PUT /questions/:id/like`. */
  like: (questionId: string) => api.put<LikeResponse>(`/questions/${questionId}/like`),

  /** `DELETE /questions/:id/like`. */
  unlike: (questionId: string) => api.delete<LikeResponse>(`/questions/${questionId}/like`),
};

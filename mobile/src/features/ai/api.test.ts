import { api } from '@/lib/apiClient';

import { aiApi } from './api';

jest.mock('@/lib/apiClient', () => ({
  api: {
    get: jest.fn(),
    getPage: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    postForm: jest.fn(),
  },
}));

const mocked = api as jest.Mocked<typeof api>;

describe('aiApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the UI language to every AI endpoint', async () => {
    await aiApi.courseSummary('c1', 'vi');
    await aiApi.lessonSummary('l1', 'en');
    await aiApi.recommendations('vi');
    await aiApi.lessonQuiz('l1', 'vi');

    expect(mocked.get).toHaveBeenNthCalledWith(1, '/courses/c1/ai/summary', { lang: 'vi' });
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/lessons/l1/ai/summary', { lang: 'en' });
    expect(mocked.get).toHaveBeenNthCalledWith(3, '/me/ai/recommendations', { lang: 'vi' });
    expect(mocked.post).toHaveBeenCalledWith('/lessons/l1/ai/quiz', undefined, {
      params: { lang: 'vi' },
    });
  });

  it('reads and clears the AI Tutor history', async () => {
    await aiApi.chatHistory('c1');
    await aiApi.chatHistory('c1', 3, 10);
    await aiApi.clearChat('c1');

    expect(mocked.getPage).toHaveBeenNthCalledWith(1, '/courses/c1/ai/chat', {
      page: 1,
      limit: 20,
    });
    expect(mocked.getPage).toHaveBeenNthCalledWith(2, '/courses/c1/ai/chat', {
      page: 3,
      limit: 10,
    });
    expect(mocked.delete).toHaveBeenCalledWith('/courses/c1/ai/chat');
  });
});

import { PAGE_SIZE } from '@/constants/config';
import { api } from '@/lib/apiClient';

import { qaApi } from './api';

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

describe('qaApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists questions of a course page by page', async () => {
    await qaApi.questions('c1', 2);
    expect(mocked.getPage).toHaveBeenCalledWith('/courses/c1/questions', {
      page: 2,
      limit: PAGE_SIZE,
    });
  });

  it('creates a question and an answer with { content }', async () => {
    await qaApi.createQuestion('c1', 'How?');
    await qaApi.createAnswer('q1', 'Like this');
    expect(mocked.post).toHaveBeenNthCalledWith(1, '/courses/c1/questions', { content: 'How?' });
    expect(mocked.post).toHaveBeenNthCalledWith(2, '/questions/q1/answers', {
      content: 'Like this',
    });
  });

  it('reads one question and its answers', async () => {
    await qaApi.question('q1');
    await qaApi.answers('q1', 1);
    expect(mocked.get).toHaveBeenCalledWith('/questions/q1');
    expect(mocked.getPage).toHaveBeenCalledWith('/questions/q1/answers', {
      page: 1,
      limit: PAGE_SIZE,
    });
  });

  it('likes with PUT and unlikes with DELETE', async () => {
    await qaApi.like('q1');
    await qaApi.unlike('q1');
    expect(mocked.put).toHaveBeenCalledWith('/questions/q1/like');
    expect(mocked.delete).toHaveBeenCalledWith('/questions/q1/like');
  });
});

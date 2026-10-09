import { createTestQueryClient } from './queryWrapper';

describe('createTestQueryClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('disables retries and garbage collection for both queries and mutations', () => {
    const client = createTestQueryClient();
    expect(client.getDefaultOptions()).toEqual({
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    });
    client.clear();
  });

  it('leaves no garbage collection timer after a query and mutation complete', async () => {
    const client = createTestQueryClient();
    try {
      await client.fetchQuery({ queryKey: ['test-gc'], queryFn: async () => 'ready' });
      const mutation = client.getMutationCache().build(client, {
        mutationFn: async () => 'saved',
      });
      await mutation.execute(undefined);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      client.clear();
    }
  });
});

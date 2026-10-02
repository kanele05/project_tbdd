import * as healthService from './health.service';

const mockQueryRaw = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: (...args: unknown[]) => mockQueryRaw(...args) },
}));

describe('healthService.checkHealth', () => {
  it('reports ok when the database answers', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    await expect(healthService.checkHealth()).resolves.toEqual({ status: 'ok', db: 'ok' });
  });

  it('reports error/down instead of throwing when the database is unreachable', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('connection refused'));
    await expect(healthService.checkHealth()).resolves.toEqual({ status: 'error', db: 'down' });
  });
});

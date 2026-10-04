import { recordAuthEvent } from './authEvent.service';

const mockCreate = jest.fn();
const mockLogger = { warn: jest.fn() };

jest.mock('@/lib/prisma', () => ({
  prisma: { authEvent: { create: (...args: unknown[]) => mockCreate(...args) } },
}));
jest.mock('@/lib/logger', () => ({
  logger: { warn: (...args: unknown[]) => mockLogger.warn(...args) },
}));

beforeEach(() => {
  mockCreate.mockReset();
  mockLogger.warn.mockReset();
});

describe('recordAuthEvent', () => {
  it('stores the event with a masked IP and a truncated user agent', async () => {
    mockCreate.mockResolvedValue({ id: 'e1' });
    await recordAuthEvent({
      userId: 'u1',
      type: 'LOGIN_SUCCESS',
      sessionId: 's1',
      ctx: { ip: '113.161.45.77', userAgent: 'a'.repeat(400), lang: 'en' },
      metadata: { method: 'password' },
    });
    const data = (mockCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({
      userId: 'u1',
      type: 'LOGIN_SUCCESS',
      sessionId: 's1',
      ipAddress: '113.161.45.x',
      metadata: { method: 'password' },
    });
    expect((data.userAgent as string).length).toBe(255);
  });

  it('works without context, session or metadata', async () => {
    mockCreate.mockResolvedValue({ id: 'e1' });
    await recordAuthEvent({ userId: 'u1', type: 'REGISTER' });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: 'u1', type: 'REGISTER', sessionId: null, ipAddress: null, userAgent: null },
      select: { id: true },
    });
  });

  it('never throws when the database write fails (logging must not break sign-in)', async () => {
    mockCreate.mockRejectedValue(new Error('db down'));
    await expect(recordAuthEvent({ userId: 'u1', type: 'LOGOUT' })).resolves.toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOGOUT' }),
      'Failed to record auth event',
    );
  });
});

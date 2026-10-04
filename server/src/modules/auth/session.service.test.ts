import { hashRefreshToken } from '@/lib/authCrypto';
import { verifyToken } from '@/lib/jwt';

import * as sessionService from './session.service';

const mockDb = {
  sessionCount: jest.fn(),
  sessionCreate: jest.fn(),
  sessionFindMany: jest.fn(),
  sessionUpdateMany: jest.fn(),
  sessionUpdate: jest.fn(),
  tokenFindUnique: jest.fn(),
  tokenUpdateMany: jest.fn(),
  tokenCreate: jest.fn(),
  tokenDeleteMany: jest.fn(),
};
const mockForgetSession = jest.fn();
const mockRecordAuthEvent = jest.fn();

jest.mock('@/lib/prisma', () => {
  const prisma = {
    session: {
      count: (...args: unknown[]) => mockDb.sessionCount(...args),
      create: (...args: unknown[]) => mockDb.sessionCreate(...args),
      findMany: (...args: unknown[]) => mockDb.sessionFindMany(...args),
      updateMany: (...args: unknown[]) => mockDb.sessionUpdateMany(...args),
      update: (...args: unknown[]) => mockDb.sessionUpdate(...args),
    },
    refreshToken: {
      findUnique: (...args: unknown[]) => mockDb.tokenFindUnique(...args),
      updateMany: (...args: unknown[]) => mockDb.tokenUpdateMany(...args),
      create: (...args: unknown[]) => mockDb.tokenCreate(...args),
      deleteMany: (...args: unknown[]) => mockDb.tokenDeleteMany(...args),
    },
    $transaction: (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => Promise<unknown>)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
  };
  return { prisma };
});
jest.mock('@/lib/sessionGuard', () => ({
  forgetSession: (...args: unknown[]) => mockForgetSession(...args),
}));
jest.mock('./authEvent.service', () => ({
  recordAuthEvent: (...args: unknown[]) => mockRecordAuthEvent(...args),
}));

const now = new Date('2026-10-04T08:00:00Z');
const ctx = {
  ip: '113.161.45.77',
  userAgent: 'Mozilla/5.0 Chrome/126.0 Windows',
  lang: 'en' as const,
};
const dbUser = {
  id: 'user-1',
  email: 'martha@example.com',
  fullName: 'Martha Rosie',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT' as const,
};

beforeEach(() => {
  Object.values(mockDb).forEach((fn) => fn.mockReset());
  mockForgetSession.mockReset();
  mockRecordAuthEvent.mockReset();
  mockDb.sessionCreate.mockResolvedValue({ id: 'sess-1' });
  mockDb.sessionUpdateMany.mockResolvedValue({ count: 1 });
  mockDb.tokenDeleteMany.mockResolvedValue({ count: 0 });
});

describe('startSession', () => {
  it('creates a session with a hashed refresh token and returns a verifiable token pair', async () => {
    mockDb.sessionCount.mockResolvedValue(0);

    const started = await sessionService.startSession(
      { id: 'user-1', role: 'STUDENT' },
      ctx,
      undefined,
      now,
    );

    const args = mockDb.sessionCreate.mock.calls[0]?.[0] as {
      data: {
        userId: string;
        deviceName: string;
        ipAddress: string;
        expiresAt: Date;
        refreshTokens: { create: { tokenHash: string; expiresAt: Date } };
      };
    };
    expect(args.data).toMatchObject({
      userId: 'user-1',
      deviceName: 'Chrome on Windows',
      ipAddress: '113.161.45.x',
      expiresAt: new Date(now.getTime() + 30 * 86_400_000),
    });
    expect(args.data.refreshTokens.create.tokenHash).toBe(
      hashRefreshToken(started.tokens.refreshToken),
    );
    expect(JSON.stringify(args)).not.toContain(started.tokens.refreshToken);

    expect(started.sessionId).toBe('sess-1');
    expect(started.tokens.token).toBe(started.tokens.accessToken);
    expect(started.tokens.accessTokenExpiresIn).toBe(900);
    expect(verifyToken(started.tokens.accessToken)).toEqual({
      id: 'user-1',
      role: 'STUDENT',
      sessionId: 'sess-1',
    });
  });

  it('does not flag the very first login of an account as a new device', async () => {
    mockDb.sessionCount.mockResolvedValue(0);
    const started = await sessionService.startSession(
      { id: 'user-1', role: 'STUDENT' },
      ctx,
      undefined,
      now,
    );
    expect(started.isNewDevice).toBe(false);
  });

  it('flags a device that was never used before when the user already has sessions', async () => {
    mockDb.sessionCount.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    const started = await sessionService.startSession(
      { id: 'user-1', role: 'STUDENT' },
      ctx,
      'Pixel 8',
      now,
    );
    expect(started.isNewDevice).toBe(true);
    expect(started.deviceName).toBe('Pixel 8');
  });

  it('does not flag a device that signed in before (case-insensitive name match)', async () => {
    mockDb.sessionCount.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const started = await sessionService.startSession(
      { id: 'user-1', role: 'STUDENT' },
      ctx,
      'pixel 8',
      now,
    );
    expect(started.isNewDevice).toBe(false);
    expect(mockDb.sessionCount).toHaveBeenLastCalledWith({
      where: { userId: 'user-1', deviceName: { equals: 'pixel 8', mode: 'insensitive' } },
    });
  });
});

describe('refreshSession', () => {
  const oldToken = 'old-refresh-token-0123456789abcdef';
  const row = (
    overrides: Record<string, unknown> = {},
    sessionOverrides: Record<string, unknown> = {},
  ) => ({
    id: 'rt-1',
    usedAt: null,
    expiresAt: new Date(now.getTime() + 86_400_000),
    session: {
      id: 'sess-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(now.getTime() + 86_400_000),
      user: dbUser,
      ...sessionOverrides,
    },
    ...overrides,
  });

  it('rotates the token: marks the old one used, stores only the hash of the new one and returns a new pair', async () => {
    mockDb.tokenFindUnique.mockResolvedValue(row());
    mockDb.tokenUpdateMany.mockResolvedValue({ count: 1 });
    mockDb.tokenCreate.mockResolvedValue({ id: 'rt-2' });
    mockDb.sessionUpdate.mockResolvedValue({ id: 'sess-1' });

    const result = await sessionService.refreshSession(oldToken, ctx, now);

    expect(mockDb.tokenFindUnique.mock.calls[0]?.[0]).toMatchObject({
      where: { tokenHash: hashRefreshToken(oldToken) },
    });
    expect(mockDb.tokenUpdateMany).toHaveBeenCalledWith({
      where: { id: 'rt-1', usedAt: null },
      data: { usedAt: now },
    });
    const created = (
      mockDb.tokenCreate.mock.calls[0]?.[0] as {
        data: { tokenHash: string; expiresAt: Date; sessionId: string };
      }
    ).data;
    expect(created.sessionId).toBe('sess-1');
    expect(created.tokenHash).toBe(hashRefreshToken(result.refreshToken));
    expect(created.expiresAt).toEqual(new Date(now.getTime() + 30 * 86_400_000));
    expect(result.refreshToken).not.toBe(oldToken);
    expect(JSON.stringify(mockDb.tokenCreate.mock.calls)).not.toContain(result.refreshToken);

    expect(mockDb.sessionUpdate).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: expect.objectContaining({ lastUsedAt: now, ipAddress: '113.161.45.x' }),
    });
    // Dọn token đã dùng quá 7 ngày.
    expect(mockDb.tokenDeleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'sess-1', usedAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } },
    });

    expect(result).toMatchObject({
      twoFactorRequired: false,
      user: expect.objectContaining({ id: 'user-1' }),
    });
    expect(result.token).toBe(result.accessToken);
    expect(verifyToken(result.accessToken)).toEqual({
      id: 'user-1',
      role: 'STUDENT',
      sessionId: 'sess-1',
    });
  });

  it.each([
    ['an unknown token', null],
    ['an expired token', row({ expiresAt: new Date(now.getTime() - 1) })],
    ['a token of a revoked session', row({}, { revokedAt: new Date(now.getTime() - 1000) })],
    ['a token of an expired session', row({}, { expiresAt: new Date(now.getTime() - 1) })],
  ])('rejects %s with 401 INVALID_REFRESH_TOKEN and rotates nothing', async (_label, found) => {
    mockDb.tokenFindUnique.mockResolvedValue(found);
    await expect(sessionService.refreshSession(oldToken, ctx, now)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
    expect(mockDb.tokenUpdateMany).not.toHaveBeenCalled();
    expect(mockRecordAuthEvent).not.toHaveBeenCalled();
  });

  it('treats a token that was already used as theft: revokes the whole session and logs REFRESH_REUSE', async () => {
    mockDb.tokenFindUnique.mockResolvedValue(row({ usedAt: new Date(now.getTime() - 5000) }));
    mockDb.sessionFindMany.mockResolvedValue([{ id: 'sess-1', userId: 'user-1' }]);

    await expect(sessionService.refreshSession(oldToken, ctx, now)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });

    expect(mockDb.sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['sess-1'] }, revokedAt: null },
      data: { revokedAt: now, revokedReason: 'REFRESH_REUSE' },
    });
    expect(mockDb.tokenDeleteMany).toHaveBeenCalledWith({
      where: { sessionId: { in: ['sess-1'] } },
    });
    expect(mockForgetSession).toHaveBeenCalledWith('sess-1');
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'REFRESH_REUSE',
      sessionId: 'sess-1',
      ctx,
    });
    expect(mockDb.tokenCreate).not.toHaveBeenCalled();
  });

  it('also detects reuse when two requests race for the same token (the loser claims 0 rows)', async () => {
    mockDb.tokenFindUnique.mockResolvedValue(row());
    mockDb.tokenUpdateMany.mockResolvedValue({ count: 0 });
    mockDb.sessionFindMany.mockResolvedValue([{ id: 'sess-1', userId: 'user-1' }]);

    await expect(sessionService.refreshSession(oldToken, ctx, now)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    expect(mockDb.tokenCreate).not.toHaveBeenCalled();
    expect(mockForgetSession).toHaveBeenCalledWith('sess-1');
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REFRESH_REUSE' }),
    );
  });
});

describe('logout', () => {
  it('revokes the session of the access token and logs LOGOUT', async () => {
    mockDb.sessionFindMany.mockResolvedValue([{ id: 'sess-1', userId: 'user-1' }]);
    await sessionService.logout({ sessionId: 'sess-1' }, ctx);
    expect(mockDb.sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['sess-1'] }, revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedReason: 'LOGOUT' },
    });
    expect(mockForgetSession).toHaveBeenCalledWith('sess-1');
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'LOGOUT',
      sessionId: 'sess-1',
      ctx,
    });
  });

  it('revokes the session found through a refresh token (expired access token)', async () => {
    mockDb.tokenFindUnique.mockResolvedValue({ sessionId: 'sess-9' });
    mockDb.sessionFindMany.mockResolvedValue([{ id: 'sess-9', userId: 'user-1' }]);
    await sessionService.logout({ refreshToken: 'some-refresh-token-0123456789' }, ctx);
    expect(mockDb.sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ id: { in: ['sess-9'] } }, { revokedAt: null }] },
      }),
    );
  });

  it('is idempotent: unknown tokens and already revoked sessions are not an error', async () => {
    mockDb.tokenFindUnique.mockResolvedValue(null);
    await expect(
      sessionService.logout({ refreshToken: 'unknown-refresh-token-0123456' }, ctx),
    ).resolves.toBeUndefined();
    await expect(sessionService.logout({}, ctx)).resolves.toBeUndefined();
    mockDb.sessionFindMany.mockResolvedValue([]);
    await expect(sessionService.logout({ sessionId: 'sess-1' }, ctx)).resolves.toBeUndefined();
    expect(mockRecordAuthEvent).not.toHaveBeenCalled();
    expect(mockDb.sessionUpdateMany).not.toHaveBeenCalled();
  });
});

describe('revokeUserSessions', () => {
  it('revokes every active session except the current one and returns how many', async () => {
    mockDb.sessionFindMany.mockResolvedValue([
      { id: 'a', userId: 'user-1' },
      { id: 'b', userId: 'user-1' },
    ]);
    const count = await sessionService.revokeUserSessions(
      'user-1',
      { exceptSessionId: 'keep', reason: 'PASSWORD_CHANGED' },
      now,
    );
    expect(count).toBe(2);
    expect(mockDb.sessionFindMany).toHaveBeenCalledWith({
      where: { AND: [{ userId: 'user-1', id: { not: 'keep' } }, { revokedAt: null }] },
      select: { id: true, userId: true },
    });
    expect(mockDb.sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] }, revokedAt: null },
      data: { revokedAt: now, revokedReason: 'PASSWORD_CHANGED' },
    });
    expect(mockForgetSession).toHaveBeenCalledTimes(2);
  });

  it('revokes all sessions when there is no exception and returns 0 when there is nothing to revoke', async () => {
    mockDb.sessionFindMany.mockResolvedValue([]);
    await expect(
      sessionService.revokeUserSessions('user-1', { reason: 'PASSWORD_RESET' }),
    ).resolves.toBe(0);
    expect(mockDb.sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ userId: 'user-1' }, { revokedAt: null }] } }),
    );
    expect(mockDb.sessionUpdateMany).not.toHaveBeenCalled();
  });
});

describe('revokeSessionOfUser', () => {
  it('revokes the session and logs SESSION_REVOKED', async () => {
    mockDb.sessionFindMany.mockResolvedValue([{ id: 'sess-2', userId: 'user-1' }]);
    await sessionService.revokeSessionOfUser('user-1', 'sess-2', ctx);
    expect(mockDb.sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ id: 'sess-2', userId: 'user-1' }, { revokedAt: null }] },
      }),
    );
    expect(mockRecordAuthEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'SESSION_REVOKED',
      sessionId: 'sess-2',
      ctx,
    });
  });

  it('throws 404 SESSION_NOT_FOUND for a session of another user, a revoked or a missing one', async () => {
    mockDb.sessionFindMany.mockResolvedValue([]);
    await expect(sessionService.revokeSessionOfUser('user-1', 'other', ctx)).rejects.toMatchObject({
      status: 404,
      code: 'SESSION_NOT_FOUND',
    });
    expect(mockRecordAuthEvent).not.toHaveBeenCalled();
  });
});

describe('listSessions', () => {
  it('lists active sessions newest-activity first and marks the current one', async () => {
    const created = new Date('2026-10-01T00:00:00Z');
    mockDb.sessionFindMany.mockResolvedValue([
      { id: 'a', deviceName: 'Pixel 8', ipAddress: '1.2.3.x', createdAt: created, lastUsedAt: now },
      {
        id: 'b',
        deviceName: 'Chrome on Windows',
        ipAddress: null,
        createdAt: created,
        lastUsedAt: created,
      },
    ]);
    const list = await sessionService.listSessions('user-1', 'a', now);
    expect(mockDb.sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', revokedAt: null, expiresAt: { gt: now } },
        orderBy: [{ lastUsedAt: 'desc' }, { id: 'asc' }],
      }),
    );
    expect(list).toEqual([
      {
        id: 'a',
        deviceName: 'Pixel 8',
        ipAddress: '1.2.3.x',
        createdAt: created.toISOString(),
        lastUsedAt: now.toISOString(),
        isCurrent: true,
      },
      {
        id: 'b',
        deviceName: 'Chrome on Windows',
        ipAddress: null,
        createdAt: created.toISOString(),
        lastUsedAt: created.toISOString(),
        isCurrent: false,
      },
    ]);
  });
});

import { ApiError } from '@/lib/ApiError';
import { verifyToken } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';

import * as authService from './auth.service';

const mockUser = { findUnique: jest.fn(), create: jest.fn() };

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUser.findUnique(...args),
      create: (...args: unknown[]) => mockUser.create(...args),
    },
  },
  Prisma: jest.requireActual('@/generated/prisma/client').Prisma,
}));

const publicUser = {
  id: 'user-1',
  email: 'martha@example.com',
  fullName: 'Martha Rosie',
  headline: null,
  avatarUrl: null,
  coverUrl: null,
  role: 'STUDENT' as const,
};

beforeEach(() => {
  mockUser.findUnique.mockReset();
  mockUser.create.mockReset();
});

describe('authService.register', () => {
  it('creates a STUDENT with a bcrypt hash and returns a token + user without the hash', async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue(publicUser);

    const result = await authService.register({
      fullName: 'Martha Rosie',
      email: 'martha@example.com',
      password: 'Learn2026',
    });

    const createArgs = mockUser.create.mock.calls[0][0] as {
      data: { passwordHash: string; role: string };
    };
    expect(createArgs.data.role).toBe('STUDENT');
    expect(createArgs.data.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(createArgs.data.passwordHash).not.toContain('Learn2026');
    expect(result.user).toEqual(publicUser);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(verifyToken(result.token)).toEqual({ id: 'user-1', role: 'STUDENT' });
  });

  it('throws 409 EMAIL_TAKEN when the email already exists', async () => {
    mockUser.findUnique.mockResolvedValue({ id: 'someone' });
    await expect(
      authService.register({ fullName: 'A B', email: 'taken@example.com', password: 'Learn2026' }),
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it('maps a concurrent unique violation (P2002) to EMAIL_TAKEN', async () => {
    const { Prisma } = jest.requireActual('@/generated/prisma/client');
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(
      authService.register({ fullName: 'A B', email: 'race@example.com', password: 'Learn2026' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });
});

describe('authService.login', () => {
  it('returns a token and user when the credentials are correct', async () => {
    mockUser.findUnique.mockResolvedValue({
      ...publicUser,
      passwordHash: await hashPassword('Learn2026'),
    });
    const result = await authService.login({ email: 'martha@example.com', password: 'Learn2026' });
    expect(result.user).toEqual(publicUser);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(verifyToken(result.token)?.id).toBe('user-1');
  });

  it('throws 401 INVALID_CREDENTIALS for a wrong password', async () => {
    mockUser.findUnique.mockResolvedValue({
      ...publicUser,
      passwordHash: await hashPassword('Learn2026'),
    });
    await expect(
      authService.login({ email: 'martha@example.com', password: 'WrongPass1' }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('throws the same error for an unknown email', async () => {
    mockUser.findUnique.mockResolvedValue(null);
    const error = await authService
      .login({ email: 'nobody@example.com', password: 'Learn2026' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password',
    });
  });
});

describe('authService.getMe', () => {
  it('returns the user', async () => {
    mockUser.findUnique.mockResolvedValue(publicUser);
    await expect(authService.getMe('user-1')).resolves.toEqual(publicUser);
  });

  it('throws 401 UNAUTHORIZED when the account no longer exists', async () => {
    mockUser.findUnique.mockResolvedValue(null);
    await expect(authService.getMe('gone')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });
});

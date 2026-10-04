import { api } from '@/lib/apiClient';

import { authApi } from './api';

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

describe('authApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs in and registers with POST', async () => {
    const login = { email: 'a@b.co', password: 'secret123', deviceName: 'Pixel 7' };
    const register = {
      fullName: 'Jane',
      email: 'a@b.co',
      password: 'secret123',
      captchaToken: 'tok',
      lang: 'en' as const,
    };
    await authApi.login(login);
    await authApi.register(register);
    expect(mocked.post).toHaveBeenNthCalledWith(1, '/auth/login', login);
    expect(mocked.post).toHaveBeenNthCalledWith(2, '/auth/register', register);
  });

  it('calls the verification, 2FA and password-reset endpoints', async () => {
    await authApi.verifyEmail({ email: 'a@b.co', code: '123456' });
    await authApi.resendVerification({ email: 'a@b.co' });
    await authApi.verifyTwoFactor({ challengeToken: 'c', code: '123456' });
    await authApi.forgotPassword({ email: 'a@b.co', captchaToken: 'tok' });
    await authApi.resetPassword({ email: 'a@b.co', code: '123456', newPassword: 'abc12345' });
    expect(mocked.post.mock.calls.map((call) => call[0])).toEqual([
      '/auth/verify-email',
      '/auth/resend-verification',
      '/auth/2fa/verify',
      '/auth/forgot-password',
      '/auth/reset-password',
    ]);
  });

  it('logs out with the refresh token and a short timeout', async () => {
    await authApi.logout('refresh.1');
    expect(mocked.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'refresh.1' },
      { timeout: 5000 },
    );
  });

  it('uses a shorter timeout for the bootstrap call than the default', async () => {
    await authApi.me();
    await authApi.meForBootstrap();
    expect(mocked.get).toHaveBeenNthCalledWith(1, '/auth/me');
    expect(mocked.get).toHaveBeenNthCalledWith(2, '/auth/me', undefined, { timeout: 8000 });
  });
});

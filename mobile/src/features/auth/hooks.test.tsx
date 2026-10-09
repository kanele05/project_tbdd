import { act, renderHook } from '@testing-library/react-native';

import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { AuthSessionDto, UserDto } from '@/types/api';

import { authApi } from './api';
import {
  useForgotPassword,
  useLogin,
  useRegister,
  useResendVerification,
  useResetPassword,
  useTwoFactorLogin,
  useVerifyEmail,
} from './hooks';

jest.mock('./api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    verifyTwoFactor: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    me: jest.fn(),
    meForBootstrap: jest.fn(),
  },
}));
jest.mock('@/utils/deviceName', () => ({ getDeviceName: () => 'Test device' }));

const mockLogin = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { login: jest.Mock }) => unknown) =>
    selector({ login: mockLogin }),
}));

const mocked = authApi as jest.Mocked<typeof authApi>;

const USER = { id: 'u1', email: 'a@b.co', fullName: 'Jane' } as UserDto;
const SESSION: AuthSessionDto = {
  twoFactorRequired: false,
  accessToken: 'access',
  refreshToken: 'refresh',
  accessTokenExpiresIn: 900,
  token: 'access',
  user: USER,
};

async function run<T>(hook: () => T) {
  return renderHook(hook, { wrapper: createQueryWrapper(createTestQueryClient()) });
}

beforeEach(() => jest.clearAllMocks());

afterEach(async () => {
  await act(flushNotifications);
});

describe('useLogin', () => {
  it('adds the device name and stores the session after a successful login', async () => {
    mocked.login.mockResolvedValue(SESSION);
    const { result } = await run(() => useLogin());

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.co', password: 'secret123' });
      await flushNotifications();
    });

    expect(mocked.login.mock.calls[0]?.[0]).toEqual({
      email: 'a@b.co',
      password: 'secret123',
      deviceName: 'Test device',
    });
    expect(mockLogin).toHaveBeenCalledWith(SESSION);
  });

  it('hands a 2FA challenge back to the screen without storing a session', async () => {
    mocked.login.mockResolvedValue({
      twoFactorRequired: true,
      challengeToken: 'c',
      challengeExpiresIn: 300,
    });
    const { result } = await run(() => useLogin());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.mutateAsync({ email: 'a@b.co', password: 'secret123' });
      await flushNotifications();
    });

    expect(outcome).toMatchObject({ twoFactorRequired: true, challengeToken: 'c' });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('does not touch the session when the credentials are wrong', async () => {
    mocked.login.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
    const { result } = await run(() => useLogin());

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.co', password: 'bad' }).catch(() => undefined);
      await flushNotifications();
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(true);
  });
});

describe('useRegister', () => {
  it('sends the UI language and does NOT log in (the email must be verified first)', async () => {
    mocked.register.mockResolvedValue({
      user: USER,
      emailVerificationRequired: true,
      codeExpiresIn: 600,
      resendAfter: 60,
    });
    const { result } = await run(() => useRegister());
    const body = {
      email: 'a@b.co',
      password: 'secret123',
      fullName: 'Jane',
      captchaToken: 'tok',
      role: 'STUDENT' as const,
    };

    await act(async () => {
      await result.current.mutateAsync(body);
      await flushNotifications();
    });

    expect(mocked.register.mock.calls[0]?.[0]).toEqual({ ...body, lang: 'en' });
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

describe('useVerifyEmail', () => {
  it('logs the user in after the right code', async () => {
    mocked.verifyEmail.mockResolvedValue(SESSION);
    const { result } = await run(() => useVerifyEmail());

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.co', code: '123456' });
      await flushNotifications();
    });

    expect(mocked.verifyEmail.mock.calls[0]?.[0]).toEqual({
      email: 'a@b.co',
      code: '123456',
      deviceName: 'Test device',
    });
    expect(mockLogin).toHaveBeenCalledWith(SESSION);
  });
});

describe('useTwoFactorLogin', () => {
  it('sends a TOTP code or a recovery code and logs in', async () => {
    mocked.verifyTwoFactor.mockResolvedValue(SESSION);
    const { result } = await run(() => useTwoFactorLogin());

    await act(async () => {
      await result.current.mutateAsync({ challengeToken: 'c', recoveryCode: 'ABCDE-FGHJK' });
      await flushNotifications();
    });

    expect(mocked.verifyTwoFactor.mock.calls[0]?.[0]).toEqual({
      challengeToken: 'c',
      recoveryCode: 'ABCDE-FGHJK',
      deviceName: 'Test device',
    });
    expect(mockLogin).toHaveBeenCalledWith(SESSION);
  });
});

describe('email-code hooks', () => {
  it('resend and forgot-password carry the UI language', async () => {
    mocked.resendVerification.mockResolvedValue({
      sent: true,
      codeExpiresIn: 600,
      resendAfter: 60,
    });
    mocked.forgotPassword.mockResolvedValue({ sent: true, codeExpiresIn: 600, resendAfter: 60 });
    const resend = await run(() => useResendVerification());
    const forgot = await run(() => useForgotPassword());

    await act(async () => {
      await resend.result.current.mutateAsync({ email: 'a@b.co' });
      await forgot.result.current.mutateAsync({ email: 'a@b.co', captchaToken: 'tok' });
      await flushNotifications();
    });

    expect(mocked.resendVerification.mock.calls[0]?.[0]).toEqual({ email: 'a@b.co', lang: 'en' });
    expect(mocked.forgotPassword.mock.calls[0]?.[0]).toEqual({
      email: 'a@b.co',
      captchaToken: 'tok',
      lang: 'en',
    });
  });

  it('reset password passes the body through', async () => {
    mocked.resetPassword.mockResolvedValue(undefined);
    const { result } = await run(() => useResetPassword());
    const body = { email: 'a@b.co', code: '123456', newPassword: 'abc12345' };

    await act(async () => {
      await result.current.mutateAsync(body);
      await flushNotifications();
    });

    expect(mocked.resetPassword.mock.calls[0]?.[0]).toEqual(body);
  });
});

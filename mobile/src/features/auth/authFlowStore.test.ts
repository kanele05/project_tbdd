import { useAuthFlowStore } from './authFlowStore';

describe('authFlowStore', () => {
  beforeEach(() => {
    useAuthFlowStore.setState({
      verifyEmail: null,
      twoFactor: null,
      resetEmail: null,
      loginNotice: null,
    });
  });

  it('remembers the email to verify and when a new code may be requested', () => {
    const before = Date.now();
    useAuthFlowStore.getState().startVerifyEmail('a@b.co', 60);

    const flow = useAuthFlowStore.getState().verifyEmail;
    expect(flow?.email).toBe('a@b.co');
    expect(flow?.resendAvailableAt).toBeGreaterThanOrEqual(before + 60_000);

    useAuthFlowStore.getState().setResendAvailableAt(123);
    expect(useAuthFlowStore.getState().verifyEmail?.resendAvailableAt).toBe(123);
  });

  it('ignores a resend time when there is no verification in progress', () => {
    useAuthFlowStore.getState().setResendAvailableAt(123);
    expect(useAuthFlowStore.getState().verifyEmail).toBeNull();
  });

  it('keeps the 2FA challenge with its expiry and clears it', () => {
    useAuthFlowStore.getState().startTwoFactor('challenge', 300);
    const flow = useAuthFlowStore.getState().twoFactor;
    expect(flow?.challengeToken).toBe('challenge');
    expect(flow?.expiresAt).toBeGreaterThan(Date.now() + 290_000);

    useAuthFlowStore.getState().clearTwoFactor();
    expect(useAuthFlowStore.getState().twoFactor).toBeNull();
  });

  it('carries the reset email and the one-shot login notice', () => {
    useAuthFlowStore.getState().startReset('a@b.co');
    useAuthFlowStore.getState().setLoginNotice('passwordReset');
    expect(useAuthFlowStore.getState().resetEmail).toBe('a@b.co');
    expect(useAuthFlowStore.getState().loginNotice).toBe('passwordReset');

    useAuthFlowStore.getState().clearReset();
    useAuthFlowStore.getState().setLoginNotice(null);
    expect(useAuthFlowStore.getState().resetEmail).toBeNull();
    expect(useAuthFlowStore.getState().loginNotice).toBeNull();
  });
});

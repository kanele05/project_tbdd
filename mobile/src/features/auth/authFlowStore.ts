import { create } from 'zustand';

/** One-shot message the Login screen shows after a flow that ended there. */
export type LoginNotice = 'passwordReset' | null;

type VerifyEmailFlow = { email: string; resendAvailableAt: number };
type TwoFactorFlow = { challengeToken: string; expiresAt: number };

type AuthFlowState = {
  /** Account waiting for its email OTP (after sign-up, or a login that answered EMAIL_NOT_VERIFIED). */
  verifyEmail: VerifyEmailFlow | null;
  /** Login that answered `twoFactorRequired`: the challenge to complete with a TOTP / recovery code. */
  twoFactor: TwoFactorFlow | null;
  /** Email an OTP for a password reset was requested for. */
  resetEmail: string | null;
  loginNotice: LoginNotice;
  startVerifyEmail: (email: string, resendAfterSec: number) => void;
  setResendAvailableAt: (timestamp: number) => void;
  startTwoFactor: (challengeToken: string, expiresInSec: number) => void;
  startReset: (email: string) => void;
  setLoginNotice: (notice: LoginNotice) => void;
  clearVerifyEmail: () => void;
  clearTwoFactor: () => void;
  clearReset: () => void;
};

/**
 * Short-lived client state that hops between the auth screens (which email is being verified, the
 * 2FA challenge...). It lives in memory ON PURPOSE instead of in the URL: a challenge token or an
 * email address must not end up in the browser history / address bar. A reload loses it and the
 * screens send the user back to Login.
 */
export const useAuthFlowStore = create<AuthFlowState>()((set) => ({
  verifyEmail: null,
  twoFactor: null,
  resetEmail: null,
  loginNotice: null,
  startVerifyEmail: (email, resendAfterSec) =>
    set({ verifyEmail: { email, resendAvailableAt: Date.now() + resendAfterSec * 1000 } }),
  setResendAvailableAt: (timestamp) =>
    set((state) =>
      state.verifyEmail
        ? { verifyEmail: { ...state.verifyEmail, resendAvailableAt: timestamp } }
        : state,
    ),
  startTwoFactor: (challengeToken, expiresInSec) =>
    set({ twoFactor: { challengeToken, expiresAt: Date.now() + expiresInSec * 1000 } }),
  startReset: (email) => set({ resetEmail: email }),
  setLoginNotice: (notice) => set({ loginNotice: notice }),
  clearVerifyEmail: () => set({ verifyEmail: null }),
  clearTwoFactor: () => set({ twoFactor: null }),
  clearReset: () => set({ resetEmail: null }),
}));

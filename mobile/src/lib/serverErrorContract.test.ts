import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { describeAiError } from '@/features/ai/aiErrors';
import {
  getAuthErrorDetails,
  getAuthErrorMessage,
  isDeadCodeError,
} from '@/features/auth/authErrors';

import { getErrorMessage, getFieldErrors, toAppError } from './appError';

/**
 * Contract fixtures: these are the error bodies the REAL server sent (contract check v2, server on
 * port 4017, e-mail addresses anonymised) for the auth / AI flows. They pin down the `details` the
 * app reads (`captchaRequired`, `retryAfterSec`, `attemptsLeft`, `email`, `resendAfter`,
 * `[{ source, field, message }]`), so a change on either side shows up as a red test.
 */
function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

const VALIDATION_PASSWORD = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request data',
    details: [
      { source: 'body', field: 'password', message: 'Password must be at least 8 characters' },
      { source: 'body', field: 'password', message: 'Password must contain at least one number' },
    ],
  },
};
const EMAIL_NOT_VERIFIED = {
  error: {
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Verify your email to continue',
    details: { email: 'student@example.com', resendAfter: 60 },
  },
};
const RESEND_TOO_SOON = {
  error: {
    code: 'RESEND_TOO_SOON',
    message: 'Please wait before requesting another code',
    details: { retryAfterSec: 42 },
  },
};
const INVALID_CODE = {
  error: {
    code: 'INVALID_CODE',
    message: 'Invalid verification code',
    details: { attemptsLeft: 4 },
  },
};
const INVALID_CREDENTIALS_CAPTCHA = {
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Incorrect email or password',
    details: { captchaRequired: true },
  },
};
const INVALID_CREDENTIALS_PLAIN = {
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Incorrect email or password',
    details: { captchaRequired: false },
  },
};
const ACCOUNT_LOCKED = {
  error: {
    code: 'ACCOUNT_LOCKED',
    message: 'Too many failed attempts. Try again later.',
    details: { retryAfterSec: 900 },
  },
};
const TOO_MANY_ATTEMPTS = {
  error: {
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Too many incorrect attempts. Request a new verification code.',
  },
};
const AI_RATE_LIMITED = {
  error: {
    code: 'AI_RATE_LIMITED',
    message: 'AI usage limit reached',
    details: { retryAfterSec: 1800 },
  },
};

describe('real server error bodies', () => {
  it('reads the per-field validation details sent by the server', () => {
    const appError = toAppError(httpError(400, VALIDATION_PASSWORD));

    expect(appError).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    // The first message of a field wins.
    expect(getFieldErrors(appError)).toEqual({
      password: 'Password must be at least 8 characters',
    });
  });

  it('keeps `email` and `resendAfter` of EMAIL_NOT_VERIFIED (403)', () => {
    const appError = toAppError(httpError(403, EMAIL_NOT_VERIFIED));

    expect(appError).toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });
    expect(getAuthErrorDetails(appError)).toMatchObject({
      email: 'student@example.com',
      resendAfter: 60,
    });
  });

  it('shows the cooldown of RESEND_TOO_SOON (429) from details.retryAfterSec', () => {
    const appError = toAppError(httpError(429, RESEND_TOO_SOON));

    expect(getAuthErrorDetails(appError).retryAfterSec).toBe(42);
    expect(getAuthErrorMessage(appError)).toContain('42');
  });

  it('shows the attempts left of INVALID_CODE (400)', () => {
    const appError = toAppError(httpError(400, INVALID_CODE));

    expect(getAuthErrorDetails(appError).attemptsLeft).toBe(4);
    expect(getAuthErrorMessage(appError)).toContain('4');
    expect(isDeadCodeError(appError)).toBe(false);
  });

  it('asks for a CAPTCHA only when INVALID_CREDENTIALS says `captchaRequired: true`', () => {
    const withCaptcha = toAppError(httpError(401, INVALID_CREDENTIALS_CAPTCHA));
    const plain = toAppError(httpError(401, INVALID_CREDENTIALS_PLAIN));

    expect(getAuthErrorDetails(withCaptcha).captchaRequired).toBe(true);
    expect(getAuthErrorDetails(plain).captchaRequired).toBeUndefined();
    expect(getErrorMessage(plain)).toBe('Incorrect email or password.');
  });

  it('turns ACCOUNT_LOCKED (423) into "try again in 15 min" and is not a rate limit', () => {
    const appError = toAppError(httpError(423, ACCOUNT_LOCKED));

    expect(appError).toMatchObject({ status: 423, code: 'ACCOUNT_LOCKED' });
    expect(getAuthErrorDetails(appError).retryAfterSec).toBe(900);
    expect(getAuthErrorMessage(appError)).toContain('15');
  });

  it('treats TOO_MANY_ATTEMPTS (429) as a dead code that needs a new one', () => {
    expect(isDeadCodeError(httpError(429, TOO_MANY_ATTEMPTS))).toBe(true);
  });

  it('reads the wait of AI_RATE_LIMITED (429) from details.retryAfterSec', () => {
    const info = describeAiError(httpError(429, AI_RATE_LIMITED));

    expect(info).toMatchObject({ retryAfterSec: 1800, isTemporary: true, isUnauthorized: false });
  });
});

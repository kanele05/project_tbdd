import { AppError } from '@/lib/appError';

import {
  applyAuthError,
  getAuthErrorDetails,
  getAuthErrorMessage,
  isDeadCodeError,
} from './authErrors';

type Values = { email: string; password: string };
const FIELDS = ['email', 'password'] as const;

describe('applyAuthError', () => {
  it('puts the server field errors ({ source, field, message }) under their inputs', () => {
    const setError = jest.fn();
    const error = new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      details: [{ source: 'body', field: 'password', message: 'Password is too long' }],
    });

    const formMessage = applyAuthError<Values>(error, setError, FIELDS);

    expect(formMessage).toBeNull();
    expect(setError).toHaveBeenCalledWith('password', {
      type: 'server',
      message: 'Password is too long',
    });
  });

  it('returns a form-level message when no field matches', () => {
    const setError = jest.fn();
    const error = new AppError({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Wrong email or password',
    });

    expect(applyAuthError<Values>(error, setError, FIELDS)).toEqual(expect.any(String));
    expect(setError).not.toHaveBeenCalled();
  });
});

describe('getAuthErrorDetails', () => {
  it('reads the numbers and flags the server puts in details', () => {
    const error = new AppError({
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'x',
      details: {
        email: 'a@b.co',
        resendAfter: 42,
        retryAfterSec: 9,
        attemptsLeft: 2,
        captchaRequired: true,
      },
    });
    expect(getAuthErrorDetails(error)).toEqual({
      email: 'a@b.co',
      resendAfter: 42,
      retryAfterSec: 9,
      attemptsLeft: 2,
      captchaRequired: true,
    });
  });

  it('ignores details of the wrong shape', () => {
    const error = new AppError({ status: 400, code: 'X', message: 'x', details: [1, 2] });
    expect(getAuthErrorDetails(error)).toEqual({
      captchaRequired: undefined,
      retryAfterSec: undefined,
      attemptsLeft: undefined,
      email: undefined,
      resendAfter: undefined,
    });
  });
});

describe('getAuthErrorMessage', () => {
  const make = (code: string, details?: unknown) =>
    new AppError({ status: 400, code, message: 'server text', details });

  it('fills in the tries left, the lock time and the resend wait', () => {
    expect(getAuthErrorMessage(make('INVALID_CODE', { attemptsLeft: 3 }))).toBe(
      'That code is incorrect. Attempts left: 3.',
    );
    expect(getAuthErrorMessage(make('ACCOUNT_LOCKED', { retryAfterSec: 890 }))).toBe(
      'Too many failed attempts. Try again in 15 min.',
    );
    expect(getAuthErrorMessage(make('RESEND_TOO_SOON', { retryAfterSec: 30 }))).toBe(
      'Please wait 30 s before requesting another code.',
    );
  });

  it('falls back to the plain mapping without numbers', () => {
    expect(getAuthErrorMessage(make('INVALID_CODE'))).toBe('That code is incorrect.');
    expect(getAuthErrorMessage(make('CODE_EXPIRED'))).toBe(
      'This code has expired. Request a new one.',
    );
  });
});

describe('isDeadCodeError', () => {
  it('is true when a new code is needed', () => {
    expect(isDeadCodeError(new AppError({ status: 400, code: 'CODE_EXPIRED', message: '' }))).toBe(
      true,
    );
    expect(
      isDeadCodeError(new AppError({ status: 429, code: 'TOO_MANY_ATTEMPTS', message: '' })),
    ).toBe(true);
    expect(isDeadCodeError(new AppError({ status: 400, code: 'INVALID_CODE', message: '' }))).toBe(
      false,
    );
  });
});

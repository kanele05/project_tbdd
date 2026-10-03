import { AppError } from '@/lib/appError';

import { applyAuthError } from './authErrors';

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

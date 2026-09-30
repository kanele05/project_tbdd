import { AppError, getErrorMessage, getFieldErrors, toAppError } from './appError';

describe('toAppError', () => {
  it('returns AppError instances unchanged', () => {
    const original = new AppError({ status: 404, code: 'COURSE_NOT_FOUND', message: 'x' });
    expect(toAppError(original)).toBe(original);
  });

  it('wraps plain errors and unknown values', () => {
    expect(toAppError(new Error('boom'))).toMatchObject({ code: 'UNKNOWN', message: 'boom' });
    expect(toAppError('weird')).toMatchObject({ code: 'UNKNOWN' });
  });
});

describe('getErrorMessage', () => {
  it('prefers the mapped friendly message', () => {
    const error = new AppError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'raw' });
    expect(getErrorMessage(error)).toBe('Incorrect email or password.');
  });

  it('falls back to the server message for unmapped codes', () => {
    const error = new AppError({ status: 422, code: 'SOMETHING_NEW', message: 'Custom message' });
    expect(getErrorMessage(error)).toBe('Custom message');
  });
});

describe('getFieldErrors', () => {
  it('reads an object of field -> message', () => {
    const error = new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      details: { email: 'Invalid email', password: ['Too short'] },
    });
    expect(getFieldErrors(error)).toEqual({ email: 'Invalid email', password: 'Too short' });
  });

  it('reads an array of { path, message } issues', () => {
    const error = new AppError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      details: [
        { path: ['fullName'], message: 'Too short' },
        { path: 'email', message: 'Bad' },
      ],
    });
    expect(getFieldErrors(error)).toEqual({ fullName: 'Too short', email: 'Bad' });
  });

  it('returns an empty object without details', () => {
    expect(getFieldErrors(new Error('x'))).toEqual({});
  });
});

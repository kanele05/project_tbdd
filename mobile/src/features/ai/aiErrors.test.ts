import { act } from '@testing-library/react-native';

import { i18n } from '@/i18n';
import { AppError } from '@/lib/appError';

import { describeAiError, getRetryAfterSec } from './aiErrors';

describe('getRetryAfterSec', () => {
  it('reads details.retryAfterSec, rounded up and capped', () => {
    expect(getRetryAfterSec({ retryAfterSec: 42 })).toBe(42);
    expect(getRetryAfterSec({ retryAfterSec: 1.2 })).toBe(2);
    expect(getRetryAfterSec({ retryAfterSec: 999999 })).toBe(3600);
  });

  it('ignores anything that is not a positive number', () => {
    expect(getRetryAfterSec(undefined)).toBeNull();
    expect(getRetryAfterSec(null)).toBeNull();
    expect(getRetryAfterSec('42')).toBeNull();
    expect(getRetryAfterSec({})).toBeNull();
    expect(getRetryAfterSec({ retryAfterSec: 0 })).toBeNull();
    expect(getRetryAfterSec({ retryAfterSec: -3 })).toBeNull();
    expect(getRetryAfterSec({ retryAfterSec: Number.NaN })).toBeNull();
  });
});

describe('describeAiError', () => {
  it('explains a rate limit and exposes the wait time', () => {
    const info = describeAiError(
      new AppError({
        status: 429,
        code: 'AI_RATE_LIMITED',
        message: 'x',
        details: { retryAfterSec: 30 },
      }),
    );
    expect(info).toMatchObject({ retryAfterSec: 30, isTemporary: true, isNotEnrolled: false });
    expect(info.message).toMatch(/busy|overloaded|wait/i);
  });

  it('marks 503 AI_UNAVAILABLE as temporary without a wait time', () => {
    const info = describeAiError(
      new AppError({ status: 503, code: 'AI_UNAVAILABLE', message: 'x' }),
    );
    expect(info).toMatchObject({ retryAfterSec: null, isTemporary: true });
  });

  it('recognizes a missing enrollment', () => {
    const info = describeAiError(new AppError({ status: 403, code: 'NOT_ENROLLED', message: 'x' }));
    expect(info.isNotEnrolled).toBe(true);
    expect(info.isTemporary).toBe(false);
  });

  it('recognizes a cancelled request and an ended session', () => {
    expect(
      describeAiError(new AppError({ status: 0, code: 'CANCELED', message: '' })).isCanceled,
    ).toBe(true);
    expect(
      describeAiError(new AppError({ status: 401, code: 'UNAUTHORIZED', message: '' }))
        .isUnauthorized,
    ).toBe(true);
  });

  it('describes a dropped stream in the current language', async () => {
    const dropped = new AppError({ status: 0, code: 'AI_STREAM_INTERRUPTED', message: '' });
    expect(describeAiError(dropped).message).toMatch(/cut off/i);

    await act(async () => {
      await i18n.changeLanguage('vi');
    });
    expect(describeAiError(dropped).message).toMatch(/ngắt/);
  });

  it('only gives retryAfterSec for AI_RATE_LIMITED', () => {
    const info = describeAiError(
      new AppError({
        status: 503,
        code: 'AI_UNAVAILABLE',
        message: '',
        details: { retryAfterSec: 5 },
      }),
    );
    expect(info.retryAfterSec).toBeNull();
  });
});

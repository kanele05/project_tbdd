import { ApiError } from '@/lib/ApiError';

import {
  AiProviderError,
  describeAiError,
  describeAnyError,
  rethrowAsApiError,
  toApiError,
} from './errors';

describe('toApiError (AI failure -> HTTP)', () => {
  it.each([
    ['rate_limited', 429, 'AI_RATE_LIMITED'],
    ['blocked', 422, 'AI_BLOCKED'],
    ['unavailable', 503, 'AI_UNAVAILABLE'],
    ['timeout', 503, 'AI_UNAVAILABLE'],
    ['bad_output', 503, 'AI_UNAVAILABLE'],
  ] as const)('maps %s to %i %s', (kind, status, code) => {
    const mapped = toApiError(new AiProviderError(kind, 'internal detail'));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped.status).toBe(status);
    expect(mapped.code).toBe(code);
  });

  it('never leaks the internal message (key, model, upstream status)', () => {
    const mapped = toApiError(
      new AiProviderError('unavailable', 'GEMINI_API_KEY is not configured'),
    );
    expect(mapped.message).not.toContain('GEMINI');
  });

  it('includes retryAfterSec for rate limits', () => {
    const mapped = toApiError(new AiProviderError('rate_limited', 'x', { retryAfterSec: 90 }));
    expect(mapped.details).toEqual({ retryAfterSec: 90 });
  });
});

describe('rethrowAsApiError', () => {
  it('turns an AiProviderError into an ApiError', () => {
    expect(() => rethrowAsApiError(new AiProviderError('blocked', 'x'))).toThrow(ApiError);
  });

  it('rethrows any other error untouched', () => {
    const original = new Error('db down');
    expect(() => rethrowAsApiError(original)).toThrow(original);
  });
});

describe('describeAnyError (SSE error event payload)', () => {
  it('describes AI failures', () => {
    expect(describeAnyError(new AiProviderError('rate_limited', 'x')).code).toBe('AI_RATE_LIMITED');
  });

  it('keeps the code of an ApiError', () => {
    expect(describeAnyError(ApiError.of('NOT_ENROLLED', 'nope')).code).toBe('NOT_ENROLLED');
  });

  it('hides unexpected errors behind INTERNAL_ERROR', () => {
    const info = describeAnyError(new Error('secret stack info'));
    expect(info).toEqual({ status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  it('describeAiError has a user-facing message for every kind', () => {
    for (const kind of [
      'rate_limited',
      'blocked',
      'unavailable',
      'timeout',
      'bad_output',
    ] as const) {
      expect(describeAiError(new AiProviderError(kind, 'x')).message.length).toBeGreaterThan(10);
    }
  });
});

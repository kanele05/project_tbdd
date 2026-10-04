import { AiProviderError } from './errors';
import { AI_QUOTA_WINDOW_MS, AiQuota } from './quota';

function makeQuota(overrides: { enabled?: boolean } = {}) {
  let now = 1_000_000;
  const quota = new AiQuota({
    limits: { chat: 2, general: 3 },
    now: () => now,
    ...overrides,
  });
  return {
    quota,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function captureError(fn: () => void): AiProviderError {
  try {
    fn();
  } catch (err) {
    return err as AiProviderError;
  }
  throw new Error('expected the call to throw');
}

describe('AiQuota', () => {
  it('allows up to the limit and then throws rate_limited with retryAfterSec', () => {
    const { quota, advance } = makeQuota();
    quota.consume('chat', 'u1');
    quota.consume('chat', 'u1');
    advance(10 * 60 * 1000);

    const err = captureError(() => quota.consume('chat', 'u1'));

    expect(err).toBeInstanceOf(AiProviderError);
    expect(err.kind).toBe('rate_limited');
    expect(err.retryAfterSec).toBe(50 * 60);
  });

  it('keeps separate counters per user and per bucket', () => {
    const { quota } = makeQuota();
    quota.consume('chat', 'u1');
    quota.consume('chat', 'u1');
    expect(() => quota.consume('chat', 'u2')).not.toThrow();
    expect(() => quota.consume('general', 'u1')).not.toThrow();
  });

  it('opens a new window after windowMs', () => {
    const { quota, advance } = makeQuota();
    quota.consume('chat', 'u1');
    quota.consume('chat', 'u1');
    advance(AI_QUOTA_WINDOW_MS);
    expect(() => quota.consume('chat', 'u1')).not.toThrow();
  });

  it('gives the slot back when the returned refund function is called', () => {
    const { quota } = makeQuota();
    quota.consume('chat', 'u1');
    const refund = quota.consume('chat', 'u1');
    refund();
    expect(() => quota.consume('chat', 'u1')).not.toThrow();
    expect(() => quota.consume('chat', 'u1')).toThrow(AiProviderError);
  });

  it('purges expired entries when many users have been seen', () => {
    const { quota, advance } = makeQuota();
    for (let i = 0; i < 5_000; i += 1) quota.consume('general', `user-${i}`);
    advance(AI_QUOTA_WINDOW_MS + 1);
    // lần gọi kế tiếp dọn mọi bộ đếm cũ và bắt đầu cửa sổ mới cho user bất kỳ
    quota.consume('general', 'user-0');
    quota.consume('general', 'user-0');
    quota.consume('general', 'user-0');
    expect(() => quota.consume('general', 'user-0')).toThrow(AiProviderError);
    expect((quota as unknown as { entries: Map<string, unknown> }).entries.size).toBe(1);
  });

  it('does nothing when disabled (tests) and can be re-enabled at runtime', () => {
    const { quota } = makeQuota({ enabled: false });
    for (let i = 0; i < 10; i += 1) quota.consume('chat', 'u1');
    quota.configure({ enabled: true, limits: { chat: 1 } });
    quota.consume('chat', 'u1');
    expect(() => quota.consume('chat', 'u1')).toThrow(AiProviderError);
    quota.reset();
    expect(() => quota.consume('chat', 'u1')).not.toThrow();
  });
});

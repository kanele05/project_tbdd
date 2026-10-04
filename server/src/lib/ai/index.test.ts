import type * as AiModule from './index';

type EnvValues = {
  AI_PROVIDER?: 'gemini' | 'mock';
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  AI_TIMEOUT_MS: number;
  AI_CHAT_LIMIT_PER_HOUR: number;
  AI_LIMIT_PER_HOUR: number;
  AI_USER_LIMIT_PER_DAY: number;
  AI_GLOBAL_LIMIT_PER_DAY: number;
};

const baseEnv: EnvValues = {
  GEMINI_MODEL: 'gemini-test-model',
  AI_TIMEOUT_MS: 5_000,
  AI_CHAT_LIMIT_PER_HOUR: 2,
  AI_LIMIT_PER_HOUR: 3,
  AI_USER_LIMIT_PER_DAY: 4,
  AI_GLOBAL_LIMIT_PER_DAY: 5,
};

type Flags = { isProduction?: boolean; isTest?: boolean };

/** Nạp `./index` với env giả (các hằng quota được tạo ngay lúc import nên cần module mới cho mỗi kịch bản). */
function loadIndex(env: Partial<EnvValues> = {}, flags: Flags = {}) {
  const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };
  let loaded: typeof AiModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('@/config/env', () => ({
      env: { ...baseEnv, ...env },
      isProduction: flags.isProduction ?? false,
      isTest: flags.isTest ?? false,
    }));
    jest.doMock('@/lib/logger', () => ({ logger }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('./index') as typeof AiModule;
  });
  if (!loaded) throw new Error('index not loaded');
  return { ai: loaded, logger };
}

afterEach(() => {
  jest.dontMock('@/config/env');
  jest.dontMock('@/lib/logger');
});

describe('resolveProviderName', () => {
  it('prefers AI_PROVIDER when it is set', () => {
    expect(loadIndex({ AI_PROVIDER: 'mock', GEMINI_API_KEY: 'k' }).ai.resolveProviderName()).toBe(
      'mock',
    );
    expect(loadIndex({ AI_PROVIDER: 'gemini' }).ai.resolveProviderName()).toBe('gemini');
  });

  it('uses gemini when only a key is present, mock otherwise', () => {
    expect(loadIndex({ GEMINI_API_KEY: 'k' }).ai.resolveProviderName()).toBe('gemini');
    expect(loadIndex().ai.resolveProviderName()).toBe('mock');
  });
});

describe('createAiProvider / getAiProvider', () => {
  it('creates the gemini provider with the configured model', () => {
    const { ai, logger } = loadIndex({ GEMINI_API_KEY: 'k' });
    const provider = ai.createAiProvider();
    expect(provider.name).toBe('gemini');
    expect(provider.model).toBe('gemini-test-model');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns when gemini is forced without an API key', () => {
    const { ai, logger } = loadIndex({ AI_PROVIDER: 'gemini' });
    expect(ai.createAiProvider().name).toBe('gemini');
    expect(logger.warn).toHaveBeenCalledWith('AI_PROVIDER=gemini but GEMINI_API_KEY is empty');
  });

  it('creates the mock provider and warns about it only in production', () => {
    const dev = loadIndex();
    expect(dev.ai.createAiProvider().name).toBe('mock');
    expect(dev.logger.warn).not.toHaveBeenCalled();

    const prod = loadIndex({}, { isProduction: true });
    expect(prod.ai.createAiProvider().name).toBe('mock');
    expect(prod.logger.warn).toHaveBeenCalledTimes(1);

    expect(loadIndex({}, { isTest: true }).ai.createAiProvider().name).toBe('mock');
  });

  it('creates the provider once and can be replaced in tests', () => {
    const { ai, logger } = loadIndex();
    const first = ai.getAiProvider();
    expect(ai.getAiProvider()).toBe(first);
    expect(logger.info).toHaveBeenCalledTimes(1);

    const fake = { ...first, name: 'mock' as const, model: 'fake' };
    ai.setAiProviderForTests(fake);
    expect(ai.getAiProvider()).toBe(fake);

    ai.setAiProviderForTests(undefined);
    expect(ai.getAiProvider()).not.toBe(fake);
  });
});

describe('consumeAiBudget', () => {
  it('does nothing while the quotas are disabled (NODE_ENV=test)', () => {
    const { ai } = loadIndex({ AI_CHAT_LIMIT_PER_HOUR: 1 }, { isTest: true });
    for (let i = 0; i < 20; i += 1) ai.consumeAiBudget('chat', 'u1')();
  });

  it('limits chat and general requests per hour separately', () => {
    const { ai } = loadIndex({ AI_USER_LIMIT_PER_DAY: 100 });
    ai.consumeAiBudget('chat', 'u1');
    ai.consumeAiBudget('chat', 'u1');
    expect(() => ai.consumeAiBudget('chat', 'u1')).toThrow(ai.AiProviderError);

    // chat đã hết nhưng bucket general (tóm tắt, quiz...) vẫn còn lượt
    ai.consumeAiBudget('general', 'u1');
    // user khác không bị ảnh hưởng
    ai.consumeAiBudget('chat', 'u2');
  });

  it('caps the total AI requests of one user per day across both buckets', () => {
    const { ai } = loadIndex({
      AI_CHAT_LIMIT_PER_HOUR: 10,
      AI_LIMIT_PER_HOUR: 10,
      AI_USER_LIMIT_PER_DAY: 3,
    });
    ai.consumeAiBudget('chat', 'u1');
    ai.consumeAiBudget('general', 'u1');
    ai.consumeAiBudget('chat', 'u1');
    expect(() => ai.consumeAiBudget('general', 'u1')).toThrow(
      expect.objectContaining({ kind: 'rate_limited' }),
    );
    ai.consumeAiBudget('chat', 'u2');
  });

  it('caps the whole server per day when the provider is gemini', () => {
    const { ai } = loadIndex({
      GEMINI_API_KEY: 'k',
      AI_CHAT_LIMIT_PER_HOUR: 10,
      AI_LIMIT_PER_HOUR: 10,
      AI_USER_LIMIT_PER_DAY: 10,
      AI_GLOBAL_LIMIT_PER_DAY: 2,
    });
    ai.consumeAiBudget('chat', 'u1');
    ai.consumeAiBudget('general', 'u2');
    expect(() => ai.consumeAiBudget('chat', 'u3')).toThrow(
      expect.objectContaining({ kind: 'rate_limited' }),
    );
  });

  it('does not apply the global cap to the free mock provider', () => {
    const { ai } = loadIndex({
      AI_CHAT_LIMIT_PER_HOUR: 10,
      AI_LIMIT_PER_HOUR: 10,
      AI_USER_LIMIT_PER_DAY: 10,
      AI_GLOBAL_LIMIT_PER_DAY: 1,
    });
    ai.consumeAiBudget('chat', 'u1');
    ai.consumeAiBudget('chat', 'u2');
  });

  it('gives back the earlier tiers when a later tier rejects the request', () => {
    const { ai } = loadIndex({
      GEMINI_API_KEY: 'k',
      AI_CHAT_LIMIT_PER_HOUR: 1,
      AI_LIMIT_PER_HOUR: 10,
      AI_USER_LIMIT_PER_DAY: 10,
      AI_GLOBAL_LIMIT_PER_DAY: 1,
    });
    ai.consumeAiBudget('general', 'u1'); // dùng hết lượt toàn server
    // u2 qua tầng giờ rồi bị chặn ở tầng server -> lượt giờ của u2 phải được hoàn lại
    expect(() => ai.consumeAiBudget('chat', 'u2')).toThrow(ai.AiProviderError);
    ai.aiGlobalQuota.configure({ limits: { general: 5 } });
    expect(() => ai.consumeAiBudget('chat', 'u2')).not.toThrow();
  });

  it('returns a function that refunds the request on every tier', () => {
    const { ai } = loadIndex({
      GEMINI_API_KEY: 'k',
      AI_CHAT_LIMIT_PER_HOUR: 1,
      AI_USER_LIMIT_PER_DAY: 1,
      AI_GLOBAL_LIMIT_PER_DAY: 1,
    });
    const refund = ai.consumeAiBudget('chat', 'u1');
    expect(() => ai.consumeAiBudget('chat', 'u1')).toThrow(ai.AiProviderError);
    refund();
    expect(() => ai.consumeAiBudget('chat', 'u1')).not.toThrow();
  });
});

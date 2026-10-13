import { z } from 'zod';

import { AiProviderError } from './errors';
import {
  assertNotBlocked,
  buildContents,
  type GeminiClient,
  GeminiProvider,
  type GeminiResponseLike,
  mapGeminiError,
  readUsage,
} from './gemini.provider';

const idle = { timedOut: false, userAborted: false };

/** Response giả của SDK (chỉ các trường provider đọc). */
function response(text: string | undefined, extra: Record<string, unknown> = {}) {
  return {
    text,
    candidates: [{ finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    ...extra,
  } as unknown as GeminiResponseLike;
}

function makeClient(models: { generateContent?: jest.Mock; generateContentStream?: jest.Mock }) {
  return {
    models: {
      generateContent: models.generateContent ?? jest.fn(),
      generateContentStream: models.generateContentStream ?? jest.fn(),
    },
  } as unknown as GeminiClient;
}

function makeProvider(client?: GeminiClient, overrides: { timeoutMs?: number } = {}) {
  return new GeminiProvider({
    apiKey: 'test-key-not-real',
    model: 'gemini-test-model',
    timeoutMs: overrides.timeoutMs ?? 5_000,
    client,
  });
}

function httpError(status: number): Error & { status: number } {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

async function collect(stream: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of stream) out.push(chunk);
  return out;
}

describe('buildContents', () => {
  it('maps assistant to model and appends the prompt as the last user turn', () => {
    const contents = buildContents(
      [
        { role: 'user', text: 'Q1' },
        { role: 'assistant', text: 'A1' },
      ],
      'Q2',
    );
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'Q1' }] },
      { role: 'model', parts: [{ text: 'A1' }] },
      { role: 'user', parts: [{ text: 'Q2' }] },
    ]);
  });

  it('merges consecutive turns of the same role and skips empty ones', () => {
    const contents = buildContents(
      [
        { role: 'user', text: 'dangling question' },
        { role: 'user', text: '   ' },
      ],
      'next',
    );
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'dangling question' }, { text: 'next' }] },
    ]);
  });

  it('never starts with a model turn', () => {
    const contents = buildContents([{ role: 'assistant', text: 'orphan' }], 'hi');
    expect(contents).toEqual([{ role: 'user', parts: [{ text: 'hi' }] }]);
  });
});

describe('mapGeminiError', () => {
  it('maps HTTP 429 to rate_limited', () => {
    expect(mapGeminiError(httpError(429), idle).kind).toBe('rate_limited');
  });

  it.each([400, 401, 403, 404, 500, 503])('maps HTTP %i to unavailable', (status) => {
    expect(mapGeminiError(httpError(status), idle).kind).toBe('unavailable');
  });

  it('maps network errors without a status to unavailable', () => {
    expect(mapGeminiError(new TypeError('fetch failed'), idle).kind).toBe('unavailable');
  });

  it('prefers timeout / aborted over the raw error', () => {
    expect(mapGeminiError(new Error('x'), { timedOut: true, userAborted: false }).kind).toBe(
      'timeout',
    );
    expect(mapGeminiError(new Error('x'), { timedOut: false, userAborted: true }).kind).toBe(
      'aborted',
    );
  });

  it('keeps an AiProviderError as-is', () => {
    const original = new AiProviderError('blocked', 'x');
    expect(mapGeminiError(original, idle)).toBe(original);
  });
});

describe('assertNotBlocked / readUsage', () => {
  it('passes a normal response', () => {
    expect(() => assertNotBlocked(response('ok'))).not.toThrow();
  });

  it('throws blocked when the prompt was blocked', () => {
    const blocked = response(undefined, {
      promptFeedback: { blockReason: 'SAFETY' },
      candidates: [],
    });
    expect(() => assertNotBlocked(blocked)).toThrow(expect.objectContaining({ kind: 'blocked' }));
  });

  it.each(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'RECITATION'])(
    'throws blocked for finishReason %s',
    (finishReason) => {
      const cut = response('partial', { candidates: [{ finishReason }] });
      expect(() => assertNotBlocked(cut)).toThrow(expect.objectContaining({ kind: 'blocked' }));
    },
  );

  it('ignores an unspecified block reason', () => {
    const r = response('ok', { promptFeedback: { blockReason: 'BLOCKED_REASON_UNSPECIFIED' } });
    expect(() => assertNotBlocked(r)).not.toThrow();
  });

  it('reads token usage', () => {
    expect(readUsage(response('x'))).toEqual({
      promptTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
    expect(readUsage(response('x', { usageMetadata: undefined }))).toBeUndefined();
  });
});

describe('GeminiProvider.generateText', () => {
  it('sends model, system instruction, contents and an abort signal; returns text + usage', async () => {
    const generateContent = jest.fn().mockResolvedValue(response('Hello!'));
    const provider = makeProvider(makeClient({ generateContent }));

    const result = await provider.generateText({
      label: 'test',
      system: 'You are a tutor',
      history: [{ role: 'user', text: 'earlier' }],
      prompt: 'now',
    });

    expect(result).toEqual({
      text: 'Hello!',
      model: 'gemini-test-model',
      usage: { promptTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
    const params = generateContent.mock.calls[0]?.[0];
    expect(params.model).toBe('gemini-test-model');
    expect(params.config.systemInstruction).toBe('You are a tutor');
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(params.contents).toEqual([
      { role: 'user', parts: [{ text: 'earlier' }, { text: 'now' }] },
    ]);
  });

  it('turns an upstream 429 into rate_limited', async () => {
    const generateContent = jest.fn().mockRejectedValue(httpError(429));
    const provider = makeProvider(makeClient({ generateContent }));
    await expect(provider.generateText({ label: 't', prompt: 'p' })).rejects.toMatchObject({
      kind: 'rate_limited',
    });
  });

  it('turns a safety block into blocked', async () => {
    const generateContent = jest
      .fn()
      .mockResolvedValue(response(undefined, { promptFeedback: { blockReason: 'SAFETY' } }));
    const provider = makeProvider(makeClient({ generateContent }));
    await expect(provider.generateText({ label: 't', prompt: 'p' })).rejects.toMatchObject({
      kind: 'blocked',
    });
  });

  it('treats an empty answer as bad_output', async () => {
    const generateContent = jest.fn().mockResolvedValue(response('   '));
    const provider = makeProvider(makeClient({ generateContent }));
    await expect(provider.generateText({ label: 't', prompt: 'p' })).rejects.toMatchObject({
      kind: 'bad_output',
    });
  });

  it('is unavailable (no network call) when the API key is missing', async () => {
    const provider = new GeminiProvider({ model: 'm', timeoutMs: 1000 });
    await expect(provider.generateText({ label: 't', prompt: 'p' })).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it('times out when the upstream never answers', async () => {
    const generateContent = jest.fn(
      (params: { config: { abortSignal: AbortSignal } }) =>
        new Promise((_resolve, reject) => {
          params.config.abortSignal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const provider = makeProvider(makeClient({ generateContent }), { timeoutMs: 30 });
    await expect(provider.generateText({ label: 't', prompt: 'p' })).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('reports aborted when the caller cancels', async () => {
    const controller = new AbortController();
    const generateContent = jest.fn(
      (params: { config: { abortSignal: AbortSignal } }) =>
        new Promise((_resolve, reject) => {
          params.config.abortSignal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const provider = makeProvider(makeClient({ generateContent }));
    const pending = provider.generateText({ label: 't', prompt: 'p', signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });
});

describe('GeminiProvider.generateJson', () => {
  const schema = z.object({ title: z.string().min(1), score: z.number().int().min(0).max(5) });

  it('requests application/json with a pruned JSON schema and returns validated data', async () => {
    const generateContent = jest.fn().mockResolvedValue(response('{"title":"Hi","score":4}'));
    const provider = makeProvider(makeClient({ generateContent }));

    const result = await provider.generateJson({ label: 'j', prompt: 'p', schema });

    expect(result.data).toEqual({ title: 'Hi', score: 4 });
    const config = generateContent.mock.calls[0]?.[0].config;
    expect(config.responseMimeType).toBe('application/json');
    expect(config.responseJsonSchema).toMatchObject({
      type: 'object',
      required: ['title', 'score'],
      properties: { score: { type: 'integer', minimum: 0, maximum: 5 } },
    });
    expect(config.responseJsonSchema.$schema).toBeUndefined();
  });

  it('retries once when the first answer does not match the schema', async () => {
    const generateContent = jest
      .fn()
      .mockResolvedValueOnce(response('{"title":"","score":9}'))
      .mockResolvedValueOnce(response('{"title":"Fixed","score":1}'));
    const provider = makeProvider(makeClient({ generateContent }));

    const result = await provider.generateJson({ label: 'j', prompt: 'p', schema });

    expect(result.data.title).toBe('Fixed');
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('gives up with bad_output after the second invalid answer', async () => {
    const generateContent = jest.fn().mockResolvedValue(response('not json'));
    const provider = makeProvider(makeClient({ generateContent }));
    await expect(provider.generateJson({ label: 'j', prompt: 'p', schema })).rejects.toMatchObject({
      kind: 'bad_output',
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('does not retry on rate limits (would burn more free-tier quota)', async () => {
    const generateContent = jest.fn().mockRejectedValue(httpError(429));
    const provider = makeProvider(makeClient({ generateContent }));
    await expect(provider.generateJson({ label: 'j', prompt: 'p', schema })).rejects.toMatchObject({
      kind: 'rate_limited',
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});

describe('GeminiProvider.streamText', () => {
  it('yields text chunks in order and skips empty ones', async () => {
    async function* chunks() {
      yield response('Hel');
      yield response('');
      yield response('lo');
    }
    const generateContentStream = jest.fn().mockResolvedValue(chunks());
    const provider = makeProvider(makeClient({ generateContentStream }));

    expect(await collect(provider.streamText({ label: 's', prompt: 'p' }))).toEqual(['Hel', 'lo']);
  });

  it('throws on the first next() when opening the stream fails with 429', async () => {
    const generateContentStream = jest.fn().mockRejectedValue(httpError(429));
    const provider = makeProvider(makeClient({ generateContentStream }));
    await expect(collect(provider.streamText({ label: 's', prompt: 'p' }))).rejects.toMatchObject({
      kind: 'rate_limited',
    });
  });

  it('propagates a mid-stream failure after some text was already delivered', async () => {
    async function* chunks() {
      yield response('partial');
      throw httpError(503);
    }
    const generateContentStream = jest.fn().mockResolvedValue(chunks());
    const provider = makeProvider(makeClient({ generateContentStream }));
    const received: string[] = [];
    await expect(
      (async () => {
        for await (const chunk of provider.streamText({ label: 's', prompt: 'p' }))
          received.push(chunk);
      })(),
    ).rejects.toMatchObject({ kind: 'unavailable' });
    expect(received).toEqual(['partial']);
  });

  it('flags safety blocks in the stream', async () => {
    async function* chunks() {
      yield response('x', { candidates: [{ finishReason: 'SAFETY' }] });
    }
    const generateContentStream = jest.fn().mockResolvedValue(chunks());
    const provider = makeProvider(makeClient({ generateContentStream }));
    await expect(collect(provider.streamText({ label: 's', prompt: 'p' }))).rejects.toMatchObject({
      kind: 'blocked',
    });
  });

  it('treats a stream with no text as bad_output', async () => {
    async function* chunks() {
      yield response('');
    }
    const generateContentStream = jest.fn().mockResolvedValue(chunks());
    const provider = makeProvider(makeClient({ generateContentStream }));
    await expect(collect(provider.streamText({ label: 's', prompt: 'p' }))).rejects.toMatchObject({
      kind: 'bad_output',
    });
  });
});

describe('GeminiProvider fallback model', () => {
  function fallbackProvider(client: GeminiClient, timeoutMs = 5_000) {
    return new GeminiProvider({
      apiKey: 'test-key-not-real',
      model: 'primary-model',
      fallbackModel: 'backup-model',
      timeoutMs,
      client,
    });
  }

  it('answers with the fallback model when the primary one is overloaded', async () => {
    const generateContent = jest
      .fn()
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce(response('From backup'));
    const result = await fallbackProvider(makeClient({ generateContent })).generateText({
      label: 't',
      prompt: 'p',
    });

    expect(result).toMatchObject({ text: 'From backup', model: 'backup-model' });
    expect(generateContent.mock.calls.map(([params]) => params.model)).toEqual([
      'primary-model',
      'backup-model',
    ]);
  });

  it('gives each model half of the timeout when the primary one hangs', async () => {
    const generateContent = jest.fn(
      (params: { model: string; config: { abortSignal: AbortSignal } }) =>
        params.model === 'primary-model'
          ? new Promise((_resolve, reject) => {
              params.config.abortSignal.addEventListener('abort', () =>
                reject(new Error('aborted')),
              );
            })
          : Promise.resolve(response('Late but fine')),
    );
    const startedAt = Date.now();
    const result = await fallbackProvider(makeClient({ generateContent }), 200).generateText({
      label: 't',
      prompt: 'p',
    });

    expect(result.model).toBe('backup-model');
    expect(Date.now() - startedAt).toBeLessThan(190);
  });

  it('keeps the JSON result model in sync with the model that answered', async () => {
    const generateContent = jest
      .fn()
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValueOnce(response('{"title":"ok"}'));
    const result = await fallbackProvider(makeClient({ generateContent })).generateJson({
      label: 'j',
      prompt: 'p',
      schema: z.object({ title: z.string() }),
      mock: () => ({ title: 'mock' }),
    });
    expect(result).toMatchObject({ data: { title: 'ok' }, model: 'backup-model' });
  });

  it('does not switch models for content problems', async () => {
    const generateContent = jest
      .fn()
      .mockResolvedValue(response(undefined, { promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(
      fallbackProvider(makeClient({ generateContent })).generateText({ label: 't', prompt: 'p' }),
    ).rejects.toMatchObject({ kind: 'blocked' });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('throws the last error when both models fail', async () => {
    const generateContent = jest.fn().mockRejectedValue(httpError(503));
    await expect(
      fallbackProvider(makeClient({ generateContent })).generateText({ label: 't', prompt: 'p' }),
    ).rejects.toMatchObject({ kind: 'unavailable' });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('streams from the fallback model when the primary one fails before any text', async () => {
    async function* chunks() {
      yield response('Backup ');
      yield response('stream');
    }
    const generateContentStream = jest
      .fn()
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce(chunks());
    const provider = fallbackProvider(makeClient({ generateContentStream }));

    expect(await collect(provider.streamText({ label: 's', prompt: 'p' }))).toEqual([
      'Backup ',
      'stream',
    ]);
    expect(generateContentStream.mock.calls[1]?.[0].model).toBe('backup-model');
  });

  it('never switches models in the middle of a stream', async () => {
    async function* chunks() {
      yield response('partial');
      throw httpError(503);
    }
    const generateContentStream = jest.fn().mockResolvedValue(chunks());
    const provider = fallbackProvider(makeClient({ generateContentStream }));
    await expect(collect(provider.streamText({ label: 's', prompt: 'p' }))).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(generateContentStream).toHaveBeenCalledTimes(1);
  });
});

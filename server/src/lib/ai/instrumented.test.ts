import { z } from 'zod';

import { aiRequestDurationSeconds, aiRequestsTotal } from '@/lib/metrics';

import { AiProviderError } from './errors';
import { withMetrics } from './instrumented';
import type { AiProvider } from './types';

type FakeOptions = { error?: unknown; chunks?: string[] };

function fakeProvider({ error, chunks = ['a', 'b', 'c'] }: FakeOptions = {}): AiProvider {
  return {
    name: 'mock',
    model: 'mock-ai-1',
    generateText: async () => {
      if (error) throw error;
      return { text: 'hello', model: 'mock-ai-1' };
    },
    generateJson: async <T>() => {
      if (error) throw error;
      return { data: { ok: true } as T, model: 'mock-ai-1' };
    },
    streamText: async function* () {
      for (const chunk of chunks) yield chunk;
      if (error) throw error;
    },
  };
}

async function count(feature: string, status: string): Promise<number> {
  const metric = await aiRequestsTotal.get();
  const found = metric.values.find(
    (v) =>
      v.labels.feature === feature && v.labels.status === status && v.labels.provider === 'mock',
  );
  return found?.value ?? 0;
}

async function durationCount(feature: string): Promise<number> {
  const metric = await aiRequestDurationSeconds.get();
  const found = metric.values.find(
    (v) => v.metricName === 'ai_request_duration_seconds_count' && v.labels.feature === feature,
  );
  return found?.value ?? 0;
}

describe('withMetrics', () => {
  beforeEach(() => {
    aiRequestsTotal.reset();
    aiRequestDurationSeconds.reset();
  });

  it('keeps the provider name and model', () => {
    const wrapped = withMetrics(fakeProvider());
    expect(wrapped.name).toBe('mock');
    expect(wrapped.model).toBe('mock-ai-1');
  });

  it('counts successful text and JSON calls and records their duration', async () => {
    const wrapped = withMetrics(fakeProvider());

    await expect(wrapped.generateText({ label: 'course_summary', prompt: 'p' })).resolves.toEqual({
      text: 'hello',
      model: 'mock-ai-1',
    });
    await wrapped.generateJson({ label: 'lesson_quiz', prompt: 'p', schema: z.object({}) });

    expect(await count('course_summary', 'ok')).toBe(1);
    expect(await count('lesson_quiz', 'ok')).toBe(1);
    expect(await durationCount('course_summary')).toBe(1);
  });

  it('labels provider failures with their kind and rethrows them', async () => {
    const error = new AiProviderError('rate_limited', 'quota');
    const wrapped = withMetrics(fakeProvider({ error }));

    await expect(wrapped.generateText({ label: 'lesson_summary', prompt: 'p' })).rejects.toBe(
      error,
    );
    await expect(
      wrapped.generateJson({ label: 'recommendations', prompt: 'p', schema: z.object({}) }),
    ).rejects.toBe(error);

    expect(await count('lesson_summary', 'rate_limited')).toBe(1);
    expect(await count('recommendations', 'rate_limited')).toBe(1);
  });

  it('labels unknown errors as error', async () => {
    const wrapped = withMetrics(fakeProvider({ error: new Error('boom') }));
    await expect(wrapped.generateText({ label: 'course_summary', prompt: 'p' })).rejects.toThrow(
      'boom',
    );
    expect(await count('course_summary', 'error')).toBe(1);
  });

  it('measures a stream from the first chunk to the end', async () => {
    const wrapped = withMetrics(fakeProvider());
    const received: string[] = [];
    for await (const chunk of wrapped.streamText({ label: 'tutor_chat', prompt: 'p' })) {
      received.push(chunk);
    }
    expect(received).toEqual(['a', 'b', 'c']);
    expect(await count('tutor_chat', 'ok')).toBe(1);
    expect(await durationCount('tutor_chat')).toBe(1);
  });

  it('records a stream failure after partial output', async () => {
    const error = new AiProviderError('timeout', 'slow');
    const wrapped = withMetrics(fakeProvider({ error, chunks: ['a'] }));
    const consume = async () => {
      for await (const chunk of wrapped.streamText({ label: 'tutor_chat', prompt: 'p' })) {
        expect(chunk).toBe('a');
      }
    };
    await expect(consume()).rejects.toBe(error);
    expect(await count('tutor_chat', 'timeout')).toBe(1);
  });

  it('records aborted when the reader stops early', async () => {
    const wrapped = withMetrics(fakeProvider());
    for await (const chunk of wrapped.streamText({ label: 'tutor_chat', prompt: 'p' })) {
      expect(chunk).toBe('a');
      break;
    }
    expect(await count('tutor_chat', 'aborted')).toBe(1);
  });

  it('records nothing for a stream that is never read', async () => {
    const wrapped = withMetrics(fakeProvider());
    wrapped.streamText({ label: 'tutor_chat', prompt: 'p' });
    expect(await durationCount('tutor_chat')).toBe(0);
  });
});

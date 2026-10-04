import { z } from 'zod';

import { AiProviderError } from './errors';
import { MockProvider, splitIntoChunks } from './mock.provider';

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
}

describe('splitIntoChunks', () => {
  it('splits into ~2-word chunks that join back to the exact original text', () => {
    const text = '  Hello brave new world,\nthis is   a test. ';
    const chunks = splitIntoChunks(text);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.join('')).toBe(text);
  });

  it('returns no chunks for empty text', () => {
    expect(splitIntoChunks('')).toEqual([]);
  });
});

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('identifies itself as the mock provider', () => {
    expect(provider.name).toBe('mock');
    expect(provider.model).toBe('mock-ai-1');
  });

  it('generateText returns the sample text (deterministic)', async () => {
    const a = await provider.generateText({ label: 't', prompt: 'p', mock: () => 'Hello there' });
    const b = await provider.generateText({ label: 't', prompt: 'p', mock: () => 'Hello there' });
    expect(a).toEqual({ text: 'Hello there', model: 'mock-ai-1' });
    expect(b).toEqual(a);
  });

  it('streamText yields the text progressively', async () => {
    const chunks = await collect(
      provider.streamText({ label: 't', prompt: 'p', mock: () => 'one two three four five' }),
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe('one two three four five');
  });

  it('streamText stops with an aborted error when the signal fires', async () => {
    const controller = new AbortController();
    const stream = provider
      .streamText({
        label: 't',
        prompt: 'p',
        signal: controller.signal,
        mock: () => 'one two three four five six',
      })
      [Symbol.asyncIterator]();
    await stream.next();
    controller.abort();
    await expect(stream.next()).rejects.toMatchObject({ kind: 'aborted' });
  });

  describe('with a delay between chunks (demo mode)', () => {
    it('still yields the complete text', async () => {
      const slow = new MockProvider({ chunkDelayMs: 1 });
      const chunks = await collect(
        slow.streamText({ label: 't', prompt: 'p', mock: () => 'one two three four' }),
      );
      expect(chunks.join('')).toBe('one two three four');
    });

    it('stops with an aborted error when the client leaves while waiting for the next chunk', async () => {
      const slow = new MockProvider({ chunkDelayMs: 5_000 });
      const controller = new AbortController();
      const stream = slow
        .streamText({
          label: 't',
          prompt: 'p',
          signal: controller.signal,
          mock: () => 'one two three four',
        })
        [Symbol.asyncIterator]();
      const first = stream.next();
      setTimeout(() => controller.abort(), 10);
      await expect(first).rejects.toMatchObject({ kind: 'aborted' });
    });
  });

  describe('generateJson', () => {
    const schema = z.object({ title: z.string().min(1), count: z.number().int() });

    it('returns the validated sample', async () => {
      const result = await provider.generateJson({
        label: 'j',
        prompt: 'p',
        schema,
        mock: () => ({ title: 'x', count: 2 }),
      });
      expect(result.data).toEqual({ title: 'x', count: 2 });
    });

    it('rejects a sample that does not satisfy the schema (mock can never drift from the contract)', async () => {
      await expect(
        provider.generateJson({
          label: 'j',
          prompt: 'p',
          schema,
          mock: () => ({ title: '', count: 2 }),
        }),
      ).rejects.toMatchObject({ kind: 'bad_output' });
    });

    it('fails with unavailable when the caller gave no sample', async () => {
      await expect(
        provider.generateJson({ label: 'j', prompt: 'p', schema }),
      ).rejects.toBeInstanceOf(AiProviderError);
    });
  });
});

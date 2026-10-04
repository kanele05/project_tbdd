import { z } from 'zod';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

import { getOrCreateAiContent } from './ai.cache';

jest.mock('@/lib/prisma', () => ({
  prisma: { aiContent: { findUnique: jest.fn(), upsert: jest.fn() } },
}));

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as { aiContent: MockModel };

const schema = z.object({ text: z.string() });
type Payload = z.infer<typeof schema>;

const createdAt = new Date('2026-10-01T00:00:00.000Z');
const row = (overrides: Record<string, unknown> = {}) => ({
  content: { text: 'cached' },
  model: 'cached-model',
  createdAt,
  expiresAt: null,
  ...overrides,
});

function spec(overrides: Partial<Parameters<typeof getOrCreateAiContent<Payload>>[0]> = {}) {
  return {
    kind: 'COURSE_SUMMARY' as const,
    refId: 'course-1',
    lang: 'en' as const,
    schema,
    generate: jest.fn().mockResolvedValue({ data: { text: 'fresh' }, model: 'fresh-model' }),
    ...overrides,
  };
}

beforeEach(() => {
  db.aiContent.findUnique.mockReset().mockResolvedValue(null);
  db.aiContent.upsert.mockReset().mockResolvedValue({});
});

describe('getOrCreateAiContent', () => {
  it('returns the cached content without calling the AI', async () => {
    db.aiContent.findUnique.mockResolvedValue(row());
    const s = spec();

    const result = await getOrCreateAiContent(s);

    expect(result).toEqual({
      data: { text: 'cached' },
      model: 'cached-model',
      generatedAt: createdAt,
    });
    expect(s.generate).not.toHaveBeenCalled();
    expect(db.aiContent.upsert).not.toHaveBeenCalled();
    expect(db.aiContent.findUnique).toHaveBeenCalledWith({
      where: { kind_refId_lang: { kind: 'COURSE_SUMMARY', refId: 'course-1', lang: 'en' } },
    });
  });

  it('generates and stores a new entry on a cache miss', async () => {
    const s = spec();

    const result = await getOrCreateAiContent(s);

    expect(result.data).toEqual({ text: 'fresh' });
    expect(result.model).toBe('fresh-model');
    expect(s.generate).toHaveBeenCalledTimes(1);
    const call = db.aiContent.upsert.mock.calls[0]?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.create).toMatchObject({
      kind: 'COURSE_SUMMARY',
      refId: 'course-1',
      lang: 'en',
      content: { text: 'fresh' },
      model: 'fresh-model',
      expiresAt: null,
    });
    expect(call.update).toMatchObject({ content: { text: 'fresh' }, expiresAt: null });
  });

  it('sets expiresAt when a ttl is given', async () => {
    const before = Date.now();
    await getOrCreateAiContent(spec({ ttlMs: 60_000 }));
    const call = db.aiContent.upsert.mock.calls[0]?.[0] as { create: { expiresAt: Date } };
    expect(call.create.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 60_000);
  });

  it('regenerates an expired entry', async () => {
    db.aiContent.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1_000) }));
    const s = spec();
    await getOrCreateAiContent(s);
    expect(s.generate).toHaveBeenCalledTimes(1);
  });

  it('uses an entry that has not expired yet', async () => {
    db.aiContent.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() + 60_000) }));
    const s = spec();
    const result = await getOrCreateAiContent(s);
    expect(result.data).toEqual({ text: 'cached' });
    expect(s.generate).not.toHaveBeenCalled();
  });

  it('regenerates when the cached content no longer matches the schema', async () => {
    db.aiContent.findUnique.mockResolvedValue(row({ content: { other: 1 } }));
    const s = spec();
    const result = await getOrCreateAiContent(s);
    expect(result.data).toEqual({ text: 'fresh' });
    expect(s.generate).toHaveBeenCalledTimes(1);
  });

  it('honours isUsable (sync and async)', async () => {
    db.aiContent.findUnique.mockResolvedValue(row());

    const stale = spec({ isUsable: jest.fn().mockResolvedValue(false) });
    await getOrCreateAiContent(stale);
    expect(stale.generate).toHaveBeenCalledTimes(1);

    const usable = spec({ isUsable: () => true });
    const result = await getOrCreateAiContent(usable);
    expect(result.data).toEqual({ text: 'cached' });
    expect(usable.generate).not.toHaveBeenCalled();
  });

  it('does not store the result when generate returns cache=false', async () => {
    const s = spec({
      generate: jest.fn().mockResolvedValue({ data: { text: 'once' }, model: 'm', cache: false }),
    });
    const result = await getOrCreateAiContent(s);
    expect(result.data).toEqual({ text: 'once' });
    expect(db.aiContent.upsert).not.toHaveBeenCalled();
  });

  it('shares one generation between concurrent requests for the same key', async () => {
    let resolve: (value: { data: Payload; model: string }) => void = () => undefined;
    const pending = new Promise<{ data: Payload; model: string }>((r) => {
      resolve = r;
    });
    const s = spec({ generate: jest.fn().mockReturnValue(pending) });

    const first = getOrCreateAiContent(s);
    const second = getOrCreateAiContent(s);
    await new Promise((r) => setImmediate(r)); // cả hai đã qua bước đọc cache
    resolve({ data: { text: 'shared' }, model: 'm' });

    const [a, b] = await Promise.all([first, second]);
    expect(a.data).toEqual({ text: 'shared' });
    expect(b.data).toEqual({ text: 'shared' });
    expect(s.generate).toHaveBeenCalledTimes(1);
  });

  it('does not share generations across different languages', async () => {
    const en = spec({ lang: 'en' });
    const vi = spec({ lang: 'vi' });
    await Promise.all([getOrCreateAiContent(en), getOrCreateAiContent(vi)]);
    expect(en.generate).toHaveBeenCalledTimes(1);
    expect(vi.generate).toHaveBeenCalledTimes(1);
  });

  it('propagates a generation error and allows a retry afterwards', async () => {
    const failing = spec({ generate: jest.fn().mockRejectedValue(new Error('boom')) });
    await expect(getOrCreateAiContent(failing)).rejects.toThrow('boom');
    expect(db.aiContent.upsert).not.toHaveBeenCalled();

    const retry = spec();
    await expect(getOrCreateAiContent(retry)).resolves.toMatchObject({ data: { text: 'fresh' } });
  });

  describe('when two processes create the same entry (P2002)', () => {
    const p2002 = () =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });

    it('uses the entry written by the other process', async () => {
      db.aiContent.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row());
      db.aiContent.upsert.mockRejectedValue(p2002());

      const result = await getOrCreateAiContent(spec());

      expect(result).toEqual({
        data: { text: 'cached' },
        model: 'cached-model',
        generatedAt: createdAt,
      });
    });

    it('falls back to its own result when the other entry cannot be read', async () => {
      db.aiContent.upsert.mockRejectedValue(p2002());
      const result = await getOrCreateAiContent(spec());
      expect(result.data).toEqual({ text: 'fresh' });
    });

    it('rethrows other database errors', async () => {
      db.aiContent.upsert.mockRejectedValue(new Error('connection lost'));
      await expect(getOrCreateAiContent(spec())).rejects.toThrow('connection lost');
    });

    it('rethrows other Prisma error codes', async () => {
      db.aiContent.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );
      await expect(getOrCreateAiContent(spec())).rejects.toMatchObject({ code: 'P2025' });
    });
  });
});

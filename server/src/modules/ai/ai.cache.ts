import type { ZodType } from 'zod';

import { type AiContentKind, Prisma } from '@/generated/prisma/client';
import type { AiLang } from '@/lib/ai/types';
import { prisma } from '@/lib/prisma';

export type AiContentSpec<T> = {
  kind: AiContentKind;
  /** courseId / lessonId / userId tùy `kind`. */
  refId: string;
  lang: AiLang;
  /** Kiểm tra bản cache: sai schema (vd. sau khi đổi schema) -> sinh lại. */
  schema: ZodType<T>;
  /** Thời gian sống (ms); bỏ trống = không hết hạn. */
  ttlMs?: number;
  /** Bản cache còn hợp lệ không? (vd. gợi ý chứa khóa user đã mua -> sinh lại). */
  isUsable?: (data: T) => Promise<boolean> | boolean;
  /** Gọi AI. `cache: false` -> trả kết quả nhưng không lưu (vd. không có ứng viên để gợi ý). */
  generate: () => Promise<{ data: T; model: string; cache?: boolean }>;
};

export type AiContentResult<T> = { data: T; model: string; generatedAt: Date };

/** Các lệnh sinh đang chạy, gộp yêu cầu trùng để không tốn thêm hạn mức AI. */
const inflight = new Map<string, Promise<AiContentResult<unknown>>>();

function cacheKey(spec: Pick<AiContentSpec<unknown>, 'kind' | 'refId' | 'lang'>): string {
  return `${spec.kind}:${spec.refId}:${spec.lang}`;
}

async function readFresh<T>(spec: AiContentSpec<T>): Promise<AiContentResult<T> | null> {
  const row = await prisma.aiContent.findUnique({
    where: { kind_refId_lang: { kind: spec.kind, refId: spec.refId, lang: spec.lang } },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;
  const parsed = spec.schema.safeParse(row.content);
  if (!parsed.success) return null;
  if (spec.isUsable && !(await spec.isUsable(parsed.data))) return null;
  return { data: parsed.data, model: row.model, generatedAt: row.createdAt };
}

async function store<T>(
  spec: AiContentSpec<T>,
  generated: { data: T; model: string },
): Promise<AiContentResult<T>> {
  const now = new Date();
  const fields = {
    content: generated.data as Prisma.InputJsonValue,
    model: generated.model,
    createdAt: now,
    expiresAt: spec.ttlMs === undefined ? null : new Date(now.getTime() + spec.ttlMs),
  };
  try {
    await prisma.aiContent.upsert({
      where: { kind_refId_lang: { kind: spec.kind, refId: spec.refId, lang: spec.lang } },
      create: { kind: spec.kind, refId: spec.refId, lang: spec.lang, ...fields },
      update: fields,
    });
  } catch (err) {
    // Hai tiến trình cùng tạo một bản ghi: bản của bên kia thắng, dùng lại nó.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    const existing = await readFresh(spec);
    if (existing) return existing;
  }
  return { data: generated.data, model: generated.model, generatedAt: now };
}

/**
 * Lấy nội dung AI từ cache (`AiContent`) hoặc sinh mới rồi lưu. Cache hit không gọi AI nên không tốn
 * hạn mức; các request đồng thời cho cùng một khóa (kind + refId + lang) dùng chung một lệnh sinh.
 */
export async function getOrCreateAiContent<T>(spec: AiContentSpec<T>): Promise<AiContentResult<T>> {
  const cached = await readFresh(spec);
  if (cached) return cached;

  const key = cacheKey(spec);
  const pending = inflight.get(key);
  if (pending) return pending as Promise<AiContentResult<T>>;

  const task = (async (): Promise<AiContentResult<T>> => {
    const generated = await spec.generate();
    if (generated.cache === false) {
      return { data: generated.data, model: generated.model, generatedAt: new Date() };
    }
    return store(spec, generated);
  })().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, task);
  return task;
}

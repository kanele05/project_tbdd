import { z, type ZodType } from 'zod';

import { AiProviderError } from './errors';

/**
 * Lấy chuỗi JSON từ output của model: bỏ rào ```json ... ``` và chữ thừa quanh `{...}` / `[...]`.
 * (Gemini ở chế độ JSON thường trả JSON thuần, đây chỉ là lớp phòng thủ.)
 */
export function extractJsonText(raw: string): string {
  let text = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  if (fenced?.[1] !== undefined) text = fenced[1].trim();
  const starts = [text.indexOf('{'), text.indexOf('[')].filter((i) => i >= 0);
  if (starts.length === 0) return text;
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  return end > start ? text.slice(start, end + 1) : text.slice(start);
}

/** Parse + validate output JSON của model; sai -> `AiProviderError('bad_output')`. */
export function parseModelJson<T>(raw: string, schema: ZodType<T>): T {
  let value: unknown;
  try {
    value = JSON.parse(extractJsonText(raw));
  } catch (cause) {
    throw new AiProviderError('bad_output', 'Model output is not valid JSON', { cause });
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first ? first.path.join('.') || '(root)' : '(root)';
    throw new AiProviderError('bad_output', `Model output does not match the schema at ${where}`);
  }
  return result.data;
}

/** Từ khóa JSON Schema mà Gemini (`responseJsonSchema`) hỗ trợ - các từ khóa khác bị loại. */
const SUPPORTED_KEYWORDS = new Set([
  '$id',
  '$defs',
  '$ref',
  '$anchor',
  'type',
  'format',
  'title',
  'description',
  'enum',
  'items',
  'prefixItems',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
  'anyOf',
  'oneOf',
  'properties',
  'additionalProperties',
  'required',
  'propertyOrdering',
]);

/** Từ khóa có giá trị là map `tên -> sub-schema` (khóa của map KHÔNG phải từ khóa JSON Schema). */
const SCHEMA_MAP_KEYWORDS = new Set(['properties', '$defs']);

function prune(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(prune);
  if (typeof node !== 'object' || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!SUPPORTED_KEYWORDS.has(key)) continue;
    if (SCHEMA_MAP_KEYWORDS.has(key) && typeof value === 'object' && value !== null) {
      out[key] = Object.fromEntries(Object.entries(value).map(([name, sub]) => [name, prune(sub)]));
    } else {
      out[key] = prune(value);
    }
  }
  return out;
}

/** zod -> JSON Schema chỉ gồm từ khóa Gemini hỗ trợ (bỏ `$schema`, `minLength`, `maxLength`, ...). */
export function toGeminiJsonSchema(schema: ZodType): Record<string, unknown> {
  return prune(z.toJSONSchema(schema)) as Record<string, unknown>;
}

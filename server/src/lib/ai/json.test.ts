import { z } from 'zod';

import { AiProviderError } from './errors';
import { extractJsonText, parseModelJson, toGeminiJsonSchema } from './json';

describe('extractJsonText', () => {
  it('returns plain JSON unchanged', () => {
    expect(extractJsonText('{"a":1}')).toBe('{"a":1}');
  });

  it('strips a ```json fence', () => {
    expect(extractJsonText('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(extractJsonText('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('drops chatter before and after the object', () => {
    expect(extractJsonText('Sure! Here you go: {"a":{"b":2}} Hope it helps.')).toBe(
      '{"a":{"b":2}}',
    );
  });

  it('handles top-level arrays', () => {
    expect(extractJsonText('Result: [1,2,3]!')).toBe('[1,2,3]');
  });

  it('returns the trimmed text when there is no JSON at all', () => {
    expect(extractJsonText('  nothing here ')).toBe('nothing here');
  });
});

describe('parseModelJson', () => {
  const schema = z.object({ name: z.string().min(1), tags: z.array(z.string()).min(1) });

  it('parses and validates a good answer', () => {
    expect(parseModelJson('```json\n{"name":"x","tags":["a"]}\n```', schema)).toEqual({
      name: 'x',
      tags: ['a'],
    });
  });

  it('throws bad_output for text that is not JSON', () => {
    expect(() => parseModelJson('I cannot do that', schema)).toThrow(AiProviderError);
    try {
      parseModelJson('{"name":', schema);
    } catch (err) {
      expect((err as AiProviderError).kind).toBe('bad_output');
    }
  });

  it('throws bad_output and names the failing field when the schema does not match', () => {
    expect.assertions(2);
    try {
      parseModelJson('{"name":"x","tags":[]}', schema);
    } catch (err) {
      expect((err as AiProviderError).kind).toBe('bad_output');
      expect((err as AiProviderError).message).toContain('tags');
    }
  });
});

describe('toGeminiJsonSchema', () => {
  const schema = z.object({
    title: z.string().min(1).max(50).describe('A title'),
    items: z
      .array(z.object({ id: z.string(), score: z.number().int().min(0).max(5) }))
      .min(2)
      .max(4),
    mode: z.enum(['a', 'b']),
  });
  const result = toGeminiJsonSchema(schema) as {
    $schema?: string;
    type: string;
    required: string[];
    properties: Record<string, Record<string, unknown>>;
  };

  it('drops $schema and keywords Gemini does not support', () => {
    expect(result.$schema).toBeUndefined();
    expect(result.properties.title).toEqual({ type: 'string', description: 'A title' });
  });

  it('keeps structure, required, enum, items and numeric/array bounds', () => {
    expect(result.type).toBe('object');
    expect(result.required).toEqual(['title', 'items', 'mode']);
    expect(result.properties.mode).toEqual({ type: 'string', enum: ['a', 'b'] });
    expect(result.properties.items).toMatchObject({ type: 'array', minItems: 2, maxItems: 4 });
    const item = result.properties.items?.items as { properties: Record<string, unknown> };
    expect(item.properties.score).toEqual({ type: 'integer', minimum: 0, maximum: 5 });
  });

  it('does not strip property NAMES that look like JSON Schema keywords', () => {
    const tricky = toGeminiJsonSchema(
      z.object({ type: z.string(), format: z.string(), required: z.boolean() }),
    ) as { properties: Record<string, unknown> };
    expect(Object.keys(tricky.properties)).toEqual(['type', 'format', 'required']);
  });
});

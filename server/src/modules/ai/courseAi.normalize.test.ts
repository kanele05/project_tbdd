import { toGeminiJsonSchema } from '@/lib/ai/json';

import { clip, normalizeDraft, normalizeReview } from './courseAi.normalize';
import {
  type CourseDraftModelOutput,
  courseDraftModelOutput,
  courseDraftOutput,
  courseReviewModelOutput,
  courseReviewOutput,
  draftBody,
} from './courseAi.schema';

describe('clip', () => {
  it('keeps short text and trims long text with an ellipsis within the limit', () => {
    expect(clip('  hello ', 10)).toBe('hello');
    const out = clip('a'.repeat(50), 10);
    expect(out).toHaveLength(10);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('normalizeDraft', () => {
  const lessons = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ title: `L${i}`.repeat(100), summary: 's'.repeat(500) }));
  const raw: CourseDraftModelOutput = {
    subtitle: 's'.repeat(400),
    description: 'd'.repeat(2500),
    benefits: Array.from({ length: 9 }, () => 'b'.repeat(300)),
    sections: Array.from({ length: 9 }, () => ({ title: 't'.repeat(300), lessons: lessons(7) })),
  };

  it('cuts every part to the DTO limits so the result validates', () => {
    const out = normalizeDraft(raw);
    expect(out.benefits).toHaveLength(6);
    expect(out.sections).toHaveLength(6);
    expect(out.sections.every((s) => s.lessons.length === 5)).toBe(true);
    expect(courseDraftOutput.safeParse(out).success).toBe(true);
  });
});

describe('normalizeReview', () => {
  const issue = (severity: 'low' | 'medium' | 'high', message: string) => ({
    severity,
    area: 'other' as const,
    message,
  });

  it('sorts by severity (stable), keeps at most 10 and clips messages', () => {
    const out = normalizeReview({
      verdict: 'NEEDS_ATTENTION',
      summary: 'ok',
      issues: [
        issue('low', 'l1'),
        issue('high', 'h1'),
        issue('medium', 'm1'),
        issue('high', 'h2'),
        ...Array.from({ length: 12 }, (_, i) => issue('low', `x${i}${'y'.repeat(600)}`)),
      ],
    });
    expect(out.issues.map((i) => i.message).slice(0, 4)).toEqual(['h1', 'h2', 'm1', 'l1']);
    expect(out.issues).toHaveLength(10);
    expect(courseReviewOutput.safeParse(out).success).toBe(true);
  });

  it('does not allow LOOKS_OK together with a medium or high issue, but allows it with low ones', () => {
    const serious = normalizeReview({
      verdict: 'LOOKS_OK',
      summary: 'fine',
      issues: [issue('medium', 'm')],
    });
    expect(serious.verdict).toBe('NEEDS_ATTENTION');
    const minor = normalizeReview({
      verdict: 'LOOKS_OK',
      summary: 'fine',
      issues: [issue('low', 'l')],
    });
    expect(minor.verdict).toBe('LOOKS_OK');
  });
});

describe('draftBody', () => {
  it('trims the topic and validates its length and the level', () => {
    expect(draftBody.parse({ topic: '  React  ', level: 'beginner' })).toEqual({
      topic: 'React',
      level: 'beginner',
    });
    expect(draftBody.safeParse({ topic: 'ab', level: 'beginner' }).success).toBe(false);
    expect(draftBody.safeParse({ topic: 'x'.repeat(201), level: 'beginner' }).success).toBe(false);
    expect(draftBody.safeParse({ topic: 'React', level: 'expert' }).success).toBe(false);
    expect(draftBody.safeParse({ topic: 'React', level: 'beginner', lang: 'fr' }).success).toBe(
      false,
    );
  });
});

describe('model output schemas', () => {
  it('convert to a Gemini JSON schema that keeps the structure and the enums', () => {
    const draft = JSON.stringify(toGeminiJsonSchema(courseDraftModelOutput));
    expect(draft).toContain('"sections"');
    expect(draft).toContain('"minItems":3');
    expect(draft).not.toContain('minLength');
    const review = JSON.stringify(toGeminiJsonSchema(courseReviewModelOutput));
    expect(review).toContain('"LOOKS_OK"');
    expect(review).toContain('"curriculum"');
    expect(review).toContain('"high"');
  });
});

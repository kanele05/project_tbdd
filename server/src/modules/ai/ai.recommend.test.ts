import { normalizeRecommendationItems } from './ai.recommend';
import type { RecommendationCandidate } from './ai.types';

function candidate(id: string): RecommendationCandidate {
  return {
    id,
    title: `Course ${id}`,
    subtitle: null,
    category: 'Design',
    teacher: 'Teacher',
    ratingAvg: 4.5,
    ratingCount: 10,
    lessonCount: 5,
    priceCents: 1000,
    tags: [],
  };
}

const candidates = ['a', 'b', 'c', 'd', 'e', 'f'].map(candidate);

describe('normalizeRecommendationItems', () => {
  it('keeps valid items in the model order', () => {
    const items = normalizeRecommendationItems(
      [
        { courseId: 'c', reason: 'because c' },
        { courseId: 'a', reason: 'because a' },
        { courseId: 'b', reason: 'because b' },
      ],
      candidates,
      'en',
      5,
    );
    expect(items).toEqual([
      { courseId: 'c', reason: 'because c' },
      { courseId: 'a', reason: 'because a' },
      { courseId: 'b', reason: 'because b' },
    ]);
  });

  it('drops invented ids and duplicates, then fills up to three from the ranking', () => {
    const items = normalizeRecommendationItems(
      [
        { courseId: 'zzz', reason: 'invented' },
        { courseId: 'b', reason: 'first b' },
        { courseId: 'b', reason: 'second b' },
      ],
      candidates,
      'en',
      5,
    );
    expect(items.map((i) => i.courseId)).toEqual(['b', 'a', 'c']);
    expect(items[0]?.reason).toBe('first b');
    expect(items[1]?.reason).toContain('Design');
  });

  it('uses Vietnamese fallback reasons for lang=vi', () => {
    const items = normalizeRecommendationItems([], candidates, 'vi', 5);
    expect(items).toHaveLength(3);
    expect(items[0]?.reason).toContain('đánh giá cao');
  });

  it('never returns more than maxItems', () => {
    const items = normalizeRecommendationItems(
      candidates.map((c) => ({ courseId: c.id, reason: c.id })),
      candidates,
      'en',
      4,
    );
    expect(items.map((i) => i.courseId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns fewer than three when there are fewer candidates', () => {
    const items = normalizeRecommendationItems([], [candidate('a'), candidate('b')], 'en', 2);
    expect(items.map((i) => i.courseId)).toEqual(['a', 'b']);
  });

  it('does not add a fallback that the model already chose', () => {
    const items = normalizeRecommendationItems(
      [{ courseId: 'a', reason: 'only a' }],
      candidates,
      'en',
      5,
    );
    expect(items.map((i) => i.courseId)).toEqual(['a', 'b', 'c']);
  });
});

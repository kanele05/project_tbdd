import type { CourseRevisionPayload } from '@/lib/courseRevisionPayload';

import {
  computeRevisionDiff,
  findRemovedLessonIds,
  type LiveCourse,
  type LiveSection,
} from './adminRevisionDiff';

const YT = (n: number) => `https://www.youtube.com/watch?v=dQw4w9WgX${String(n).padStart(2, '0')}`;

function lesson(id: string, n: number) {
  return {
    id,
    title: `Lesson ${n}`,
    videoUrl: YT(n),
    durationSec: 100,
    isPreview: false,
    content: `c${n}`,
  };
}

const sections: LiveSection[] = [
  { id: 's1', title: 'One', lessons: [lesson('l1', 1), lesson('l2', 2)] },
  { id: 's2', title: 'Two', lessons: [lesson('l3', 3)] },
];

const live: LiveCourse = {
  title: 'Live',
  priceCents: 1000,
  originalPriceCents: null,
  category: { id: 'c1', name: 'Code' },
  tags: [{ id: 't1', name: 'React', isHot: true }],
  sections,
};

function samePayload(): CourseRevisionPayload {
  return {
    title: 'Live',
    priceCents: 1000,
    originalPriceCents: null,
    categoryId: 'c1',
    tagIds: ['t1'],
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      lessons: s.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        videoUrl: l.videoUrl,
        durationSec: l.durationSec,
        isPreview: l.isPreview,
        content: l.content ?? '',
      })),
    })),
  };
}

function diff(payload: CourseRevisionPayload, progress: [string, number][] = []) {
  return computeRevisionDiff({
    live,
    payload,
    afterCategory: { id: payload.categoryId, name: payload.categoryId === 'c1' ? 'Code' : 'Art' },
    afterTags: payload.tagIds.map((id) => ({
      id,
      name: id === 't1' ? 'React' : 'Vue',
      isHot: false,
    })),
    progressCounts: new Map(progress),
  });
}

describe('computeRevisionDiff', () => {
  it('reports no changes for an identical payload', () => {
    const result = diff(samePayload());
    expect(result.hasChanges).toBe(false);
    expect(result.curriculum).toEqual({
      sectionsAdded: [],
      sectionsRemoved: [],
      sectionsRenamed: [],
      lessonsAdded: [],
      lessonsRemoved: [],
      lessonsChanged: [],
      isReordered: false,
    });
  });

  it('reports before/after for the changed top-level fields only', () => {
    const payload = samePayload();
    payload.title = 'New';
    payload.originalPriceCents = 2000;
    payload.categoryId = 'c2';
    payload.tagIds = ['t2'];
    const result = diff(payload);
    expect(result.title).toEqual({ before: 'Live', after: 'New' });
    expect(result.priceCents).toBeNull();
    expect(result.originalPriceCents).toEqual({ before: null, after: 2000 });
    expect(result.category).toEqual({
      before: { id: 'c1', name: 'Code' },
      after: { id: 'c2', name: 'Art' },
    });
    expect(result.tags?.after.map((t) => t.name)).toEqual(['Vue']);
  });

  it('detects added, removed, renamed and changed lessons with the progress that would be lost', () => {
    const payload = samePayload();
    payload.sections[0]!.title = 'One renamed';
    payload.sections[0]!.lessons.pop(); // l2 removed
    payload.sections[0]!.lessons[0]!.videoUrl = 'https://youtu.be/dQw4w9WgX09';
    payload.sections[0]!.lessons[0]!.content = 'edited';
    payload.sections.push({
      title: 'Three',
      lessons: [{ title: 'Fresh', videoUrl: YT(7), durationSec: 50, isPreview: true, content: '' }],
    });
    const result = diff(payload, [['l2', 4]]);
    const c = result.curriculum;
    expect(c.sectionsAdded).toEqual(['Three']);
    expect(c.sectionsRenamed).toEqual([{ before: 'One', after: 'One renamed' }]);
    expect(c.lessonsAdded).toEqual([
      { id: null, title: 'Fresh', sectionTitle: 'Three', durationSec: 50 },
    ]);
    expect(c.lessonsRemoved).toEqual([
      { id: 'l2', title: 'Lesson 2', sectionTitle: 'One', durationSec: 100, progressCount: 4 },
    ]);
    expect(c.lessonsChanged).toHaveLength(1);
    expect(c.lessonsChanged[0]).toMatchObject({
      id: 'l1',
      sectionTitle: 'One renamed',
      changedFields: ['videoUrl', 'content'],
    });
    expect(c.isReordered).toBe(false);
    expect(result.hasChanges).toBe(true);
  });

  it('treats a removed section as removed and counts a moved lesson as a reorder', () => {
    const payload = samePayload();
    const moved = payload.sections[1]!.lessons.pop()!;
    payload.sections[0]!.lessons.push(moved);
    payload.sections.pop();
    const result = diff(payload);
    expect(result.curriculum.sectionsRemoved).toEqual(['Two']);
    expect(result.curriculum.lessonsRemoved).toEqual([]);
    expect(result.curriculum.isReordered).toBe(true);
  });

  it('detects a pure reorder of sections and of lessons', () => {
    const swapSections = samePayload();
    swapSections.sections.reverse();
    expect(diff(swapSections).curriculum.isReordered).toBe(true);
    expect(diff(swapSections).hasChanges).toBe(true);

    const swapLessons = samePayload();
    swapLessons.sections[0]!.lessons.reverse();
    expect(diff(swapLessons).curriculum.isReordered).toBe(true);
  });

  it('treats an unknown id like a new lesson', () => {
    const payload = samePayload();
    payload.sections[1]!.lessons[0]!.id = 'ghost';
    const result = diff(payload);
    expect(result.curriculum.lessonsAdded).toHaveLength(1);
    expect(result.curriculum.lessonsRemoved.map((l) => l.id)).toEqual(['l3']);
  });
});

describe('findRemovedLessonIds', () => {
  it('returns the live lessons that the payload no longer mentions', () => {
    const payload = samePayload();
    payload.sections[0]!.lessons.shift();
    expect(findRemovedLessonIds(sections, payload)).toEqual(['l1']);
  });
});

import { courseRevisionPayloadSchema, snapshotFromRevision } from './courseRevisionPayload';

const lesson = {
  title: 'Intro',
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  durationSec: 120,
  isPreview: true,
};

const payload = {
  title: 'New title',
  priceCents: 4900,
  originalPriceCents: null,
  categoryId: 'cat-1',
  tagIds: ['t1', 't2'],
  sections: [{ id: 's1', title: 'Basics', lessons: [{ ...lesson, id: 'l1' }, lesson] }],
};

describe('courseRevisionPayloadSchema', () => {
  it('accepts a payload and defaults lesson content to an empty string', () => {
    const parsed = courseRevisionPayloadSchema.parse(payload);
    expect(parsed.sections[0]?.lessons[1]?.content).toBe('');
    expect(parsed.sections[0]?.lessons[0]?.id).toBe('l1');
  });

  it('rejects more than 5 tags, unknown keys and a negative price', () => {
    expect(
      courseRevisionPayloadSchema.safeParse({ ...payload, tagIds: ['1', '2', '3', '4', '5', '6'] })
        .success,
    ).toBe(false);
    expect(courseRevisionPayloadSchema.safeParse({ ...payload, status: 'PUBLISHED' }).success).toBe(
      false,
    );
    expect(courseRevisionPayloadSchema.safeParse({ ...payload, priceCents: -1 }).success).toBe(
      false,
    );
  });

  it('leaves the YouTube rule to the service but rejects an empty link or a zero duration', () => {
    const withLesson = (patch: object) => ({
      ...payload,
      sections: [{ title: 'A', lessons: [{ ...lesson, ...patch }] }],
    });
    expect(courseRevisionPayloadSchema.safeParse(withLesson({})).success).toBe(true);
    // Video MP4 đang lưu của khóa seed phải đọc được; luật "YouTube hoặc giữ nguyên" nằm ở service/checklist.
    expect(
      courseRevisionPayloadSchema.safeParse(withLesson({ videoUrl: '/static/videos/a.mp4' }))
        .success,
    ).toBe(true);
    expect(courseRevisionPayloadSchema.safeParse(withLesson({ videoUrl: ' ' })).success).toBe(
      false,
    );
    expect(courseRevisionPayloadSchema.safeParse(withLesson({ durationSec: 0 })).success).toBe(
      false,
    );
  });

  it('rejects more than 100 lessons in total', () => {
    const lessons = Array.from({ length: 101 }, () => lesson);
    const sections = [
      { title: 'A', lessons: lessons.slice(0, 60) },
      { title: 'B', lessons: lessons.slice(60) },
    ];
    expect(courseRevisionPayloadSchema.safeParse({ ...payload, sections }).success).toBe(false);
  });
});

describe('snapshotFromRevision', () => {
  it('merges the live minor fields with the revision payload', () => {
    const parsed = courseRevisionPayloadSchema.parse(payload);
    const snapshot = snapshotFromRevision({ description: 'desc', thumbnailUrl: '/t.png' }, parsed);
    expect(snapshot).toMatchObject({
      title: 'New title',
      description: 'desc',
      thumbnailUrl: '/t.png',
      categoryId: 'cat-1',
    });
    expect(snapshot.sections[0]?.lessons.map((l) => l.id)).toEqual(['l1', undefined]);
  });
});

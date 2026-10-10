import { type CoursePreviewUpdate, updateCoursePreviews } from './coursePreviewUpdate.service';

const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn();
const mockAggregate = jest.fn();
const mockUpdateCourse = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: (...args: unknown[]) => mockTransaction(...args) },
}));

const preview: CoursePreviewUpdate = {
  courseId: 'crs_python_introduction',
  lessons: [
    {
      lessonId: 'les_python_introduction_01',
      videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345&start=10&end=130',
      durationSec: 120,
    },
    {
      lessonId: 'les_python_introduction_02',
      videoUrl: 'https://www.youtube.com/watch?v=AbCdEf12345&start=190&end=250',
      durationSec: 60,
    },
  ],
};

function originalLessons() {
  return preview.lessons.map(({ lessonId }) => ({
    id: lessonId,
    isPreview: true,
    videoUrl: 'https://old.example.com/sample.mp4',
    durationSec: 10,
    section: { courseId: preview.courseId },
  }));
}

function withSecondUrl(videoUrl: string): CoursePreviewUpdate {
  return { ...preview, lessons: [preview.lessons[0], { ...preview.lessons[1], videoUrl }] };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFindMany.mockResolvedValue(originalLessons());
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockAggregate.mockResolvedValue({ _sum: { durationSec: 156 } });
  mockTransaction.mockImplementation((callback: (transaction: unknown) => unknown) =>
    callback({
      lesson: { findMany: mockFindMany, updateMany: mockUpdateMany, aggregate: mockAggregate },
      course: { update: mockUpdateCourse },
    }),
  );
});

describe('updateCoursePreviews', () => {
  it('defaults to a dry run without writing anything', async () => {
    expect(await updateCoursePreviews([preview])).toEqual({
      applied: false,
      changes: [{ courseId: preview.courseId, changedLessons: 2 }],
    });
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockUpdateCourse).not.toHaveBeenCalled();
  });

  it('gives each preview lesson its own excerpt and recomputes the course duration', async () => {
    await updateCoursePreviews([preview], true);
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
    for (const lesson of preview.lessons) {
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: lesson.lessonId, isPreview: true, section: { courseId: preview.courseId } },
        data: { videoUrl: lesson.videoUrl, durationSec: lesson.durationSec },
      });
    }
    expect(mockUpdateCourse).toHaveBeenCalledWith({
      where: { id: preview.courseId },
      data: { totalDurationSec: 156 },
    });
  });

  it('only rewrites the lesson that differs', async () => {
    const [first, second] = originalLessons();
    mockFindMany.mockResolvedValue([
      { ...first, videoUrl: preview.lessons[0].videoUrl, durationSec: 120 },
      second,
    ]);
    const result = await updateCoursePreviews([preview], true);
    expect(result.changes[0]?.changedLessons).toBe(1);
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: preview.lessons[1].lessonId },
    });
  });

  it('does not rewrite previews already synchronized', async () => {
    mockFindMany.mockResolvedValue(
      originalLessons().map((lesson, index) => ({
        ...lesson,
        videoUrl: preview.lessons[index]?.videoUrl,
        durationSec: preview.lessons[index]?.durationSec,
      })),
    );
    const result = await updateCoursePreviews([preview], true);
    expect(result.changes[0]?.changedLessons).toBe(0);
    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mockUpdateCourse).not.toHaveBeenCalled();
  });

  it('aborts the transaction if a preview changes concurrently', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(updateCoursePreviews([preview], true)).rejects.toThrow('changed concurrently');
    expect(mockUpdateCourse).not.toHaveBeenCalled();
  });

  it.each(['missing', 'not-preview', 'wrong-course'])(
    'rejects mismatched %s lessons',
    async (kind) => {
      const lessons = originalLessons();
      if (kind === 'missing') lessons.pop();
      if (kind === 'not-preview') lessons[0]!.isPreview = false;
      if (kind === 'wrong-course') lessons[0]!.section.courseId = 'unrelated-course';
      mockFindMany.mockResolvedValue(lessons);
      await expect(updateCoursePreviews([preview], true)).rejects.toThrow(
        'matching preview lessons',
      );
      expect(mockUpdateMany).not.toHaveBeenCalled();
    },
  );

  it('rejects duplicate courses before opening a transaction', async () => {
    await expect(updateCoursePreviews([preview, preview], true)).rejects.toThrow(
      'Duplicate course',
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('rejects a lesson listed under two courses before opening a transaction', async () => {
    await expect(
      updateCoursePreviews([preview, { ...preview, courseId: 'crs_other' }], true),
    ).rejects.toThrow('Duplicate lesson');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])(
    'rejects invalid duration %s before opening a transaction',
    async (duration) => {
      const invalid: CoursePreviewUpdate = {
        ...preview,
        lessons: [{ ...preview.lessons[0], durationSec: duration }, preview.lessons[1]],
      };
      await expect(updateCoursePreviews([invalid])).rejects.toThrow('Invalid preview duration');
      expect(mockTransaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    'file:///video.mp4',
    'http://www.youtube.com/watch?v=AbCdEf12345',
    'https://youtube.com/watch?v=AbCdEf12345',
    'https://www.youtube.com.evil.example/watch?v=AbCdEf12345',
    'https://www.youtube.com/embed/AbCdEf12345',
    'https://api.example.com/static/previews/python-introduction-v2.mp4',
    'not a url',
  ])('rejects the non-YouTube-watch video URL %s', async (videoUrl) => {
    await expect(updateCoursePreviews([withSecondUrl(videoUrl)])).rejects.toThrow(
      'Invalid preview URL',
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

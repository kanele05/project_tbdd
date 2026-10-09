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
  lessonIds: ['les_python_introduction_01', 'les_python_introduction_02'],
  videoUrl: 'https://api.example.com/static/previews/python-introduction-v1.mp4',
  durationSec: 18,
};

function originalLessons() {
  return preview.lessonIds.map((id) => ({
    id,
    isPreview: true,
    videoUrl: 'https://old.example.com/sample.mp4',
    durationSec: 10,
    section: { courseId: preview.courseId },
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFindMany.mockResolvedValue(originalLessons());
  mockUpdateMany.mockResolvedValue({ count: 2 });
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

  it('only updates the known preview lessons and their course duration', async () => {
    await updateCoursePreviews([preview], true);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: preview.lessonIds },
        isPreview: true,
        section: { courseId: preview.courseId },
      },
      data: { videoUrl: preview.videoUrl, durationSec: 18 },
    });
    expect(mockUpdateCourse).toHaveBeenCalledWith({
      where: { id: preview.courseId },
      data: { totalDurationSec: 156 },
    });
  });

  it('does not rewrite previews already synchronized', async () => {
    mockFindMany.mockResolvedValue(
      originalLessons().map((lesson) => ({
        ...lesson,
        videoUrl: preview.videoUrl,
        durationSec: 18,
      })),
    );
    const result = await updateCoursePreviews([preview], true);
    expect(result.changes[0]?.changedLessons).toBe(0);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('aborts the transaction if a preview changes concurrently', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
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

  it.each([0, -1, 1.5])(
    'rejects invalid duration %s before opening a transaction',
    async (duration) => {
      await expect(updateCoursePreviews([{ ...preview, durationSec: duration }])).rejects.toThrow(
        'Invalid preview duration',
      );
      expect(mockTransaction).not.toHaveBeenCalled();
    },
  );

  it('rejects non-HTTP video URLs', async () => {
    await expect(
      updateCoursePreviews([{ ...preview, videoUrl: 'file:///video.mp4' }]),
    ).rejects.toThrow('Invalid preview URL');
  });
});

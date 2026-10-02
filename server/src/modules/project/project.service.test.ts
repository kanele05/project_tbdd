import { createSubmission, getProject, listSubmissions, toSubmissionDto } from './project.service';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findUnique: jest.fn() },
    projectSubmission: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  },
}));

type Fn = jest.Mock;
const db = (jest.requireMock('@/lib/prisma') as { prisma: Record<string, Record<string, Fn>> })
  .prisma;

const submissionRow = {
  id: 's1',
  title: 'Mine',
  description: null,
  imageUrl: '/uploads/cover.png',
  fileUrl: '/uploads/file.zip',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  user: { id: 'u1', fullName: 'U', avatarUrl: null },
};

beforeEach(() => {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
});

describe('toSubmissionDto', () => {
  it('turns stored paths into absolute URLs and dates into ISO strings', () => {
    const dto = toSubmissionDto(submissionRow);
    expect(dto.fileUrl).toMatch(/^https?:\/\/.+\/uploads\/file\.zip$/);
    expect(dto.imageUrl).toMatch(/^https?:\/\/.+\/uploads\/cover\.png$/);
    expect(dto.createdAt).toBe('2026-09-01T00:00:00.000Z');
    expect(dto.user).toEqual({ id: 'u1', fullName: 'U', avatarUrl: null });
  });

  it('keeps a missing cover image as null and external URLs untouched', () => {
    const dto = toSubmissionDto({
      ...submissionRow,
      imageUrl: null,
      fileUrl: 'https://images.example.com/x.jpg',
    });
    expect(dto.imageUrl).toBeNull();
    expect(dto.fileUrl).toBe('https://images.example.com/x.jpg');
  });
});

describe('createSubmission', () => {
  const file = { filename: 'file.zip', mimetype: 'application/zip' };

  it('rejects a missing project file with 400 before touching the database', async () => {
    await expect(createSubmission('u1', 'c1', { title: 'x' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(db.projectSubmission.create).not.toHaveBeenCalled();
  });

  it('rejects a cover image that is not png/jpg with 415', async () => {
    await expect(
      createSubmission('u1', 'c1', {
        title: 'x',
        file,
        image: { filename: 'c.pdf', mimetype: 'application/pdf' },
      }),
    ).rejects.toMatchObject({ status: 415, code: 'UNSUPPORTED_FILE_TYPE' });
    expect(db.projectSubmission.create).not.toHaveBeenCalled();
  });

  it('stores relative upload paths for file and image', async () => {
    db.projectSubmission.create.mockResolvedValue(submissionRow);

    await createSubmission('u1', 'c1', {
      title: 'Mine',
      description: 'd',
      file,
      image: { filename: 'cover.png', mimetype: 'image/png' },
    });

    expect(db.projectSubmission.create.mock.calls[0][0].data).toEqual({
      courseId: 'c1',
      userId: 'u1',
      title: 'Mine',
      description: 'd',
      fileUrl: '/uploads/file.zip',
      imageUrl: '/uploads/cover.png',
    });
  });
});

describe('getProject', () => {
  it('returns an empty description when the course has none and throws 404 for unknown courses', async () => {
    db.course.findUnique.mockResolvedValueOnce({
      projectDescription: null,
      resources: [],
      _count: { submissions: 0 },
    });
    await expect(getProject('c1')).resolves.toEqual({
      description: '',
      resources: [],
      submissionCount: 0,
    });

    db.course.findUnique.mockResolvedValueOnce(null);
    await expect(getProject('x')).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' });
  });
});

describe('listSubmissions', () => {
  it('paginates newest first', async () => {
    db.projectSubmission.count.mockResolvedValue(12);
    db.projectSubmission.findMany.mockResolvedValue([submissionRow]);

    const result = await listSubmissions('c1', { page: 2, limit: 5 });

    expect(result.meta).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3 });
    expect(db.projectSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: 'c1' },
        skip: 5,
        take: 5,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });
});

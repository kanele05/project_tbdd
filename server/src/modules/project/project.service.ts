import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { toUserRef, userRefSelect } from '@/lib/mappers';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrl, toAbsoluteUrlOrNull } from '@/lib/url';
import { IMAGE_MIME_TYPES } from '@/middlewares/upload';
import type { CourseProjectDto, ProjectSubmissionDto, ResourceDto } from '@/types/dto';

/** Phần của `Express.Multer.File` mà service cần. */
export type UploadedFile = { filename: string; mimetype: string };

export type CreateSubmissionInput = {
  title: string;
  description?: string | undefined;
  file?: UploadedFile;
  /** Ảnh bìa (tùy chọn): chỉ png/jpg. */
  image?: UploadedFile;
};

const submissionSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  fileUrl: true,
  createdAt: true,
  user: { select: userRefSelect },
} satisfies Prisma.ProjectSubmissionSelect;

type SubmissionRow = Prisma.ProjectSubmissionGetPayload<{ select: typeof submissionSelect }>;

export function toSubmissionDto(row: SubmissionRow): ProjectSubmissionDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: toAbsoluteUrlOrNull(row.imageUrl),
    fileUrl: toAbsoluteUrl(row.fileUrl),
    createdAt: row.createdAt.toISOString(),
    user: toUserRef(row.user),
  };
}

/** DB giữ đường dẫn tương đối `/uploads/<tên file>` (không phụ thuộc PUBLIC_BASE_URL). */
const uploadPath = (file: UploadedFile): string => `/uploads/${file.filename}`;

/** Mô tả project, tài liệu và số bài nộp của khóa (người gọi đã qua kiểm tra ghi danh). */
export async function getProject(courseId: string): Promise<CourseProjectDto> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      projectDescription: true,
      resources: {
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, fileUrl: true, sizeBytes: true, mimeType: true },
      },
      _count: { select: { submissions: true } },
    },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  const resources: ResourceDto[] = course.resources.map((resource) => ({
    ...resource,
    fileUrl: toAbsoluteUrl(resource.fileUrl),
  }));
  return {
    description: course.projectDescription ?? '',
    resources,
    submissionCount: course._count.submissions,
  };
}

/** Bài nộp của cả lớp, mới nhất trước. */
export async function listSubmissions(
  courseId: string,
  query: { page?: number; limit?: number },
): Promise<{ submissions: ProjectSubmissionDto[]; meta: PaginationMeta }> {
  const pagination = getPagination(query);
  const [total, rows] = await Promise.all([
    prisma.projectSubmission.count({ where: { courseId } }),
    prisma.projectSubmission.findMany({
      where: { courseId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: submissionSelect,
    }),
  ]);
  return { submissions: rows.map(toSubmissionDto), meta: buildPaginationMeta(total, pagination) };
}

/** BR-09: người đã ghi danh nộp bài (file bắt buộc, ảnh bìa tùy chọn). */
export async function createSubmission(
  userId: string,
  courseId: string,
  input: CreateSubmissionInput,
): Promise<ProjectSubmissionDto> {
  if (!input.file) {
    throw ApiError.badRequest('A project file is required', [
      { source: 'body', field: 'file', message: 'File is required' },
    ]);
  }
  if (input.image && !IMAGE_MIME_TYPES.includes(input.image.mimetype)) {
    throw ApiError.of('UNSUPPORTED_FILE_TYPE', 'The cover image must be a PNG or JPG file');
  }

  const created = await prisma.projectSubmission.create({
    data: {
      courseId,
      userId,
      title: input.title,
      description: input.description ?? null,
      fileUrl: uploadPath(input.file),
      imageUrl: input.image ? uploadPath(input.image) : null,
    },
    select: submissionSelect,
  });
  return toSubmissionDto(created);
}

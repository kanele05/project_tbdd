// Hồ sơ giảng viên của chính mình (FR-49): GET (tạo rỗng nếu chưa có) / PATCH.
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { TeacherProfileDto } from '@/types/teacherAdminDto';

import type { TeacherProfileBody } from './studio.schema';

const profileSelect = {
  id: true,
  jobTitle: true,
  bio: true,
  organization: true,
  location: true,
  timezone: true,
} satisfies Prisma.TeacherProfileSelect;

/** Tìm hoặc tạo hồ sơ rỗng (đăng ký TEACHER thường đã tạo sẵn; tài khoản được nâng quyền thì chưa). */
export async function ensureTeacherProfile(
  userId: string,
  db: Pick<Prisma.TransactionClient, 'teacherProfile'> = prisma,
): Promise<TeacherProfileDto> {
  return db.teacherProfile.upsert({
    where: { userId },
    create: { userId, jobTitle: '', bio: '' },
    update: {},
    select: profileSelect,
  });
}

export function getMyTeacherProfile(userId: string): Promise<TeacherProfileDto> {
  return ensureTeacherProfile(userId);
}

export async function updateMyTeacherProfile(
  userId: string,
  input: TeacherProfileBody,
): Promise<TeacherProfileDto> {
  const data: Prisma.TeacherProfileUpdateInput = {};
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.organization !== undefined) data.organization = input.organization;
  if (input.location !== undefined) data.location = input.location;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  return prisma.teacherProfile.upsert({
    where: { userId },
    create: {
      userId,
      jobTitle: input.jobTitle ?? '',
      bio: input.bio ?? '',
      organization: input.organization ?? null,
      location: input.location ?? null,
      timezone: input.timezone ?? null,
    },
    update: data,
    select: profileSelect,
  });
}

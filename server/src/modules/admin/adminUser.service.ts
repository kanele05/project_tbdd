/** `GET /admin/users` + khóa / mở khóa tài khoản (FR-52, BR-28). Khóa/mở khóa thật nằm ở `auth/accountStatus.service`. */
import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { toAbsoluteUrlOrNull } from '@/lib/url';
import { disableUser, enableUser } from '@/modules/auth/accountStatus.service';
import type { AdminUserDto } from '@/types/teacherAdminDto';

import type { ListAdminUsersQuery } from './admin.schema';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
  emailVerifiedAt: true,
  disabledAt: true,
  disabledReason: true,
  teacherProfile: { select: { _count: { select: { courses: true } } } },
  _count: { select: { enrollments: true } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function toAdminUser(row: UserRow): AdminUserDto {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    avatarUrl: toAbsoluteUrlOrNull(row.avatarUrl),
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    emailVerified: row.emailVerifiedAt !== null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    disabledReason: row.disabledReason,
    courseCount: row.role === 'TEACHER' ? (row.teacherProfile?._count.courses ?? 0) : 0,
    enrollmentCount: row._count.enrollments,
  };
}

/** Escape `\`, `%`, `_` để ký tự đặc biệt của LIKE được tìm theo nghĩa đen. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function listAdminUsers(
  query: ListAdminUsersQuery,
): Promise<{ users: AdminUserDto[]; meta: PaginationMeta }> {
  const pagination = getPagination(query);
  const search = query.search?.trim();
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status === 'disabled' ? { disabledAt: { not: null } } : {}),
    ...(query.status === 'active' ? { disabledAt: null } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: escapeLike(search), mode: 'insensitive' } },
            { email: { contains: escapeLike(search), mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: userSelect,
    }),
  ]);
  return { users: rows.map(toAdminUser), meta: buildPaginationMeta(total, pagination) };
}

async function getAdminUser(userId: string): Promise<AdminUserDto> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!row) throw ApiError.of('NOT_FOUND', 'User not found');
  return toAdminUser(row);
}

export async function disableAdminUser(
  userId: string,
  reason: string,
  actorId: string,
): Promise<AdminUserDto> {
  await disableUser(userId, reason, actorId);
  return getAdminUser(userId);
}

export async function enableAdminUser(userId: string, actorId: string): Promise<AdminUserDto> {
  await enableUser(userId, actorId);
  return getAdminUser(userId);
}

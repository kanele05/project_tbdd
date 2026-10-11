/**
 * Đổi vai trò tài khoản bằng script (BR-30): ADMIN không có đường đăng ký nên production nâng quyền bằng
 * `scripts/setUserRole.ts`. Chỉ tài khoản đã xác minh email. Nâng lên TEACHER tạo `TeacherProfile` rỗng nếu chưa có
 * (giảng viên tự điền ở `/me/teacher-profile`). Hạ vai trò giữ nguyên hồ sơ và khóa học đã có.
 * Vai trò mới có hiệu lực tối đa sau 30 s (`requireAuth` đọc role từ DB, cache phiên 30 s).
 */
import { ApiError } from '@/lib/ApiError';
import { prisma } from '@/lib/prisma';

import type { SettableRole } from './setUserRoleArgs';

export type SetUserRoleResult = {
  email: string;
  fromRole: SettableRole;
  toRole: SettableRole;
  applied: boolean;
  willCreateTeacherProfile: boolean;
};

export async function setUserRole(
  email: string,
  role: SettableRole,
  shouldApply: boolean,
): Promise<SetUserRoleResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      emailVerifiedAt: true,
      teacherProfile: { select: { id: true } },
    },
  });
  if (!user) throw ApiError.of('NOT_FOUND', `No account with email ${email}`);
  if (!user.emailVerifiedAt) {
    throw ApiError.of('EMAIL_NOT_VERIFIED', 'Only accounts with a verified email can change role');
  }

  const willCreateTeacherProfile = role === 'TEACHER' && !user.teacherProfile;
  const result: SetUserRoleResult = {
    email,
    fromRole: user.role,
    toRole: role,
    applied: false,
    willCreateTeacherProfile,
  };
  if (!shouldApply || user.role === role) return result;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { role }, select: { id: true } });
    if (willCreateTeacherProfile) {
      await tx.teacherProfile.create({
        data: { userId: user.id, jobTitle: '', bio: '' },
        select: { id: true },
      });
    }
  });
  return { ...result, applied: true };
}

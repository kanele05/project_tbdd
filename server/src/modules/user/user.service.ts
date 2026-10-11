import { ApiError } from '@/lib/ApiError';
import { toUserDto, userDtoSelect } from '@/lib/mappers';
import { Prisma, prisma } from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/url';
import type { MeStatsDto, UserDto } from '@/types/dto';

import type { UpdateMeInput } from './user.schema';

/**
 * Tổng thời gian học (giây) trong một truy vấn: bài hoàn thành = đủ `durationSec`, bài dở dang =
 * `min(positionSec, durationSec)` (không âm). `COALESCE` -> 0 khi chưa có tiến độ nào.
 */
async function sumLearningSec(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ learningSec: number }[]>(Prisma.sql`
    SELECT COALESCE(SUM(
      CASE WHEN lp."isCompleted" THEN GREATEST(l."durationSec", 0)
           ELSE GREATEST(LEAST(lp."positionSec", l."durationSec"), 0) END
    ), 0)::int AS "learningSec"
    FROM "LessonProgress" lp
    JOIN "Lesson" l ON l."id" = lp."lessonId"
    WHERE lp."userId" = ${userId}
  `);
  return Number(rows[0]?.learningSec ?? 0);
}

/** BR-15: Save = số bookmark; On going = đã ghi danh & < 100 %; Completed = 100 % (BR-05). */
export async function getMyStats(userId: string): Promise<MeStatsDto> {
  const [savedCount, ongoingCount, completedCount, learningSec] = await Promise.all([
    prisma.bookmark.count({ where: { userId } }),
    prisma.enrollment.count({ where: { userId, progressPercent: { lt: 100 } } }),
    prisma.enrollment.count({ where: { userId, progressPercent: 100 } }),
    sumLearningSec(userId),
  ]);
  return { savedCount, ongoingCount, completedCount, learningSec };
}

/** Token còn hạn nhưng tài khoản đã bị xóa (Prisma P2025) -> coi như chưa đăng nhập. */
function rethrowMissingAccount(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    throw ApiError.unauthorized('Account no longer exists');
  }
  throw err;
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<UserDto> {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        // headline rỗng hoặc null -> xóa (lưu NULL).
        ...(input.headline !== undefined ? { headline: input.headline || null } : {}),
      },
      select: userDtoSelect,
    });
    return toUserDto(updated);
  } catch (err) {
    return rethrowMissingAccount(err);
  }
}

/**
 * Lưu avatar vừa upload. DB giữ đường dẫn tương đối `/uploads/<tên file>` (không phụ thuộc
 * PUBLIC_BASE_URL), API trả URL tuyệt đối.
 */
export async function updateAvatar(
  userId: string,
  filename: string,
): Promise<{ avatarUrl: string }> {
  const avatarPath = `/uploads/${filename}`;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarPath },
      select: { id: true },
    });
  } catch (err) {
    return rethrowMissingAccount(err);
  }
  return { avatarUrl: toAbsoluteUrl(avatarPath) };
}

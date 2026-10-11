import type { Prisma } from '@/generated/prisma/client';
import { ApiError } from '@/lib/ApiError';
import { notificationMessage } from '@/lib/notificationMessage';
import { notificationData } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

type CourseNotifyDb = Pick<Prisma.TransactionClient, 'course' | 'follow' | 'notification'>;

/**
 * FR-54 / BR-27: khi khóa được xuất bản LẦN ĐẦU (`publishedAt` vừa được đặt), tạo thông báo `NEW_COURSE`
 * cho mọi người đang theo dõi giảng viên. Chỉ dùng `createMany` (1 câu lệnh), nên gọi trong CÙNG transaction
 * với thao tác duyệt (`db = tx`). Trả số thông báo đã tạo.
 *
 * Tiêu đề / nội dung lưu bằng tiếng Anh làm dự phòng; mobile dịch theo `data.key` + `data.params`.
 * Người theo dõi chính là giảng viên (không xảy ra, CANNOT_FOLLOW_SELF) vẫn bị loại cho chắc.
 */
export async function notifyFollowersOfNewCourse(
  courseId: string,
  db: CourseNotifyDb = prisma,
): Promise<number> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      teacher: { select: { userId: true, user: { select: { fullName: true } } } },
    },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');

  const followers = await db.follow.findMany({
    where: { teacher: { userId: course.teacher.userId }, userId: { not: course.teacher.userId } },
    select: { userId: true },
  });
  if (followers.length === 0) return 0;

  const message = notificationMessage('NEW_COURSE', {
    teacher: course.teacher.user.fullName,
    courseTitle: course.title,
  });
  const data = notificationData(message, { courseId: course.id });
  const result = await db.notification.createMany({
    data: followers.map((follower) => ({
      userId: follower.userId,
      type: message.type,
      title: message.title,
      body: message.body,
      data,
    })),
  });
  return result.count;
}

import { isProduction } from '@/config/env';
import { ApiError } from '@/lib/ApiError';
import { type NotificationMessage, notificationMessage } from '@/lib/notificationMessage';
import { notify } from '@/lib/notify';
import { buildPaginationMeta, getPagination, type PaginationMeta } from '@/lib/pagination';
import { Prisma, prisma } from '@/lib/prisma';
import { toAbsoluteUrl } from '@/lib/url';
import { invalidateHomeCache } from '@/modules/home/home.service';
import type { CheckoutResponseDto, EnrollmentStateDto, OrderDto, PaymentMethod } from '@/types/dto';

import type { CheckoutInput } from './order.schema';

// ---------------------------------------------------------------- Order -> DTO

const orderSelect = {
  id: true,
  totalCents: true,
  status: true,
  paymentMethod: true,
  createdAt: true,
  paidAt: true,
  items: {
    orderBy: { id: 'asc' },
    select: {
      courseId: true,
      priceCents: true,
      course: { select: { id: true, title: true, thumbnailUrl: true } },
    },
  },
} satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

export function toOrderDto(order: OrderRow): OrderDto {
  return {
    id: order.id,
    totalCents: order.totalCents,
    status: order.status,
    paymentMethod: order.paymentMethod as PaymentMethod,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    items: order.items.map((item) => ({
      courseId: item.courseId,
      priceCents: item.priceCents,
      course: {
        id: item.course.id,
        title: item.course.title,
        thumbnailUrl: toAbsoluteUrl(item.course.thumbnailUrl),
      },
    })),
  };
}

// ---------------------------------------------------------------- POST /orders/checkout (BR-07)

type CheckoutOutcome =
  | { kind: 'paid'; result: CheckoutResponseDto }
  | { kind: 'failed'; orderId: string }
  | { kind: 'empty' };

type CartLine = { courseId: string; course: { title: string; priceCents: number } };

/** Thông báo ORDER_PAID: 1 khóa -> ORDER_PAID_ONE (tên khóa), nhiều khóa -> ORDER_PAID_MANY (số khóa). */
export function buildPaidNotification(lines: readonly CartLine[]): {
  message: NotificationMessage;
  courseId: string;
} {
  const [first] = lines;
  return {
    message:
      lines.length === 1
        ? notificationMessage('ORDER_PAID_ONE', { courseTitle: first.course.title })
        : notificationMessage('ORDER_PAID_MANY', { count: lines.length }),
    courseId: first.courseId,
  };
}

async function runCheckout(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CheckoutInput,
): Promise<CheckoutOutcome> {
  const cartLines = await tx.cartItem.findMany({
    where: { userId, course: { status: 'PUBLISHED' } },
    orderBy: [{ addedAt: 'asc' }, { courseId: 'asc' }],
    select: {
      courseId: true,
      course: {
        select: { title: true, priceCents: true, teacher: { select: { userId: true } } },
      },
    },
  });
  // BR-23: giảng viên không mua khóa của chính mình (vd. thêm vào giỏ trước khi trở thành chủ khóa).
  if (cartLines.some((line) => line.course.teacher.userId === userId)) {
    throw ApiError.of('OWN_COURSE', 'Remove your own course from the cart to continue');
  }
  // Khóa đã ghi danh (vd. mua song song ở 2 thiết bị) không bị tính tiền lần nữa.
  const alreadyEnrolled = new Set(
    (
      await tx.enrollment.findMany({
        where: { userId, courseId: { in: cartLines.map((line) => line.courseId) } },
        select: { courseId: true },
      })
    ).map((row) => row.courseId),
  );
  const lines = cartLines.filter((line) => !alreadyEnrolled.has(line.courseId));
  if (lines.length === 0) {
    if (cartLines.length > 0) await tx.cartItem.deleteMany({ where: { userId } });
    return { kind: 'empty' };
  }

  // Cờ giả lập thất bại chỉ dành cho demo/kiểm thử: bỏ qua trên production (Render).
  const isFailure = input.simulateFailure === true && !isProduction;
  const order = await tx.order.create({
    data: {
      userId,
      totalCents: lines.reduce((sum, line) => sum + line.course.priceCents, 0),
      status: isFailure ? 'FAILED' : 'PAID',
      paymentMethod: input.paymentMethod,
      paidAt: isFailure ? null : new Date(),
      items: {
        create: lines.map((line) => ({
          courseId: line.courseId,
          priceCents: line.course.priceCents,
        })),
      },
    },
    select: orderSelect,
  });
  // Thanh toán thất bại: giữ nguyên giỏ, không ghi danh (đơn FAILED vẫn được lưu để tra lịch sử).
  if (isFailure) return { kind: 'failed', orderId: order.id };

  const courseIds = lines.map((line) => line.courseId);
  await tx.enrollment.createMany({
    data: courseIds.map((courseId) => ({ userId, courseId })),
    skipDuplicates: true,
  });
  await tx.course.updateMany({
    where: { id: { in: courseIds } },
    data: { enrollmentCount: { increment: 1 } },
  });
  await tx.cartItem.deleteMany({ where: { userId } });
  const paid = buildPaidNotification(lines);
  await notify(tx, { userId, message: paid.message, refs: { courseId: paid.courseId } });
  return { kind: 'paid', result: { order: toOrderDto(order), enrolledCourseIds: courseIds } };
}

/**
 * BR-07: toàn bộ trong 1 transaction. Giỏ rỗng -> 422 `CART_EMPTY`; thành công -> order PAID, ghi danh
 * từng khóa, tăng `enrollmentCount`, xóa giỏ, thông báo ORDER_PAID; `simulateFailure` -> order FAILED
 * (đã commit) rồi trả 402 `PAYMENT_FAILED`.
 */
export async function checkout(userId: string, input: CheckoutInput): Promise<CheckoutResponseDto> {
  const outcome = await prisma.$transaction((tx) => runCheckout(tx, userId, input));
  if (outcome.kind === 'empty') throw ApiError.of('CART_EMPTY', 'Your cart is empty');
  if (outcome.kind === 'failed') {
    throw ApiError.of('PAYMENT_FAILED', 'Payment failed. You have not been charged.', {
      orderId: outcome.orderId,
    });
  }
  invalidateHomeCache();
  return outcome.result;
}

// ---------------------------------------------------------------- POST /courses/:id/enroll

/** Ghi danh khóa MIỄN PHÍ: 404 · 422 `OWN_COURSE` · 422 `PAID_COURSE` (phải mua qua giỏ) · 409 `ALREADY_ENROLLED`. */
export async function enrollInFreeCourse(
  userId: string,
  courseId: string,
): Promise<EnrollmentStateDto> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: 'PUBLISHED' },
    select: { id: true, priceCents: true, teacher: { select: { userId: true } } },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
  if (course.teacher.userId === userId) {
    throw ApiError.of('OWN_COURSE', 'You cannot enroll in your own course');
  }
  if (course.priceCents > 0) {
    throw ApiError.of('PAID_COURSE', 'This course is not free - add it to your cart to buy it');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.enrollment.create({ data: { userId, courseId }, select: { id: true } });
      await tx.course.update({
        where: { id: courseId },
        data: { enrollmentCount: { increment: 1 } },
        select: { id: true },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw ApiError.of('ALREADY_ENROLLED', 'You are already enrolled in this course');
    }
    throw err;
  }
  invalidateHomeCache();
  return { courseId, progressPercent: 0, lastLessonId: null };
}

// ---------------------------------------------------------------- GET /orders

/** Lịch sử đơn của người dùng, mới nhất trước (kể cả đơn FAILED). */
export async function listOrders(
  userId: string,
  query: { page?: number; limit?: number },
): Promise<{ orders: OrderDto[]; meta: PaginationMeta }> {
  const pagination = getPagination(query);
  const [total, rows] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      select: orderSelect,
    }),
  ]);
  return { orders: rows.map(toOrderDto), meta: buildPaginationMeta(total, pagination) };
}

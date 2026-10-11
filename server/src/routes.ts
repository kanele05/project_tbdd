import { type RequestHandler, Router } from 'express';

import { requireAuth } from '@/middlewares/requireAuth';
import { requireRole } from '@/middlewares/requireRole';

/**
 * [đường dẫn gắn dưới /api/v1, tên module, ...middleware áp dụng cho cả module]
 * Tên module là `<thư mục>` (file `<thư mục>.routes.ts`) hoặc `<thư mục>/<tên file>` (file `<tên file>.routes.ts`).
 */
type ModuleMount = readonly [
  mountPath: string,
  moduleName: string,
  ...middlewares: RequestHandler[],
];

/**
 * ============================================================================
 *  ĐĂNG KÝ MODULE - thêm module mới CHỈ CẦN THÊM 1 DÒNG vào mảng dưới đây.
 * ============================================================================
 *  1. Tạo `src/modules/<tên>/<tên>.routes.ts` và `export const router = Router();`
 *     (routes -> controller -> service; chỉ service được dùng Prisma).
 *  2. Thêm 1 dòng:   ['/<đường-dẫn>', '<tên thư mục module>'],
 *     - Module chỉ có 1 nhóm đường dẫn:      ['/categories', 'category']
 *       (trong router khai báo `router.get('/', ...)` -> GET /api/v1/categories)
 *     - Module có nhiều nhóm đường dẫn khác nhau (vd. /courses/:id/questions và /questions/:id):
 *       gắn ở gốc ['/', 'question'] rồi khai báo ĐẦY ĐỦ đường dẫn trong router
 *       (`router.get('/courses/:id/questions', ...)`).
 *     - Cần middleware cho cả module:        ['/x', 'x', someMiddleware]
 *       (rate limit của auth chỉ gắn riêng cho POST /login, /register trong auth.routes.ts)
 *  Không cần import router ở đâu khác -> không xung đột merge khi nhiều người thêm module.
 *  Sau đó: viết test tại tests/integration/<tên>.test.ts và cập nhật PLAN.md §9 (và mobile/src/types/api.ts nếu đổi DTO).
 * ============================================================================
 */
/** Mọi route giảng viên (`/teacher/*`, `/me/teacher-profile`): đăng nhập + role TEACHER (BR-23). */
const TEACHER_ONLY: readonly RequestHandler[] = [requireAuth, requireRole('TEACHER')];
/** Mọi route quản trị (`/admin/*`): đăng nhập + role ADMIN (BR-23). */
const ADMIN_ONLY: readonly RequestHandler[] = [requireAuth, requireRole('ADMIN')];

const MODULES: readonly ModuleMount[] = [
  ['/health', 'health'],
  ['/auth', 'auth'],
  ['/categories', 'category'],
  ['/tags', 'tag'],
  // ➜ THÊM MODULE MỚI Ở DÒNG NGAY DƯỚI (giữ nguyên comment này để dễ tìm):
  // Module A:
  ['/home', 'home'],
  ['/courses', 'course'],
  ['/teachers', 'teacher'],
  ['/cart', 'cart'],
  ['/me', 'user'],
  ['/me', 'security'], // /me/security, /me/password, /me/sessions, /me/2fa/*
  ['/notifications', 'notification'],
  ['/', 'order'], // /orders/*, /courses/:id/enroll
  ['/', 'project'], // /courses/:id/project, /courses/:id/submissions
  // Module C (gắn ở gốc, khai báo đầy đủ đường dẫn trong router):
  ['/', 'bookmark'],
  ['/', 'lesson'],
  ['/', 'enrollment'],
  ['/', 'review'],
  ['/', 'question'],
  ['/', 'like'],
  // Module AI (Gemini; gắn ở gốc, khai báo đầy đủ đường dẫn trong router):
  ['/', 'ai'],
  // ------------------------------------------------------------------ Giảng viên & Quản trị (PLAN §2.4)
  // Mỗi mount đã gồm requireAuth + requireRole -> router bên trong KHÔNG cần lặp lại, chỉ khai báo route
  // (và guard chủ khóa: `assertCourseOwner` trong service). Mỗi agent chỉ sửa file trong thư mục module của mình.
  ['/teacher/ai', 'ai/courseDraft', ...TEACHER_ONLY], // POST /teacher/ai/course-draft (TA-05)
  ['/teacher', 'studio', ...TEACHER_ONLY], // khóa/chương/bài/duyệt/bản sửa đổi/upload ảnh (TA-02)
  ['/teacher', 'teaching', ...TEACHER_ONLY], // stats, bài nộp + chấm, phản hồi review, ghim Q&A (TA-04)
  ['/me/teacher-profile', 'studio/teacherProfile', ...TEACHER_ONLY], // GET/PATCH hồ sơ giảng viên (TA-02)
  ['/admin/courses', 'ai/courseReview', ...ADMIN_ONLY], // GET /admin/courses/:id/ai-review (TA-05)
  ['/admin', 'admin', ...ADMIN_ONLY], // hàng chờ, duyệt, người dùng, dashboard (TA-03)
];

function loadRouter(moduleName: string): Router {
  // Tải theo tên thư mục để mỗi module tự đăng ký bằng 1 dòng (không cần import ở đây).
  const [dir, file = dir] = moduleName.split('/');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require(`./modules/${dir}/${file}.routes`) as { router?: Router };
  if (!loaded.router) {
    throw new Error(`Module "${moduleName}" must export "router" from its ${file}.routes.ts`);
  }
  return loaded.router;
}

export function createApiRouter(): Router {
  const apiRouter = Router();
  for (const [mountPath, moduleName, ...middlewares] of MODULES) {
    apiRouter.use(mountPath, ...middlewares, loadRouter(moduleName));
  }
  return apiRouter;
}

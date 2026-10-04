import { type RequestHandler, Router } from 'express';

/**
 * [đường dẫn gắn dưới /api/v1, tên thư mục module, ...middleware áp dụng cho cả module]
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
];

function loadRouter(moduleName: string): Router {
  // Tải theo tên thư mục để mỗi module tự đăng ký bằng 1 dòng (không cần import ở đây).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require(`./modules/${moduleName}/${moduleName}.routes`) as { router?: Router };
  if (!loaded.router) {
    throw new Error(`Module "${moduleName}" must export "router" from ${moduleName}.routes.ts`);
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

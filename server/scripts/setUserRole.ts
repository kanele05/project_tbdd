/**
 * Đổi vai trò tài khoản (BR-30) - cách DUY NHẤT tạo ADMIN ở production.
 * Mặc định chạy thử (dry-run); thêm `--apply` để ghi DB. Xem mục "Nâng quyền admin" trong server/README.md.
 *   npm run user:set-role -- --email admin@example.com --role ADMIN [--apply]
 */
import { logger } from '@/lib/logger';
import { disconnectPrisma } from '@/lib/prisma';
import { setUserRole } from '@/modules/user/setUserRole.service';
import { parseSetUserRoleArgs } from '@/modules/user/setUserRoleArgs';

async function main() {
  const { email, role, shouldApply } = parseSetUserRoleArgs(process.argv.slice(2));
  const result = await setUserRole(email, role, shouldApply);
  logger.info(
    result,
    result.applied
      ? 'User role updated'
      : shouldApply
        ? 'Role unchanged (user already has this role)'
        : 'Role dry run - add --apply to write',
  );
}

main()
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : 'Set user role failed');
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);

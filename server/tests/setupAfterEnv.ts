/** Đóng connection pool Prisma (nếu file test có dùng) để Jest thoát sạch, không treo. */
afterAll(async () => {
  const { __prisma: prisma } = globalThis as { __prisma?: { $disconnect: () => Promise<void> } };
  if (prisma) await prisma.$disconnect();
});

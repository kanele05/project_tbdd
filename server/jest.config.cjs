/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Prisma client sinh code có import kiểu './xxx.js' trỏ tới file .ts (chỉ áp dụng cho đường dẫn tương đối)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/server.ts', '!src/**/*.d.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/src/generated/'],
  testTimeout: 30000,
};

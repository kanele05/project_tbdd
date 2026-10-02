import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const relativeDepthRule = {
  group: ['../../../*'],
  message: 'Dùng alias @/ thay cho đường dẫn tương đối quá 2 cấp (CLAUDE.md §6).',
};

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'src/generated/**',
      '.pgdata/**',
      'uploads/**',
      'static/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.jest },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      // CLAUDE.md §6: cấm any, cấm @ts-ignore (chỉ cho @ts-expect-error có lý do)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 5,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // CLAUDE.md §6: không console.log trong code commit (server dùng logger của pino)
      'no-console': 'error',
      // CLAUDE.md §6: thứ tự import = thư viện ngoài -> alias @/ -> tương đối
      'simple-import-sort/imports': [
        'error',
        { groups: [['^node:'], ['^@?\\w'], ['^@/'], ['^\\.']] },
      ],
      'simple-import-sort/exports': 'error',
      'no-restricted-imports': ['error', { patterns: [relativeDepthRule] }],
    },
  },
  {
    // CLAUDE.md §8: chỉ service được dùng Prisma (controller / routes thì không)
    files: ['src/modules/**/*.controller.ts', 'src/modules/**/*.routes.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/prisma', message: 'Chỉ service được dùng Prisma (CLAUDE.md §8).' },
            { name: '@prisma/client', message: 'Chỉ service được dùng Prisma (CLAUDE.md §8).' },
          ],
          patterns: [relativeDepthRule],
        },
      ],
    },
  },
  {
    // Script CLI (seed, db) được phép in ra console
    files: ['scripts/**/*.ts', 'prisma/**/*.ts', 'prisma.config.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);

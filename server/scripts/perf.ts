/**
 * M-29 (server): đo hiệu năng API. Chạy: `npx tsx scripts/perf.ts` (trong server/).
 *
 * Script TỰ KHỞI ĐỘNG server trong cùng tiến trình ở cổng `PERF_PORT` (mặc định 4003), dùng DB
 * trong `.env` (DB dev đã seed) và chỉ gửi request ĐỌC (GET) - không ghi gì vào DB. Chạy cùng
 * tiến trình để gọi được `cache.invalidatePrefix('home:')` giữa các mẫu "cache miss" của GET /home.
 * Request chạy tuần tự bằng `fetch` / `node:http` của Node (không cài thêm thư viện).
 *
 * Đo 3 nhóm số liệu (xem PLAN.md §17.2):
 *   1. GET /home: cache miss vs cache hit (mỗi loại 20 lần; khách và người dùng đăng nhập).
 *   2. p50/p95 các endpoint chính (20 request/endpoint), so với NFR-02 (p95 < 500 ms).
 *   3. Kích thước payload GET /courses?limit=20: gzip vs không nén.
 *
 * Biến môi trường tùy chọn: PERF_PORT, PERF_SAMPLES (mặc định 20).
 */
import { request } from 'node:http';
import os from 'node:os';

import type * as AppModule from '@/app';
import type * as CacheModule from '@/lib/cache';
import type * as PrismaModule from '@/lib/prisma';
import type * as HomeModule from '@/modules/home/home.service';

import type * as UsersModule from '../prisma/seed-data/users';

const PORT = Number(process.env.PERF_PORT ?? 4003);
const SAMPLES = Number(process.env.PERF_SAMPLES ?? 20);
const NFR_P95_MS = 500;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;

// Phải đặt TRƯỚC khi nạp `@/config/env` (đọc process.env một lần khi import).
process.env.PORT = String(PORT);
process.env.LOG_LEVEL = 'silent';

type Json = Record<string, unknown>;
type Stats = { name: string; n: number; min: number; p50: number; p95: number; max: number };

// ---------------------------------------------------------------- Thống kê

/** Percentile theo nearest-rank: phần tử thứ ceil(p * n) của dãy đã sắp tăng dần. */
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1] ?? Number.NaN;
}

function summarize(name: string, durations: readonly number[]): Stats {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    name,
    n: sorted.length,
    min: sorted[0] ?? Number.NaN,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1] ?? Number.NaN,
  };
}

const ms = (value: number): string => value.toFixed(1);

// ---------------------------------------------------------------- HTTP

type Timed = { status: number; durationMs: number; body: string };

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * GET một lần và đo đến khi nhận đủ body. Bị rate limit (429, giới hạn chung 300 request / phút / IP)
 * thì chờ `Retry-After` rồi gọi lại; lần 429 không được tính vào mẫu.
 */
async function timedGet(path: string, token?: string): Promise<Timed> {
  for (;;) {
    const startedAt = performance.now();
    const res = await fetch(`${BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await res.text();
    const durationMs = performance.now() - startedAt;
    if (res.status !== 429) return { status: res.status, durationMs, body };
    const retryAfterSec = Number(res.headers.get('retry-after') ?? '60');
    process.stderr.write(`  (429 rate limit - chờ ${retryAfterSec}s rồi gọi lại)\n`);
    await sleep((Number.isFinite(retryAfterSec) ? retryAfterSec : 60) * 1000 + 500);
  }
}

async function getJson(path: string, token?: string): Promise<Json> {
  const res = await timedGet(path, token);
  if (res.status !== 200)
    throw new Error(`GET ${path} -> ${res.status}: ${res.body.slice(0, 200)}`);
  return JSON.parse(res.body) as Json;
}

/** Số byte THỰC SỰ truyền qua mạng (không tự giải nén) với header Accept-Encoding cho trước. */
function rawBytes(
  path: string,
  acceptEncoding: string,
): Promise<{ bytes: number; encoding: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      `${BASE}${path}`,
      { method: 'GET', headers: { 'Accept-Encoding': acceptEncoding } },
      (res) => {
        let bytes = 0;
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
        });
        res.on('end', () =>
          resolve({ bytes, encoding: String(res.headers['content-encoding'] ?? 'none') }),
        );
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function login(): Promise<string> {
  // require lười: seed-data/media nạp `@/config/env`, phải đợi PORT / LOG_LEVEL đặt xong.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { DEMO_ACCOUNT, SEED_PASSWORD } =
    require('../prisma/seed-data/users') as typeof UsersModule;
  /* eslint-enable @typescript-eslint/no-require-imports */
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEMO_ACCOUNT.email, password: SEED_PASSWORD }),
  });
  if (res.status !== 200) throw new Error(`Đăng nhập tài khoản demo thất bại (${res.status})`);
  const json = (await res.json()) as { data: { token: string } };
  return json.data.token;
}

// ---------------------------------------------------------------- Chọn dữ liệu đo

type Targets = {
  courseId: string;
  teacherId: string;
  /** Bài preview của khóa người demo CHƯA ghi danh -> GET /lessons/:id không ghi `lastLessonId`. */
  lessonId: string;
};

type CourseListItem = { id: string; teacher: { id: string } };

async function pickTargets(token: string): Promise<Targets> {
  const list = (await getJson('/courses?limit=50', token)).data as CourseListItem[];
  const first = list[0];
  if (!first) throw new Error('DB chưa có dữ liệu seed (GET /courses rỗng).');
  for (const course of list) {
    const detail = (await getJson(`/courses/${course.id}`, token)).data as {
      previewLessonId: string | null;
      enrollment: unknown;
    };
    if (detail.previewLessonId && detail.enrollment === null) {
      return {
        courseId: course.id,
        teacherId: course.teacher.id,
        lessonId: detail.previewLessonId,
      };
    }
  }
  throw new Error('Không tìm được khóa có bài preview mà tài khoản demo chưa ghi danh.');
}

// ---------------------------------------------------------------- Đo

async function measure(path: string, token?: string, before?: () => void): Promise<number[]> {
  const durations: number[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    before?.();
    const res = await timedGet(path, token);
    if (res.status !== 200) throw new Error(`GET ${path} -> ${res.status}`);
    durations.push(res.durationMs);
  }
  return durations;
}

function table(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

function environmentLines(): string[] {
  const cpu = os.cpus()[0]?.model.trim() ?? 'unknown';
  return [
    `- Node ${process.version}, ${os.platform()} ${os.release()} (${os.arch()})`,
    `- CPU: ${cpu} (${os.cpus().length} luồng), RAM ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB`,
    `- Server: Express chạy cùng tiến trình với script, cổng ${PORT}, PostgreSQL local (embedded) cùng máy`,
    `- Mẫu mỗi phép đo: ${SAMPLES} request tuần tự; percentile = nearest-rank`,
  ];
}

async function main(): Promise<void> {
  // require (không import tĩnh): biến môi trường PORT / LOG_LEVEL phải có trước khi nạp `@/config/env`.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { createApp } = require('@/app') as typeof AppModule;
  const { cache } = require('@/lib/cache') as typeof CacheModule;
  const { HOME_CACHE_PREFIX } = require('@/modules/home/home.service') as typeof HomeModule;
  const { disconnectPrisma } = require('@/lib/prisma') as typeof PrismaModule;
  /* eslint-enable @typescript-eslint/no-require-imports */

  const server = createApp().listen(PORT);
  await new Promise<void>((resolve) => server.once('listening', resolve));

  try {
    const token = await login();
    const targets = await pickTargets(token);
    const invalidateHome = (): void => {
      cache.invalidatePrefix(HOME_CACHE_PREFIX);
    };

    // Khởi động nguội (kết nối Prisma, JIT) - không tính vào số liệu.
    for (const path of ['/home', '/courses?limit=20', `/courses/${targets.courseId}`]) {
      await timedGet(path, token);
    }

    // 1) GET /home: miss vs hit
    const homeRows: Stats[] = [];
    for (const [label, tok] of [
      ['khách', undefined],
      ['đã đăng nhập', token],
    ] as const) {
      const miss = await measure('/home', tok, invalidateHome);
      invalidateHome();
      await timedGet('/home', tok); // nạp cache
      const hit = await measure('/home', tok);
      homeRows.push(summarize(`GET /home (${label}) - cache miss`, miss));
      homeRows.push(summarize(`GET /home (${label}) - cache hit`, hit));
    }

    // 2) Các endpoint chính
    const endpoints: readonly { name: string; path: string; token?: string }[] = [
      { name: 'GET /home (cache hit, đăng nhập)', path: '/home', token },
      { name: 'GET /courses?q=design&limit=20 (tìm kiếm)', path: '/courses?q=design&limit=20' },
      { name: 'GET /courses?limit=20 (danh sách)', path: '/courses?limit=20' },
      {
        name: 'GET /courses/:id (chi tiết, đăng nhập)',
        path: `/courses/${targets.courseId}`,
        token,
      },
      {
        name: 'GET /courses/:id/curriculum',
        path: `/courses/${targets.courseId}/curriculum`,
        token,
      },
      { name: 'GET /courses/:id/reviews', path: `/courses/${targets.courseId}/reviews` },
      { name: 'GET /teachers/:id', path: `/teachers/${targets.teacherId}` },
      { name: 'GET /cart', path: '/cart', token },
      { name: 'GET /me/courses', path: '/me/courses', token },
      { name: 'GET /lessons/:id (bài preview)', path: `/lessons/${targets.lessonId}`, token },
      { name: 'GET /notifications', path: '/notifications', token },
    ];
    const endpointRows: Stats[] = [];
    for (const endpoint of endpoints) {
      endpointRows.push(summarize(endpoint.name, await measure(endpoint.path, endpoint.token)));
    }

    // 3) Payload gzip vs không nén
    const listPath = '/courses?limit=20';
    const plain = await rawBytes(listPath, 'identity');
    const gzip = await rawBytes(listPath, 'gzip');
    const saved = ((plain.bytes - gzip.bytes) / plain.bytes) * 100;

    // ---------------------------------------------------------- In kết quả
    const out: string[] = [];
    out.push('## Môi trường', ...environmentLines(), '');
    out.push('## 1. GET /home: cache miss vs cache hit (ms)');
    out.push(
      table(
        ['Phép đo', 'n', 'min', 'p50', 'p95', 'max'],
        homeRows.map((r) => [r.name, String(r.n), ms(r.min), ms(r.p50), ms(r.p95), ms(r.max)]),
      ),
      '',
    );
    out.push(`## 2. p50 / p95 các endpoint chính (ms), NFR-02: p95 < ${NFR_P95_MS} ms`);
    out.push(
      table(
        ['Endpoint', 'n', 'p50', 'p95', 'max', `p95 < ${NFR_P95_MS}`],
        endpointRows.map((r) => [
          r.name,
          String(r.n),
          ms(r.p50),
          ms(r.p95),
          ms(r.max),
          r.p95 < NFR_P95_MS ? 'Đạt' : 'KHÔNG đạt',
        ]),
      ),
      '',
    );
    out.push('## 3. Payload GET /courses?limit=20');
    out.push(
      table(
        ['Chế độ', 'Content-Encoding', 'Bytes'],
        [
          ['Không nén (Accept-Encoding: identity)', plain.encoding, String(plain.bytes)],
          ['gzip (Accept-Encoding: gzip)', gzip.encoding, String(gzip.bytes)],
        ],
      ),
      `Giảm: ${saved.toFixed(1)} %`,
    );
    process.stdout.write(`${out.join('\n')}\n`);
  } finally {
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeAllConnections();
    await closed;
    await disconnectPrisma();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});

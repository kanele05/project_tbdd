/**
 * Quản lý PostgreSQL local không cần Docker / cài đặt (dùng binary của `embedded-postgres`).
 *
 *   npm run db:start    khởi tạo (lần đầu) + chạy PostgreSQL nền + tạo 2 DB `elearning`, `elearning_test`
 *   npm run db:stop     dừng PostgreSQL
 *   npm run db:status   xem trạng thái
 *
 * Dữ liệu nằm ở `server/.pgdata/` (đã gitignore). Cổng mặc định 5433 (đổi bằng biến PG_PORT).
 * Chỉ dùng cho phát triển local; deploy dùng Neon (chỉ cần đổi DATABASE_URL trong .env).
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Client } from 'pg';

const SERVER_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(SERVER_DIR, '.pgdata');
const LOG_FILE = path.join(SERVER_DIR, '.pgdata.log');
const PORT = Number(process.env.PG_PORT ?? 5433);
const USER = 'postgres';
const PASSWORD = process.env.PG_PASSWORD ?? 'postgres';
const DATABASES = ['elearning', 'elearning_test'];

type Binaries = { pg_ctl: string; initdb: string; postgres: string };

const PLATFORM_PACKAGES: Record<string, string> = {
  'win32-x64': '@embedded-postgres/windows-x64',
  'darwin-arm64': '@embedded-postgres/darwin-arm64',
  'darwin-x64': '@embedded-postgres/darwin-x64',
  'linux-x64': '@embedded-postgres/linux-x64',
  'linux-arm64': '@embedded-postgres/linux-arm64',
};

async function loadBinaries(): Promise<Binaries> {
  const key = `${os.platform()}-${os.arch()}`;
  const pkg = PLATFORM_PACKAGES[key];
  if (!pkg) throw new Error(`Nền tảng ${key} chưa được hỗ trợ bởi embedded-postgres`);
  return (await import(pkg)) as Binaries;
}

function run(bin: string, args: string[], options: { silent?: boolean } = {}) {
  // stdio 'ignore' (không phải 'pipe'/'inherit') để tiến trình postgres chạy nền KHÔNG kế thừa
  // handle stdout của lệnh gọi -> nếu không, terminal/CI sẽ chờ mãi tới khi postgres thoát.
  return spawnSync(bin, args, {
    stdio: options.silent ? 'ignore' : 'pipe',
    encoding: 'utf8',
    windowsHide: true,
  });
}

function isInitialised(): boolean {
  return fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
}

function isRunning(bin: Binaries): boolean {
  if (!isInitialised()) return false;
  return run(bin.pg_ctl, ['status', '-D', DATA_DIR]).status === 0;
}

function initialise(bin: Binaries): void {
  const pwFile = path.join(os.tmpdir(), `pg-pw-${crypto.randomBytes(6).toString('hex')}`);
  fs.writeFileSync(pwFile, `${PASSWORD}\n`);
  try {
    const base = [
      `--pgdata=${DATA_DIR}`,
      '--auth=scram-sha-256',
      `--username=${USER}`,
      `--pwfile=${pwFile}`,
      '--encoding=UTF8',
      '--lc-messages=C',
    ];
    // Ưu tiên ICU en-US để ILIKE/lower() hoạt động đúng với chữ có dấu; lỗi thì dùng locale C.
    let result = run(bin.initdb, [
      ...base,
      '--locale-provider=icu',
      '--icu-locale=en-US',
      '--locale=C',
    ]);
    if (result.status !== 0) {
      fs.rmSync(DATA_DIR, { recursive: true, force: true });
      result = run(bin.initdb, [...base, '--locale=C']);
    }
    if (result.status !== 0) {
      throw new Error(`initdb thất bại:\n${result.stdout}\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(pwFile, { force: true });
  }
}

async function ensureDatabases(): Promise<void> {
  const client = new Client({
    host: '127.0.0.1',
    port: PORT,
    user: USER,
    password: PASSWORD,
    database: 'postgres',
  });
  await client.connect();
  try {
    for (const name of DATABASES) {
      const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
      if (found.rowCount === 0) {
        await client.query(`CREATE DATABASE "${name}"`);
        console.log(`  + đã tạo database "${name}"`);
      }
    }
  } finally {
    await client.end();
  }
}

async function start(): Promise<void> {
  const bin = await loadBinaries();
  if (!isInitialised()) {
    console.log('Khởi tạo cụm PostgreSQL mới tại', DATA_DIR);
    initialise(bin);
  }
  if (isRunning(bin)) {
    console.log(`PostgreSQL đã chạy sẵn (cổng ${PORT}).`);
  } else {
    const result = run(
      bin.pg_ctl,
      [
        'start',
        '-D',
        DATA_DIR,
        '-l',
        LOG_FILE,
        '-w',
        '-t',
        '60',
        '-o',
        `-p ${PORT} -c listen_addresses=127.0.0.1`,
      ],
      { silent: true },
    );
    if (result.status !== 0) {
      throw new Error(`Không khởi động được PostgreSQL. Xem log: ${LOG_FILE}`);
    }
  }
  await ensureDatabases();
  console.log(`PostgreSQL sẵn sàng tại 127.0.0.1:${PORT}`);
  for (const name of DATABASES) {
    console.log(`  postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${name}?schema=public`);
  }
}

async function stop(): Promise<void> {
  const bin = await loadBinaries();
  if (!isRunning(bin)) {
    console.log('PostgreSQL không chạy.');
    return;
  }
  const result = run(bin.pg_ctl, ['stop', '-D', DATA_DIR, '-m', 'fast', '-w', '-t', '60']);
  if (result.status !== 0) throw new Error('Không dừng được PostgreSQL (xem log).');
  console.log('Đã dừng PostgreSQL.');
}

async function status(): Promise<void> {
  const bin = await loadBinaries();
  console.log(isRunning(bin) ? `PostgreSQL đang chạy (cổng ${PORT}).` : 'PostgreSQL không chạy.');
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'start') return start();
  if (command === 'stop') return stop();
  if (command === 'status') return status();
  console.log('Cách dùng: tsx scripts/db.ts <start|stop|status>');
  process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

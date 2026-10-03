# E-Learning Server

REST API cho E-Learning App: **Node.js + Express 5 + TypeScript (strict) + Prisma 7 + PostgreSQL**.
Đặc tả API/DB và quy ước code nằm trong tài liệu nội bộ của nhóm (`PLAN.md`, `CLAUDE.md` — không đưa lên repo).

## 1. Yêu cầu

- Node.js ≥ 20 (đã chạy với v24), npm ≥ 10.
- **Không cần** Docker / cài PostgreSQL / tài khoản Neon để phát triển local: dùng PostgreSQL nhúng (`embedded-postgres`) qua `npm run db:start`.
- Windows / macOS / Linux (x64, arm64) đều được hỗ trợ bởi `embedded-postgres`.

## 2. Cài đặt lần đầu

```bash
cd server
npm install                 # tự chạy `prisma generate` (postinstall) -> src/generated/prisma (gitignored)
cp .env.example .env        # rồi đổi JWT_SECRET (>= 32 ký tự ngẫu nhiên)
cp .env.test.example .env.test
npm run db:start            # khởi động PostgreSQL local + tạo 2 database (xem 3)
npm run db:migrate          # áp migration lên DB `elearning` (lần đầu: prisma migrate dev)
npm run db:migrate:test     # áp migration lên DB test `elearning_test`
npm run prisma:seed         # nạp dữ liệu mẫu (idempotent)
npm run dev                 # http://localhost:4000/api/v1/health
```

Sinh JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 3. Database local (embedded-postgres)

| Lệnh                | Tác dụng                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:start`  | Lần đầu `initdb` vào `server/.pgdata/` (gitignored), chạy PostgreSQL nền, tạo DB `elearning` (dev) và `elearning_test` (test) nếu chưa có |
| `npm run db:stop`   | Dừng PostgreSQL (dữ liệu giữ nguyên)                                                                                                      |
| `npm run db:status` | Xem đang chạy hay không                                                                                                                   |

- Cổng mặc định **5433** (tránh trùng PostgreSQL cài sẵn ở 5432); đổi bằng biến môi trường `PG_PORT` (nhớ sửa `DATABASE_URL`). User/mật khẩu local: `postgres` / `postgres`.
- Chuỗi kết nối mặc định:
  `postgresql://postgres:postgres@localhost:5433/elearning?schema=public` (dev) và `.../elearning_test?...` (test).
- Log của PostgreSQL: `server/.pgdata.log`. Xóa hẳn dữ liệu: `npm run db:stop` rồi xóa thư mục `server/.pgdata/`.
- Máy khởi động lại thì chạy lại `npm run db:start`.
- **Vì sao không dùng `prisma dev`?** Đã thử: chạy được nhưng mọi tên database trong URL đều trỏ về **cùng một** instance PGlite (không tách được `elearning` / `elearning_test`) và xử lý truy vấn tuần tự. Vì vậy dùng PostgreSQL thật (embedded-postgres).

### Đổi sang Neon (hoặc PostgreSQL khác)

Chỉ cần sửa `DATABASE_URL` trong `.env` (và `.env.test` trỏ tới **branch/DB riêng** cho test):

```
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx.aws.neon.tech/neondb?sslmode=require
```

Sau đó `npm run db:migrate:deploy` (áp migration) và `npm run prisma:seed`. Code không đổi. Seed từ chối chạy khi `NODE_ENV=production` (cần `SEED_FORCE=1`).

## 4. Dữ liệu mẫu và tài khoản demo

`npm run prisma:seed` (hoặc `npx prisma db seed`) **xóa toàn bộ dữ liệu rồi tạo lại**; chạy nhiều lần cho cùng kết quả (ID cố định, PRNG có seed). Nội dung ở `prisma/seed-data/*.ts`:

6 danh mục · 16 tag (7 hot) · 9 giảng viên · 30 khóa (3 miễn phí, 5 best-seller, có khóa giảm giá) · 93 chương / 290 bài (2 bài đầu `isPreview`) · 20 học viên · ~250 review · ~140 câu hỏi / ~260 trả lời · 2 tài liệu/khóa · ~210 bài nộp · 3 banner. Toàn bộ trường denormalize được tính lại bằng `recomputeDenormalized()` (`src/lib/denormalize.ts`).

|                    |                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Tài khoản demo** | `martha.rosie@example.com` / `Learn2026` (mật khẩu TEST dùng chung cho **mọi** user seed, định nghĩa trong `prisma/seed-data/users.ts`) |
| Ghi danh           | UX Foundation 30 % · Creative Art Design 70 % · Palettes for Your App 100 % · Typography in UI Design 50 % (khớp design My Courses)     |
| Đã lưu             | Product Design · Website Design · Mobile UI Design · Digital Portrait (khớp design User Profile)                                        |
| Thông báo          | 3 (2 chưa đọc)                                                                                                                          |
| Giảng viên         | `ramono.wultschner@example.com`, `sara.weise@example.com`... (cùng mật khẩu)                                                            |

- **Ảnh:** URL Unsplash trực tiếp (đã kiểm tra HTTP 200 và xem thử khớp chủ đề) và `randomuser.me` cho avatar. Không tải ảnh về repo.
- **Video:** 5 clip MP4 công khai (test-videos.co.uk, MDN CC0, Blender) dùng lặp lại; `durationSec` = thời lượng thật đọc từ header MP4 (10 s / 10 s / 10 s / 5 s / 52 s). Danh sách ở `prisma/seed-data/media.ts`.
- **Tài liệu:** `static/resources/Document 1.txt`, `Document 2.pdf` (sinh bằng `npx tsx scripts/generateResources.ts`); URL build từ `PUBLIC_BASE_URL` **tại thời điểm seed** → đổi `PUBLIC_BASE_URL` (vd sang IP LAN) thì chạy lại seed.

## 5. Scripts

| Script                                          | Mô tả                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                   | `tsx watch src/server.ts` (tự reload)                                                                         |
| `npm run build` / `npm start`                   | Biên dịch `tsc` + `tsc-alias` ra `dist/`, chạy `node dist/server.js`                                          |
| `npm run typecheck` / `lint` / `format`         | `tsc --noEmit` · ESLint (flat config) · Prettier                                                              |
| `npm test`                                      | Toàn bộ test (unit + integration) tuần tự (`--runInBand`) trên DB `elearning_test`                            |
| `npm run test:unit`                             | Chỉ unit test (`src/**`), **không cần DB**                                                                    |
| `npm run test:integration` / `test:coverage`    | Integration test · kèm coverage                                                                               |
| `npm run db:migrate -- --name <ten>`            | `prisma migrate dev` - tạo + áp migration mới (đổi `prisma/schema.prisma`)                                    |
| `npm run db:migrate:deploy` / `db:migrate:test` | Áp migration lên DB dev / test                                                                                |
| `npm run db:reset`                              | `prisma migrate reset --force` (xóa sạch DB dev; chỉ người thật chạy - Prisma CLI chặn khi chạy bởi AI agent) |
| `npm run db:seed` / `prisma:seed`               | Seed                                                                                                          |
| `npm run db:studio`                             | Prisma Studio                                                                                                 |

**Test:** `tests/globalSetup.ts` chạy `prisma migrate deploy` + TRUNCATE mọi bảng trên DB test (từ chối chạy nếu tên DB không chứa `test`); mỗi file integration test gọi `resetDb()` trong `beforeEach`. Jest chạy với `--experimental-vm-modules` (bắt buộc để Prisma 7 nạp WASM query compiler). Cache server bị tắt khi `NODE_ENV=test`.

## 6. Cấu trúc

```
server/
├── prisma/            schema.prisma · migrations/ · seed.ts · seed-data/ (dữ liệu + bộ sinh hoạt động)
├── prisma.config.ts   URL DB, đường dẫn migration/seed (Prisma 7)
├── scripts/           db.ts (PostgreSQL local) · generateResources.ts
├── static/            tài liệu/video mẫu phục vụ tại /static
├── uploads/           file người dùng upload (gitignored), phục vụ tại /uploads
├── src/
│   ├── app.ts         createApp(): helmet, cors, compression, logger, static, /api/v1, notFound, errorHandler
│   ├── server.ts      listen + tắt êm
│   ├── routes.ts      ĐĂNG KÝ MODULE (1 dòng / module)
│   ├── config/env.ts  zod parse process.env (.env hoặc .env.test khi NODE_ENV=test)
│   ├── lib/           prisma · jwt · password · ApiError · errorCodes · pagination · response · cache · logger · mappers · url · bookmarkedIds · denormalize
│   ├── middlewares/   validate · requireAuth (+optionalAuth) · errorHandler · notFound · upload · rateLimit
│   ├── modules/<tên>/ <tên>.routes.ts · .controller.ts · .service.ts · .schema.ts · .service.test.ts
│   ├── types/         dto.ts (DTO trả về) · auth.ts · express.d.ts (req.user)
│   └── generated/     Prisma Client (sinh tự động, gitignored)
└── tests/             integration/ · helpers/ (testApp, resetDb, factories, authHelper) · globalSetup.ts
```

Alias `@/` → `src/` hoạt động ở dev (tsx), build (tsc-alias), test (Jest `moduleNameMapper`) và typecheck (`paths`).

## 7. Endpoint hiện có

Base URL `/api/v1`. Thành công `{ data, meta? }`, lỗi `{ error: { code, message, details? } }`.

| Method & path                     | Auth | Ghi chú                                                                                           |
| --------------------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| `GET /health`                     | —    | `{ data: { status: 'ok', db: 'ok' } }`; DB hỏng → 503 `{ data: { status: 'error', db: 'down' } }` |
| `POST /auth/register`             | —    | `{ fullName, email, password }` → 201 `{ token, user }`; 409 `EMAIL_TAKEN`                        |
| `POST /auth/login`                | —    | → 200 `{ token, user }`; 401 `INVALID_CREDENTIALS`                                                |
| `GET /auth/me`                    | ✓    | `UserDto`; 401 `UNAUTHORIZED`                                                                     |
| `GET /categories`                 | —    | 6 danh mục + `courseCount` (cache 60 s)                                                           |
| `GET /tags/hot`                   | —    | tag `isHot` (cache 60 s)                                                                          |
| `GET /static/*`, `GET /uploads/*` | —    | file tĩnh (hỗ trợ HTTP Range cho video)                                                           |

Rate limit: `POST /auth/login` + `POST /auth/register` **10 request/phút/IP** (dùng chung bộ đếm; `GET /auth/me` không bị giới hạn) → 429 `RATE_LIMITED`; toàn bộ API 300 request/phút/IP. Tắt khi test.

### Quyết định thiết kế bổ sung (PLAN §9 chưa nêu - cần đồng bộ vào PLAN nếu nhóm đồng ý)

- : không có header = khách; **có header nhưng token sai/hết hạn = 401 ** (để mobile đăng xuất đúng lúc).
- Route không tồn tại → 404 ; body JSON > 100 KB → 413 ; JSON hỏng → 400 ; Prisma P2002 → 409 , P2025 → 404 .
- = mảng .
- trả (lỗi: 503, ).
- vẫn có giá trị khi nếu khóa có giá gốc cao hơn; giảm giá làm tròn về 0 % thì coi như không giảm.
- = trung bình cộng các khóa đã publish có đánh giá (làm tròn 1 chữ số); = tổng .

### Quyết định thiết kế bổ sung (PLAN §9 chưa nêu - cần đồng bộ vào PLAN nếu nhóm đồng ý)

- `optionalAuth`: không có header `Authorization` = khách; **có header nhưng token sai/hết hạn = 401 `UNAUTHORIZED`** (để mobile đăng xuất đúng lúc).
- Route không tồn tại → 404 `NOT_FOUND`; body JSON > 100 KB → 413 `PAYLOAD_TOO_LARGE`; JSON hỏng → 400 `VALIDATION_ERROR`; Prisma P2002 → 409 `CONFLICT`, P2025 → 404 `NOT_FOUND`.
- `VALIDATION_ERROR.details` = mảng `{ source: 'body' | 'query' | 'params', field, message }`.
- `GET /health` trả `db: 'ok'` (DB lỗi: 503 với `status: 'error', db: 'down'`).
- `discountPercent` vẫn có giá trị khi `badge = 'BEST_SELLER'` nếu khóa có giá gốc cao hơn; giảm giá làm tròn về 0 % thì coi như không giảm.
- `TeacherSummary.ratingAvg` = trung bình cộng `ratingAvg` các khóa đã publish có đánh giá (làm tròn 1 chữ số); `ratingCount` = tổng `ratingCount`.

## 8. Helper dùng chung cho các module

| Helper                                                                                                                                                                                                    | Vị trí                                 | Dùng để                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiError(status, code, message, details?)`, `ApiError.of(code, message)`, `.notFound/.forbidden/.conflict/.unprocessable/.unauthorized`                                                                  | `lib/ApiError.ts`, `lib/errorCodes.ts` | Ném lỗi nghiệp vụ; `ERROR_STATUS` là bảng mã lỗi → HTTP status (PAYMENT_FAILED 402, FILE_TOO_LARGE 413, UNSUPPORTED_FILE_TYPE 415, RATE_LIMITED 429...) |
| `validate({ body?, query?, params? })`                                                                                                                                                                    | `middlewares/validate.ts`              | zod; dữ liệu đã parse ghi đè `req.body/query/params`; lỗi 400 `details: [{source, field, message}]`                                                     |
| `requireAuth`, `optionalAuth`, `getAuthUser(req)`                                                                                                                                                         | `middlewares/requireAuth.ts`           | JWT Bearer; `optionalAuth`: không header = khách, token sai = 401                                                                                       |
| `ok(res, data, meta?)`, `created(...)`, `noContent(res)`                                                                                                                                                  | `lib/response.ts`                      | Định dạng `{ data, meta }`                                                                                                                              |
| `paginationQuery` (zod), `getPagination(query)` → `{page, limit, skip, take}`, `buildPaginationMeta(total, pagination)`                                                                                   | `lib/pagination.ts`                    | Phân trang, limit ≤ 50                                                                                                                                  |
| `cache.wrap(key, ttlMs, loader)`, `cache.invalidatePrefix(prefix)`, `cache.delete/clear`                                                                                                                  | `lib/cache.ts`                         | Cache TTL trong bộ nhớ (lru-cache)                                                                                                                      |
| `upload.single('file')`, `createUpload({ maxSizeBytes, allowedMimeTypes })`, `IMAGE_MIME_TYPES`, `uploadedFileUrl(filename)`                                                                              | `middlewares/upload.ts`                | Upload ≤ 10 MB, whitelist png/jpg/pdf/zip/txt vào `uploads/`                                                                                            |
| `toCourseSummary(row, { bookmarkedIds })`, `courseSummarySelect`, `toTeacherSummary(row)`, `teacherSummarySelect`, `toUserDto(row)`, `userDtoSelect`, `toCategoryDto`, `toTagDto`, `computeBadge(course)` | `lib/mappers.ts`                       | Mapper + Prisma `select` chuẩn; BR-10                                                                                                                   |
| `getBookmarkedIds(userId, courseIds)`                                                                                                                                                                     | `lib/bookmarkedIds.ts`                 | 1 query cho cả danh sách → truyền vào `toCourseSummary`                                                                                                 |
| `toAbsoluteUrl(path)`                                                                                                                                                                                     | `lib/url.ts`                           | `/static/...` → URL tuyệt đối theo `PUBLIC_BASE_URL`                                                                                                    |
| `recomputeDenormalized()`                                                                                                                                                                                 | `lib/denormalize.ts`                   | Tính lại ratingAvg/Count, enrollmentCount, lessonCount, totalDurationSec, likeCount, answerCount                                                        |
| `signToken`, `verifyToken`, `hashPassword`, `verifyPassword`                                                                                                                                              | `lib/jwt.ts`, `lib/password.ts`        | JWT 7 ngày (HS256), bcryptjs cost 10                                                                                                                    |
| `createTestApi()`, `resetDb()`, `authHeader(user)`, `createUser/Teacher/Category/Tag/Course/CourseWithLessons/Enrollment/Bookmark`                                                                        | `tests/helpers/*`                      | Viết integration test                                                                                                                                   |

## 9. Cách thêm module mới (checklist)

Ví dụ module `bookmark`:

1. Tạo thư mục `src/modules/bookmark/` gồm `bookmark.schema.ts` (zod) · `bookmark.service.ts` (**chỉ service** được import `@/lib/prisma` - ESLint chặn ở controller/routes) · `bookmark.controller.ts` (req/res, dùng `ok/created/noContent`) · `bookmark.routes.ts` với `export const router = Router();` và middleware `requireAuth`/`validate`.
2. **Đăng ký bằng đúng 1 dòng** trong mảng `MODULES` của `src/routes.ts` (không cần import):
   - `['/categories', 'category']` → router khai báo `router.get('/', ...)`;
   - module nhiều nhóm đường dẫn (`/courses/:id/bookmark`, `/me/bookmarks`) → `['/', 'bookmark']` rồi khai báo **đầy đủ** đường dẫn trong router.
3. Ném lỗi bằng `ApiError.of('COURSE_NOT_FOUND', '...')`; trả DTO qua mapper trong `lib/mappers.ts` (thiếu thì thêm mapper + `select` dùng chung, không tự nhân bản).
4. Đổi DB: sửa `prisma/schema.prisma` → `npm run db:migrate -- --name <ten>` → `npm run db:migrate:test`; báo owner schema (A), 1 migration/PR; cập nhật PLAN.md §8.2.
5. Test: unit test service (mock `@/lib/prisma`, mẫu `auth.service.test.ts`) + integration test `tests/integration/<module>.test.ts` (mẫu `auth.test.ts`, `catalog.test.ts`; happy path + ≥ 1 case lỗi); `npm run typecheck && npm run lint && npm test`.
6. Cập nhật đặc tả endpoint/DTO/mã lỗi ở PLAN.md §9 (và `mobile/src/types/api.ts` nếu đổi DTO), rồi tick task trong PLAN.md.

## 10. Biến môi trường

| Biến              | Mặc định                  | Ghi chú                                                                                                    |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`        | `development`             | `test` → dùng `.env.test`, tắt cache/rate limit/log                                                        |
| `PORT`            | `4000`                    |                                                                                                            |
| `DATABASE_URL`    | — (bắt buộc)              | Local: `postgresql://postgres:postgres@localhost:5433/elearning?schema=public`; Neon: có `sslmode=require` |
| `JWT_SECRET`      | — (bắt buộc, ≥ 32 ký tự)  |                                                                                                            |
| `JWT_EXPIRES_IN`  | `7d`                      |                                                                                                            |
| `CORS_ORIGIN`     | `*`                       | Có thể liệt kê nhiều origin, phân cách dấu phẩy                                                            |
| `PUBLIC_BASE_URL` | `http://localhost:<PORT>` | Đặt `http://<IP-LAN>:4000` để điện thoại tải được ảnh/tài liệu                                             |
| `UPLOAD_DIR`      | `uploads`                 |                                                                                                            |
| `LOG_LEVEL`       | tùy môi trường            | `debug` (dev) / `info` (prod) / `silent` (test)                                                            |

## 11. Xử lý sự cố

- **`Invalid environment variables`** khi khởi động: thiếu `.env` hoặc `JWT_SECRET` < 32 ký tự.
- **`Không reset được DB test` / `ECONNREFUSED 5433`**: chưa chạy `npm run db:start`.
- **Cổng 5433 bị chiếm**: đặt `PG_PORT` khác cho `db:start` và sửa `DATABASE_URL` ở cả `.env`, `.env.test`.
- **`npm run db:start` treo trên Windows**: đã xử lý bằng cách chạy `pg_ctl` với stdio `ignore`; nếu vẫn treo, xem `server/.pgdata.log`.
- **Jest báo `A dynamic import callback was invoked without --experimental-vm-modules`**: chạy test bằng `npm test` (đã cấu hình cờ), không gọi `jest` trực tiếp.
- **Thiếu `src/generated/prisma`**: `npm run db:generate`.
- Cảnh báo `npm audit` (mysql2, deepmerge-ts) đến từ Prisma CLI (devDependency), không nằm trong runtime của server.

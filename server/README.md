# E-Learning Server

REST API cho E-Learning App: **Node.js + Express 5 + TypeScript (strict) + Prisma 7 + PostgreSQL**.
Triển khai production (Docker Compose, HTTPS, giám sát, CI/CD): xem [../deploy/README.md](../deploy/README.md). App di động/web: [../mobile/README.md](../mobile/README.md).

## 1. Yêu cầu

- Node.js ≥ 20 (đã chạy với v24), npm ≥ 10.
- **Không cần** Docker / cài PostgreSQL / tài khoản dịch vụ database để phát triển local: dùng PostgreSQL nhúng (`embedded-postgres`) qua `npm run db:start`.
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

### Dùng PostgreSQL khác (vd. dịch vụ PostgreSQL trên cloud)

Chỉ cần sửa `DATABASE_URL` trong `.env` (và `.env.test` trỏ tới **branch/DB riêng** cho test):

```
DATABASE_URL=postgresql://USER:PASSWORD@host.example.com:5432/elearning?sslmode=require
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
- **Video xem thử:** 2 bài đầu của mỗi khóa là 2 đoạn YouTube riêng (cùng một video đã kiểm tra phát được), khai báo ở `prisma/seed-data/externalCoursePreviewManifest.json`; các bài còn lại dùng clip MP4 bên dưới.
- **Video:** 5 clip MP4 công khai (test-videos.co.uk, MDN CC0, Blender) dùng lặp lại; `durationSec` = thời lượng thật đọc từ header MP4 (10 s / 10 s / 10 s / 5 s / 52 s). Danh sách ở `prisma/seed-data/media.ts`.
- **Tài liệu:** `static/resources/Document 1.txt`, `Document 2.pdf` (sinh bằng `npx tsx scripts/generateResources.ts`); URL build từ `PUBLIC_BASE_URL` **tại thời điểm seed** → đổi `PUBLIC_BASE_URL` (vd sang IP LAN) thì chạy lại seed.

## 5. Scripts

| Script                                              | Mô tả                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                       | `tsx watch src/server.ts` (tự reload)                                                                         |
| `npm run build` / `npm start`                       | Biên dịch `tsc` + `tsc-alias` ra `dist/`, chạy `node dist/server.js`                                          |
| `npm run typecheck` / `lint` / `format`             | `tsc --noEmit` · ESLint (flat config) · Prettier                                                              |
| `npm test`                                          | Toàn bộ test (unit + integration) tuần tự (`--runInBand`) trên DB `elearning_test`                            |
| `npm run test:unit`                                 | Chỉ unit test (`src/**`), **không cần DB**                                                                    |
| `npm run test:integration` / `test:coverage`        | Integration test · kèm coverage                                                                               |
| `npm run db:migrate -- --name <ten>`                | `prisma migrate dev` - tạo + áp migration mới (đổi `prisma/schema.prisma`)                                    |
| `npm run db:migrate:deploy` / `db:migrate:test`     | Áp migration lên DB dev / test                                                                                |
| `npm run db:reset`                                  | `prisma migrate reset --force` (xóa sạch DB dev; chỉ người thật chạy - Prisma CLI chặn khi chạy bởi AI agent) |
| `npm run db:seed` / `prisma:seed`                   | Seed                                                                                                          |
| `npm run db:studio`                                 | Prisma Studio                                                                                                 |
| `npm run previews:dry-run` / `previews:apply`       | Cập nhật video xem thử YouTube (dry-run / ghi DB) - xem mục 5.1                                               |
| `npm run user:set-role -- --email <e> --role <R>`   | Đổi vai trò tài khoản (tạo ADMIN) - dry-run, thêm `--apply` để ghi - xem mục 5.2                              |
| `npm run notifications:backfill:dry-run` / `:apply` | Gắn khóa dịch (`data.key`) cho thông báo cũ (dry-run / ghi DB) - xem mục 5.3                                  |

**Test:** `tests/globalSetup.ts` chạy `prisma migrate deploy` + TRUNCATE mọi bảng trên DB test (từ chối chạy nếu tên DB không chứa `test`); mỗi file integration test gọi `resetDb()` trong `beforeEach`. Jest chạy với `--experimental-vm-modules` (bắt buộc để Prisma 7 nạp WASM query compiler). Cache server bị tắt khi `NODE_ENV=test`.

### 5.1 Cập nhật video xem thử YouTube (không reseed)

Mỗi khóa có 2 bài xem thử (`les_<slug>_01`, `_02`), mỗi bài một đoạn YouTube riêng của cùng một video. Hợp đồng manifest (`prisma/seed-data/externalCoursePreviewManifest.json`, 30 mục, `.strict()`): `slug`, `videoId`, `title`, `creator`, `playbackVerified: true`, `verifiedAt`, `excerpts` = đúng 2 đoạn `{ startSeconds, endSeconds }`, mỗi đoạn 45-180 giây, đoạn 2 bắt đầu **sau hoặc đúng lúc** đoạn 1 kết thúc (không chồng nhau). Updater chỉ chấp nhận URL `https://www.youtube.com/watch?...`, không còn chế độ MP4 và **bắt buộc** `--external-manifest`. Mặc định là dry-run; chỉ ghi DB khi có `--apply`. Updater chạy trong 1 transaction, idempotent (lần 2 báo `changedLessons: 0`), kiểm tra bài thuộc đúng khóa và tính lại `totalDurationSec` của khóa. Không ảnh hưởng người dùng, ghi danh, tiến độ học.

**Dev** (từ `server/`, DB trong `.env`):

```bash
npm run previews:dry-run   # xem sẽ đổi bao nhiêu bài (log "Preview dry run", changedLessons)
npm run previews:apply     # ghi DB
```

**Production** (trên VPS, thư mục chứa `docker-compose.yml`; image production không có `tsx` trong `PATH` nên gọi bản cài ở `/opt/tools`; `npm run previews:*` chỉ dùng được ở máy dev):

```bash
# 1) Backup DB trước (xem deploy/README.md - mục backup), rồi dry-run:
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/updateCoursePreviews.ts   --external-manifest prisma/seed-data/externalCoursePreviewManifest.json
# 2) Đọc kết quả (applied=false, changedLessons theo từng khóa). Nếu đúng mong đợi thì ghi:
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/updateCoursePreviews.ts   --external-manifest prisma/seed-data/externalCoursePreviewManifest.json --apply
# 3) Chạy lại lệnh dry-run: phải báo changedLessons = 0 cho mọi khóa.
```

Quy tắc: luôn dry-run và backup trước; **không** chạy `db:seed` / `SEED_FORCE=1` trên production (seed xóa toàn bộ dữ liệu người dùng); manifest nằm trong image nên muốn đổi đoạn video phải build + deploy image mới trước khi chạy updater. Script này (kèm `prisma/`, `src/`, `tsconfig.json`) đã được `Dockerfile` đưa vào image.

### 5.2 Nâng quyền admin / giảng viên (`user:set-role`, BR-30)

Không có API đăng ký ADMIN. Admin chỉ được tạo bằng seed (dev: `admin@example.com`, cùng mật khẩu với tài khoản mẫu) hoặc script này. Script chỉ nhận tài khoản **đã xác minh email**, mặc định **dry-run** (chỉ in `fromRole` → `toRole`), thêm `--apply` mới ghi DB; nâng lên `TEACHER` tự tạo `TeacherProfile` rỗng nếu chưa có. Vai trò mới có hiệu lực tối đa sau 30 giây (API đọc role từ DB, không tin claim trong access token).

**Dev** (từ `server/`):

```bash
npm run user:set-role -- --email someone@example.com --role ADMIN           # dry-run
npm run user:set-role -- --email someone@example.com --role ADMIN --apply   # ghi DB
```

**Production** (trên VPS, thư mục chứa `docker-compose.yml`; gọi `tsx` ở `/opt/tools` như mục 5.1):

```bash
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/setUserRole.ts --email someone@example.com --role ADMIN
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/setUserRole.ts --email someone@example.com --role ADMIN --apply
```

Quy tắc: tài khoản phải đăng ký + xác minh email trước; luôn dry-run trước; script nằm trong image (`Dockerfile` + `.dockerignore`) nên chỉ cần build + deploy image mới trước khi chạy lần đầu.

### 5.3 Backfill khóa thông báo (`notifications:backfill:*`)

Thông báo được lưu kèm `data.key` + `data.params` (vd `ORDER_PAID_ONE` + `{ courseTitle }`) để mobile dịch theo ngôn ngữ đang chọn; `title`/`body` chỉ còn là bản dự phòng. Các dòng tạo TRƯỚC thay đổi này chỉ có chữ đã dựng sẵn (lẫn tiếng Việt/Anh) nên cần backfill một lần. Script chỉ động vào dòng **chưa có** `data.key` và khớp một mẫu câu đã biết (EN + VI, kèm vài mẫu cũ của seed); dòng không khớp giữ nguyên (mobile hiển thị chữ đã lưu). Mặc định **dry-run**, thêm `--apply` mới ghi; cập nhật theo lô trong transaction, **idempotent** (chạy lại: `matched: 0`). Log chỉ có số đếm theo `key`, số dòng không khớp (theo `type`) và vài mẫu đã cắt ngắn, không in nguyên nội dung.

**Dev** (từ `server/`, DB trong `.env`):

```bash
npm run notifications:backfill:dry-run   # log "Notification backfill dry run": scanned, matched, byKey, unmatched
npm run notifications:backfill:apply     # ghi DB
```

**Production** (trên VPS, thư mục chứa `docker-compose.yml`; gọi `tsx` ở `/opt/tools` như mục 5.1):

```bash
# 1) Backup DB trước (deploy/README.md), rồi dry-run:
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/backfillNotificationKeys.ts
# 2) Đọc kết quả (applied=false, byKey, unmatched). Nếu đúng mong đợi thì ghi:
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/backfillNotificationKeys.ts --apply
# 3) Chạy lại dry-run: phải báo matched = 0.
```

Quy tắc: luôn dry-run và backup trước; script nằm trong image (`Dockerfile` + `.dockerignore`) nên cần build + deploy image mới (API đã ghi `data.key` cho thông báo mới) trước khi chạy lần đầu. Thông báo mới tạo từ giờ đã có `key` nên không cần chạy lại.

### 5.4 Thay video seed đã chết (`lessons:replace-dead-video`)

Clip seed `download.blender.org/durian/trailer/sintel_trailer-480p.mp4` trả **HTTP 403** từ 10/2026 (45 bài ở production). Script thay mọi bài còn trỏ tới URL đó bằng clip Big Buck Bunny 720p 10 s của test-videos.co.uk (CC-BY): cập nhật `videoUrl` + `durationSec = 10`, tính lại `lessonCount`/`totalDurationSec` của khóa, kéo `positionSec` của tiến độ học về tối đa 10 s. Mặc định **dry-run**, thêm `--apply` mới ghi; **idempotent** (chạy lại: `lessonCount: 0`). Seed (`prisma/seed-data/media.ts`) đã dùng clip mới nên DB seed lại không cần chạy.

**Dev** (từ `server/`): `npm run lessons:replace-dead-video` (dry-run) · `npm run lessons:replace-dead-video -- --apply`.

**Production** (trên VPS, sau khi deploy image có script):

```bash
# 1) Backup DB trước (deploy/README.md), rồi dry-run:
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/replaceLessonVideo.ts
# 2) Đúng mong đợi (lessonCount, courseCount, progressClamped) thì ghi:
docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/replaceLessonVideo.ts --apply
# 3) Chạy lại dry-run: phải báo lessonCount = 0.
```

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

## 7. Endpoint

Base URL `/api/v1`. Thành công `{ data, meta? }`, lỗi `{ error: { code, message, details? } }`. Phân trang `?page=1&limit=20` (tối đa 50).

Bảng dưới liệt kê nhóm endpoint xác thực, tài khoản và dữ liệu chung. Các nhóm còn lại (khóa học, bài học, ghi danh, giỏ hàng, đơn hàng, đánh giá, hỏi đáp, bài nộp, giảng viên, thông báo, AI...) nằm trong `src/modules/<tên>/<tên>.routes.ts`; mỗi module có schema zod mô tả đầu vào.

| Method & path                                                                                 | Auth | Ghi chú                                                                                                                                      |
| --------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                                                                                 | —    | `{ data: { status: 'ok', db: 'ok' } }`; DB hỏng → 503 `{ data: { status: 'error', db: 'down' } }`                                            |
| `POST /auth/register`                                                                         | —    | + `captchaToken` → 201 `{ user, emailVerificationRequired }` (chưa có token); 409 `EMAIL_TAKEN`                                              |
| `POST /auth/verify-email`                                                                     | —    | OTP email → 200 token pair (`AuthSessionDto`); 400 `INVALID_CODE`/`CODE_EXPIRED`; 429 `TOO_MANY_ATTEMPTS`                                    |
| `POST /auth/resend-verification`                                                              | —    | gửi lại OTP sau 60 s (429 `RESEND_TOO_SOON`)                                                                                                 |
| `POST /auth/login`                                                                            | —    | → 200 token pair **hoặc** `{ twoFactorRequired, challengeToken }`; 401 `INVALID_CREDENTIALS`; 403 `EMAIL_NOT_VERIFIED`; 423 `ACCOUNT_LOCKED` |
| `POST /auth/2fa/verify`                                                                       | —    | `challengeToken` + mã TOTP/mã khôi phục → token pair                                                                                         |
| `POST /auth/refresh`, `/auth/logout`                                                          | —    | xoay vòng refresh token (phát hiện dùng lại → thu hồi phiên); đăng xuất                                                                      |
| `POST /auth/forgot-password`, `/auth/reset-password`                                          | —    | mã qua email (luôn 200 ở forgot); đặt lại xong thu hồi mọi phiên                                                                             |
| `GET /auth/me`                                                                                | ✓    | `UserDto`; 401 `UNAUTHORIZED`                                                                                                                |
| `GET/DELETE /me/sessions[/:id]`                                                               | ✓    | thiết bị đăng nhập + đăng xuất từ xa                                                                                                         |
| `GET /me/security`, `POST /me/password`, `POST /me/2fa/{setup,enable,disable,recovery-codes}` | ✓    | bảo mật tài khoản (đổi mật khẩu, 2FA TOTP)                                                                                                   |
| `GET /categories`                                                                             | —    | 6 danh mục + `courseCount` (cache 60 s)                                                                                                      |
| `GET /tags/hot`                                                                               | —    | tag `isHot` (cache 60 s)                                                                                                                     |
| `GET /static/*`, `GET /uploads/*`                                                             | —    | file tĩnh (hỗ trợ HTTP Range cho video)                                                                                                      |

Rate limit: `POST /auth/login` + `POST /auth/register` **10 request/phút/IP** (dùng chung bộ đếm; `GET /auth/me` không bị giới hạn); verify-email / reset-password / 2fa/verify 10/phút; resend-verification / forgot-password 5/phút; refresh 30/phút; `/me/password`, `/me/2fa/*`, `DELETE /me/sessions*` 10/phút → 429 `RATE_LIMITED`; toàn bộ API 300 request/phút/IP. Tắt khi test.

### Quy ước hành vi của API

- `optionalAuth`: không có header `Authorization` = khách; **có header nhưng token sai/hết hạn = 401 `UNAUTHORIZED`** (để mobile đăng xuất đúng lúc).
- Route không tồn tại → 404 `NOT_FOUND`; body JSON > 100 KB → 413 `PAYLOAD_TOO_LARGE`; JSON hỏng → 400 `VALIDATION_ERROR`; Prisma P2002 → 409 `CONFLICT`, P2025 → 404 `NOT_FOUND`.
- `VALIDATION_ERROR.details` = mảng `{ source: 'body' | 'query' | 'params', field, message }`.
- `GET /health` trả `db: 'ok'` (DB lỗi: 503 với `status: 'error', db: 'down'`).
- `discountPercent` vẫn có giá trị khi `badge = 'BEST_SELLER'` nếu khóa có giá gốc cao hơn; giảm giá làm tròn về 0 % thì coi như không giảm.
- `TeacherSummary.ratingAvg` = trung bình cộng `ratingAvg` các khóa đã publish có đánh giá (làm tròn 1 chữ số); `ratingCount` = tổng `ratingCount`.

## 8. Helper dùng chung cho các module

| Helper                                                                                                                                                                                                                   | Vị trí                                                      | Dùng để                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiError(status, code, message, details?)`, `ApiError.of(code, message)`, `.notFound/.forbidden/.conflict/.unprocessable/.unauthorized`                                                                                 | `lib/ApiError.ts`, `lib/errorCodes.ts`                      | Ném lỗi nghiệp vụ; `ERROR_STATUS` là bảng mã lỗi → HTTP status (PAYMENT_FAILED 402, FILE_TOO_LARGE 413, UNSUPPORTED_FILE_TYPE 415, RATE_LIMITED 429...) |
| `validate({ body?, query?, params? })`                                                                                                                                                                                   | `middlewares/validate.ts`                                   | zod; dữ liệu đã parse ghi đè `req.body/query/params`; lỗi 400 `details: [{source, field, message}]`                                                     |
| `requireAuth`, `optionalAuth`, `getAuthUser(req)`                                                                                                                                                                        | `middlewares/requireAuth.ts`                                | JWT Bearer; `optionalAuth`: không header = khách, token sai = 401                                                                                       |
| `ok(res, data, meta?)`, `created(...)`, `noContent(res)`                                                                                                                                                                 | `lib/response.ts`                                           | Định dạng `{ data, meta }`                                                                                                                              |
| `paginationQuery` (zod), `getPagination(query)` → `{page, limit, skip, take}`, `buildPaginationMeta(total, pagination)`                                                                                                  | `lib/pagination.ts`                                         | Phân trang, limit ≤ 50                                                                                                                                  |
| `cache.wrap(key, ttlMs, loader)`, `cache.invalidatePrefix(prefix)`, `cache.delete/clear`                                                                                                                                 | `lib/cache.ts`                                              | Cache TTL trong bộ nhớ (lru-cache)                                                                                                                      |
| `upload.single('file')`, `createUpload({ maxSizeBytes, allowedMimeTypes })`, `IMAGE_MIME_TYPES`, `uploadedFileUrl(filename)`                                                                                             | `middlewares/upload.ts`                                     | Upload ≤ 10 MB, whitelist png/jpg/pdf/zip/txt vào `uploads/`                                                                                            |
| `toCourseSummary(row, { bookmarkedIds })`, `courseSummarySelect`, `toTeacherSummary(row)`, `teacherSummarySelect`, `toUserDto(row)`, `userDtoSelect`, `toCategoryDto`, `toTagDto`, `computeBadge(course)`                | `lib/mappers.ts`                                            | Mapper + Prisma `select` chuẩn; BR-10                                                                                                                   |
| `getBookmarkedIds(userId, courseIds)`                                                                                                                                                                                    | `lib/bookmarkedIds.ts`                                      | 1 query cho cả danh sách → truyền vào `toCourseSummary`                                                                                                 |
| `toAbsoluteUrl(path)`                                                                                                                                                                                                    | `lib/url.ts`                                                | `/static/...` → URL tuyệt đối theo `PUBLIC_BASE_URL`                                                                                                    |
| `recomputeDenormalized()`                                                                                                                                                                                                | `lib/denormalize.ts`                                        | Tính lại ratingAvg/Count, enrollmentCount, lessonCount, totalDurationSec, likeCount, answerCount                                                        |
| `signAccessToken`, `verifyToken`, `signChallengeToken`, `hashPassword`, `verifyPassword`                                                                                                                                 | `lib/jwt.ts`, `lib/password.ts`                             | Access token JWT 15 phút (HS256, claim `sid` = phiên), bcryptjs cost 10                                                                                 |
| `isSessionActive(sid)`, `queueMail`, `assertCaptcha`, `verifyTotp`                                                                                                                                                       | `lib/sessionGuard.ts`, `mailer.ts`, `captcha.ts`, `totp.ts` | Phiên còn hiệu lực (cache 30 s), gửi email nền (nodemailer), CAPTCHA (reCAPTCHA v2 / Turnstile), TOTP RFC 6238                                          |
| `createTestApi()`, `resetDb()`, `authHeader(user)` (user phải do `createUser` tạo: có sẵn Session), `installMailbox()`/`mockTurnstile()`, `createUser/Teacher/Category/Tag/Course/CourseWithLessons/Enrollment/Bookmark` | `tests/helpers/*`                                           | Viết integration test                                                                                                                                   |

## 9. Cách thêm module mới (checklist)

Ví dụ module `bookmark`:

1. Tạo thư mục `src/modules/bookmark/` gồm `bookmark.schema.ts` (zod) · `bookmark.service.ts` (**chỉ service** được import `@/lib/prisma` - ESLint chặn ở controller/routes) · `bookmark.controller.ts` (req/res, dùng `ok/created/noContent`) · `bookmark.routes.ts` với `export const router = Router();` và middleware `requireAuth`/`validate`.
2. **Đăng ký bằng đúng 1 dòng** trong mảng `MODULES` của `src/routes.ts` (không cần import):
   - `['/categories', 'category']` → router khai báo `router.get('/', ...)`;
   - module nhiều nhóm đường dẫn (`/courses/:id/bookmark`, `/me/bookmarks`) → `['/', 'bookmark']` rồi khai báo **đầy đủ** đường dẫn trong router.
3. Ném lỗi bằng `ApiError.of('COURSE_NOT_FOUND', '...')`; trả DTO qua mapper trong `lib/mappers.ts` (thiếu thì thêm mapper + `select` dùng chung, không tự nhân bản).
4. Đổi DB: sửa `prisma/schema.prisma` → `npm run db:migrate -- --name <ten>` → `npm run db:migrate:test`; mỗi PR một migration.
5. Test: unit test service (mock `@/lib/prisma`, mẫu `auth.service.test.ts`) + integration test `tests/integration/<module>.test.ts` (mẫu `auth.test.ts`, `catalog.test.ts`; happy path + ≥ 1 case lỗi); `npm run typecheck && npm run lint && npm test`.
6. Cập nhật `mobile/src/types/api.ts` nếu đổi DTO trả về cho app.

## 10. Biến môi trường

| Biến                | Mặc định                  | Ghi chú                                                                                                                    |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          | `development`             | `test` → dùng `.env.test`, tắt cache/rate limit/log                                                                        |
| `PORT`              | `4000`                    |                                                                                                                            |
| `DATABASE_URL`      | — (bắt buộc)              | Local: `postgresql://postgres:postgres@localhost:5433/elearning?schema=public`; dịch vụ cloud thường cần `sslmode=require` |
| `JWT_SECRET`        | — (bắt buộc, ≥ 32 ký tự)  |                                                                                                                            |
| `ACCESS_TOKEN_TTL`  | `15m`                     | Thời hạn access token (dạng `15m`, `12h`, `30d`)                                                                           |
| `REFRESH_TOKEN_TTL` | `30d`                     | Thời hạn refresh token (trượt theo mỗi lần refresh)                                                                        |
| `CORS_ORIGIN`       | `*`                       | Có thể liệt kê nhiều origin, phân cách dấu phẩy                                                                            |
| `PUBLIC_BASE_URL`   | `http://localhost:<PORT>` | Đặt `http://<IP-LAN>:4000` để điện thoại tải được ảnh/tài liệu                                                             |
| `UPLOAD_DIR`        | `uploads`                 |                                                                                                                            |
| `LOG_LEVEL`         | tùy môi trường            | `debug` (dev) / `info` (prod) / `silent` (test)                                                                            |

Ngoài ra còn các nhóm biến cho email SMTP (`SMTP_*`, `MAIL_FROM`), CAPTCHA (`CAPTCHA_PROVIDER`, `RECAPTCHA_*`, `TURNSTILE_*`, `CAPTCHA_ALLOWED_HOSTNAMES`), AI (`AI_PROVIDER`, `GEMINI_*`, `AI_*_LIMIT_*`) và 2FA (`TOTP_ENC_KEY`). Danh sách đầy đủ và giá trị mặc định: [.env.example](.env.example) và `src/config/env.ts`; mẫu cho production: [../deploy/.env.example](../deploy/.env.example).

## 11. Xử lý sự cố

- **`Invalid environment variables`** khi khởi động: thiếu `.env` hoặc `JWT_SECRET` < 32 ký tự.
- **`Không reset được DB test` / `ECONNREFUSED 5433`**: chưa chạy `npm run db:start`.
- **Cổng 5433 bị chiếm**: đặt `PG_PORT` khác cho `db:start` và sửa `DATABASE_URL` ở cả `.env`, `.env.test`.
- **`npm run db:start` treo trên Windows**: đã xử lý bằng cách chạy `pg_ctl` với stdio `ignore`; nếu vẫn treo, xem `server/.pgdata.log`.
- **Jest báo `A dynamic import callback was invoked without --experimental-vm-modules`**: chạy test bằng `npm test` (đã cấu hình cờ), không gọi `jest` trực tiếp.
- **Thiếu `src/generated/prisma`**: `npm run db:generate`.
- Cảnh báo `npm audit` (mysql2, deepmerge-ts) đến từ Prisma CLI (devDependency), không nằm trong runtime của server.

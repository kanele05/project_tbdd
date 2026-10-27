# CHƯƠNG 4. GIAI ĐOẠN 3 — HIỆN THỰC (IMPLEMENTATION)

Chương này trình bày cách hệ thống được xây dựng thành sản phẩm chạy được: công nghệ và phiên bản đã chốt, tổ chức mã nguồn, quy ước lập trình của nhóm, những đoạn mã tiêu biểu của các chức năng chính, các kỹ thuật cache và ngoại tuyến, phần AI và xác thực, đa ngôn ngữ, giao diện sáng/tối, web/PWA, các màn hình đã hiện thực, và hướng dẫn lấy mã nguồn để chạy lại. Mọi số liệu và đoạn mã trích từ kho mã nguồn ở thời điểm đóng băng mã (24/10/2026); đường dẫn file được ghi kèm để đối chiếu.

## 4.1 Công nghệ và phiên bản

Phiên bản được lấy từ `package.json` của hai gói (`server/`, `mobile/`) và từ `deploy/docker-compose.yml`. Quy tắc nhóm đặt ra: mọi thành viên dùng **cùng Expo SDK 57** và cài Expo Go tương thích SDK 57; thư viện Expo/React Native luôn cài bằng `npx expo install` để đúng phiên bản của SDK.

*Bảng 4.1 – Công nghệ phía mobile và web (`mobile/package.json`)*

| Nhóm | Công nghệ | Phiên bản |
|---|---|---|
| Nền tảng | Expo SDK (managed workflow) | `~57.0.26` |
| | React Native / React | 0.86.3 / 19.2.3 (New Architecture) |
| | Expo Router (điều hướng theo file) | `~57.0.24` |
| | TypeScript (`strict`) | `~6.0.3` |
| Dữ liệu | TanStack Query (+ persist AsyncStorage) | `^5.104.0` |
| | Zustand | `^5.0.15` |
| | axios | `^1.20.0` |
| | react-hook-form + zod (+ resolvers) | `^7.89.0` + `^4.6.5` |
| Giao diện | expo-image, expo-linear-gradient, expo-blur, react-native-svg | `~57.0.5`, `~57.0.2`, `~57.0.3`, `15.15.4` |
| | react-native-reanimated, react-native-worklets | `4.5.1`, `0.10.1` |
| | @shopify/flash-list | `2.0.2` |
| | @expo/vector-icons (Feather) | `^15.0.2` |
| | Playfair Display, Be Vietnam Pro | `@expo-google-fonts/*` |
| Phương tiện | expo-video, YouTube nhúng (react-native-webview) | `~57.0.5`, `13.16.1` |
| | expo-document-picker, expo-image-picker, expo-file-system, expo-sharing | `~57.0.x` |
| Hệ thống | expo-secure-store, async-storage, netinfo, expo-localization, expo-device | `~57.0.4`, `2.2.0`, `12.0.1`, `~57.0.2`, `~57.0.2` |
| Đa ngôn ngữ | i18next, react-i18next, dayjs | `^26.4.2`, `^17.0.15`, `^1.11.23` |
| Phát hành | expo-updates (EAS Update), EAS Build | `~57.0.26` |
| Kiểm thử | jest + jest-expo, React Native Testing Library | `^29.7.0` + `~57.0.5`, `^14.0.1` |

*Bảng 4.2 – Công nghệ phía server (`server/package.json`)*

| Nhóm | Công nghệ | Phiên bản |
|---|---|---|
| Nền tảng | Node.js (CI và Docker dùng 24; `engines`: ≥ 20) | 24 |
| | Express | `^5.2.1` |
| | TypeScript | `^5.9.3` |
| ORM, CSDL | Prisma (client + adapter `pg`), `pg` | `^7.10.0`, `^8.23.0` |
| | PostgreSQL (production / phát triển) | 17 / `embedded-postgres` 18 |
| Kiểm tra dữ liệu | zod | `^4.6.5` |
| Bảo mật | jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit | `^9.0.3`, `^3.0.3`, `^8.3.0`, `^2.8.6`, `^8.7.0` |
| Hạ tầng web | compression, multer, lru-cache | `^1.8.2`, `^2.4.0`, `^11.5.3` |
| Email, AI | nodemailer, `@google/genai` | `^10.0.14`, `^2.27.0` |
| Quan sát | pino + pino-http, prom-client | `^10.3.1` + `^11.0.0`, `^15.1.3` |
| Kiểm thử | jest + ts-jest, supertest | `^30.5.2` + `^29.4.14`, `^7.3.0` |
| Công cụ | tsx, ESLint (+ typescript-eslint), Prettier | `^4.23.15`, `^10.11.0`, `^3.9.9` |

*Bảng 4.3 – Hạ tầng triển khai (`deploy/docker-compose.yml`, `.github/workflows/`)*

| Thành phần | Image / công cụ | Phiên bản |
|---|---|---|
| Reverse proxy, HTTPS | `caddy` | 2 (alpine) |
| Cơ sở dữ liệu, sao lưu | `postgres` | 17 (alpine) |
| Giám sát | Prometheus · Grafana · Loki · Alloy | v3.15.0 · 13.0 · 3.7 · v1.20.1 |
| Exporter | node-exporter · cAdvisor · postgres-exporter | v1.12.1 · v0.60.6 · v0.20.1 |
| CI/CD | GitHub Actions, GHCR | `checkout@v7`, `setup-node@v7`, Node 24 |

Môi trường làm việc của nhóm: Windows 11, Node 24, npm 11, Git 2.53; không có Docker, Java hay Android SDK trên máy lập trình, nên ứng dụng được chạy bằng **Expo Go trên điện thoại thật** (cùng mạng Wi-Fi với máy chạy server) và bằng bản web; APK được dựng trên đám mây bằng EAS Build.

## 4.2 Tổ chức mã nguồn và phân chia module

### 4.2.1 Cấu trúc thư mục

Mã nguồn nằm trong một kho Git (nhánh `main` ổn định, `develop` tích hợp; thư mục gốc `project_tbdd/`):

```
project_tbdd/
├── mobile/                  Ứng dụng Expo (Android + web)
│   ├── app/                 CHỈ chứa route (Expo Router) — file mỏng
│   │   ├── (auth)/ (tabs)/ admin/ studio/ learn/ course/ settings/ ...
│   └── src/
│       ├── components/      ui/ (UI kit), course/ (thẻ khóa học), layout/ (khung PC), intro/
│       ├── features/<feature>/   api.ts · hooks.ts · components/ · screens/ · *.test.ts(x)
│       ├── lib/             apiClient, queryClient, queryKeys, persister, secureStorage
│       ├── stores/          Zustand: authStore, preferencesStore, searchFilterStore
│       ├── theme/           palettes (sáng/tối), typography, spacing, radius, shadows, makeStyles
│       ├── i18n/            locales/{vi,en}/*.json, format, useLanguage
│       ├── hooks/ utils/ constants/ types/ (api.ts = DTO dùng chung) test/
├── server/
│   ├── prisma/              schema.prisma · migrations/ (4) · seed.ts · seed-data/
│   ├── src/
│   │   ├── app.ts · server.ts · routes.ts · config/env.ts
│   │   ├── lib/             prisma, jwt, cache, ApiError, ai/, captcha, mailer, metrics, ...
│   │   ├── middlewares/     requireAuth, requireRole, validate, upload, rateLimit, errorHandler
│   │   └── modules/<module>/  <module>.routes · .controller · .service · .schema (+ test)
│   ├── tests/               integration/ (Supertest + PostgreSQL thật) · helpers/
│   ├── scripts/             perf.ts, setUserRole.ts, replaceLessonVideo.ts, ...
│   └── static/ uploads/     video/tài liệu mẫu; tệp người dùng tải lên (gitignored)
├── deploy/                  docker-compose.yml · caddy/ · prometheus/ · grafana/ · loki/ · alloy/ · backup/
├── .github/workflows/       ci.yml · deploy.yml
└── docs/                    báo cáo, bằng chứng kiểm thử
```

### 4.2.2 Quy mô mã nguồn

*Bảng 4.4 – Quy mô mã nguồn tại thời điểm đóng băng (đếm dòng file `.ts`/`.tsx`, không tính mã sinh tự động)*

| Phần | Số file nguồn | Số dòng mã (không test) | Số dòng test |
|---|---|---|---|
| Server (`server/src`) | 199 | 17 856 | 25 248 (80 test đơn vị cạnh mã + 40 test tích hợp) |
| Mobile (`mobile/src`, `mobile/app`) | 620 | khoảng 55 800 (`src`) + 543 (`app`) | 33 870 (287 file test) |

Kết quả kiểm thử tự động tại ngày 26/10/2026: server **120 suite / 1 729 test** (Jest + Supertest chạy trên PostgreSQL thật), mobile **287 suite / 2 241 test** (Jest + React Native Testing Library); `typecheck`, `lint` và kiểm tra định dạng Prettier đều sạch; CI chạy lại toàn bộ trước mỗi lần triển khai (chi tiết ở Chương 5).

### 4.2.3 Module server

*Bảng 4.5 – Module server và số dòng mã nguồn (không test)*

| Module | Dòng | Vai trò |
|---|---|---|
| `ai` | 3 171 | Tóm tắt, quiz, gợi ý, AI Tutor (SSE), soạn khóa, kiểm duyệt sơ bộ |
| `auth` | 1 632 | Đăng ký, đăng nhập, OTP, phiên, refresh token, khóa tạm, 2FA, nhật ký bảo mật |
| `studio` | 1 612 | Giảng viên soạn khóa: CRUD khóa/chương/bài, gửi duyệt, bản sửa đổi, hồ sơ giảng viên |
| `admin` | 1 473 | Hàng chờ duyệt, so sánh bản sửa đổi, duyệt/từ chối, người dùng, dashboard |
| `course` | 673 | Danh sách/tìm kiếm/lọc, chi tiết, khóa tương tự |
| `lesson` | 484 | Chương trình học, chi tiết bài, lưu tiến độ |
| `notification` | 431 | Thông báo, đánh dấu đã đọc, backfill khóa dịch |
| `question` | 412 | Hỏi đáp: câu hỏi, câu trả lời, thích |
| `teaching` | 392 | Thống kê, chấm project, phản hồi đánh giá, ghim câu trả lời |
| `teacher` | 372 | Hồ sơ giảng viên công khai, theo dõi |
| `order` | 290 | Thanh toán giả lập, ghi danh miễn phí, lịch sử đơn |
| `user` | 265 | Thống kê hồ sơ, sửa hồ sơ, ảnh đại diện, đổi vai trò (script) |
| `project` | 264 | Mô tả project, nộp bài |
| `review` | 218 | Đánh giá khóa học |
| `security` | 188 | Đổi mật khẩu, danh sách thiết bị, 2FA (route) |
| `enrollment`, `home`, `cart`, `like`, `bookmark` | 135 · 130 · 129 · 116 · 106 | Khóa của tôi, Trang chủ, giỏ hàng, thích/chia sẻ, lưu khóa |
| `tag`, `health`, `category` | 35 · 35 · 34 | Thẻ nóng, kiểm tra sống, danh mục |

### 4.2.4 Feature mobile

*Bảng 4.6 – Feature mobile và số dòng mã nguồn (không test)*

| Feature | Dòng | Nội dung |
|---|---|---|
| `studio` | 7 233 | Wizard soạn khóa 5 bước, chương trình học, AI gợi ý, trạng thái duyệt |
| `admin` | 4 279 | Dashboard, hàng chờ, xem và duyệt khóa, người dùng |
| `auth` | 3 290 | Đăng nhập, đăng ký, OTP, quên/đặt lại mật khẩu, 2FA, CAPTCHA |
| `course` | 2 907 | Chi tiết khóa, danh sách khóa |
| `ai` | 2 651 | AI Tutor (SSE), quiz, lỗi AI |
| `search` | 2 496 | Tìm kiếm, bộ lọc, lịch sử tìm kiếm |
| `settings` | 2 325 | Cài đặt, bảo mật, thiết bị, bật 2FA |
| `home` | 2 202 | Trang chủ (điện thoại và PC) |
| `teaching` | 2 157 | Thống kê, chấm bài, sửa hồ sơ giảng viên |
| `learning` | 2 115 | Học bài, trình phát, theo dõi tiến độ, hàng đợi ngoại tuyến |
| `teacher` | 1 994 | Hồ sơ giảng viên, top giảng viên |
| `cart` | 1 914 | Giỏ hàng, thanh toán |
| `profile` | 1 694 | Hồ sơ cá nhân, sửa hồ sơ |
| `project` | 1 420 | Nộp project, tải tài liệu |
| `my-courses` | 1 399 | Khóa của tôi |
| `review`, `qa` | 1 089 · 1 007 | Đánh giá, hỏi đáp |
| `notification`, `media`, `bookmark` | 869 · 738 · 323 | Thông báo, trình phát YouTube, lưu khóa |

Phần dùng chung: `components/` 7 511 dòng (UI kit, thẻ khóa học, khung PC), `types/api.ts` 1 148 dòng (DTO), `theme/` 916, `lib/` 875, `i18n/` 321, `stores/` 311, `utils/` 244.

### 4.2.5 Phân công phụ trách

Để tránh xung đột mã, mỗi khu vực có một người phụ trách chính (PLAN.md mục 3.2). Server: Lê Hoàng Khang phụ trách nền tảng (`app.ts`, `config`, `lib`, `middlewares`, `schema.prisma`) và các module `auth`, `course`, `home`, `cart`, `order`, `teacher`, `project`, `notification`, `user`; Hoàng Ngọc Hải phụ trách `lesson`, `enrollment`, `question`, `review`, `bookmark`. Mobile: Nguyễn Văn Sỹ phụ trách `theme`, `lib`, `components/ui`, `stores` và các feature `auth`, `home`, `search`, `course`, `cart`, `profile`, `project`; Hoàng Ngọc Hải phụ trách `learning`, `my-courses`, `qa`, `review`; Lê Hoàng Khang phụ trách `teacher`, `notification`. Các module giai đoạn giảng viên/quản trị (`studio`, `admin`, `teaching`, `ai`) được phát triển theo hợp đồng API chung (`notes/teacher-admin-contract.md`) và cả nhóm review. Chi tiết quy trình làm việc nhóm ở Chương 1. `[[CẦN NHÓM BỔ SUNG: xác nhận lại phân công thực tế cho các module giai đoạn 2 (studio, admin, teaching, ai), vì PLAN.md mục 3.2 viết cho giai đoạn 1]]`

## 4.3 Quy ước lập trình (coding standard)

Quy ước được nhóm thống nhất và **được máy kiểm tra** (ESLint, Prettier, TypeScript, CI) thay vì chỉ ghi trên giấy.

**Ngôn ngữ và đặt tên.**

- Mã nguồn (tên biến, hàm, file, thông điệp commit) viết bằng **tiếng Anh**; chú thích tiếng Việt hoặc tiếng Anh nhưng thống nhất trong từng file.
- `PascalCase` cho component và màn hình (`CourseCard.tsx`, `HomeScreen.tsx`), type và interface (không tiền tố `I`); `useXxx` cho hook; `camelCase` cho hàm, biến và file tiện ích; `UPPER_SNAKE_CASE` cho hằng số toàn cục; biến boolean bắt đầu bằng `is/has/can/should`; file route của Expo Router dùng `kebab-case` hoặc `[param].tsx`.
- **Chỉ dùng named export**, trừ file route trong `mobile/app/` (Expo Router bắt buộc `default export`); ESLint quy tắc `import/no-default-export` kiểm.
- Chuỗi hiển thị trong ứng dụng **không viết cứng** trong component mà nằm trong file locale (`vi`, `en`); màu, cỡ chữ, khoảng cách lấy từ `theme`, không viết cứng.

**Kiểu dữ liệu và định dạng.**

- TypeScript `strict: true`; **cấm `any`** (`@typescript-eslint/no-explicit-any`) và cấm `@ts-ignore` (chỉ `@ts-expect-error` kèm lý do ≥ 5 ký tự). Mobile mở rộng `expo/tsconfig.base`; server dùng `module: nodenext`, `noImplicitOverride`.
- Alias `@/` trỏ tới `src/`; cấm đường dẫn tương đối quá hai cấp (`../../../*`, server cưỡng chế bằng `no-restricted-imports`).
- Thứ tự import: thư viện ngoài → alias `@/` → tương đối, tự sắp xếp bằng ESLint (`simple-import-sort` ở server, `import/order` ở mobile).
- Cấm `console.log` (server dùng logger pino; mobile chỉ cho phép `console.warn/error`).
- Prettier thống nhất hai gói: 2 khoảng trắng, dấu nháy đơn, có chấm phẩy, `printWidth` 100, `trailingComma: all`, kết thúc dòng LF (`.gitattributes` ép `eol=lf`). Hàm không quá khoảng 50 dòng, component không quá khoảng 200 dòng, dài hơn thì tách.

**Quy ước kiến trúc.**

- Mobile: route **mỏng**; component không gọi axios trực tiếp mà đi qua `api.ts → hooks.ts`; khóa truy vấn khai báo tập trung trong `queryKeys.ts`; dữ liệu server chỉ nằm trong TanStack Query, Zustand chỉ cho trạng thái client; thao tác bật/tắt (lưu, thích, theo dõi) dùng cập nhật lạc quan kèm hoàn tác khi lỗi; mỗi màn có dữ liệu xử lý đủ bốn trạng thái; ảnh dùng `expo-image` với `cachePolicy="memory-disk"`; danh sách dài dùng FlashList, `React.memo` và `useCallback`; vùng chạm tối thiểu 48 dp, nút chỉ có biểu tượng có `accessibilityLabel`; nội dung nằm trong vùng an toàn; token lưu ở SecureStore.
- Server: **routes → controller → service → Prisma**, chỉ service dùng Prisma (ESLint cấm import Prisma trong `*.controller.ts` và `*.routes.ts`); mọi input qua zod `validate`; phản hồi thành công `{data, meta}`, lỗi `{error: {code, message, details}}`; thay đổi cơ sở dữ liệu chỉ bằng migration; seed phải chạy lại được.

**Quy ước kiểm thử.** File test đặt cạnh file nguồn (`xxx.test.ts(x)`), test tích hợp server ở `server/tests/integration/`; tên test mô tả hành vi (`it('returns 403 when user is not enrolled')`); mỗi service server có test đơn vị, mỗi endpoint chính có test tích hợp với ít nhất một ca lỗi; không hợp nhất khi test đỏ.

**Quy trình Git.** Nhánh `main` (ổn định, nộp bài) ← `develop` (tích hợp) ← `feature/<mã-task>-<mô-tả>`, `fix/…`, `docs/…`, `test/…`. Thông điệp commit theo **Conventional Commits** với phạm vi `mobile`, `server`, `docs`, ví dụ `feat(mobile): add a Netflix-style desktop web layout and a course wizard`, `fix(server): replace the dead seed lesson video …`, `build(mobile): add EAS Update with preview and production channels`. Mỗi pull request ghi mã task, kèm ảnh chụp nếu có thay đổi giao diện, và cần ít nhất một thành viên khác review trước khi hợp nhất vào `develop`. Bí mật (`.env*`, khóa API) không bao giờ được commit.

**Cổng chất lượng tự động.** Quy trình CI (`.github/workflows/ci.yml`) chạy trên mỗi pull request và khi đẩy lên `develop`: với server, áp migration lên PostgreSQL thật rồi chạy `typecheck`, `lint`, `format:check`, `test`; với mobile chạy `typecheck`, `lint` (không cho phép cảnh báo), `format:check`, kiểm tra **tương phản màu** `check:contrast` và `test`; và build thử hai image Docker (API, web). Quy trình triển khai gọi lại chính CI này trước khi build và triển khai, nên mã chưa qua kiểm thử không thể lên máy chủ.

## 4.4 Hiện thực các chức năng chính

Mục này trích các đoạn mã tiêu biểu (mỗi đoạn không quá 25 dòng, có đường dẫn file) và giải thích quyết định hiện thực. Các luồng tương ứng đã được vẽ ở các biểu đồ tuần tự của Chương 3; ở đây tập trung vào "mã làm điều đó như thế nào".

### 4.4.1 Duyệt, tìm kiếm và lọc khóa học

**Phía server.** Điều kiện tìm kiếm được dựng bằng hàm thuần để dễ kiểm thử: mỗi từ khóa phải khớp ít nhất một trong bốn trường (BR-13), các bộ lọc khác được cộng dồn bằng `AND`, và luôn chỉ lấy khóa đã xuất bản.

*Đoạn mã 4.1 – `server/src/modules/course/course.service.ts`: điều kiện tìm kiếm*

```ts
function termFilter(term: string): Prisma.CourseWhereInput {
  const contains = { contains: escapeLikePattern(term), mode: 'insensitive' } as const;
  return {
    OR: [
      { title: contains },
      { subtitle: contains },
      { tags: { some: { tag: { name: contains } } } },
      { teacher: { user: { fullName: contains } } },
    ],
  };
}

export function buildCourseWhere(filters: CourseFilters): Prisma.CourseWhereInput {
  const and: Prisma.CourseWhereInput[] = splitSearchTerms(filters.q).map(termFilter);
  if (filters.categoryId && filters.categoryId.length > 0) {
    and.push({ categoryId: { in: filters.categoryId } });
  }
  if (filters.isFree === true) and.push({ priceCents: 0 });
  if (filters.minRating !== undefined) and.push({ ratingAvg: { gte: filters.minRating } });
  // ... (teacherId, minPrice, maxPrice, section = inspires)
  return { status: 'PUBLISHED', AND: and };
}
```

Hàm `escapeLikePattern` thoát các ký tự `\`, `%`, `_` vì Prisma `contains` không tự thoát: người dùng gõ `%` hoặc `_` phải được hiểu là ký tự thường. Thứ tự sắp xếp luôn có `id` ở cuối (`buildCourseOrderBy`) để phân trang ổn định khi nhiều khóa bằng điểm nhau.

**Phía mobile.** Ô tìm kiếm được **debounce 400 ms** và danh sách dùng truy vấn vô hạn của TanStack Query; trang kế tiếp chỉ được tải khi còn trang (`meta.page < meta.totalPages`).

*Đoạn mã 4.2 – `mobile/src/features/search/useSearchKeyword.ts` và `hooks.ts`*

```ts
useEffect(() => {
  const trimmed = text.trim();
  if (trimmed === keyword) return undefined;
  const timer = setTimeout(() => setKeyword(trimmed), trimmed === '' ? 0 : SEARCH_DEBOUNCE_MS);
  return () => clearTimeout(timer);
}, [text, keyword]);

const query = useInfiniteQuery({
  queryKey: queryKeys.coursesList(params),
  queryFn: ({ pageParam }) => searchApi.courses({ ...params, page: pageParam, limit: PAGE_SIZE }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) =>
    lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
  staleTime: STALE_TIME.courseList,
});
```

Khi từ khóa rỗng, hiệu ứng áp dụng ngay (độ trễ 0) để xóa kết quả tức thì; gõ tiếp thì bộ hẹn giờ cũ bị hủy trong hàm dọn dẹp của `useEffect`, nên một chuỗi gõ chỉ sinh một request.

### 4.4.2 Giỏ hàng, thanh toán và ghi danh

**Giỏ hàng.** Các điều kiện chặn thêm vào giỏ (BR-06, BR-23) được kiểm theo thứ tự và trả về mã lỗi riêng để ứng dụng hiển thị đúng thông điệp:

*Đoạn mã 4.3 – `server/src/modules/cart/cart.service.ts` (rút gọn)*

```ts
if (course.teacher.userId === userId) {
  throw ApiError.of('OWN_COURSE', 'You cannot buy your own course');
}
// ... đọc song song enrollment và cartItem ...
if (enrollment) throw ApiError.of('ALREADY_ENROLLED', 'You are already enrolled in this course');
if (course.priceCents === 0) {
  throw ApiError.of('FREE_COURSE', 'This course is free - enroll directly instead of using the cart');
}
if (inCart) throw ApiError.of('ALREADY_IN_CART', 'This course is already in your cart');
// khóa chính ghép (userId, courseId) chặn trùng khi hai request chạy song song (P2002)
```

**Thanh toán giả lập** chạy trong một giao dịch (BR-07). Đơn được tạo trước, sau đó nhánh thành công mới ghi danh, tăng bộ đếm, xóa giỏ và tạo thông báo; nhánh thất bại giả lập trả sớm để đơn `FAILED` vẫn được lưu.

*Đoạn mã 4.4 – `server/src/modules/order/order.service.ts`: nhánh thanh toán thành công*

```ts
// Thanh toán thất bại: giữ nguyên giỏ, không ghi danh (đơn FAILED vẫn được lưu để tra lịch sử).
if (isFailure) return { kind: 'failed', orderId: order.id };

const courseIds = lines.map((line) => line.courseId);
await tx.enrollment.createMany({
  data: courseIds.map((courseId) => ({ userId, courseId })),
  skipDuplicates: true,
});
await tx.course.updateMany({
  where: { id: { in: courseIds } },
  data: { enrollmentCount: { increment: 1 } },
});
await tx.cartItem.deleteMany({ where: { userId } });
const paid = buildPaidNotification(lines);
await notify(tx, { userId, message: paid.message, refs: { courseId: paid.courseId } });
return { kind: 'paid', result: { order: toOrderDto(order), enrolledCourseIds: courseIds } };
```

Hàm bao ngoài `checkout` gọi `prisma.$transaction(...)`, sau đó mới ném 402 `PAYMENT_FAILED` hoặc 422 `CART_EMPTY` (ném **sau** khi giao dịch đã kết thúc để đơn `FAILED` không bị hoàn tác) và xóa cache Trang chủ. Cờ `simulateFailure` chỉ có hiệu lực ngoài production (`!isProduction`); ứng dụng cũng chỉ gửi cờ này ở bản phát triển (`__DEV__`).

**Làm mới giao diện sau thanh toán.** Mutation phía client làm mất hiệu lực mọi truy vấn bị ảnh hưởng nhưng **không chờ** tải lại, để màn hình "thành công" hiện ngay:

*Đoạn mã 4.5 – `mobile/src/features/cart/hooks.ts`*

```ts
onSuccess: ({ enrolledCourseIds }) => {
  const keys: QueryKey[] = [
    queryKeys.cart(), queryKeys.meCoursesAll(), queryKeys.meStats(),
    queryKeys.home(), queryKeys.notifications(), queryKeys.orders(),
    ...enrolledCourseIds.map((courseId) => queryKeys.course(courseId)),
  ];
  // Not awaited: the success screen must not wait for the refetches.
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
},
```

### 4.4.3 Học video và lưu tiến độ

**Server** tính tiến độ trong một giao dịch có khóa dòng. `FOR UPDATE` trên bản ghi ghi danh đảm bảo hai lần lưu song song của cùng một người không đếm lệch số bài hoàn thành; chỉ khi một bài **vừa** hoàn thành mới tính lại phần trăm (BR-04), và đạt 100% thì đặt `completedAt` cùng thông báo `COURSE_COMPLETED`.

*Đoạn mã 4.6 – `server/src/modules/lesson/lesson.service.ts`: `saveProgress` (rút gọn)*

```ts
return prisma.$transaction(async (tx) => {
  const enrollment = await lockEnrollment(tx, userId, courseId); // SELECT ... FOR UPDATE
  const existing = await tx.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { isCompleted: true },
  });
  const wasCompleted = existing?.isCompleted === true;
  const isCompleted = wasCompleted || body.isCompleted === true; // không bao giờ bỏ hoàn thành
  await tx.lessonProgress.upsert({ /* positionSec đã kẹp trong [0, durationSec] */ });
  if (isCompleted && !wasCompleted) {
    const [total, done] = await Promise.all([ /* đếm tổng bài và bài đã xong */ ]);
    courseProgressPercent = computeProgressPercent(done, total);
    if (courseProgressPercent === 100 && enrollment.progressPercent < 100) {
      enrollmentData.completedAt = new Date();
      await notify(tx, { userId, message: notificationMessage('COURSE_COMPLETED', { courseTitle: course.title }), refs: { courseId } });
    }
  }
  /* ... UPDATE Enrollment ... */
  return { lessonProgress: { positionSec, isCompleted }, courseProgressPercent };
});
```

**Mobile** tách *khi nào lưu* ra thành lớp thuần `LessonProgressTracker` (không phụ thuộc React) để kiểm thử được quy tắc thời gian: chỉ lưu tối đa mỗi 10 giây, vượt 90% thời lượng thì đánh dấu hoàn thành và lưu ngay, và không gửi gì trước khi trình phát báo vị trí thật đầu tiên (rời màn hình trước khi video tải xong không ghi đè vị trí đã lưu bằng 0).

*Đoạn mã 4.7 – `mobile/src/features/learning/progressTracker.ts`: `update`*

```ts
update(positionSec: number): void {
  if (!Number.isFinite(positionSec) || positionSec < 0) return;
  this.latestPosition = positionSec;

  const { durationSec } = this.options;
  const hasReachedThreshold =
    durationSec > 0 && positionSec >= durationSec * LESSON_COMPLETE_RATIO; // 0.9
  if (hasReachedThreshold && !this.isCompleted) {
    this.isCompleted = true;
    void this.save();
    return;
  }
  if (this.now() - this.lastSaveAt >= this.intervalMs) void this.save(); // 10 000 ms
}
```

Hook `useLessonProgress` nối tracker với vòng đời màn hình: `flush()` khi ứng dụng xuống nền (`AppState`) và khi component bị hủy (rời màn hình hoặc đổi bài), sau đó làm mới `lastLessonId` và danh sách "Khóa của tôi". Video được phát bằng `expo-video` với tệp mẫu hoặc bằng trình phát YouTube nhúng cho bài của giảng viên (`features/media`, có nhánh `.web.tsx` cho web); link YouTube được kiểm kỹ (chỉ `https`, đúng máy chủ YouTube, không cổng/tài khoản/fragment, mã video 11 ký tự, hỗ trợ `start`/`end`).

### 4.4.4 Hỏi đáp (Q&A)

Tạo câu trả lời, tăng bộ đếm và thông báo cho người hỏi chạy trong cùng một giao dịch; giảng viên của khóa được trả lời mà không cần ghi danh (BR-24) nhờ hàm `assertQnaAccess` dùng chung với các endpoint đọc.

*Đoạn mã 4.8 – `server/src/modules/question/question.service.ts`: `createAnswer` (rút gọn)*

```ts
return prisma.$transaction(async (tx) => {
  const question = await tx.question.findUnique({ /* id, userId, courseId, course.title */ });
  if (!question) throw questionNotFound();
  await assertQnaAccess(userId, question.courseId, { db: tx });

  const answer = await tx.answer.create({ data: { questionId, userId, content }, select: answerSelect });
  await tx.question.update({
    where: { id: questionId },
    data: { answerCount: { increment: 1 } },
    select: { id: true },
  });
  if (question.userId !== userId) {
    await notify(tx, {
      userId: question.userId,
      message: notificationMessage('NEW_ANSWER', { author: answer.user.fullName, courseTitle: question.course.title }),
      refs: { courseId: question.courseId, questionId },
    });
  }
  return toAnswerDto(answer);
});
```

Phía mobile, thao tác thích câu hỏi dùng **cập nhật lạc quan**: đổi `likeCount` và `isLiked` ngay trên mọi danh sách đang hiển thị, gọi `PUT/DELETE /questions/:id/like` (idempotent) và hoàn tác kèm thông báo lỗi nếu thất bại (cùng cơ chế được mô tả ở mục 4.5.4).

### 4.4.5 Nộp project và tải tài liệu

Tệp được nhận bằng multer, nhưng quyền được kiểm **trước** multer để người không ghi danh không ghi được tệp lên đĩa:

*Đoạn mã 4.9 – `server/src/modules/project/project.routes.ts`*

```ts
// Kiểm tra đăng nhập + ghi danh TRƯỚC multer để người không đủ quyền không ghi được file lên đĩa.
router.post(
  '/courses/:id/submissions',
  requireAuth,
  validate({ params: courseIdParams }),
  requireEnrolled,
  submissionUpload,                       // multer: file ≤ 10 MB, whitelist MIME
  validate({ body: submissionBody }),
  projectController.createSubmission,
);
router.use(discardUploadsOnError);       // lỗi sau khi đã lưu tệp -> xóa tệp mồ côi
```

Phía mobile, `useSubmissionFiles` kiểm tra loại tệp và dung lượng (≤ 10 MB) trước khi gửi; dữ liệu `multipart/form-data` có hàm tiện ích `lib/formData.ts` để trên **web** cũng gửi được tệp (đối tượng `Blob` thay cho đường dẫn cục bộ của React Native); thanh tiến độ upload lấy từ `onUploadProgress` của axios. Tải tài liệu dùng `expo-file-system` + `expo-sharing` trên điện thoại và tải trực tiếp trên web (`downloadResource.ts` và `downloadResource.web.ts`).

### 4.4.6 Đánh giá khóa học

Đánh giá là thao tác "tạo hoặc sửa" (`PUT`), cập nhật điểm trung bình của khóa trong cùng giao dịch và khóa dòng khóa học để hai đánh giá đồng thời không ghi đè số liệu của nhau (BR-08).

*Đoạn mã 4.10 – `server/src/modules/review/review.service.ts`: `upsertMyReview` (rút gọn)*

```ts
const review = await prisma.$transaction(async (tx) => {
  await assertEnrolledInCourse(userId, courseId, tx);
  await tx.$queryRaw`SELECT "id" FROM "Course" WHERE "id" = ${courseId} FOR UPDATE`;

  const saved = await tx.review.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, rating: body.rating, content: body.content },
    update: { rating: body.rating, content: body.content },
    select: reviewDtoSelect,
  });
  const totals = await tx.review.aggregate({
    where: { courseId }, _sum: { rating: true }, _count: { _all: true },
  });
  const ratingCount = totals._count._all;
  await tx.course.update({
    where: { id: courseId },
    data: { ratingCount, ratingAvg: averageRating(totals._sum.rating ?? 0, ratingCount) },
  });
  return saved;
});
invalidateRatingCaches();
```

### 4.4.7 Giảng viên: soạn khóa và gửi duyệt

Luồng gửi duyệt kiểm checklist trên nội dung hiện tại rồi chuyển trạng thái **có điều kiện** để hai request song song chỉ một request thành công; mỗi hành động ghi một dòng lịch sử `CourseModeration`.

*Đoạn mã 4.11 – `server/src/modules/studio/studioWorkflow.service.ts`: `submitCourse` (rút gọn)*

```ts
const owned = await assertCourseOwner(userId, courseId);       // 404 nếu không phải chủ khóa
assertStatus(owned.status, ['DRAFT', 'REJECTED'], 'submit');   // 422 INVALID_COURSE_STATE
const missing = missingOfLiveCourse(row);                      // checklist BR-20
if (missing.length > 0) {
  throw ApiError.of('COURSE_INCOMPLETE', 'The course does not meet the submission requirements', { missing });
}
await prisma.$transaction(async (tx) => {
  const moved = await tx.course.updateMany({
    where: { id: courseId, status: { in: ['DRAFT', 'REJECTED'] } },
    data: { status: 'PENDING_REVIEW', submittedAt: new Date() },
  });
  if (moved.count === 0) throw ApiError.of('INVALID_COURSE_STATE', 'Course state has changed');
  await recordModeration(tx, { courseId, actorId: userId, action: 'SUBMITTED', target: 'COURSE' });
});
```

Ở phía giao diện, màn soạn khóa là **wizard 5 bước** (Ý tưởng → Giới thiệu → Giá và thẻ → Bài học → Xem lại) dùng chung cho tạo mới và sửa: tự lưu khi bấm "Tiếp", bước hiện tại nằm trong tham số `?step=` (tải lại trang vẫn giữ đúng bước), hộp thoại "Bỏ thay đổi?" cảnh báo khi rời màn có thay đổi chưa lưu (`useUnsavedChangesGuard`, chỉ hiện một hộp khi nhiều guard cùng kích hoạt), và mục còn thiếu ở bước "Xem lại" bấm vào sẽ mở đúng bước cần sửa.

### 4.4.8 Quản trị: duyệt khóa học

Duyệt khóa được hiện thực trong `adminModeration.service.ts` như đã mô tả ở SQ-UC032. Điểm đáng chú ý là tách bạch phần *trong giao dịch* và phần *sau giao dịch*:

*Đoạn mã 4.12 – `server/src/modules/admin/adminModeration.service.ts`: `approveCourse` (rút gọn)*

```ts
await prisma.$transaction(async (tx) => {
  if (target === 'COURSE') {
    const isFirstPublish = course.publishedAt === null;
    const moved = await tx.course.updateMany({
      where: { id: courseId, status: 'PENDING_REVIEW' },
      data: { status: 'PUBLISHED', ...(isFirstPublish ? { publishedAt: new Date() } : {}) },
    });
    if (moved.count === 0) throw invalidState('This course is no longer waiting for review');
    if (isFirstPublish) await notifyFollowersOfNewCourse(courseId, tx);
  } else {
    /* xóa CourseRevision đang chờ rồi applyRevision(tx, courseId, payload) */
  }
  await tx.courseModeration.create({ data: { courseId, actorId, action: 'APPROVED', target } });
  await notify(tx, { userId: course.teacher.userId, message: /* COURSE_APPROVED | REVISION_APPROVED */ });
}, TX_OPTIONS);

invalidateHomeCache();                       // sau commit
sendDecisionMail(approved, target, 'APPROVED'); // email nền, lỗi chỉ ghi log
```

Việc áp dụng bản sửa đổi (`applyRevision`) cập nhật khóa theo `id` của chương/bài: bài giữ `id` thì cập nhật, bài bị bỏ thì xóa (kèm tiến độ của bài đó), bài mới thì tạo, rồi tính lại `lessonCount` và `totalDurationSec`.

## 4.5 Cache, ngoại tuyến và hiệu năng

Đây là phần "nội dung đặc biệt" của đồ án: các kỹ thuật làm ứng dụng nhanh và dùng được khi mạng yếu. Tất cả đều đã nằm trong mã nguồn; số liệu đo ở mục 4.5.6.

### 4.5.1 Cache nhiều tầng

**Tầng 1 – bộ nhớ và đĩa phía client.** TanStack Query giữ dữ liệu trong RAM (gộp request trùng, `staleTime` theo từng loại) và **lưu xuống AsyncStorage** tối đa 24 giờ. Chỉ các khóa được đánh dấu "lưu" mới xuống đĩa, và `buster` bằng phiên bản ứng dụng để bản cập nhật mới bỏ cache cũ:

*Đoạn mã 4.13 – `mobile/src/lib/persister.ts` và `queryKeys.ts`*

```ts
export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister,
  maxAge: CACHE_MAX_AGE_MS,                 // 24 giờ
  buster: APP_VERSION,                      // phiên bản mới => bỏ cache cũ
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) && isPersistedQueryKey(query.queryKey),
  },
};

export function isPersistedQueryKey(queryKey: readonly unknown[]): boolean {
  const [root, , sub] = queryKey;
  switch (root) {
    case 'me':
      // Account security data (2FA status, signed-in devices) never goes to disk.
      return queryKey[1] !== 'security' && queryKey[1] !== 'sessions';
    case 'home': case 'categories': case 'tags': return true;
    case 'course': return queryKey.length === 2 || sub === 'curriculum';
    default: return false;
  }
}
```

Nhờ vậy mở lại ứng dụng thấy ngay Trang chủ, Khóa của tôi và chi tiết các khóa đã xem, rồi âm thầm tải bản mới (stale-while-revalidate). **Đăng xuất xóa sạch** cache RAM lẫn đĩa (`queryClient.clear()` và `clearPersistedCache()`), nên dữ liệu của người trước không lộ cho người sau.

**Tầng 2 – ảnh.** Mọi ảnh (ảnh bìa, ảnh đại diện, banner) dùng `expo-image` với `cachePolicy="memory-disk"`.

**Tầng 3 – cache phía server.** Phần công khai của `GET /home` được cache trong bộ nhớ 60 giây bằng `TtlCache` (lru-cache); phần theo người dùng ghép sau cache, nên không lộ dữ liệu giữa các người dùng. Cache tự xóa khi có thanh toán, ghi danh, đánh giá, duyệt hoặc ẩn khóa:

*Đoạn mã 4.14 – `server/src/modules/home/home.service.ts`*

```ts
export async function getHome(userId?: string): Promise<HomeResponseDto> {
  const [publicHome, personalRecommended] = await Promise.all([
    cache.wrap(HOME_PUBLIC_CACHE_KEY, HOME_CACHE_TTL_MS, loadPublicHome), // 60 000 ms
    userId ? loadRecommended(userId) : Promise.resolve(null),
  ]);
  const bookmarkedIds = await getBookmarkedIds(userId, [
    ...publicHome.popular.map((course) => course.id),
    ...publicHome.inspires.map((course) => course.id),
  ]);
  return { /* banners, categories, popular, recommended, inspires, topTeachers */ };
}
```

**Tầng 4 – nội dung AI** lưu trong bảng `AiContent` (mục 3.11.3), vừa tiết kiệm hạn mức vừa làm lần xem sau tức thì.

### 4.5.2 Chạy khi mất mạng

- `NetInfo` nối với `onlineManager` của TanStack Query: mất mạng thì truy vấn tạm dừng và ứng dụng hiện **banner ngoại tuyến** toàn cục (`OfflineBanner`, vai trò `alert`).
- Dữ liệu đã cache vẫn đọc được. Thao tác **ghi bị chặn** ngay tại tầng axios và hiện thông báo "bạn đang ngoại tuyến":

*Đoạn mã 4.15 – `mobile/src/lib/apiClient.ts`: interceptor yêu cầu*

```ts
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  config.headers.set('Accept-Language', i18n.language);
  // Writes are blocked while offline (PLAN.md §10); the UI shows "You're offline".
  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && !onlineManager.isOnline()) {
    return Promise.reject(
      new AppError({ status: 0, code: 'OFFLINE', message: i18n.t('errors:offline') }),
    );
  }
  return config;
});
```

- **Ngoại lệ có chủ đích: tiến độ video không bao giờ mất.** Khi offline (hoặc lỗi mạng/5xx), `LessonProgressTracker` ghi vị trí xem vào **hàng đợi AsyncStorage**, mỗi bài chỉ giữ bản mới nhất (ghi đè, bài đã hoàn thành vẫn hoàn thành, mỗi mục gắn `userId` để tiến độ của người này không bao giờ gửi bằng token người khác, mục quá 30 ngày bị bỏ):

*Đoạn mã 4.16 – `mobile/src/features/learning/progressQueue.ts`*

```ts
export function enqueuePendingProgress(
  entry: Omit<PendingProgress, 'savedAt'>,
  now: () => number = Date.now,
): Promise<void> {
  return serialize(async () => {
    const store = await readStore();
    const previous = store[entry.lessonId];
    const isSameOwner = previous?.userId === entry.userId;
    store[entry.lessonId] = {
      ...entry,
      isCompleted: entry.isCompleted || (isSameOwner && previous?.isCompleted === true),
      savedAt: now(),
    };
    await writeStore(store);
  });
}
```

  Hàm `serialize` xếp các thao tác đọc-sửa-ghi thành chuỗi để hai lần lưu liên tiếp không ghi đè nhau. Khi có mạng trở lại, `startPendingProgressSync` (đăng ký ở `AppFrame`) đăng ký lên `onlineManager` và gửi hàng đợi theo thứ tự cũ → mới; còn offline thì dừng ngay và giữ nguyên các mục còn lại, lỗi 403/404 (ví dụ bài đã bị xóa) thì bỏ mục, lỗi 5xx thì giữ lại thử sau; nhiều lệnh gọi đồng thời dùng chung một lượt gửi.

### 4.5.3 Học video thông minh

- **Tự tiếp tục** đúng vị trí đã dừng (`positionSec` từ `GET /lessons/:id`).
- **Lưu tiến độ tiết kiệm:** giới hạn 10 giây một lần, cộng thêm lưu khi tạm dừng, đổi bài, rời màn hình và khi ứng dụng xuống nền (mục 4.4.3).
- **Tự hoàn thành** khi xem từ 90% hoặc phát hết; biểu tượng ✓ và phần trăm khóa cập nhật ngay nhờ `invalidateAfterProgress`; đạt 100% thì sinh thông báo.

### 4.5.4 Cập nhật lạc quan (optimistic UI)

Các thao tác bật/tắt (lưu khóa, theo dõi giảng viên, thích khóa, thích câu hỏi, đánh dấu thông báo đã đọc) đổi ngay trên **mọi** màn đang hiển thị, không chờ server. `onMutate` hủy các truy vấn đang bay có thể ghi đè bản vá, lưu ảnh chụp để hoàn tác, rồi vá mọi bản cache có chứa khóa học đó; nếu lỗi thì `onError` hoàn tác và hiện thông báo:

*Đoạn mã 4.17 – `mobile/src/features/bookmark/hooks.ts` (rút gọn)*

```ts
onMutate: async ({ courseId, isBookmarked, course }) => {
  if (!onlineManager.isOnline()) {
    throw new AppError({ status: 0, code: 'OFFLINE', message: tr('errors:offline') });
  }
  const willBeBookmarked = !isBookmarked;
  await queryClient.cancelQueries({ predicate: (query) => mayHoldCourses(query.queryKey) });
  patchAllCaches(queryClient, courseId, willBeBookmarked);   // home, courses, course/:id, teacher...
  /* ... cập nhật danh sách "Đã lưu" và bộ đếm savedCount, giữ ảnh chụp để hoàn tác ... */
  return { snapshots, isStatsAdjusted };
},
onError: (error, { courseId, isBookmarked }, context) => {
  patchAllCaches(queryClient, courseId, isBookmarked);       // hoàn tác
  /* ... khôi phục các ảnh chụp ... */
  showToast(getErrorMessage(error), { type: 'error' });
},
onSettled: () => { /* làm mới meStats và meBookmarks từ server */ },
```

Hàm `setCourseBookmarked` duyệt đệ quy mọi giá trị đã cache (trang chủ, danh sách vô hạn, chi tiết, khóa tương tự…) và đặt `isBookmarked` cho đúng đối tượng có `id` khớp, **giữ nguyên tham chiếu** của các nhánh không đổi (structural sharing) để React không vẽ lại thừa.

### 4.5.5 Tối ưu hiệu năng

- **Danh sách dài:** `FlashList` cho kết quả tìm kiếm, khóa của tôi, tất cả đánh giá, hỏi đáp, thông báo, bảng quản trị; item bọc `React.memo` (107 file nguồn có dùng `memo`), callback bọc `useCallback`; cuộn vô hạn 20 mục mỗi trang.
- **Debounce 400 ms** cho ô tìm kiếm; **Trang chủ gom 6 khối vào một request** `GET /home`.
- **Phía server:** nén gzip (`compression`), Prisma `select` chỉ lấy cột cần dùng, chỉ mục cho các truy vấn thường gặp (Bảng 3.37), giá trị tổng hợp được lưu sẵn (mục 3.9.4), kiểm tra phiên đăng nhập hầu như không phải truy vấn DB nhờ cache phiên 30 giây.
- **Giao diện:** hoạt ảnh bằng Reanimated tôn trọng "Giảm chuyển động" của hệ thống; ảnh hero có scrim thay vì lọc nặng; blur kính chỉ dùng ở vài lớp nổi (tab bar, thanh mua).

### 4.5.6 Số liệu đo

Các số liệu dưới đây đo ngày 03/10/2026 (trước khi thiết kế lại giao diện và thêm phần giảng viên/quản trị), trên máy phát triển Windows 11, AMD Ryzen 7, Node 24, PostgreSQL chạy cùng máy, dữ liệu mẫu 30 khóa/290 bài. Số request đếm bằng test Jest với đồng hồ giả (xác định, lặp lại được); thời gian server đo bằng `server/scripts/perf.ts` (20 request tuần tự, bỏ 3 request khởi động nguội). Đây là thời gian xử lý của server (loopback, không có độ trễ mạng), **không phải** load test.

*Bảng 4.7 – Số liệu hiệu năng (nguồn: `notes/performance-server.md`, `notes/performance-mobile.md`)*

| Chỉ số | Cách đo | Kết quả |
|---|---|---|
| `GET /home`, khách: chưa cache → đã cache | `perf.ts`, 20 lần | p50 **13,6 → 3,8 ms** (giảm 72%), p95 20,4 → 4,9 ms |
| `GET /home`, đã đăng nhập: chưa cache → đã cache | `perf.ts`, 20 lần | p50 **18,4 → 10,6 ms** (giảm 42%) |
| p95 của 11 endpoint chính (NFR-02: dưới 500 ms) | `perf.ts`, 20 request mỗi endpoint | **11/11 đạt**, p95 lớn nhất **18,4 ms** (chi tiết khóa) |
| Dung lượng `GET /courses?limit=20`: không nén → gzip | `perf.ts` | **8 130 B → 1 506 B** (giảm 81,5%) |
| Số request khi gõ "javascript" (10 ký tự, tốc độ gõ thông thường) | test với đồng hồ giả | **10 → 1** request (giảm 90%) |
| Số lần lưu tiến độ trong 5 phút xem | test `progressTracker` | **300 → 30** (giảm 90%); 30 phút: 1 800 → 180 |
| Bundle Android (`expo export`) | đo lúc đó | JS Hermes 5,5 MiB, tài nguyên 3,0 MiB (chủ yếu font), tổng 8,5 MiB |

Lưu ý khi trích dẫn: bundle đo khi còn dùng font giai đoạn 1 (Epilogue/Inter) nên số hiện tại sẽ khác; debounce không có tác dụng khi người dùng dừng quá 400 ms giữa mỗi phím. Hai chỉ số cần thiết bị thật — thời gian mở lại Trang chủ khi có cache so với lần đầu và FPS khi cuộn trên 100 kết quả — **chưa được đo**. `[[CẦN NHÓM BỔ SUNG: số đo trên điện thoại Android thật (mở lại Trang chủ có cache so với lần đầu; JS FPS khi cuộn 100+ kết quả bằng Perf Monitor), nếu muốn đưa vào báo cáo]]`

## 4.6 Hiện thực AI

### 4.6.1 Lớp provider và hạn mức

Mọi module nghiệp vụ gọi AI qua giao diện `AiProvider` (mục 3.11.2), không import SDK Gemini. Hàm `runAi` là điểm vào duy nhất cho các lệnh gọi tốn hạn mức: trừ lượt ở ba tầng, chạy tác vụ, và **hoàn lượt khi lỗi**; lỗi nội bộ được đổi thành `ApiError` (429/422/503).

*Đoạn mã 4.18 – `server/src/modules/ai/ai.service.ts`*

```ts
export async function runAi<T>(
  userId: string,
  bucket: AiQuotaBucket,
  task: () => Promise<T>,
): Promise<T> {
  let refund: (() => void) | undefined;
  try {
    refund = consumeAiBudget(bucket, userId);
    return await task();
  } catch (err) {
    refund?.();
    return rethrowAsApiError(err);
  }
}
```

Model dự phòng được chọn ngay trong provider: danh sách `[model chính, model dự phòng]`; khi có dự phòng, mỗi model chỉ được một nửa thời gian chờ để tổng thời gian không đổi.

*Đoạn mã 4.19 – `server/src/lib/ai/gemini.provider.ts`*

```ts
/** Lỗi phía model (không phải lỗi nội dung hay người dùng hủy) -> đáng thử model dự phòng. */
const FALLBACK_KINDS = new Set(['unavailable', 'timeout', 'rate_limited']);

private attempts(): { models: string[]; timeoutMs: number } {
  const { fallbackModel, timeoutMs } = this.options;
  if (!fallbackModel || fallbackModel === this.model) return { models: [this.model], timeoutMs };
  return { models: [this.model, fallbackModel], timeoutMs: Math.ceil(timeoutMs / 2) };
}
```

### 4.6.2 Cache và gộp yêu cầu trùng

*Đoạn mã 4.20 – `server/src/modules/ai/ai.cache.ts`: `getOrCreateAiContent`*

```ts
export async function getOrCreateAiContent<T>(spec: AiContentSpec<T>): Promise<AiContentResult<T>> {
  const cached = await readFresh(spec);          // chưa hết hạn, đúng schema, còn dùng được
  if (cached) return cached;

  const key = cacheKey(spec);
  const pending = inflight.get(key);             // đang có lệnh sinh trùng khóa: dùng chung
  if (pending) return pending as Promise<AiContentResult<T>>;

  const task = (async (): Promise<AiContentResult<T>> => {
    const generated = await spec.generate();
    if (generated.cache === false) {
      return { data: generated.data, model: generated.model, generatedAt: new Date() };
    }
    return store(spec, generated);               // upsert theo (kind, refId, lang)
  })().finally(() => { inflight.delete(key); });
  inflight.set(key, task);
  return task;
}
```

### 4.6.3 AI Tutor phát trực tuyến

**Server.** Controller đợi **đoạn đầu tiên** của câu trả lời trước khi mở luồng SSE, nên mọi lỗi khởi động (chưa ghi danh, hết hạn mức, AI không dùng được) vẫn trả JSON lỗi bình thường với đúng mã HTTP; sau đó mới đẩy từng đoạn `delta`, rồi lưu cặp tin nhắn và gửi `done`:

*Đoạn mã 4.21 – `server/src/modules/ai/ai.controller.ts`: `chat` (rút gọn)*

```ts
const abort = new AbortController();
res.on('close', () => { if (!res.writableFinished) abort.abort(); }); // client ngắt -> hủy AI

const session = await chatService.startTutorChat(userId, id, message, langOf(req), abort.signal);

const sse = openSse(res);
try {
  for await (const text of session.chunks) {
    if (!sse.send('delta', { text })) return;  // client đã rời: không lưu câu trả lời dang dở
  }
  const { messageId } = await session.complete();
  sse.send('done', { messageId });
} catch (err) {
  const info = describeAnyError(err);
  sse.send('error', { code: info.code, message: info.message });
} finally {
  sse.end();
}
```

**Mobile.** `EventSource` không gửi được tiêu đề `Authorization` và nội dung POST, nên ứng dụng dùng `fetch` có luồng của `expo/fetch`, đọc từng khối byte, giải mã UTF-8 an toàn với ký tự nhiều byte bị cắt giữa hai khối, và đưa qua bộ phân tích SSE tự viết (`features/ai/sse.ts`) chịu được sự kiện bị cắt ở chỗ bất kỳ, ba kiểu xuống dòng (`\n`, `\r\n`, `\r`), nhiều dòng `data:`, dòng chú thích. Hook `useAiTutorChat` **gộp chữ** rồi vẽ tối đa mỗi 40 ms để mô hình nhanh không làm vẽ lại theo từng token, hủy request khi rời màn hình và đếm ngược thời gian chờ khi gặp 429 theo `details.retryAfterSec`. Lỗi giữa chừng giữ lại phần chữ đã nhận nhưng đánh dấu trạng thái `error` (không lưu).

### 4.6.4 Các tính năng AI khác trong ứng dụng

- **Tóm tắt khóa và bài, Quiz, Gợi ý lộ trình:** server trả JSON đã kiểm schema; màn Quiz (`learn/[courseId]/quiz`) chấm điểm, giải thích đúng/sai và cho làm lại; gợi ý lộ trình hiện ở Trang chủ.
- **AI soạn khóa** (giảng viên): mở trong một "sheet" (`studio/ai-draft`), giảng viên nhập chủ đề, xem gợi ý, **chỉnh sửa** rồi áp dụng từng phần (phụ đề, mô tả, lợi ích, danh mục, dàn ý chương/bài) vào form; dàn ý bài chưa tạo được nhớ lại trong AsyncStorage để không mất khi tải lại trang.
- **AI kiểm duyệt sơ bộ** (quản trị viên): panel trong màn xem khóa hiện nhận định `LOOKS_OK` hoặc `NEEDS_ATTENTION` và danh sách vấn đề theo mức độ.
- Chế độ `mock`: khi chưa cấu hình khóa API (ví dụ máy lập trình, CI) toàn bộ tính năng trên vẫn chạy với nội dung mẫu có cấu trúc đúng.

## 4.7 Hiện thực xác thực chuẩn ứng dụng thật

### 4.7.1 Làm mới token trong suốt ở client

Access token chỉ sống 15 phút, nên ứng dụng phải làm mới token mà người dùng không nhận ra. Khi một request mang Bearer nhận 401, interceptor phản hồi gọi `refreshOnce()` — **một lượt làm mới dùng chung** cho mọi request đang chờ — rồi gửi lại request đó đúng một lần:

*Đoạn mã 4.22 – `mobile/src/lib/apiClient.ts`*

```ts
/** Single-flight: concurrent callers share one `POST /auth/refresh`. */
function refreshOnce(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh()
      .then((outcome) => {
        if (outcome.kind === 'rejected') unauthorizedHandler?.();   // phiên chết -> đăng xuất
        return outcome;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
```

Các chi tiết quan trọng: (1) lượt làm mới dùng một axios riêng không có interceptor (`refreshClient`) nên không thể lặp vô hạn và không mang token hết hạn; (2) **lưu cặp token mới trước khi gửi lại request** vì token cũ đã chết; (3) bộ đếm `sessionVersion` giúp bỏ kết quả làm mới nếu người dùng đã đăng xuất trong lúc chờ (kết quả `stale`); (4) phân biệt "bị từ chối" (400/401/403: phiên kết thúc) với "thất bại" (mạng/5xx: chỉ request này lỗi, phiên vẫn giữ); (5) các đường dẫn xác thực (`/auth/login`, `/auth/register`, …) không bao giờ kích hoạt làm mới vì 401 ở đó nghĩa là sai thông tin, không phải token hết hạn.

Khi khởi động, `authStore.hydrate()` đọc token từ SecureStore rồi gọi `GET /auth/me` (token hết hạn được làm mới tự động). Không có mạng nhưng đã có hồ sơ lưu trong cache thì vẫn vào ứng dụng ở chế độ ngoại tuyến; phiên bị từ chối thì xóa token và về màn Đăng nhập.

### 4.7.2 Xoay vòng refresh token ở server

Việc "chiếm" token cũ và cấp token mới nằm trong một giao dịch; điều kiện `usedAt: null` trong `updateMany` bảo đảm chỉ một request đồng thời thắng. Token đã dùng mà bị trình lại sẽ thu hồi phiên:

*Đoạn mã 4.23 – `server/src/modules/auth/session.service.ts`: `refreshSession` (rút gọn)*

```ts
if (row.usedAt) return rejectReuse(row, ctx, now);        // đã dùng -> thu hồi cả phiên

const rotated = await prisma.$transaction(async (tx) => {
  // "Chiếm" token bằng UPDATE có điều kiện: hai request đồng thời chỉ một request thắng.
  const claim = await tx.refreshToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claim.count === 0) return false;
  await tx.refreshToken.create({
    data: { sessionId, tokenHash: hashRefreshToken(nextToken), expiresAt: nextExpiresAt },
  });
  await tx.session.update({ where: { id: sessionId }, data: { lastUsedAt: now, expiresAt: nextExpiresAt /* ... */ } });
  /* ... dọn token đã dùng quá 7 ngày ... */
  return true;
});
if (!rotated) return rejectReuse(row, ctx, now);
```

### 4.7.3 Chống dò mật khẩu và mã 2FA

Bộ đếm lỗi liên tiếp nằm ngay trên bản ghi người dùng; đủ 5 lần thì khóa 15 phút và đặt lại bộ đếm:

*Đoạn mã 4.24 – `server/src/modules/auth/lockout.service.ts`: `recordFailure`*

```ts
export async function recordFailure(userId: string, now = new Date()): Promise<FailureResult> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (updated.failedLoginCount < MAX_FAILED_ATTEMPTS) {
    return { failedCount: updated.failedLoginCount, lockedUntil: null, justLocked: false };
  }
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_SEC * 1000);   // 15 phút
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil },
    select: { id: true },
  });
  return { failedCount: 0, lockedUntil, justLocked: true };
}
```

Từ lần sai thứ 3 (`CAPTCHA_AFTER_FAILURES = 3`) đăng nhập đòi CAPTCHA; ứng dụng đọc `details.captchaRequired` trong lỗi 401 để hiện widget, và `Retry-After`/`retryAfterSec` của lỗi 423 để đếm ngược (`useCountdown`).

### 4.7.4 TOTP, mã khôi phục và mã hóa secret

TOTP được tự hiện thực bằng `node:crypto` để phụ thuộc ít và dễ giải thích; kiểm bằng test vector của RFC 4226/6238/4648. Hàm kiểm tra luôn duyệt hết cửa sổ ±1 bước để thời gian xử lý không lộ khớp ở bước nào, và từ chối mã thuộc bước đã dùng:

*Đoạn mã 4.25 – `server/src/lib/totp.ts`: `verifyTotp` (rút gọn)*

```ts
if (!/^\d{6}$/.test(code)) return null;
const secret = base32Decode(secretBase32);
const current = totpStep(nowMs);
let matched: number | null = null;
for (let step = current - window; step <= current + window; step += 1) {
  if (step >= 0 && codesEqual(hotp(secret, step), code) && matched === null) matched = step;
}
if (matched === null) return null;
if (lastStep !== null && matched <= lastStep) return null;   // chống dùng lại cùng một mã
return matched;
```

Secret lưu trong DB được mã hóa AES-256-GCM với IV mới 96 bit cho mỗi lần mã hóa (`encryptSecret`: `v1.<iv>.<tag>.<ciphertext>`), GCM còn xác thực toàn vẹn nên dữ liệu bị sửa thì giải mã lỗi. Mã khôi phục dạng `XXXXX-XXXXX` (bảng chữ 32 ký tự, bỏ `I`, `O`, `0`, `1` cho khỏi đọc nhầm, 50 bit entropy) chỉ lưu HMAC. Ở ứng dụng, màn bật 2FA hiển thị mã QR (thư viện `qrcode`) kèm khóa nhập tay, và 10 mã khôi phục hiện **một lần** với nút sao chép.

### 4.7.5 Các màn hình xác thực

Gồm sáu màn: Đăng nhập, Đăng ký (chọn Học viên/Giảng viên, kiểm tra mật khẩu bằng zod phía client giống server), Xác minh email (ô nhập OTP, đồng hồ đếm ngược gửi lại 60 giây), Quên mật khẩu, Đặt lại mật khẩu, Xác thực hai lớp (nhập mã TOTP hoặc mã khôi phục); cùng màn Cài đặt → Bảo mật (đổi mật khẩu, danh sách thiết bị, đăng xuất từ xa, bật/tắt 2FA, tạo lại mã khôi phục). CAPTCHA: trên web dùng widget reCAPTCHA trực tiếp, trên Android chạy trong WebView với origin HTTPS cấu hình trước; các bước đăng nhập, đăng ký, quên mật khẩu luôn đi qua `authFlowStore` (Zustand) để giữ email giữa các màn.

## 4.8 Đa ngôn ngữ, giao diện sáng/tối, web/PWA và phát hành bản cập nhật

### 4.8.1 Hai ngôn ngữ Việt/Anh

Ứng dụng dùng một thể hiện i18next duy nhất (`mobile/src/i18n/index.ts`) với tài nguyên đóng gói sẵn trong bundle (khởi tạo đồng bộ, không phải chờ tải). Ngôn ngữ mặc định lấy từ máy bằng `expo-localization`: thiết bị tiếng Việt chọn `vi`, mọi trường hợp còn lại chọn `en`; người dùng đổi trong Cài đặt (*Theo thiết bị / Tiếng Việt / English*) và lựa chọn lưu vào AsyncStorage.

*Đoạn mã 4.26 – `mobile/src/i18n/index.ts`*

```ts
/** Device language limited to the supported ones: a Vietnamese device => `vi`, everything else => `en`. */
export function getDeviceLanguage(): AppLanguage {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'vi' ? 'vi' : FALLBACK_LANGUAGE;
  } catch {
    return FALLBACK_LANGUAGE;
  }
}

export function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference === 'system' ? getDeviceLanguage() : preference;
}

// Web: keep `<html lang>` and dayjs in step with the UI language.
i18n.on('languageChanged', (language) => {
  dayjs.locale(language);
  syncDocumentLanguage(language);
});
```

Chuỗi nằm trong 20 file namespace cho mỗi ngôn ngữ (`locales/{vi,en}/<namespace>.json`, ví dụ `home.json`, `studio.json`); có hỗ trợ số nhiều (`openCount_one`/`openCount_other` ở tiếng Anh, tiếng Việt chỉ cần một dạng) và nội suy (`"greeting": "Xin chào, {{name}}!"`). Bài kiểm tra `locales.test.ts` bảo đảm mọi khóa có ở cả hai ngôn ngữ, cùng các tham số `{{...}}` và không để trống. Lỗi từ server được dịch theo `error.code` (namespace `errors`), thông báo theo `data.key` + `data.params` **lúc hiển thị** (nên đổi ngôn ngữ thì thông báo cũ cũng đổi theo), còn nội dung AI do server tạo theo tham số `lang` lấy từ ngôn ngữ đang chọn. Dữ liệu mẫu (tên khóa, nội dung bài) giữ tiếng Anh theo quyết định ban đầu của nhóm.

### 4.8.2 Giao diện sáng/tối

`ThemeProvider` chọn bảng màu `lightPalette` hoặc `darkPalette` từ lựa chọn của người dùng (`system`, `light`, `dark`); chế độ `system` theo `useColorScheme()`. Component không bao giờ so sánh `isDark` để chọn màu mà lấy token ngữ nghĩa qua hàm `makeStyles`, nên một đoạn mã viết một lần chạy đúng ở cả hai chế độ:

*Đoạn mã 4.27 – `mobile/src/theme/makeStyles.ts` và cách dùng (trích chú thích hướng dẫn trong file)*

```ts
const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.card, borderColor: t.colors.borderSubtle },
}));

function Card() {
  const styles = useStyles();           // memoized: rebuilt only when the theme changes
  return <View style={styles.card} />;
}
```

`ThemeProvider` còn đồng bộ phần "vỏ" của hệ điều hành: `Appearance.setColorScheme` (hộp thoại và bàn phím theo chế độ đã chọn), `SystemUI.setBackgroundColorAsync` (không nháy trắng sau điều hướng), và trên web đặt màu nền và `color-scheme` của `<html>`. Độ tương phản được bảo vệ bằng `npm run check:contrast` (chạy cả trong CI): mọi cặp chữ/nền phải từ 4,5:1 ở **cả hai** bảng màu, chữ trên mặt kính được kiểm trên nền trắng và đen xấu nhất bên dưới, biểu tượng ở chế độ tối phải từ 3:1.

### 4.8.3 Web và PWA

Cùng một mã nguồn chạy trên web (`expo export --platform web`, `output: single` → SPA). Những điểm riêng cho web:

- **Bố cục:** `useBreakpoint` và `AppFrame` (mục 3.3.5); `DesktopTopNav` là thanh điều hướng kiểu Netflix ba cột (logo · liên kết căn giữa · biểu tượng tìm kiếm, giỏ, chuông, avatar có menu); các màn có bản PC riêng (`HomeDesktopScreen`, `CartDesktopScreen`, `CheckoutDesktopScreen`, `ProfileDesktopScreen`, `SearchDesktopScreen`…) và các route chưa có bản PC nằm trong cột giới hạn `NARROW_FALLBACK_WIDTH` ở giữa.
- **Tệp theo nền tảng:** hậu tố `.web.tsx`/`.web.ts` thay thế bản native: `YouTubePlayer.web.tsx` (iframe), `RecaptchaWidget.web.tsx`, `TurnstileWidget.web.tsx`, `downloadResource.web.ts`; các API chỉ có trên native đều có nhánh `Platform.OS === 'web'` hoặc dự phòng (ví dụ hộp xác nhận thay cho `Alert`).
- **Token:** SecureStore không có trên web nên `lib/secureStorage.ts` lưu token vào `localStorage` (đã ghi chú đánh đổi bảo mật ở mục 3.10.1).
- **Manifest và cài đặt như ứng dụng:** `public/manifest.json` khai báo `display: standalone`, biểu tượng 192/512 px và biểu tượng *maskable*; `public/index.html` thay mẫu HTML của Expo để gắn manifest, `apple-touch-icon`, các thẻ meta và một đoạn script **tô nền trang trước khi JavaScript chạy** để chế độ tối không bị nháy trắng. Trên iPhone người dùng mở bằng Safari rồi chọn *Thêm vào MH chính* để dùng như ứng dụng (nhóm không có tài khoản Apple Developer).
- **Phục vụ:** `mobile/Dockerfile.web` build bằng `expo export` trong image Node, rồi chạy bằng Caddy tĩnh, mọi đường dẫn không phải tệp rơi về `index.html` (SPA); Caddy ngoài đặt `Cache-Control: immutable` cho tệp có băm tên (`/_expo/static/*`, `/assets/*`).
- **Nhúng cấu hình:** các biến `EXPO_PUBLIC_*` (URL API, loại CAPTCHA, site key) được Metro thay thẳng vào mã lúc build, vì vậy `Dockerfile.web` bắt buộc truyền `EXPO_PUBLIC_API_URL` và từ chối build reCAPTCHA production nếu thiếu site key thật hoặc dùng khóa thử của Google.

### 4.8.4 Android APK và EAS Update

- **APK:** dựng bằng EAS Build trên đám mây với profile `preview` (`distribution: internal`, `buildType: apk`); biến môi trường của build (URL API production, loại CAPTCHA, site key công khai) khai báo trong `env` của profile ở `mobile/eas.json`, nên APK luôn gọi đúng API thật, không đọc `mobile/.env` (địa chỉ LAN). Profile `production` dựng `app-bundle`, profile `development` dùng cho development client.
- **Cập nhật qua mạng (EAS Update):** triển khai server hoặc web **không** cập nhật APK đã cài. Với thay đổi chỉ ở JavaScript và ảnh, nhóm phát hành bản cập nhật OTA bằng `npm run update:preview -- "mô tả"`. Script `mobile/scripts/eas-update.mjs` lấy `env` của profile cùng tên trong `eas.json`, tắt đọc `.env` (`EXPO_NO_DOTENV=1`) và xóa cache Metro (`--clear-cache`), để bản cập nhật gọi đúng API production thay vì địa chỉ LAN trong `.env`. APK `preview` nhận bản cập nhật qua `channel: preview` với `runtimeVersion` theo `appVersion` (`1.0.0`); thêm thư viện native hoặc nâng SDK thì phải dựng APK mới và tăng `version`, vì APK cũ sẽ không nhận bản cập nhật không tương thích.

*Đoạn mã 4.28 – `mobile/scripts/eas-update.mjs` (lệnh được dựng)*

```js
const args = [
  'eas-cli', 'update',
  '--channel', channel,
  '--environment', profile.environment ?? channel,
  '--platform', 'android',
  '--clear-cache',
];
const result = spawnSync('npx', [...args, '--message', quote(message)], {
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, ...profile.env, EXPO_NO_DOTENV: '1' },
});
```

## 4.9 Các màn hình đã hiện thực

Các ảnh dưới đây chụp từ ứng dụng **thật** chạy trên bản web (Playwright + Edge, dữ liệu mẫu, tài khoản mẫu của dữ liệu seed): điện thoại 390 × 844 (mặc định giao diện sáng; ảnh P15, P16 là giao diện tối) và máy tính 1440 × 900 (mặc định giao diện tối; ảnh D09 là giao diện sáng), tiếng Việt. Ảnh nằm trong `notes/tools/evidence/figma/shots/` (ký hiệu `P` là điện thoại, `D` là máy tính). Ảnh minh chứng kiểm thử có đánh số theo test case nằm ở `docs/04-testing/evidence/<khu vực>/` (xem Chương 5).

### 4.9.1 Màn hình điện thoại

**Đăng nhập, khám phá và chi tiết khóa.**

![Hình 4.1 – Đăng nhập (điện thoại, sáng)](../../../notes/tools/evidence/figma/shots/P01-login.png)

*Hình 4.1 – Màn Đăng nhập: tiêu đề serif, thẻ đăng nhập, liên kết quên mật khẩu và đăng ký.*

![Hình 4.2 – Trang chủ (điện thoại, sáng)](../../../notes/tools/evidence/figma/shots/P02-home.png)

*Hình 4.2 – Trang chủ: lời chào theo tên, banner hero tràn viền với nút neon, hàng "Tiếp tục học", thanh tab kính nổi.*

![Hình 4.3 – Trang chủ (điện thoại, tối)](../../../notes/tools/evidence/figma/shots/P15-home-dark.png)

*Hình 4.3 – Trang chủ ở chế độ tối (chế độ chính của concept Noir).*

![Hình 4.4 – Tìm kiếm (điện thoại)](../../../notes/tools/evidence/figma/shots/P03-search.png)

*Hình 4.4 – Màn Khám phá: ô tìm kiếm, chủ đề nóng (chip), danh sách danh mục.*

![Hình 4.5 – Chi tiết khóa học (điện thoại, sáng)](../../../notes/tools/evidence/figma/shots/P04-course-detail.png)

*Hình 4.5 – Chi tiết khóa học: ảnh hero với nút phát, tên khóa serif, giảng viên và nút Theo dõi, thanh số liệu, ba tab Tổng quan / Nội dung / Đánh giá, thanh mua kính ở đáy.*

![Hình 4.6 – Chi tiết khóa học (điện thoại, tối)](../../../notes/tools/evidence/figma/shots/P16-course-detail-dark.png)

*Hình 4.6 – Chi tiết khóa học ở chế độ tối.*

**Mua và học.**

![Hình 4.7 – Giỏ hàng (điện thoại)](../../../notes/tools/evidence/figma/shots/P07-cart.png)

*Hình 4.7 – Giỏ hàng ở trạng thái rỗng (EmptyState có nút khám phá khóa học).*

![Hình 4.8 – Khóa học của tôi (điện thoại)](../../../notes/tools/evidence/figma/shots/P08-my-courses.png)

*Hình 4.8 – Khóa học của tôi: khối "Tiếp tục học", thẻ có thanh tiến độ và phần trăm, các tab Tất cả / Đang học / Hoàn thành.*

![Hình 4.9 – Học bài (điện thoại)](../../../notes/tools/evidence/figma/shots/P05-learning.png)

*Hình 4.9 – Học bài: trình phát video, các tab Bài học / Project / Hỏi đáp, thẻ AI Tutor, danh sách bài theo chương có dấu hoàn thành.*

![Hình 4.10 – AI Tutor (điện thoại)](../../../notes/tools/evidence/figma/shots/P06-ai-tutor.png)

*Hình 4.10 – AI Tutor: câu hỏi gợi ý, ô nhập câu hỏi; câu trả lời hiện dần khi nhận luồng SSE.*

![Hình 4.11 – Thông báo (điện thoại)](../../../notes/tools/evidence/figma/shots/P09-notifications.png)

*Hình 4.11 – Thông báo nhóm theo thời gian, có chấm chưa đọc và biểu tượng theo loại.*

**Hồ sơ và giảng viên.**

![Hình 4.12 – Hồ sơ cá nhân (điện thoại)](../../../notes/tools/evidence/figma/shots/P10-profile.png)

*Hình 4.12 – Hồ sơ cá nhân: ảnh đại diện, thống kê Đã lưu / Đang học / Hoàn thành, danh sách khóa đã lưu.*

![Hình 4.13 – Hồ sơ giảng viên (điện thoại)](../../../notes/tools/evidence/figma/shots/P11-teacher.png)

*Hình 4.13 – Hồ sơ giảng viên: giờ địa phương, thống kê, nút Theo dõi, các khóa theo danh mục.*

![Hình 4.14 – Studio của giảng viên (điện thoại)](../../../notes/tools/evidence/figma/shots/P12-studio.png)

*Hình 4.14 – Tab Giảng dạy (Studio): tóm tắt số liệu, chip trạng thái khóa (nháp, chờ duyệt, đã xuất bản…), nút tạo khóa mới.*

![Hình 4.15 – Wizard soạn khóa (điện thoại)](../../../notes/tools/evidence/figma/shots/P13-wizard.png)

*Hình 4.15 – Wizard soạn khóa 5 bước, đang ở bước "Giới thiệu": phụ đề, mô tả có nút "Viết giúp" (AI), lợi ích.*

![Hình 4.16 – Hàng chờ duyệt (điện thoại)](../../../notes/tools/evidence/figma/shots/P14-admin-queue.png)

*Hình 4.16 – Quản trị: hàng chờ duyệt với bộ lọc loại (khóa mới / bản sửa đổi) và trạng thái.*

### 4.9.2 Màn hình máy tính (web PC)

![Hình 4.17 – Đăng nhập (máy tính, tối)](../../../notes/tools/evidence/figma/shots/D01-login.png)

*Hình 4.17 – Đăng nhập trên máy tính: thẻ giữa màn hình trên nền poster mờ.*

![Hình 4.18 – Trang chủ (máy tính, tối)](../../../notes/tools/evidence/figma/shots/D02-home.png)

*Hình 4.18 – Trang chủ máy tính: thanh điều hướng trên cùng, banner tràn viền, hàng "Tiếp tục học" cuộn ngang.*

![Hình 4.19 – Trang chủ (máy tính, sáng)](../../../notes/tools/evidence/figma/shots/D09-home-light.png)

*Hình 4.19 – Trang chủ máy tính ở chế độ sáng.*

![Hình 4.20 – Chi tiết khóa học (máy tính)](../../../notes/tools/evidence/figma/shots/D03-course-detail.png)

*Hình 4.20 – Chi tiết khóa học dạng hai cột: nội dung bên trái, thẻ giá và hành động dính bên phải.*

![Hình 4.21 – Học bài (máy tính)](../../../notes/tools/evidence/figma/shots/D04-learning.png)

*Hình 4.21 – Học bài: video bên trái, danh sách bài, AI Tutor và Quiz bên phải.*

![Hình 4.22 – Khóa học của tôi (máy tính)](../../../notes/tools/evidence/figma/shots/D05-my-courses.png)

*Hình 4.22 – Khóa học của tôi: chip số liệu, khối "Tiếp tục học" lớn, lưới thẻ có tiến độ.*

![Hình 4.23 – Khám phá và tìm kiếm (máy tính)](../../../notes/tools/evidence/figma/shots/D06-search.png)

*Hình 4.23 – Tìm kiếm trên máy tính: bộ lọc theo hàng, lưới poster.*

![Hình 4.24 – Wizard soạn khóa (máy tính)](../../../notes/tools/evidence/figma/shots/D07-studio-wizard.png)

*Hình 4.24 – Wizard soạn khóa trên máy tính: danh sách bước dọc bên trái, form ở giữa.*

![Hình 4.25 – Hàng chờ duyệt (máy tính)](../../../notes/tools/evidence/figma/shots/D08-admin-course.png)

*Hình 4.25 – Quản trị trên máy tính: hàng chờ duyệt dạng bảng.*

## 4.10 Mã nguồn và hướng dẫn chạy

### 4.10.1 Mã nguồn

- Kho mã: `https://github.com/kanele05/project_tbdd` (nhánh mặc định `develop`, nhánh ổn định `main`). Bản đóng băng mã ngày 24/10/2026 (commit gần nhất khi viết: `8e93a62`).
- Tài liệu chạy mã: `README.md` (tổng quan), `server/README.md`, `mobile/README.md`, `deploy/README.md` (triển khai). Tệp `.env` thật không nằm trong kho; mỗi thư mục có `.env.example` để sao chép.
- Hệ thống đã chạy thật tại: ứng dụng web `https://app.eliuh.site` và API `https://api.eliuh.site/api/v1` (máy chủ AWS EC2 chỉ bật khi test/demo để tiết kiệm chi phí; trạng thái sống kiểm bằng `GET /api/v1/health`).

### 4.10.2 Chạy server cục bộ

Yêu cầu: Node.js ≥ 20 (đã chạy với 24), npm ≥ 10. **Không cần** Docker hay cài PostgreSQL vì PostgreSQL nhúng được khởi động bằng lệnh `npm run db:start`.

```bash
cd server
npm install                 # tự chạy `prisma generate`
cp .env.example .env        # rồi đặt JWT_SECRET (>= 32 ký tự ngẫu nhiên)
cp .env.test.example .env.test
npm run db:start            # PostgreSQL nhúng, cổng 5433, tạo 2 database (dev và test)
npm run db:migrate          # áp migration lên database dev
npm run db:migrate:test     # áp migration lên database test
npm run prisma:seed         # nạp dữ liệu mẫu (xóa rồi tạo lại)
npm run dev                 # http://localhost:4000/api/v1/health
```

Khi chưa có `GEMINI_API_KEY`, server tự dùng provider `mock` cho AI; khi chưa cấu hình SMTP, email chỉ ghi vào log; CAPTCHA ở môi trường dev chấp nhận khóa thử nghiệm. Các lệnh hay dùng: `npm test` (unit + integration, trên database test), `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run db:studio` (xem dữ liệu), `npm run user:set-role -- --email <email> --role ADMIN` (chế độ chạy thử mặc định, thêm `--apply` mới ghi). Tài khoản mẫu và mật khẩu chung của dữ liệu seed khai báo ở `server/prisma/seed-data/users.ts` (tài khoản quản trị mẫu: `admin@example.com`).

### 4.10.3 Chạy ứng dụng di động và web cục bộ

```bash
cd mobile
npm install
cp .env.example .env        # đặt EXPO_PUBLIC_API_URL=http://<IP-LAN>:4000/api/v1
npx expo start              # quét mã QR bằng Expo Go (tương thích SDK 57)
npx expo start --web        # chạy bản web trên trình duyệt
npx expo start -c           # xóa cache Metro khi gặp lỗi lạ
```

Trên điện thoại thật phải dùng **IP LAN** của máy chạy server (không dùng `localhost`), cùng mạng Wi-Fi; Android Emulator dùng `10.0.2.2`; nếu Wi-Fi chặn kết nối giữa các thiết bị thì chạy `npx expo start --tunnel`. Các lệnh kiểm tra: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run check:contrast`, `npm test`.

### 4.10.4 Dựng bản phát hành

- **Web:** `npx expo export --platform web --output-dir dist` (hoặc dựng image `mobile/Dockerfile.web` với `--build-arg EXPO_PUBLIC_API_URL=https://api.<tên miền>/api/v1`).
- **APK Android:** `npx eas-cli build -p android --profile preview` (cần tài khoản Expo; biến môi trường lấy từ `eas.json`); cập nhật JavaScript cho APK đã cài bằng `npm run update:preview -- "mô tả"`.
- **Triển khai máy chủ:** đẩy lên nhánh `main` hoặc gắn tag `v*` để quy trình CI/CD chạy kiểm thử, dựng image đẩy lên GHCR và triển khai qua SSH (Chương 6; hướng dẫn từng bước ở `deploy/README.md`).

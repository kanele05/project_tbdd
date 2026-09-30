# Đặc tả API (D-05)

> **Tài liệu:** `docs/02-design/api-spec.md` · **Task:** D-05 · **Owner tài liệu:** A (Lê Hoàng Khang)
>
> **Owner endpoint cập nhật file này khi implement** (CLAUDE.md §8, §13): mỗi khi thêm/sửa endpoint, người phụ trách endpoint (cột *Owner* ở từng mục) sửa đúng mục của mình trong cùng PR và cập nhật cả [PLAN.md §9](../../PLAN.md) nếu thay đổi hợp đồng.
> **Nguồn sự thật:** [PLAN.md §9](../../PLAN.md) (danh sách endpoint, DTO, mã lỗi) và [§6.5 Business rules](../../PLAN.md). Liên quan: [database.md](database.md) · [SDS.md](SDS.md) · [sequence-diagrams.md](sequence-diagrams.md).

## Mục lục

1. [Quy ước chung](#1-quy-ước-chung)
2. [Bảng tổng hợp endpoint](#2-bảng-tổng-hợp-endpoint)
3. [DTO](#3-dto)
4. [Chi tiết endpoint](#4-chi-tiết-endpoint)
   - [4.1 Health](#41-health) · [4.2 Auth](#42-auth) · [4.3 Home](#43-home) · [4.4 Catalog](#44-catalog) · [4.5 Bookmark](#45-bookmark) · [4.6 Like / Share](#46-like--share) · [4.7 Review](#47-review) · [4.8 Teacher](#48-teacher) · [4.9 Cart](#49-cart) · [4.10 Order & Enroll](#410-order--enroll) · [4.11 Learning](#411-learning) · [4.12 Q&A](#412-qa) · [4.13 Project](#413-project) · [4.14 Me](#414-me) · [4.15 Notification](#415-notification) · [4.16 Files](#416-files)
5. [Mã lỗi](#5-mã-lỗi)
6. [Ma trận endpoint ↔ yêu cầu](#6-ma-trận-endpoint--yêu-cầu)
7. [Bổ sung và làm rõ so với PLAN §9](#7-bổ-sung-và-làm-rõ-so-với-plan-9)

---

## 1. Quy ước chung

### 1.1 Base URL và phiên bản

| Môi trường | Base URL |
|---|---|
| Dev (điện thoại thật, Expo Go) | `http://<IP-LAN>:4000/api/v1` (không dùng `localhost`) |
| Android Emulator | `http://10.0.2.2:4000/api/v1` |
| Staging / Demo | `https://<app>.onrender.com/api/v1` |

- Mọi endpoint nằm dưới tiền tố **`/api/v1`**, trừ file tĩnh `/static/*` và `/uploads/*` (mục 4.16).
- REST, tài nguyên là danh từ số nhiều, kebab-case (`/courses/:id/reviews`).
- Header yêu cầu: `Content-Type: application/json` (trừ upload dùng `multipart/form-data`), `Accept: application/json`. Server bật `compression` (gzip) — client gửi `Accept-Encoding: gzip`.
- Mỗi response có header `X-Request-Id` (sinh bởi `pino-http`) để đối chiếu log.

### 1.2 Response thành công

```json
{
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
}
```

- `data`: đối tượng, mảng hoặc `null` (vd `GET /courses/:id/reviews/me` khi chưa có review).
- `meta`: chỉ có với danh sách phân trang (`PaginationMeta`) hoặc khi endpoint có thông tin bổ sung (`meta.unreadCount` ở `GET /notifications`, `meta.summary` ở review). Các trường bổ sung được **gộp** vào cùng đối tượng `meta`.
- Endpoint trả `204 No Content` **không có body**.

### 1.3 Response lỗi

```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course not found",
    "details": null
  }
}
```

- `code`: mã ổn định, `UPPER_SNAKE_CASE` (mục 5) — client rẽ nhánh theo `code`, **không** theo `message`.
- `message`: câu tiếng Anh dễ hiểu, có thể hiển thị trực tiếp (UI tiếng Anh). Không chứa thông tin nhạy cảm, **không trả stack trace**.
- `details`: tùy chọn; với `VALIDATION_ERROR` là mảng lỗi từng trường:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "source": "body", "field": "email", "message": "Invalid email address" },
      { "source": "body", "field": "password", "message": "Password must be at least 8 characters" }
    ]
  }
}
```

  `source` ∈ `body | query | params`; `field` là đường dẫn dạng dấu chấm (`"items.0.courseId"`). Client dùng `field` để `setError` của react-hook-form.
- Với `ALREADY_ENROLLED`/`CART_EMPTY`… `details` có thể chứa dữ liệu hỗ trợ (được ghi ở từng endpoint).

### 1.4 Xác thực

- Header: `Authorization: Bearer <JWT>`. JWT ký HS256 bằng `JWT_SECRET`, hạn **7 ngày** (`JWT_EXPIRES_IN=7d`), payload `{ sub: userId, role, iat, exp }`. Không có refresh token (ADR-07).
- Cột **Auth** dùng ký hiệu của PLAN §9.1:

| Ký hiệu | Middleware | Ý nghĩa |
|---|---|---|
| `—` | không | Công khai. Nếu client vẫn gửi token thì bị bỏ qua |
| `opt` | `optionalAuth` | Token tùy chọn để cá nhân hóa (`isBookmarked`, `isLiked`, `isInCart`, `enrollment`, `isFollowed`…). **Không có header → khách (guest)**; **có header nhưng token sai/hết hạn → `401 UNAUTHORIZED`** để client đăng xuất |
| `✓` | `requireAuth` | Bắt buộc token hợp lệ, ngược lại `401 UNAUTHORIZED` |
| `✓E` | `requireAuth` + kiểm tra ghi danh | Bắt buộc token **và** đã ghi danh khóa học liên quan, ngược lại `403 NOT_ENROLLED` (NFR-06). Server kiểm tra thật, không chỉ ẩn UI |

- Mọi endpoint `✓`/`✓E` có thể trả `401 UNAUTHORIZED` (thiếu header, sai định dạng, chữ ký sai, hết hạn). `requireAuth` chỉ kiểm tra JWT (không truy vấn DB ở mỗi request); riêng `GET /auth/me` còn trả 401 khi người dùng không còn tồn tại. Mobile: nhận 401 → xóa token, `queryClient.clear()`, về Login.

### 1.5 Phân trang

- Query: `?page=1&limit=20`. `page` ≥ 1 (mặc định 1), `limit` từ 1 đến **50** (mặc định 20).
- Response: `meta = { page, limit, total, totalPages }` (`totalPages = ceil(total / limit)`, `0` nếu `total = 0`).
- Trang vượt quá `totalPages` trả `data: []` (không lỗi). Sắp xếp luôn có khóa phụ `id` để phân trang ổn định.
- Mobile dùng `useInfiniteQuery`, `getNextPageParam = meta.page < meta.totalPages ? meta.page + 1 : undefined`.
- Zod dùng chung (`lib/pagination.ts`):

```ts
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

### 1.6 Status code

| Code | Dùng khi |
|---|---|
| `200 OK` | Đọc/cập nhật thành công có body |
| `201 Created` | Tạo mới (`register`, thêm giỏ, tạo câu hỏi/trả lời/bài nộp, checkout, ghi danh) |
| `204 No Content` | Thành công không có body (bookmark, xóa mục giỏ, đánh dấu đã đọc) |
| `400 Bad Request` | `VALIDATION_ERROR` — body/query/params sai; JSON hỏng |
| `401 Unauthorized` | Chưa đăng nhập / token sai / `INVALID_CREDENTIALS` |
| `403 Forbidden` | Không đủ quyền, điển hình `NOT_ENROLLED` |
| `404 Not Found` | Không có tài nguyên (`*_NOT_FOUND`) hoặc route không tồn tại (`NOT_FOUND`) |
| `409 Conflict` | Trùng: `EMAIL_TAKEN`, `ALREADY_ENROLLED`, `ALREADY_IN_CART` |
| `402 Payment Required` | `PAYMENT_FAILED` — thanh toán giả lập thất bại (BR-07) |
| `413 Payload Too Large` | `FILE_TOO_LARGE` · `PAYLOAD_TOO_LARGE` *(mã bổ sung — mục 7)* |
| `415 Unsupported Media Type` | `UNSUPPORTED_FILE_TYPE` |
| `422 Unprocessable Entity` | Vi phạm quy tắc nghiệp vụ: `FREE_COURSE`, `PAID_COURSE`, `CART_EMPTY`, `CANNOT_FOLLOW_SELF` |
| `429 Too Many Requests` | `RATE_LIMITED` |
| `500 Internal Server Error` | `INTERNAL_ERROR` — lỗi không lường trước; chi tiết chỉ ở log server |

### 1.7 Định dạng dữ liệu

| Loại | Quy ước |
|---|---|
| ID | Chuỗi `cuid` (25 ký tự). **Các ID trong ví dụ của tài liệu này được rút gọn cho dễ đọc** (vd `crs_ux_foundation`) |
| Tiền | Số nguyên **cent** (`priceCents: 5900` = $59.00) |
| Thời lượng | Số nguyên **giây** (`durationSec`, `positionSec`, `totalDurationSec`) |
| Thời gian | ISO 8601 UTC (`2026-11-05T09:30:00.000Z`) |
| URL tệp/ảnh | Luôn là URL **tuyệt đối** (server ghép `PUBLIC_BASE_URL` cho đường dẫn tương đối) |
| Boolean query | Chuỗi `"true"` / `"false"` |
| Mảng query | Danh sách phân tách bằng dấu phẩy (`categoryId=a,b`) |
| Chuỗi văn bản | Server `trim()` đầu/cuối; độ dài tính theo ký tự Unicode |
| ID param | `z.string().min(1).max(50)` — ID không tồn tại trả `404` thay vì `400` |

### 1.8 Giới hạn và bảo mật

| Hạng mục | Giá trị | Ghi chú |
|---|---|---|
| Rate limit | **10 request / phút / IP**, **chỉ** `POST /auth/login` và `POST /auth/register` (không áp cho `GET /auth/me` hay endpoint khác) | Vượt → `429 RATE_LIMITED` + header `Retry-After`. NFR-05 |
| Kích thước body JSON | ≤ 100 KB | Vượt → `413 PAYLOAD_TOO_LARGE` |
| Upload | multer, ≤ 10 MB/tệp (avatar ≤ 5 MB); whitelist MIME `image/png`, `image/jpeg`, `application/pdf`, `application/zip`, `text/plain` | Vượt → `413 FILE_TOO_LARGE`; sai loại → `415 UNSUPPORTED_FILE_TYPE` |
| Header bảo mật | `helmet` (đặt `Cross-Origin-Resource-Policy: cross-origin` để ảnh/video tải được), `cors` (`CORS_ORIGIN`) | |
| Mật khẩu | bcryptjs cost 10; không log password/token | |

### 1.9 Cách đọc từng endpoint

Mỗi endpoint có: bảng thông tin (Auth, Owner, Sprint, yêu cầu liên quan) → tham số/body (kiểu, bắt buộc, ràng buộc zod) → response thành công mẫu → bảng lỗi → quy tắc nghiệp vụ áp dụng. Lỗi `401`/`500` được ghi ở từng endpoint có yêu cầu đăng nhập; `500 INTERNAL_ERROR` luôn có thể xảy ra ở mọi endpoint.

---

## 2. Bảng tổng hợp endpoint

**52 endpoint REST + 2 route file tĩnh.** ID `E01…E52` dùng để tham chiếu chéo (E52 là endpoint thêm ở PLAN v1.3, xếp cùng nhóm Notification).

| ID | Nhóm | Method & Path | Auth | Mô tả ngắn | Owner | Sprint |
|---|---|---|---|---|---|---|
| E01 | Health | `GET /health` | — | Trạng thái server và DB | A | W2 |
| E02 | Auth | `POST /auth/register` | — | Đăng ký, trả token | A | S1 |
| E03 | | `POST /auth/login` | — | Đăng nhập, trả token | A | S1 |
| E04 | | `GET /auth/me` | ✓ | Người dùng hiện tại | A | S1 |
| E05 | Home | `GET /home` | opt | Gộp 6 section trang chủ | A | S1 |
| E06 | Catalog | `GET /categories` | — | 6 danh mục kèm `courseCount` | A | S1 |
| E07 | | `GET /tags/hot` | — | Tag hot | A | S1 |
| E08 | | `GET /courses` | opt | Tìm kiếm / lọc / sắp xếp / section | A | S2 |
| E09 | | `GET /courses/:id` | opt | Chi tiết khóa học | A | S2 |
| E10 | | `GET /courses/:id/curriculum` | opt | Chương/bài kèm trạng thái | C | S2 |
| E11 | | `GET /courses/:id/similar` | opt | ≤ 3 khóa tương tự | A | S2 |
| E12 | Bookmark | `PUT /courses/:id/bookmark` | ✓ | Lưu khóa (idempotent) | C | S1 |
| E13 | | `DELETE /courses/:id/bookmark` | ✓ | Bỏ lưu | C | S1 |
| E14 | | `GET /me/bookmarks` | ✓ | Khóa đã lưu | C | S1 |
| E15 | Like/Share | `PUT /courses/:id/like` | ✓ | Thích khóa (Could) | C | S2 |
| E16 | | `DELETE /courses/:id/like` | ✓ | Bỏ thích (Could) | C | S2 |
| E17 | | `POST /courses/:id/share` | ✓ | Tăng lượt chia sẻ (Could) | C | S2 |
| E18 | Review | `GET /courses/:id/reviews` | opt | Danh sách review + tóm tắt | C | S2 |
| E19 | | `GET /courses/:id/reviews/me` | ✓ | Review của tôi | C | S4 |
| E20 | | `PUT /courses/:id/reviews/me` | ✓E | Tạo/sửa review | C | S4 |
| E21 | Teacher | `GET /teachers` | — | Danh sách giảng viên (top) | A | S2 |
| E22 | | `GET /teachers/:id` | opt | Hồ sơ giảng viên | A | S2 |
| E23 | | `GET /teachers/:id/courses` | opt | Khóa của giảng viên theo danh mục | A | S2 |
| E24 | | `GET /teachers/:id/reviews` | — | Review các khóa của giảng viên | A | S2 |
| E25 | | `PUT /teachers/:id/follow` | ✓ | Follow | A | S2 |
| E26 | | `DELETE /teachers/:id/follow` | ✓ | Unfollow | A | S2 |
| E27 | Cart | `GET /cart` | ✓ | Giỏ hàng | A | S2 |
| E28 | | `POST /cart/items` | ✓ | Thêm khóa vào giỏ | A | S2 |
| E29 | | `DELETE /cart/items/:courseId` | ✓ | Xóa khỏi giỏ | A | S2 |
| E30 | Order | `POST /orders/checkout` | ✓ | Thanh toán giả lập + ghi danh (`simulateFailure` để mô phỏng thất bại) | A | S3 |
| E31 | | `GET /orders` | ✓ | Lịch sử đơn (Could) | A | S4 |
| E32 | | `POST /courses/:id/enroll` | ✓ | Ghi danh khóa miễn phí | A | S3 |
| E33 | Learning | `GET /me/courses` | ✓ | My Courses theo trạng thái | C | S2 |
| E34 | | `GET /lessons/:id` | ✓ | Chi tiết bài (kèm `videoUrl`) | C | S2 |
| E35 | | `PUT /lessons/:id/progress` | ✓E | Lưu tiến độ bài học | C | S2 |
| E36 | Q&A | `GET /courses/:id/questions` | ✓E | Danh sách câu hỏi | C | S4 |
| E37 | | `POST /courses/:id/questions` | ✓E | Đặt câu hỏi | C | S4 |
| E38 | | `GET /questions/:id` | ✓E | Chi tiết câu hỏi | C | S4 |
| E39 | | `GET /questions/:id/answers` | ✓E | Danh sách trả lời | C | S4 |
| E40 | | `POST /questions/:id/answers` | ✓E | Trả lời (sinh thông báo) | C | S4 |
| E41 | | `PUT /questions/:id/like` | ✓E | Thích câu hỏi | C | S4 |
| E42 | | `DELETE /questions/:id/like` | ✓E | Bỏ thích câu hỏi | C | S4 |
| E43 | Project | `GET /courses/:id/project` | ✓E | Mô tả + tài liệu + số bài nộp | A | S4 |
| E44 | | `GET /courses/:id/submissions` | ✓E | Bài nộp của học viên | A | S4 |
| E45 | | `POST /courses/:id/submissions` | ✓E | Nộp project (multipart) | A | S4 |
| E46 | Me | `GET /me/stats` | ✓ | Save / On going / Completed | A | S3 |
| E47 | | `PATCH /me` | ✓ | Sửa tên, headline | A | S3 |
| E48 | | `POST /me/avatar` | ✓ | Đổi avatar (multipart) | A | S3 |
| E49 | Notification | `GET /notifications` | ✓ | Danh sách + `unreadCount` | A | S3 |
| E50 | | `PATCH /notifications/:id/read` | ✓ | Đánh dấu đã đọc | A | S3 |
| E51 | | `PATCH /notifications/read-all` | ✓ | Đánh dấu tất cả đã đọc | A | S3 |
| E52 | | `GET /notifications/unread-count` | ✓ | Số thông báo chưa đọc (badge chuông ở Home) | A | S3 |
| F1 | Files | `GET /static/*` | — | Video, tài liệu, ảnh mẫu | A | W2 |
| F2 | | `GET /uploads/*` | — | Tệp người dùng upload | A | W2 |

---

## 3. DTO

DTO dùng chung, đặt trong `mobile/src/types/api.ts` và server trả **đúng** hình dạng này. Phần đầu là DTO của PLAN §9.3 (giữ nguyên tên/trường); phần bổ sung đánh dấu *(bổ sung)*.

### 3.1 Người dùng và giảng viên

```ts
type UserDto = {
  id: string; email: string; fullName: string; headline: string | null;
  avatarUrl: string | null; coverUrl: string | null; role: 'STUDENT' | 'TEACHER' | 'ADMIN';
};

type TeacherSummary = {
  id: string;               // TeacherProfile.id
  fullName: string; avatarUrl: string | null; organization: string | null;
  ratingAvg: number;        // TB cộng ratingAvg các khóa published có ratingCount > 0 (0 nếu không có)
  ratingCount: number;      // Σ ratingCount các khóa
};

type TeacherDetail = TeacherSummary & {
  jobTitle: string; bio: string; coverUrl: string | null;   // coverUrl lấy từ User.coverUrl
  location: string | null; timezone: string | null;
  localTime: string | null; // (bổ sung) giờ địa phương "hh:mm A" theo timezone, BR-16; null nếu thiếu timezone
  isFollowed: boolean;
  stats: { courseCount: number; studentCount: number; followerCount: number };
};
```

### 3.2 Khóa học

```ts
type CourseSummary = {
  id: string; title: string; thumbnailUrl: string;
  teacher: { id: string; fullName: string };
  priceCents: number; originalPriceCents: number | null;
  badge: 'BEST_SELLER' | 'DISCOUNT' | null; discountPercent: number | null;   // BR-10
  ratingAvg: number; ratingCount: number; lessonCount: number; totalDurationSec: number;
  isBookmarked: boolean;    // false nếu không có token
};

// (PLAN viết "CourseSummary & {...}"; vì `teacher` được mở rộng nên dùng Omit để kiểu chặt chẽ)
type CourseDetail = Omit<CourseSummary, 'teacher'> & {
  subtitle: string | null; description: string; bannerUrl: string | null; benefits: string[];
  likeCount: number; shareCount: number; isLiked: boolean;
  category: { id: string; name: string };
  teacher: { id: string; fullName: string; avatarUrl: string | null; jobTitle: string; isFollowed: boolean };
  enrollment: { progressPercent: number; lastLessonId: string | null } | null;
  isInCart: boolean; previewLessonId: string | null;
};

type CategoryDto = {       // (bổ sung)
  id: string; name: string; slug: string;
  icon: string;            // tên icon Feather, vd 'trending-up'
  color: string;           // mã màu hex, vd '#00BDD6'
  courseCount: number;     // số khóa isPublished thuộc danh mục
};

type TagDto = { id: string; name: string; isHot: boolean };   // (bổ sung)

type TeacherCourseGroup = {  // (bổ sung) phần tử của GET /teachers/:id/courses
  category: { id: string; name: string };
  isTopRated: boolean;     // TB ratingAvg của nhóm >= 4.5
  courses: CourseSummary[];
};
```

**Quy tắc suy diễn (mappers):**

| Trường | Cách tính |
|---|---|
| `badge` | `isBestSeller` → `'BEST_SELLER'`; ngược lại nếu `originalPriceCents > priceCents` → `'DISCOUNT'`; còn lại `null` (BR-10) |
| `discountPercent` | Chỉ khi `originalPriceCents > priceCents`: `round((1 − priceCents / originalPriceCents) × 100)`; ngược lại `null`. **Có giá trị cả khi `badge = 'BEST_SELLER'`** (để thanh giá ở trang chi tiết vẫn hiện "x% Disc.") |
| `isBookmarked`, `isLiked`, `isInCart`, `enrollment`, `isFollowed` | Theo `req.user`; guest → `false` / `null` |
| `previewLessonId` | Bài `isPreview` đầu tiên theo thứ tự (chương, bài); `null` nếu không có |

### 3.3 Chương trình học và bài học

```ts
type LessonStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED';   // BR-02
type CurriculumSection = {
  id: string; title: string; order: number;
  lessons: { id: string; number: number; title: string; durationSec: number; isPreview: boolean; status: LessonStatus }[];
};   // number: số thứ tự bài trong toàn khóa (1..N). KHÔNG chứa videoUrl (BR-01)

type LessonDetail = {
  id: string; courseId: string; title: string; durationSec: number; videoUrl: string;
  positionSec: number; isCompleted: boolean; nextLessonId: string | null;
};

type LessonProgressDto = {   // (bổ sung)
  lessonId: string; positionSec: number; isCompleted: boolean; updatedAt: string;
};

type EnrollmentDto = {       // (bổ sung) kết quả POST /courses/:id/enroll
  courseId: string; progressPercent: number; lastLessonId: string | null; enrolledAt: string;
};

type MyCourseItem = {
  course: { id: string; title: string; thumbnailUrl: string };
  totalDurationSec: number; progressPercent: number; lastLessonId: string | null; lastAccessedAt: string;
};

type MeStatsDto = { savedCount: number; ongoingCount: number; completedCount: number };   // (bổ sung) BR-15
```

### 3.4 Đánh giá, hỏi đáp, project

```ts
type ReviewDto = {
  id: string; rating: number; content: string; createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
  course?: { id: string; title: string };     // chỉ có ở GET /teachers/:id/reviews
};

type ReviewSummaryDto = {    // (bổ sung) meta.summary của GET /courses/:id/reviews
  avg: number; count: number;
  distribution: { '1': number; '2': number; '3': number; '4': number; '5': number };
};

type QuestionDto = {
  id: string; content: string; createdAt: string; likeCount: number; answerCount: number;
  isLiked: boolean; user: { id: string; fullName: string; avatarUrl: string | null };
  courseId: string;          // (bổ sung) để SC-16 biết khóa học khi mở từ thông báo
};

type AnswerDto = {           // (bổ sung)
  id: string; questionId: string; content: string; createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
};

type ResourceDto = {         // (bổ sung)
  id: string; name: string; fileUrl: string; sizeBytes: number; mimeType: string;
};

type ProjectSubmissionDto = {   // (bổ sung)
  id: string; title: string; description: string | null;
  imageUrl: string | null; fileUrl: string; createdAt: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
};
```

### 3.5 Giỏ hàng, đơn hàng, trang chủ, thông báo, phân trang

```ts
type CartDto = {             // (bổ sung)
  items: { course: CourseSummary; addedAt: string }[];
  totalCents: number;        // Σ course.priceCents hiện tại
};

type OrderDto = {            // (bổ sung)
  id: string; status: 'PENDING' | 'PAID' | 'FAILED'; totalCents: number;
  paymentMethod: 'MOCK_CARD' | 'MOCK_EWALLET'; createdAt: string; paidAt: string | null;
  items: { course: { id: string; title: string; thumbnailUrl: string }; priceCents: number }[];
};

type BannerDto = {
  id: string; title: string; subtitle: string | null; ctaText: string; imageUrl: string;
  bgColor: string; target: { type: 'COURSE' | 'CATEGORY'; id: string };
};

type HomeResponse = {
  banners: BannerDto[]; categories: CategoryDto[]; popular: CourseSummary[];
  recommended: CourseSummary[]; inspires: CourseSummary[]; topTeachers: TeacherSummary[];
};   // badge chuông lấy từ GET /notifications/unread-count (không còn trong meta của /home)

type NotificationDto = {
  id: string; type: 'ORDER_PAID' | 'NEW_ANSWER' | 'COURSE_COMPLETED' | 'SYSTEM';
  title: string; body: string; data: { courseId?: string; questionId?: string } | null;
  isRead: boolean; createdAt: string;
};

type UnreadCountDto = { count: number };   // (bổ sung) GET /notifications/unread-count

type CheckoutRequest = { paymentMethod: 'MOCK_CARD' | 'MOCK_EWALLET'; simulateFailure?: boolean };   // (bổ sung) BR-07
type CheckoutResult = { order: OrderDto; enrolledCourseIds: string[] };

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

type ApiSuccess<T, M = PaginationMeta | undefined> = { data: T; meta?: M };
type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };
```

---
## 4. Chi tiết endpoint

> **Ghi chú về ví dụ:** mảng dài chỉ liệt kê vài phần tử đầu (số phần tử tối đa được nêu trong phần *Quy tắc*). Dữ liệu ví dụ lấy từ seed/design (Martha Rosie, Sara Weise, UX Foundation…). Mọi URL ảnh/video là URL minh họa.

### 4.1 Health

#### E01 · `GET /health`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | W2 | M1 check, Render health check (`/api/v1/health`) |

Kiểm tra server sống và kết nối DB (`SELECT 1`). Dùng cho Render health check và màn hình thử nghiệm "API OK" ở M1.

**Response `200 OK`**

```json
{ "data": { "status": "ok", "db": "up" } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 503 | — | DB không phản hồi. Body vẫn theo dạng thành công để công cụ health check đọc được: `{ "data": { "status": "error", "db": "down" } }` |

**Quy tắc:** không cần token, không ghi log ở mức `info` (tránh nhiễu), không dùng cache.

---

### 4.2 Auth

#### E02 · `POST /auth/register`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | S1 | FR-01, UC-01, NFR-05 |

Đăng ký tài khoản học viên và đăng nhập luôn.

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `fullName` | string | ✓ | `z.string().trim().min(2).max(60)` | Họ tên |
| `email` | string | ✓ | `z.string().trim().toLowerCase().email().max(254)` | Email, lưu chữ thường |
| `password` | string | ✓ | `z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/\d/)` | ≥ 8 ký tự, có chữ và số; tối đa 72 (giới hạn của bcrypt) |

```json
{ "fullName": "Martha Rosie", "email": "martha.rosie@example.com", "password": "Learn2026" }
```

**Response `201 Created`**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfbWFydGhhIiwicm9sZSI6IlNUVURFTlQiLCJpYXQiOjE3NjIzMzUwMDAsImV4cCI6MTc2MjkzOTgwMH0.GiNu1kuJOra4jQFL6lmq6mcqZSbjlIqXb6DmOBvSbMY",
    "user": {
      "id": "usr_martha",
      "email": "martha.rosie@example.com",
      "fullName": "Martha Rosie",
      "headline": null,
      "avatarUrl": null,
      "coverUrl": null,
      "role": "STUDENT"
    }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu/sai định dạng trường (email sai, mật khẩu < 8 ký tự hoặc thiếu chữ/số) |
| 409 | `EMAIL_TAKEN` | Email đã đăng ký (message "Email already in use") |
| 429 | `RATE_LIMITED` | Quá 10 request/phút/IP |

**Quy tắc:** hash bằng bcryptjs cost 10 · `role = STUDENT` · không bao giờ trả `passwordHash` · không log body.

---

#### E03 · `POST /auth/login`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | S1 | FR-02, UC-02, NFR-05 |

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `email` | string | ✓ | `z.string().trim().toLowerCase().email()` | Email |
| `password` | string | ✓ | `z.string().min(1).max(72)` | Mật khẩu (không kiểm độ mạnh khi đăng nhập) |

```json
{ "email": "martha.rosie@example.com", "password": "Learn2026" }
```

**Response `200 OK`** — cùng hình dạng E02 (`{ data: { token, user } }`).

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfbWFydGhhIiwicm9sZSI6IlNUVURFTlQiLCJpYXQiOjE3NjIzMzUwMDAsImV4cCI6MTc2MjkzOTgwMH0.GiNu1kuJOra4jQFL6lmq6mcqZSbjlIqXb6DmOBvSbMY",
    "user": {
      "id": "usr_martha",
      "email": "martha.rosie@example.com",
      "fullName": "Martha Rosie",
      "headline": "UX/UI Designer",
      "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg",
      "coverUrl": "https://img.example.com/covers/martha-rosie.jpg",
      "role": "STUDENT"
    }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu/sai định dạng trường |
| 401 | `INVALID_CREDENTIALS` | Email không tồn tại **hoặc** sai mật khẩu — cùng một thông điệp ("Incorrect email or password") để không lộ email nào đã đăng ký |
| 429 | `RATE_LIMITED` | Quá 10 request/phút/IP |

**Quy tắc:** so sánh mật khẩu bằng `bcrypt.compare` (thời gian ổn định, kể cả khi email không tồn tại thì vẫn so với hash giả) · token hạn 7 ngày.

---

#### E04 · `GET /auth/me`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S1 | FR-02 (tự đăng nhập lại), SC-01 bootstrap |

Trả người dùng ứng với token. Mobile gọi khi mở app để xác nhận token còn hiệu lực.

**Response `200 OK`**

```json
{
  "data": {
    "id": "usr_martha",
    "email": "martha.rosie@example.com",
    "fullName": "Martha Rosie",
    "headline": "UX/UI Designer",
    "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg",
    "coverUrl": "https://img.example.com/covers/martha-rosie.jpg",
    "role": "STUDENT"
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai/hết hạn token, hoặc người dùng không còn tồn tại (chỉ endpoint này tra DB) |

---

### 4.3 Home

#### E05 · `GET /home`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | A | S1 | FR-04, UC-04, BR-10, BR-11, BR-12, SC-04 |

Gom 6 section trang chủ trong **1 request** (giảm round-trip — PLAN §17.1). Có token thì `isBookmarked` đúng theo người dùng, và `recommended` cá nhân hóa. Số thông báo chưa đọc cho badge chuông **không** nằm ở đây mà lấy từ E52.

**Tham số:** không.

**Response `200 OK`**

```json
{
  "data": {
    "banners": [
      {
        "id": "ban_pm20",
        "title": "PROJECT MANAGEMENT",
        "subtitle": "20% OFF",
        "ctaText": "JOIN NOW",
        "imageUrl": "https://img.example.com/banners/project-management.png",
        "bgColor": "#8353E2",
        "target": { "type": "CATEGORY", "id": "cat_business" }
      }
    ],
    "categories": [
      { "id": "cat_business", "name": "Business", "slug": "business", "icon": "trending-up", "color": "#00BDD6", "courseCount": 6 },
      { "id": "cat_design", "name": "Design", "slug": "design", "icon": "pen-tool", "color": "#8353E2", "courseCount": 9 },
      { "id": "cat_code", "name": "Code", "slug": "code", "icon": "code", "color": "#E05858", "courseCount": 5 },
      { "id": "cat_writing", "name": "Writing", "slug": "writing", "icon": "file-text", "color": "#4069E5", "courseCount": 3 },
      { "id": "cat_movie", "name": "Movie", "slug": "movie", "icon": "video", "color": "#8353E2", "courseCount": 3 },
      { "id": "cat_language", "name": "Language", "slug": "language", "icon": "globe", "color": "#ED7D2D", "courseCount": 4 }
    ],
    "popular": [
      {
        "id": "crs_php_one_click",
        "title": "PHP in One Click",
        "thumbnailUrl": "https://img.example.com/courses/php-in-one-click.jpg",
        "teacher": { "id": "tch_ramono", "fullName": "Ramono Wultschner" },
        "priceCents": 5900,
        "originalPriceCents": null,
        "badge": null,
        "discountPercent": null,
        "ratingAvg": 4.5,
        "ratingCount": 1233,
        "lessonCount": 18,
        "totalDurationSec": 16200,
        "isBookmarked": false
      },
      {
        "id": "crs_python_intro",
        "title": "Python Introduction",
        "thumbnailUrl": "https://img.example.com/courses/python-introduction.jpg",
        "teacher": { "id": "tch_ramono", "fullName": "Ramono Wultschner" },
        "priceCents": 3900,
        "originalPriceCents": 4900,
        "badge": "BEST_SELLER",
        "discountPercent": 20,
        "ratingAvg": 4.5,
        "ratingCount": 1267,
        "lessonCount": 12,
        "totalDurationSec": 9000,
        "isBookmarked": false
      }
    ],
    "recommended": [
      {
        "id": "crs_website_design",
        "title": "Website Design",
        "thumbnailUrl": "https://img.example.com/courses/website-design.jpg",
        "teacher": { "id": "tch_ramono", "fullName": "Ramono Wultschner" },
        "priceCents": 5900,
        "originalPriceCents": null,
        "badge": "BEST_SELLER",
        "discountPercent": null,
        "ratingAvg": 4.5,
        "ratingCount": 1233,
        "lessonCount": 9,
        "totalDurationSec": 7200,
        "isBookmarked": true
      },
      {
        "id": "crs_ux_research",
        "title": "UX Research For Beginners",
        "thumbnailUrl": "https://img.example.com/courses/ux-research.jpg",
        "teacher": { "id": "tch_olivia", "fullName": "Olivia Wang" },
        "priceCents": 2900,
        "originalPriceCents": 3625,
        "badge": "DISCOUNT",
        "discountPercent": 20,
        "ratingAvg": 4.5,
        "ratingCount": 1782,
        "lessonCount": 12,
        "totalDurationSec": 9900,
        "isBookmarked": false
      }
    ],
    "inspires": [
      {
        "id": "crs_digital_portrait",
        "title": "Digital Portrait",
        "thumbnailUrl": "https://img.example.com/courses/digital-portrait.jpg",
        "teacher": { "id": "tch_ramono", "fullName": "Ramono Wultschner" },
        "priceCents": 6700,
        "originalPriceCents": null,
        "badge": null,
        "discountPercent": null,
        "ratingAvg": 4.5,
        "ratingCount": 657,
        "lessonCount": 12,
        "totalDurationSec": 10800,
        "isBookmarked": false
      }
    ],
    "topTeachers": [
      {
        "id": "tch_christian",
        "fullName": "Christian Hayes",
        "avatarUrl": "https://img.example.com/teachers/christian-hayes.jpg",
        "organization": "University of Oxford",
        "ratingAvg": 4.5,
        "ratingCount": 1233
      },
      {
        "id": "tch_dennis",
        "fullName": "Dennis Sweeney",
        "avatarUrl": "https://img.example.com/teachers/dennis-sweeney.jpg",
        "organization": "University of Oxford",
        "ratingAvg": 4.5,
        "ratingCount": 1233
      }
    ]
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Có header `Authorization` nhưng token sai/hết hạn (không có header thì là khách, trả bình thường) |

**Quy tắc**

- `banners`: `isActive = true`, sắp theo `order`; `target.type/id` lấy từ `targetType/targetId`.
- `categories`: 6 danh mục theo `order`, kèm `courseCount` (chỉ khóa `isPublished`).
- `popular` (≤ 10): `enrollmentCount` giảm dần (BR-11). `inspires` (≤ 3): `isFeatured = true`. `topTeachers` (≤ 10): điểm TB các khóa giảm dần, tối thiểu 1 khóa (BR-11).
- `recommended` (≤ 10, BR-12): khóa thuộc các danh mục người dùng đã ghi danh/lưu, loại khóa đã ghi danh, sắp theo `ratingAvg` giảm dần; nếu không đủ 10 thì bổ sung khóa rating cao nhất còn lại. **Khách:** khóa rating cao nhất.
- `badge` theo BR-10.
- **Cache server (PLAN §17):** phần công khai (`banners`, `categories`, `popular`, `inspires`, `topTeachers`) lưu in-memory LRU **TTL 60 s** (khóa `home:public`); `recommended` và `isBookmarked` được ghép theo người dùng *sau* cache. Cache bị xóa khi checkout/enroll/review làm đổi `enrollmentCount`/`ratingAvg`.

---

### 4.4 Catalog

#### E06 · `GET /categories`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | S1 | FR-04, FR-05, FR-06, FR-07 (SC-04, SC-05, SC-07) |

**Tham số:** không.

**Response `200 OK`**

```json
{
  "data": [
    { "id": "cat_business", "name": "Business", "slug": "business", "icon": "trending-up", "color": "#00BDD6", "courseCount": 6 },
    { "id": "cat_design", "name": "Design", "slug": "design", "icon": "pen-tool", "color": "#8353E2", "courseCount": 9 },
    { "id": "cat_code", "name": "Code", "slug": "code", "icon": "code", "color": "#E05858", "courseCount": 5 },
    { "id": "cat_writing", "name": "Writing", "slug": "writing", "icon": "file-text", "color": "#4069E5", "courseCount": 3 },
    { "id": "cat_movie", "name": "Movie", "slug": "movie", "icon": "video", "color": "#8353E2", "courseCount": 3 },
    { "id": "cat_language", "name": "Language", "slug": "language", "icon": "globe", "color": "#ED7D2D", "courseCount": 4 }
  ]
}
```

**Lỗi:** không có lỗi nghiệp vụ.

**Quy tắc:** sắp theo `Category.order`; cache server TTL 60 s (khóa `categories`); mobile `staleTime` 24 giờ.

---

#### E07 · `GET /tags/hot`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | S1 | FR-05, SC-05 (Hot topics) |

**Response `200 OK`**

```json
{
  "data": [
    { "id": "tag_java", "name": "Java", "isHot": true },
    { "id": "tag_sql", "name": "SQL", "isHot": true },
    { "id": "tag_javascript", "name": "Javascript", "isHot": true },
    { "id": "tag_python", "name": "Python", "isHot": true },
    { "id": "tag_digital_marketing", "name": "Digital marketing", "isHot": true },
    { "id": "tag_photoshop", "name": "Photoshop", "isHot": true },
    { "id": "tag_watercolor", "name": "Watercolor", "isHot": true }
  ]
}
```

**Lỗi:** không có lỗi nghiệp vụ.

**Quy tắc:** chỉ tag `isHot = true`, sắp theo tên (hoặc thứ tự seed cố định); cache server TTL 60 s (khóa `tags:hot`).

---

#### E08 · `GET /courses`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | A | S2 | FR-05, FR-06, FR-07, UC-05, UC-06, UC-07, BR-10, BR-11, BR-12, BR-13 |

Tìm kiếm, lọc, sắp xếp và phân trang khóa học. Dùng cho Search (SC-05/06), Course list (SC-08), "View more", Teacher → "View all".

**Query**

| Tham số | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `q` | string | | `z.string().trim().min(1).max(100)`; chuỗi rỗng bị bỏ qua | Từ khóa; khớp không phân biệt hoa thường với `title`, `subtitle`, tên tag, tên giảng viên (BR-13) |
| `categoryId` | string | | `z.string()` → tách bằng `,`, tối đa 6 phần tử | Lọc theo một hoặc nhiều danh mục (OR) |
| `teacherId` | string | | `z.string().min(1)` | Lọc theo giảng viên (`TeacherProfile.id`) |
| `isFree` | `"true"｜"false"` | | `z.enum(['true','false'])` | `true`: `priceCents = 0`; `false`: `priceCents > 0`; bỏ trống: tất cả |
| `minPrice` | int | | `z.coerce.number().int().min(0)` | Giá tối thiểu, **đơn vị cent** |
| `maxPrice` | int | | `z.coerce.number().int().min(0)`; phải ≥ `minPrice` | Giá tối đa, **đơn vị cent** |
| `minRating` | number | | `z.coerce.number().min(0).max(5)` | `ratingAvg ≥ minRating` |
| `sort` | enum | | `z.enum(['popular','rating','newest','price_asc','price_desc']).default('popular')` | Sắp xếp: `popular` = `enrollmentCount` ↓ · `rating` = `ratingAvg` ↓ · `newest` = `createdAt` ↓ · `price_asc/desc` = `priceCents` |
| `section` | enum | | `z.enum(['popular','recommended','inspires'])` | Nhóm "View more" của Home. **Nếu có `section` thì `sort` bị bỏ qua** |
| `page`, `limit` | int | | xem 1.5 | Phân trang (`limit` mặc định 20, tối đa 50) |

Ví dụ: `GET /courses?q=design&minRating=4.5&sort=price_asc&page=1&limit=20`

**Response `200 OK`** — `data: CourseSummary[]`, `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "crs_ux_foundation",
      "title": "UX Foundation: Introduction to User Experience Design",
      "thumbnailUrl": "https://img.example.com/courses/ux-foundation.jpg",
      "teacher": { "id": "tch_sara_weise", "fullName": "Sara Weise" },
      "priceCents": 5100,
      "originalPriceCents": null,
      "badge": "BEST_SELLER",
      "discountPercent": null,
      "ratingAvg": 4.5,
      "ratingCount": 1233,
      "lessonCount": 13,
      "totalDurationSec": 8700,
      "isBookmarked": false
    },
    {
      "id": "crs_design_basics",
      "title": "Design Basics",
      "thumbnailUrl": "https://img.example.com/courses/design-basics.jpg",
      "teacher": { "id": "tch_kelly", "fullName": "Kelly Hamilton" },
      "priceCents": 8900,
      "originalPriceCents": null,
      "badge": null,
      "discountPercent": null,
      "ratingAvg": 4.5,
      "ratingCount": 1233,
      "lessonCount": 12,
      "totalDurationSec": 9000,
      "isBookmarked": true
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Tham số sai kiểu/giá trị (vd `limit=100`, `sort=abc`, `minPrice > maxPrice`, `categoryId` quá 6 phần tử) |
| 401 | `UNAUTHORIZED` | Có header `Authorization` nhưng token sai/hết hạn |

**Quy tắc**

- Chỉ trả khóa `isPublished = true` (BR-13). `meta.total` là tổng số kết quả sau lọc (màn hình hiển thị "{total} Results").
- Các bộ lọc kết hợp bằng AND. `q` là OR trên `title`, `subtitle`, `tags.name`, `teacher.user.fullName` (`contains`, `mode: 'insensitive'`).
- `section=popular`: `enrollmentCount` ↓. `section=inspires`: `isFeatured = true`, sắp `ratingAvg` ↓ rồi `enrollmentCount` ↓. `section=recommended` (BR-12): loại khóa đã ghi danh; ưu tiên khóa thuộc danh mục người dùng đã ghi danh/lưu, trong mỗi nhóm sắp `ratingAvg` ↓; khách được coi là không có danh mục ưa thích (chỉ sắp `ratingAvg` ↓). Các bộ lọc khác (`categoryId`, `minRating`…) vẫn áp dụng cùng `section`.
- Khóa phụ khi sắp xếp: `id` (phân trang ổn định).
- `isBookmarked` chỉ đúng khi có token; được ghép bằng **một** truy vấn `Bookmark.findMany({ courseId: { in: ids } })` cho cả trang (tránh N+1).
- `badge`, `discountPercent` theo BR-10 (mục 3.2).

---

#### E09 · `GET /courses/:id`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | A | S2 | FR-08, UC-08, BR-10, BR-17, SC-09 |

**Path**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | string | Mã khóa học |

**Response `200 OK`** — `data: CourseDetail`

```json
{
  "data": {
    "id": "crs_ux_foundation",
    "title": "UX Foundation: Introduction to User Experience Design",
    "thumbnailUrl": "https://img.example.com/courses/ux-foundation.jpg",
    "priceCents": 5900,
    "originalPriceCents": 7375,
    "badge": "DISCOUNT",
    "discountPercent": 20,
    "ratingAvg": 4.5,
    "ratingCount": 1233,
    "lessonCount": 12,
    "totalDurationSec": 50400,
    "isBookmarked": true,
    "subtitle": "Learn the foundations of user experience design",
    "description": "Convallis in semper laoreet nibh id. Vivamus malesuada ipsum pulvinar non rutrum risus dui, risus. Purus massa velit iaculis tincidunt tortor, risus, scelerisque risus.",
    "bannerUrl": "https://img.example.com/banners/ux-foundation-hero.png",
    "benefits": [
      "14 hours on-demand video",
      "Native teacher",
      "100% free document",
      "Full lifetime access",
      "24/7 support"
    ],
    "likeCount": 231,
    "shareCount": 16,
    "isLiked": false,
    "category": { "id": "cat_design", "name": "Design" },
    "teacher": {
      "id": "tch_sara_weise",
      "fullName": "Sara Weise",
      "avatarUrl": "https://img.example.com/teachers/sara-weise.jpg",
      "jobTitle": "UI/UX Designer",
      "isFollowed": false
    },
    "enrollment": null,
    "isInCart": false,
    "previewLessonId": "les_ux_01"
  }
}
```

Khi đã ghi danh, `enrollment` là `{ "progressPercent": 30, "lastLessonId": "les_ux_02" }`.

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Có header nhưng token sai/hết hạn |
| 404 | `COURSE_NOT_FOUND` | Không tồn tại hoặc `isPublished = false` |

**Quy tắc**

- Khách: `isBookmarked = isLiked = isInCart = false`, `enrollment = null`, `teacher.isFollowed = false`.
- `benefits` do seed cấp (5 mục: video hours, native teacher, document, lifetime access, 24/7 support); **không** có "Certificate" vì chứng chỉ thuộc mục Won't (BR-18). Nút Follow ở hàng giảng viên thuộc FR-20 (Should) — dùng E25/E26.
- Client quyết định nút hành động theo **BR-17**: `enrollment` ≠ null → "Continue learning"; `priceCents = 0` → "Enroll for free"; `isInCart` → "Go to cart"; còn lại → "Add to cart".
- Thanh giá dưới cùng hiển thị `priceCents`, và nếu `discountPercent` ≠ null thì "{discountPercent}% Disc." cùng `originalPriceCents` gạch ngang.
- Sau các thao tác thay đổi trạng thái (bookmark, like, follow, giỏ, checkout, enroll, review), client invalidate `['course', id]`.

---

#### E10 · `GET /courses/:id/curriculum`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | C | S2 | FR-09, UC-08, UC-09, BR-01, BR-02, SC-09 (Lessons), SC-15 |

Chương trình học và **trạng thái từng bài theo người dùng**. Response **không** chứa `videoUrl` (BR-01).

**Path:** `id` — mã khóa học.

**Response `200 OK`** — `data: CurriculumSection[]`

```json
{
  "data": [
    {
      "id": "sec_ux_1",
      "title": "I - Introduction",
      "order": 1,
      "lessons": [
        { "id": "les_ux_01", "number": 1, "title": "Amet adipisicing consectetur", "durationSec": 83, "isPreview": true, "status": "COMPLETED" },
        { "id": "les_ux_02", "number": 2, "title": "Adipisicing dolor amet occaeca", "durationSec": 83, "isPreview": true, "status": "IN_PROGRESS" }
      ]
    },
    {
      "id": "sec_ux_2",
      "title": "II - Plan for your UX Research",
      "order": 2,
      "lessons": [
        { "id": "les_ux_03", "number": 3, "title": "Exercitation elit incididunt esse", "durationSec": 83, "isPreview": false, "status": "UNLOCKED" },
        { "id": "les_ux_04", "number": 4, "title": "Duis esse ipsum laboru", "durationSec": 83, "isPreview": false, "status": "UNLOCKED" }
      ]
    }
  ]
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Có header nhưng token sai/hết hạn |
| 404 | `COURSE_NOT_FOUND` | Không tồn tại hoặc chưa publish |

**Quy tắc — BR-02 (thứ tự ưu tiên):**

1. `COMPLETED`: có `LessonProgress.isCompleted = true`.
2. `IN_PROGRESS`: là `Enrollment.lastLessonId` và chưa hoàn thành.
3. `UNLOCKED`: đã ghi danh, hoặc bài `isPreview = true`.
4. `LOCKED`: còn lại (khách hoặc chưa ghi danh, không phải preview).

`number` đánh liên tục 1..N trên toàn khóa theo thứ tự (`Section.order`, `Lesson.order`). Khách luôn nhận `UNLOCKED` (preview) hoặc `LOCKED`. Mobile `staleTime` 1 phút; invalidate khi lưu tiến độ/checkout.

---

#### E11 · `GET /courses/:id/similar`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | A | S2 | FR-08, SC-09 (Similar courses) |

**Path:** `id` — mã khóa học.

**Response `200 OK`** — `data: CourseSummary[]` (không có `meta`)

```json
{
  "data": [
    {
      "id": "crs_product_design",
      "title": "Product Design",
      "thumbnailUrl": "https://img.example.com/courses/product-design.jpg",
      "teacher": { "id": "tch_dennis", "fullName": "Dennis Sweeney" },
      "priceCents": 9000,
      "originalPriceCents": null,
      "badge": null,
      "discountPercent": null,
      "ratingAvg": 4.5,
      "ratingCount": 1233,
      "lessonCount": 12,
      "totalDurationSec": 9000,
      "isBookmarked": false
    },
    {
      "id": "crs_palettes_for_your_app",
      "title": "Palettes for Your App",
      "thumbnailUrl": "https://img.example.com/courses/palettes-for-your-app.jpg",
      "teacher": { "id": "tch_ramono", "fullName": "Ramono Wultschner" },
      "priceCents": 5900,
      "originalPriceCents": null,
      "badge": null,
      "discountPercent": null,
      "ratingAvg": 4.5,
      "ratingCount": 1233,
      "lessonCount": 12,
      "totalDurationSec": 9000,
      "isBookmarked": true
    }
  ]
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Có header nhưng token sai/hết hạn |
| 404 | `COURSE_NOT_FOUND` | Khóa gốc không tồn tại hoặc chưa publish |

**Quy tắc:** tối đa **3** khóa `isPublished` cùng `categoryId`, loại chính khóa gốc, sắp `enrollmentCount` ↓ (id làm khóa phụ). Danh mục chỉ có 1 khóa thì trả `[]`.

---

### 4.5 Bookmark

#### E12 · `PUT /courses/:id/bookmark`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S1 | FR-12, UC-10 |

Lưu khóa học. **Idempotent:** gọi lặp lại vẫn `204`, không tạo dòng thứ hai.

**Path:** `id` — mã khóa học. **Body:** không.

**Response `204 No Content`** (không có body)

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại hoặc chưa publish |

**Quy tắc:** `upsert`/`createMany({ skipDuplicates: true })` trên khóa chính ghép `(userId, courseId)`. Mobile dùng optimistic update (PLAN §10).

---

#### E13 · `DELETE /courses/:id/bookmark`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S1 | FR-12, UC-10 |

Bỏ lưu. **Idempotent:** chưa lưu vẫn `204`.

**Path:** `id` — mã khóa học. **Body:** không.

**Response `204 No Content`**

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** `deleteMany({ where: { userId, courseId } })`.

---

#### E14 · `GET /me/bookmarks`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S1 | FR-21, BR-15, SC-20 (Saved courses) |

**Query:** `page`, `limit` (mục 1.5).

**Response `200 OK`** — `data: CourseSummary[]`, `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "crs_product_design",
      "title": "Product Design",
      "thumbnailUrl": "https://img.example.com/courses/product-design.jpg",
      "teacher": { "id": "tch_dennis", "fullName": "Dennis Sweeney" },
      "priceCents": 19000,
      "originalPriceCents": null,
      "badge": null,
      "discountPercent": null,
      "ratingAvg": 4.5,
      "ratingCount": 1233,
      "lessonCount": 12,
      "totalDurationSec": 9000,
      "isBookmarked": true
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 25, "totalPages": 2 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` sai |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** sắp theo `Bookmark.createdAt` ↓; `isBookmarked` luôn `true`; chỉ khóa `isPublished`; `meta.total` khớp `savedCount` của E46 (khi mọi khóa đã lưu còn published).

---

### 4.6 Like / Share

> Thuộc nhóm **Could** (FR-17, UC-21) — mặc định không làm; chỉ làm ở W9 nếu Must + Should đã xong.

#### E15 · `PUT /courses/:id/like`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S2 | FR-17 |

Thích khóa học (idempotent).

**Path:** `id`. **Body:** không.

**Response `200 OK`**

```json
{ "data": { "likeCount": 232, "isLiked": true } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** tạo `CourseLike` và `likeCount + 1` trong cùng transaction, **chỉ khi dòng mới được tạo** (gọi lặp không tăng thêm).

---

#### E16 · `DELETE /courses/:id/like`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S2 | FR-17 |

**Path:** `id`. **Body:** không.

**Response `200 OK`**

```json
{ "data": { "likeCount": 231, "isLiked": false } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** xóa `CourseLike` và `likeCount − 1` chỉ khi có dòng bị xóa; `likeCount` không xuống dưới 0.

---

#### E17 · `POST /courses/:id/share`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S2 | FR-17 |

Ghi nhận một lượt chia sẻ (client gọi sau khi mở share sheet).

**Path:** `id`. **Body:** không.

**Response `200 OK`**

```json
{ "data": { "shareCount": 17 } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** `shareCount + 1` nguyên tử (`increment`); không chống trùng theo người dùng.

---
### 4.7 Review

#### E18 · `GET /courses/:id/reviews`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | C | S2 | FR-10, UC-08, BR-08, SC-09 (Review), SC-10 |

Danh sách đánh giá của khóa học, kèm tóm tắt điểm (dùng cho `ReviewSummary`).

**Path:** `id` — mã khóa học.

**Query**

| Tham số | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `rating` | int | | `z.coerce.number().int().min(1).max(5)` | Chỉ lấy review đúng số sao (chip lọc 5/4/3/2/1). Bỏ trống = All |
| `page`, `limit` | int | | xem 1.5 | Phân trang |

**Response `200 OK`** — `data: ReviewDto[]`, `meta: PaginationMeta & { summary: ReviewSummaryDto }`

```json
{
  "data": [
    {
      "id": "rev_jinny",
      "rating": 5,
      "content": "Nostrud excepteur magna id est quis in aliqua consequat. Exercitation enim eiusmod elit sint laborum",
      "createdAt": "2026-11-04T08:15:00.000Z",
      "user": { "id": "usr_jinny", "fullName": "Jinny Oslin", "avatarUrl": "https://img.example.com/avatars/jinny-oslin.jpg" }
    },
    {
      "id": "rev_jane",
      "rating": 4,
      "content": "Deserunt minim incididunt cillum nostrud do voluptate excepteur excepteur minim ex minim est",
      "createdAt": "2026-11-04T06:40:00.000Z",
      "user": { "id": "usr_jane", "fullName": "Jane Barry", "avatarUrl": "https://img.example.com/avatars/jane-barry.jpg" }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1233,
    "totalPages": 62,
    "summary": {
      "avg": 4.5,
      "count": 1233,
      "distribution": { "1": 23, "2": 30, "3": 80, "4": 300, "5": 800 }
    }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `rating` ngoài 1–5, `page`/`limit` sai |
| 401 | `UNAUTHORIZED` | Có header nhưng token sai/hết hạn |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại hoặc chưa publish |

**Quy tắc**

- Sắp theo `createdAt` ↓ (id làm khóa phụ). Khi có `rating`, `meta.total` là số review thuộc bộ lọc; **`meta.summary` luôn tính trên toàn bộ review của khóa** (không đổi theo bộ lọc).
- `summary.avg`/`count` lấy từ cột denormalize `Course.ratingAvg`/`ratingCount`; `distribution` tính bằng `groupBy(rating)` (nhờ index `(courseId, rating)`); khóa không có review → `avg = 0`, `count = 0`, mọi mức = 0.
- Đọc review không cần đăng nhập/ghi danh (chỉ *viết* mới cần — BR-08).

---

#### E19 · `GET /courses/:id/reviews/me`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S4 | FR-11, SC-11 |

Review của người dùng hiện tại cho khóa này — dùng để điền sẵn form ở SC-11.

**Path:** `id` — mã khóa học.

**Response `200 OK`** — `data: ReviewDto | null`

```json
{
  "data": {
    "id": "rev_martha_ux",
    "rating": 5,
    "content": "Clear structure and practical examples. Highly recommended for beginners.",
    "createdAt": "2026-11-03T10:00:00.000Z",
    "user": { "id": "usr_martha", "fullName": "Martha Rosie", "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg" }
  }
}
```

Chưa có review: `{ "data": null }`.

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** không yêu cầu đã ghi danh (người chưa ghi danh luôn nhận `null`).

---

#### E20 · `PUT /courses/:id/reviews/me`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-11, UC-15, BR-08, NFR-06, SC-11 |

Tạo hoặc sửa review của tôi (mỗi người 1 review/khóa).

**Path:** `id` — mã khóa học.

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `rating` | int | ✓ | `z.number().int().min(1).max(5)` | Số sao |
| `content` | string | ✓ | `z.string().trim().min(10).max(1000)` | Nội dung |

```json
{ "rating": 5, "content": "Clear structure and practical examples. Highly recommended for beginners." }
```

**Response** — `201 Created` khi tạo mới, `200 OK` khi sửa; `data: ReviewDto` (cùng hình dạng E19).

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `rating` không nguyên 1–5; `content` < 10 hoặc > 1000 ký tự |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa này |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** `upsert` theo `(userId, courseId)` và cập nhật `Course.ratingAvg`/`ratingCount` **trong cùng transaction** (database.md mục 6); xóa cache server `home:public`; client invalidate `['course', id]` và `['course', id, 'reviews', *]`.

---

### 4.8 Teacher

`id` trong các path này là **`TeacherProfile.id`** (cũng là `teacher.id` trong `CourseSummary`).

#### E21 · `GET /teachers`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | S2 | SC-19 (Top teachers, Could), BR-11 |

**Query**

| Tham số | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `sort` | enum | | `z.enum(['top']).default('top')` | Hiện chỉ có `top` (điểm TB giảm dần) |
| `page`, `limit` | int | | xem 1.5 | Phân trang |

**Response `200 OK`** — `data: TeacherSummary[]`, `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "tch_christian",
      "fullName": "Christian Hayes",
      "avatarUrl": "https://img.example.com/teachers/christian-hayes.jpg",
      "organization": "University of Oxford",
      "ratingAvg": 4.8,
      "ratingCount": 2410
    },
    {
      "id": "tch_dennis",
      "fullName": "Dennis Sweeney",
      "avatarUrl": "https://img.example.com/teachers/dennis-sweeney.jpg",
      "organization": "University of Oxford",
      "ratingAvg": 4.7,
      "ratingCount": 1980
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 9, "totalPages": 1 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `sort`/`page`/`limit` sai |

**Quy tắc:** chỉ giảng viên có ít nhất 1 khóa published (BR-11); `ratingAvg` = TB cộng `ratingAvg` các khóa có `ratingCount > 0`, `ratingCount` = Σ `ratingCount` (database.md mục 6); sắp `ratingAvg` ↓ rồi `ratingCount` ↓.

---

#### E22 · `GET /teachers/:id`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | A | S2 | FR-20, UC-18, BR-14, BR-16, SC-18 |

**Path:** `id` — mã giảng viên.

**Response `200 OK`** — `data: TeacherDetail`

```json
{
  "data": {
    "id": "tch_sara_weise",
    "fullName": "Sara Weise",
    "avatarUrl": "https://img.example.com/teachers/sara-weise.jpg",
    "organization": "Design Lab Studio",
    "ratingAvg": 4.5,
    "ratingCount": 3210,
    "jobTitle": "UI/UX Designer",
    "bio": "Sara has 10 years of experience designing mobile products and teaching UX to beginners.",
    "coverUrl": "https://img.example.com/covers/sara-weise.jpg",
    "location": "New York",
    "timezone": "America/New_York",
    "localTime": "09:30 AM",
    "isFollowed": false,
    "stats": { "courseCount": 6, "studentCount": 5231, "followerCount": 1200 }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Có header nhưng token sai/hết hạn |
| 404 | `TEACHER_NOT_FOUND` | Không có giảng viên với `id` này |

**Quy tắc:** `localTime` = giờ hiện tại theo `timezone`, định dạng `hh:mm A` (BR-16); `null` nếu thiếu `timezone`. App hiển thị "{location} - {localTime}". `stats.studentCount` = Σ `Course.enrollmentCount`, `followerCount` = `COUNT(Follow)`, `courseCount` = số khóa published. Khách: `isFollowed = false`.

---

#### E23 · `GET /teachers/:id/courses`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| opt | A | S2 | FR-20, SC-18 (tab Courses) |

Khóa học của giảng viên, **nhóm theo danh mục**.

**Path:** `id` — mã giảng viên.

**Response `200 OK`** — `data: TeacherCourseGroup[]` (không có `meta`)

```json
{
  "data": [
    {
      "category": { "id": "cat_design", "name": "Design" },
      "isTopRated": true,
      "courses": [
        {
          "id": "crs_ux_foundation",
          "title": "UX Foundation",
          "thumbnailUrl": "https://img.example.com/courses/ux-foundation.jpg",
          "teacher": { "id": "tch_sara_weise", "fullName": "Sara Weise" },
          "priceCents": 5100,
          "originalPriceCents": null,
          "badge": null,
          "discountPercent": null,
          "ratingAvg": 4.5,
          "ratingCount": 1233,
          "lessonCount": 12,
          "totalDurationSec": 8700,
          "isBookmarked": false
        },
        {
          "id": "crs_mobile_app_design",
          "title": "Mobile App Design",
          "thumbnailUrl": "https://img.example.com/courses/mobile-app-design.jpg",
          "teacher": { "id": "tch_sara_weise", "fullName": "Sara Weise" },
          "priceCents": 5900,
          "originalPriceCents": null,
          "badge": null,
          "discountPercent": null,
          "ratingAvg": 4.5,
          "ratingCount": 1233,
          "lessonCount": 12,
          "totalDurationSec": 9000,
          "isBookmarked": true
        }
      ]
    },
    {
      "category": { "id": "cat_business", "name": "Business" },
      "isTopRated": false,
      "courses": [
        {
          "id": "crs_project_management",
          "title": "Project Management Essentials",
          "thumbnailUrl": "https://img.example.com/courses/project-management-essentials.jpg",
          "teacher": { "id": "tch_sara_weise", "fullName": "Sara Weise" },
          "priceCents": 4900,
          "originalPriceCents": null,
          "badge": null,
          "discountPercent": null,
          "ratingAvg": 4.2,
          "ratingCount": 310,
          "lessonCount": 10,
          "totalDurationSec": 7200,
          "isBookmarked": false
        }
      ]
    }
  ]
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Có header nhưng token sai/hết hạn |
| 404 | `TEACHER_NOT_FOUND` | Không có giảng viên với `id` này |

**Quy tắc:** chỉ khóa published; nhóm theo `Category` (tên nhóm = `Category.name`, chỉ có 6 giá trị vì seed 6 danh mục); `isTopRated = true` khi TB `ratingAvg` của nhóm ≥ 4.5 (badge "Top-rated"); nhóm sắp theo `Category.order`, khóa trong nhóm sắp `enrollmentCount` ↓. "View all" của nhóm mở `GET /courses?teacherId=<id giảng viên>&categoryId=<id danh mục>`.

---

#### E24 · `GET /teachers/:id/reviews`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | S2 | FR-20, SC-18 (tab Review) |

Review của tất cả khóa thuộc giảng viên (mỗi phần tử kèm `course`).

**Path:** `id` — mã giảng viên. **Query:** `page`, `limit` (mục 1.5).

**Response `200 OK`** — `data: ReviewDto[]` (có `course`), `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "rev_claire",
      "rating": 4,
      "content": "Magna id sint irure in cillum esse nisi dolor laboris ullamco. Consectetur proident.",
      "createdAt": "2026-10-30T14:20:00.000Z",
      "user": { "id": "usr_claire", "fullName": "Claire Mignard", "avatarUrl": "https://img.example.com/avatars/claire-mignard.jpg" },
      "course": { "id": "crs_ux_foundation", "title": "UX Foundation" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 212, "totalPages": 11 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` sai |
| 404 | `TEACHER_NOT_FOUND` | Không có giảng viên với `id` này |

**Quy tắc:** sắp `createdAt` ↓; chỉ review của khóa published.

---

#### E25 · `PUT /teachers/:id/follow`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S2 | FR-20, BR-14, SC-09, SC-18 |

Theo dõi giảng viên (idempotent).

**Path:** `id` — mã giảng viên. **Body:** không.

**Response `200 OK`**

```json
{ "data": { "followerCount": 1201, "isFollowed": true } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `TEACHER_NOT_FOUND` | Không có giảng viên với `id` này |
| 422 | `CANNOT_FOLLOW_SELF` | Người dùng chính là giảng viên đó (`TeacherProfile.userId = req.user.id`) |

**Quy tắc:** `createMany({ skipDuplicates: true })` trên `(userId, teacherId)`; `followerCount` = `COUNT(Follow)` sau khi ghi. Mobile optimistic update.

---

#### E26 · `DELETE /teachers/:id/follow`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S2 | FR-20, BR-14 |

**Path:** `id` — mã giảng viên. **Body:** không.

**Response `200 OK`**

```json
{ "data": { "followerCount": 1200, "isFollowed": false } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `TEACHER_NOT_FOUND` | Không có giảng viên với `id` này |

**Quy tắc:** idempotent — chưa follow vẫn `200` với `isFollowed = false`.

---

### 4.9 Cart

#### E27 · `GET /cart`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S2 | FR-13, UC-11, SC-12 |

**Response `200 OK`** — `data: CartDto`

```json
{
  "data": {
    "items": [
      {
        "course": {
          "id": "crs_ux_foundation",
          "title": "UX Foundation: Introduction to User Experience Design",
          "thumbnailUrl": "https://img.example.com/courses/ux-foundation.jpg",
          "teacher": { "id": "tch_sara_weise", "fullName": "Sara Weise" },
          "priceCents": 5900,
          "originalPriceCents": 7375,
          "badge": "DISCOUNT",
          "discountPercent": 20,
          "ratingAvg": 4.5,
          "ratingCount": 1233,
          "lessonCount": 12,
          "totalDurationSec": 50400,
          "isBookmarked": true
        },
        "addedAt": "2026-11-05T09:12:00.000Z"
      },
      {
        "course": {
          "id": "crs_design_basics",
          "title": "Design Basics",
          "thumbnailUrl": "https://img.example.com/courses/design-basics.jpg",
          "teacher": { "id": "tch_kelly", "fullName": "Kelly Hamilton" },
          "priceCents": 8900,
          "originalPriceCents": null,
          "badge": null,
          "discountPercent": null,
          "ratingAvg": 4.5,
          "ratingCount": 1233,
          "lessonCount": 12,
          "totalDurationSec": 9000,
          "isBookmarked": false
        },
        "addedAt": "2026-11-05T09:20:00.000Z"
      }
    ],
    "totalCents": 14800
  }
}
```

Giỏ trống: `{ "data": { "items": [], "totalCents": 0 } }`.

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** sắp `addedAt` ↓; `totalCents` = Σ `priceCents` **hiện tại** của các khóa (không lưu, tính khi đọc); khóa bị gỡ publish không hiển thị. Badge số lượng giỏ ở Home = `items.length`.

---

#### E28 · `POST /cart/items`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S2 | FR-13, UC-11, BR-06, SC-09 |

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `courseId` | string | ✓ | `z.string().min(1).max(50)` | Khóa cần thêm |

```json
{ "courseId": "crs_ux_foundation" }
```

**Response `201 Created`** — `data: CartDto` (giỏ sau khi thêm; hình dạng như E27). PLAN chỉ nêu mã `201`; trả kèm giỏ mới để client cập nhật badge mà không cần gọi lại (mục 7).

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `courseId` |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại hoặc chưa publish |
| 409 | `ALREADY_ENROLLED` | Đã ghi danh khóa này (BR-06) |
| 409 | `ALREADY_IN_CART` | Khóa đã có trong giỏ (BR-06) |
| 422 | `FREE_COURSE` | Khóa miễn phí — dùng `POST /courses/:id/enroll` (BR-06) |

**Quy tắc:** thứ tự kiểm tra: khóa tồn tại → chưa ghi danh → chưa có trong giỏ → có phí. Client invalidate `['cart']` và `['course', id]`.

---

#### E29 · `DELETE /cart/items/:courseId`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S2 | FR-13, SC-12 |

**Path:** `courseId` — mã khóa cần xóa khỏi giỏ.

**Response `204 No Content`**

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** idempotent — khóa không có trong giỏ vẫn `204`. Client hỏi xác nhận trước khi gọi (SC-12).

---

### 4.10 Order & Enroll

#### E30 · `POST /orders/checkout`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-14, UC-12, BR-07, ADR-10, NFR-10, SC-13 |

Thanh toán **giả lập** toàn bộ giỏ hàng và ghi danh, trong **một transaction**. Body có `simulateFailure: true` để **mô phỏng thanh toán thất bại** (phục vụ demo/kiểm thử luồng lỗi).

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `paymentMethod` | enum | ✓ | `z.enum(['MOCK_CARD','MOCK_EWALLET'])` | Phương thức giả lập (không nhận dữ liệu thẻ thật) |
| `simulateFailure` | boolean | | `z.boolean().optional().default(false)` | `true` → giả lập cổng thanh toán từ chối: tạo `Order` trạng thái `FAILED`, trả `402 PAYMENT_FAILED`, **giữ nguyên giỏ**, không ghi danh (BR-07) |

```json
{ "paymentMethod": "MOCK_CARD", "simulateFailure": false }
```

**Response `201 Created`**

```json
{
  "data": {
    "order": {
      "id": "ord_20261105_001",
      "status": "PAID",
      "totalCents": 14800,
      "paymentMethod": "MOCK_CARD",
      "createdAt": "2026-11-05T09:30:00.000Z",
      "paidAt": "2026-11-05T09:30:00.000Z",
      "items": [
        {
          "course": {
            "id": "crs_ux_foundation",
            "title": "UX Foundation: Introduction to User Experience Design",
            "thumbnailUrl": "https://img.example.com/courses/ux-foundation.jpg"
          },
          "priceCents": 5900
        },
        {
          "course": {
            "id": "crs_design_basics",
            "title": "Design Basics",
            "thumbnailUrl": "https://img.example.com/courses/design-basics.jpg"
          },
          "priceCents": 8900
        }
      ]
    },
    "enrolledCourseIds": ["crs_ux_foundation", "crs_design_basics"]
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `paymentMethod` thiếu/không hợp lệ |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 402 | `PAYMENT_FAILED` | `simulateFailure = true`. Body: `{ "error": { "code": "PAYMENT_FAILED", "message": "Payment failed. You were not charged", "details": { "orderId": "ord_20261105_002" } } }` |
| 422 | `CART_EMPTY` | Giỏ rỗng (hoặc mọi khóa trong giỏ đã được ghi danh) |

**Quy tắc — BR-07, trong 1 `prisma.$transaction`:**

1. Đọc giỏ (khóa published). Bỏ khóa mà người dùng **đã ghi danh** (trường hợp lệch dữ liệu hiếm) khỏi đơn và khỏi giỏ. Nếu không còn khóa nào → `422 CART_EMPTY`.
2. Tạo `Order` (`PENDING`, `totalCents` = Σ giá **hiện tại**) và các `OrderItem` (lưu `priceCents` tại thời điểm mua).
3. Thanh toán giả lập:
   - **Thành công** (mặc định) → `status = PAID`, `paidAt = now()`, rồi thực hiện bước 4–6.
   - **`simulateFailure = true`** → `status = FAILED`, `paidAt = null`; **bỏ qua bước 4–6** (không ghi danh, không tăng `enrollmentCount`, không xóa giỏ, không thông báo). Transaction commit để lưu `Order` `FAILED` (giữ lại làm dấu vết), sau đó service ném `ApiError(402, 'PAYMENT_FAILED', 'Payment failed. You were not charged', { orderId })`. Giỏ vẫn nguyên nên người dùng bấm thử lại được.
4. Tạo `Enrollment` cho từng khóa (`progressPercent = 0`, `lastAccessedAt = now()`), `Course.enrollmentCount + 1` mỗi khóa.
5. Xóa các `CartItem` của người dùng.
6. Tạo `Notification` `ORDER_PAID` ("Payment successful", `data: { courseId }` của khóa đầu tiên).
7. Sau khi commit: xóa cache server `home:public`.

Lỗi kỹ thuật giữa chừng (`500`) → rollback toàn bộ (không có đơn nửa vời); còn `PAYMENT_FAILED` là kết quả nghiệp vụ hợp lệ nên `Order` `FAILED` được lưu. Độ trễ ~1,5 s ở màn hình thanh toán là *giả lập phía client*, không phải server. Client invalidate: `['cart']`, `['me','courses']`, `['me','stats']`, `['course', *]`, `['home']`, `['notifications']` (PLAN §7.3).

---

#### E31 · `GET /orders`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S4 | Lịch sử đơn (Could) |

**Query:** `page`, `limit` (mục 1.5).

**Response `200 OK`** — `data: OrderDto[]`, `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "ord_20261105_001",
      "status": "PAID",
      "totalCents": 14800,
      "paymentMethod": "MOCK_CARD",
      "createdAt": "2026-11-05T09:30:00.000Z",
      "paidAt": "2026-11-05T09:30:00.000Z",
      "items": [
        {
          "course": {
            "id": "crs_ux_foundation",
            "title": "UX Foundation: Introduction to User Experience Design",
            "thumbnailUrl": "https://img.example.com/courses/ux-foundation.jpg"
          },
          "priceCents": 5900
        }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` sai |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** chỉ đơn của người dùng hiện tại, sắp `createdAt` ↓ (index `(userId, createdAt)`).

---

#### E32 · `POST /courses/:id/enroll`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-14, UC-12, BR-06, BR-17 |

Ghi danh trực tiếp **khóa miễn phí** ("Enroll for free").

**Path:** `id` — mã khóa học. **Body:** không.

**Response `201 Created`** — `data: EnrollmentDto`

```json
{
  "data": {
    "courseId": "crs_python_free",
    "progressPercent": 0,
    "lastLessonId": null,
    "enrolledAt": "2026-11-05T09:45:00.000Z"
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại hoặc chưa publish |
| 409 | `ALREADY_ENROLLED` | Đã ghi danh |
| 422 | `PAID_COURSE` | Khóa có phí (`priceCents > 0`) — phải đi qua giỏ hàng/checkout |

**Quy tắc:** tạo `Enrollment` và `Course.enrollmentCount + 1` trong 1 transaction; xóa cache server `home:public`. Client invalidate `['course', id]`, `['me','courses']`, `['me','stats']`, `['home']`.

---

### 4.11 Learning

#### E33 · `GET /me/courses`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S2 | FR-15, UC-13, BR-05, SC-14 |

**Query**

| Tham số | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `status` | enum | | `z.enum(['all','ongoing','completed']).default('all')` | `ongoing`: `progressPercent < 100`; `completed`: `= 100` |

**Response `200 OK`** — `data: MyCourseItem[]` (không phân trang, không có `meta`)

```json
{
  "data": [
    {
      "course": { "id": "crs_ux_foundation", "title": "UX Foundation", "thumbnailUrl": "https://img.example.com/courses/ux-foundation.jpg" },
      "totalDurationSec": 8700,
      "progressPercent": 30,
      "lastLessonId": "les_ux_04",
      "lastAccessedAt": "2026-11-05T08:00:00.000Z"
    },
    {
      "course": { "id": "crs_creative_art", "title": "Creative Art Design", "thumbnailUrl": "https://img.example.com/courses/creative-art-design.jpg" },
      "totalDurationSec": 12300,
      "progressPercent": 70,
      "lastLessonId": "les_art_08",
      "lastAccessedAt": "2026-11-04T19:30:00.000Z"
    },
    {
      "course": { "id": "crs_palettes", "title": "Palettes for Your App", "thumbnailUrl": "https://img.example.com/courses/palettes-for-your-app.jpg" },
      "totalDurationSec": 17400,
      "progressPercent": 100,
      "lastLessonId": "les_pal_12",
      "lastAccessedAt": "2026-11-03T10:10:00.000Z"
    },
    {
      "course": { "id": "crs_typography", "title": "Typography in UI Design", "thumbnailUrl": "https://img.example.com/courses/typography-in-ui-design.jpg" },
      "totalDurationSec": 17400,
      "progressPercent": 50,
      "lastLessonId": "les_typ_06",
      "lastAccessedAt": "2026-11-02T21:45:00.000Z"
    }
  ]
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `status` không hợp lệ |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** BR-05 — sắp theo `Enrollment.lastAccessedAt` ↓. Mobile `staleTime = 0`, refetch khi màn được focus; invalidate khi checkout/enroll/lưu tiến độ. Tổng số bài mỗi khóa không nằm ở đây (dùng E10 khi cần).

---

#### E34 · `GET /lessons/:id`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | C | S2 | FR-09, FR-16, UC-09, UC-14, BR-01, NFR-06, SC-09, SC-15 |

Chi tiết bài học kèm **`videoUrl`** và vị trí xem đã lưu.

**Path:** `id` — mã bài học.

**Response `200 OK`** — `data: LessonDetail`

```json
{
  "data": {
    "id": "les_ux_02",
    "courseId": "crs_ux_foundation",
    "title": "Adipisicing dolor amet occaeca",
    "durationSec": 83,
    "videoUrl": "http://192.168.1.10:4000/static/videos/clip-02.mp4",
    "positionSec": 20,
    "isCompleted": false,
    "nextLessonId": "les_ux_03"
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh **và** `isPreview = false` (BR-01). Body lỗi **không** chứa `videoUrl` |
| 404 | `LESSON_NOT_FOUND` | Bài không tồn tại hoặc khóa chưa publish |

**Quy tắc**

- BR-01: cho phép nếu **đã ghi danh** hoặc `isPreview = true`; ngược lại 403. Đây là chốt chặn phân quyền thật (TC-SEC-01).
- `positionSec`/`isCompleted` lấy từ `LessonProgress` của người dùng (mặc định `0`/`false`; người chưa ghi danh xem preview luôn `0`/`false`).
- `nextLessonId`: bài kế tiếp theo thứ tự (chương, bài) trong cùng khóa; `null` nếu là bài cuối.
- Mobile: `staleTime = 0`, không persist. Player seek tới `positionSec` (nếu `isCompleted` và `positionSec` gần cuối thì bắt đầu từ 0).

---

#### E35 · `PUT /lessons/:id/progress`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S2 | FR-16, UC-14, BR-03, BR-04, NFR-10, SC-15 |

Lưu tiến độ xem. Client gọi **mỗi 10 s** khi đang phát, khi pause, khi chuyển bài, khi rời màn hình hoặc app xuống nền; và gửi `isCompleted: true` khi xem ≥ 90 % hoặc phát hết.

**Path:** `id` — mã bài học.

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `positionSec` | int | ✓ | `z.number().int().min(0)` | Vị trí hiện tại (giây). Server chặn trên bằng `durationSec` |
| `isCompleted` | boolean | | `z.boolean().optional()` | `true` khi đủ điều kiện hoàn thành. `false`/vắng mặt **không** hủy hoàn thành |

```json
{ "positionSec": 75, "isCompleted": true }
```

**Response `200 OK`**

```json
{
  "data": {
    "lessonProgress": {
      "lessonId": "les_ux_02",
      "positionSec": 75,
      "isCompleted": true,
      "updatedAt": "2026-11-05T09:50:10.000Z"
    },
    "courseProgressPercent": 17
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `positionSec` âm/không nguyên, `isCompleted` không phải boolean |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa của bài này (xem preview không được lưu tiến độ) |
| 404 | `LESSON_NOT_FOUND` | Bài không tồn tại |

**Quy tắc**

1. `positionSec' = min(positionSec, durationSec)`.
2. `isCompleted' = đã hoàn thành từ trước ∨ body.isCompleted = true ∨ positionSec' ≥ ⌊0,9 × durationSec⌋` (BR-03; server tự bảo đảm ngưỡng 90 % kể cả khi client quên gửi cờ; **đã hoàn thành thì không bị bỏ**).
3. Trong 1 transaction: `upsert LessonProgress`; cập nhật `Enrollment.lastLessonId = lessonId`, `lastAccessedAt = now()`.
4. **Chỉ khi bài vừa chuyển từ chưa xong sang xong**: `progressPercent = round(số bài isCompleted / Course.lessonCount × 100)` (BR-04) và ghi vào `Enrollment`. Nếu đạt 100 và `completedAt` còn `null` → đặt `completedAt = now()` và tạo `Notification` `COURSE_COMPLETED`. Các lần gọi khác trả `courseProgressPercent` hiện có mà không phải đếm lại.
5. Idempotent theo nghĩa cuối cùng: gọi lặp cùng nội dung cho cùng kết quả.

Client invalidate `['course', id, 'curriculum']`, `['me','courses']`, và khi đạt 100 %: `['me','stats']`, `['notifications']` (PLAN §10).

**Offline (ngoại lệ FR-24):** khi mất mạng, client **không** chặn việc lưu tiến độ như các thao tác ghi khác mà ghi vị trí mới nhất của từng bài vào AsyncStorage và gửi lại `PUT` này khi có mạng (thứ tự theo thời gian). Vì vậy server phải chịu được cuộc gọi đến muộn: kết quả luôn nhất quán (`isCompleted` không bị hạ, `positionSec` là giá trị gửi sau cùng).

---
### 4.12 Q&A

#### E36 · `GET /courses/:id/questions`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-19, UC-16, SC-15 (tab Q&A) |

**Path:** `id` — mã khóa học. **Query:** `page`, `limit` (mục 1.5).

**Response `200 OK`** — `data: QuestionDto[]`, `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "qst_jane_1",
      "courseId": "crs_ux_foundation",
      "content": "Deserunt minim incididunt cillum nostrud do voluptate excepteur excepteur minim ex minim est",
      "createdAt": "2026-11-04T08:00:00.000Z",
      "likeCount": 23,
      "answerCount": 5,
      "isLiked": false,
      "user": { "id": "usr_jane", "fullName": "Jane Barry", "avatarUrl": "https://img.example.com/avatars/jane-barry.jpg" }
    },
    {
      "id": "qst_thomas_1",
      "courseId": "crs_ux_foundation",
      "content": "Which tool do you recommend for the first wireframe? 🔥",
      "createdAt": "2026-11-03T15:30:00.000Z",
      "likeCount": 23,
      "answerCount": 5,
      "isLiked": true,
      "user": { "id": "usr_thomas", "fullName": "Thomas Carlson", "avatarUrl": "https://img.example.com/avatars/thomas-carlson.jpg" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 4, "totalPages": 1 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` sai |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa học này (NFR-06) |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** mới nhất trước (`createdAt` ↓, index `(courseId, createdAt)`); `isLiked` ghép bằng một truy vấn `QuestionLike` cho cả trang; `likeCount`/`answerCount` là cột denormalize. Từ PLAN v1.3, cả *đọc* lẫn *ghi* Q&A đều yêu cầu đã ghi danh (`✓E`); `requireEnrolled` kiểm tra trước controller.

---

#### E37 · `POST /courses/:id/questions`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-19, UC-16, BR-09, NFR-06, SC-15 |

**Path:** `id` — mã khóa học.

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `content` | string | ✓ | `z.string().trim().min(1).max(1000)` | Nội dung, có thể kèm emoji (chèn từ hàng emoji nhanh) |

```json
{ "content": "How do I structure a UX research plan? 🙌" }
```

**Response `201 Created`** — `data: QuestionDto` (`likeCount = 0`, `answerCount = 0`, `isLiked = false`)

```json
{
  "data": {
    "id": "qst_martha_1",
    "courseId": "crs_ux_foundation",
    "content": "How do I structure a UX research plan? 🙌",
    "createdAt": "2026-11-05T10:05:00.000Z",
    "likeCount": 0,
    "answerCount": 0,
    "isLiked": false,
    "user": { "id": "usr_martha", "fullName": "Martha Rosie", "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg" }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `content` rỗng hoặc > 1000 ký tự |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa này (BR-09) |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** client invalidate `['course', id, 'questions']`. Không sinh thông báo.

---

#### E38 · `GET /questions/:id`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-19, SC-16, SC-22 (mở từ thông báo) |

**Path:** `id` — mã câu hỏi.

**Response `200 OK`** — `data: QuestionDto` (hình dạng như phần tử của E36)

```json
{
  "data": {
    "id": "qst_thomas_1",
    "courseId": "crs_ux_foundation",
    "content": "Which tool do you recommend for the first wireframe? 🔥",
    "createdAt": "2026-11-03T15:30:00.000Z",
    "likeCount": 23,
    "answerCount": 5,
    "isLiked": true,
    "user": { "id": "usr_thomas", "fullName": "Thomas Carlson", "avatarUrl": "https://img.example.com/avatars/thomas-carlson.jpg" }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa học của câu hỏi (NFR-06) |
| 404 | `QUESTION_NOT_FOUND` | Câu hỏi không tồn tại |

**Quy tắc phân quyền:** `✓E` — `requireEnrolled` tra `Question.courseId` từ `:id` rồi kiểm tra `Enrollment` của người dùng; câu hỏi không tồn tại → `404 QUESTION_NOT_FOUND` (kiểm tra trước), chưa ghi danh → `403 NOT_ENROLLED`.

---

#### E39 · `GET /questions/:id/answers`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-19, SC-16 |

**Path:** `id` — mã câu hỏi. **Query:** `page`, `limit` (mục 1.5).

**Response `200 OK`** — `data: AnswerDto[]`, `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "ans_1",
      "questionId": "qst_thomas_1",
      "content": "I started with paper sketches and then moved to Figma.",
      "createdAt": "2026-11-03T16:10:00.000Z",
      "user": { "id": "usr_jenny", "fullName": "Jenny Barry", "avatarUrl": "https://img.example.com/avatars/jenny-barry.jpg" }
    },
    {
      "id": "ans_2",
      "questionId": "qst_thomas_1",
      "content": "Figma is enough for a first wireframe. 👏",
      "createdAt": "2026-11-03T18:45:00.000Z",
      "user": { "id": "usr_martha", "fullName": "Martha Rosie", "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` sai |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa học của câu hỏi (NFR-06) |
| 404 | `QUESTION_NOT_FOUND` | Câu hỏi không tồn tại |

**Quy tắc:** cũ nhất trước (`createdAt` ↑, như luồng hội thoại; index `(questionId, createdAt)`).

**Quy tắc phân quyền:** `✓E` — `requireEnrolled` tra `Question.courseId` từ `:id` rồi kiểm tra `Enrollment` của người dùng; câu hỏi không tồn tại → `404 QUESTION_NOT_FOUND` (kiểm tra trước), chưa ghi danh → `403 NOT_ENROLLED`.

---

#### E40 · `POST /questions/:id/answers`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-19, FR-23, UC-16, BR-09, NFR-06, SC-16 |

Trả lời một câu hỏi. "Đã ghi danh" được kiểm tra theo **khóa học của câu hỏi**.

**Path:** `id` — mã câu hỏi.

**Body (`application/json`)**

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `content` | string | ✓ | `z.string().trim().min(1).max(1000)` | Nội dung trả lời |

```json
{ "content": "Figma is enough for a first wireframe. 👏" }
```

**Response `201 Created`** — `data: AnswerDto`

```json
{
  "data": {
    "id": "ans_2",
    "questionId": "qst_thomas_1",
    "content": "Figma is enough for a first wireframe. 👏",
    "createdAt": "2026-11-03T18:45:00.000Z",
    "user": { "id": "usr_martha", "fullName": "Martha Rosie", "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg" }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `content` rỗng hoặc > 1000 ký tự |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa của câu hỏi |
| 404 | `QUESTION_NOT_FOUND` | Câu hỏi không tồn tại |

**Quy tắc — trong 1 transaction:** tạo `Answer`; `Question.answerCount + 1`; nếu người trả lời **khác** người hỏi thì tạo `Notification` `NEW_ANSWER` cho người hỏi (title "New answer", `data: { courseId, questionId }`) — BR-09. Client invalidate `['question', id, 'answers']`, `['course', courseId, 'questions']`.

---

#### E41 · `PUT /questions/:id/like`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-19, SC-15, SC-16 |

Thích câu hỏi (idempotent).

**Path:** `id` — mã câu hỏi. **Body:** không.

**Response `200 OK`**

```json
{ "data": { "likeCount": 24, "isLiked": true } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa học của câu hỏi (NFR-06) |
| 404 | `QUESTION_NOT_FOUND` | Câu hỏi không tồn tại |

**Quy tắc:** tạo `QuestionLike` và `Question.likeCount + 1` trong 1 transaction, chỉ khi dòng mới được tạo. Mobile optimistic update.

**Quy tắc phân quyền:** `✓E` — `requireEnrolled` tra `Question.courseId` từ `:id` rồi kiểm tra `Enrollment` của người dùng; câu hỏi không tồn tại → `404 QUESTION_NOT_FOUND` (kiểm tra trước), chưa ghi danh → `403 NOT_ENROLLED`.

---

#### E42 · `DELETE /questions/:id/like`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | C | S4 | FR-19 |

**Path:** `id` — mã câu hỏi. **Body:** không.

**Response `200 OK`**

```json
{ "data": { "likeCount": 23, "isLiked": false } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa học của câu hỏi (NFR-06) |
| 404 | `QUESTION_NOT_FOUND` | Câu hỏi không tồn tại |

**Quy tắc:** xóa `QuestionLike` và `likeCount − 1` chỉ khi có dòng bị xóa; không xuống dưới 0.

**Quy tắc phân quyền:** `✓E` — `requireEnrolled` tra `Question.courseId` từ `:id` rồi kiểm tra `Enrollment` của người dùng; câu hỏi không tồn tại → `404 QUESTION_NOT_FOUND` (kiểm tra trước), chưa ghi danh → `403 NOT_ENROLLED`.

---

### 4.13 Project

#### E43 · `GET /courses/:id/project`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | A | S4 | FR-18, UC-17, SC-15 (tab Projects) |

Mô tả project, danh sách tài liệu và số bài nộp của khóa.

**Path:** `id` — mã khóa học.

**Response `200 OK`** — `data: { description: string | null; resources: ResourceDto[]; submissionCount: number }`

```json
{
  "data": {
    "description": "Culpa aliquip commodo incididunt nostrud aliqua ut adipisicing officia. Laborum consequat ea reprehenderit voluptate voluptate quis pariatur dolor. Laboris proident ea fugiat nulla.",
    "resources": [
      { "id": "res_1", "name": "Document 1.txt", "fileUrl": "http://192.168.1.10:4000/static/resources/document-1.txt", "sizeBytes": 626688, "mimeType": "text/plain" },
      { "id": "res_2", "name": "Document 2.pdf", "fileUrl": "http://192.168.1.10:4000/static/resources/document-2.pdf", "sizeBytes": 36700160, "mimeType": "application/pdf" }
    ],
    "submissionCount": 12
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa học này (NFR-06) |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** `✓E` (PLAN v1.3): chưa ghi danh → `403 NOT_ENROLLED`. `description` = `Course.projectDescription` (`null` nếu khóa chưa có); `resources` sắp theo tên; `submissionCount` = `COUNT(ProjectSubmission)`. Mobile tải tài liệu bằng `expo-file-system` rồi mở bằng `expo-sharing`.

---

#### E44 · `GET /courses/:id/submissions`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | A | S4 | FR-18, UC-17, SC-15 ("n Student Projects") |

**Path:** `id` — mã khóa học. **Query:** `page`, `limit` (mục 1.5).

**Response `200 OK`** — `data: ProjectSubmissionDto[]`, `meta: PaginationMeta`

```json
{
  "data": [
    {
      "id": "sub_1",
      "title": "Wireframe",
      "description": "Low-fidelity wireframes for a food delivery app.",
      "imageUrl": "https://img.example.com/projects/wireframe.jpg",
      "fileUrl": "http://192.168.1.10:4000/uploads/submissions/ckx1wireframe.pdf",
      "createdAt": "2026-11-02T11:00:00.000Z",
      "user": { "id": "usr_ramono_student", "fullName": "Ramono Wultschner", "avatarUrl": "https://img.example.com/avatars/ramono-wultschner.jpg" }
    },
    {
      "id": "sub_2",
      "title": "Personal",
      "description": null,
      "imageUrl": "https://img.example.com/projects/personal.jpg",
      "fileUrl": "http://192.168.1.10:4000/uploads/submissions/ckx2personal.zip",
      "createdAt": "2026-11-01T09:20:00.000Z",
      "user": { "id": "usr_thomas", "fullName": "Thomas Carlson", "avatarUrl": "https://img.example.com/avatars/thomas-carlson.jpg" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` sai |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa học này (NFR-06) |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |

**Quy tắc:** mới nhất trước (`createdAt` ↓, index `(courseId, createdAt)`); chỉ người **đã ghi danh** khóa đó mới xem được bài nộp của học viên khác (`✓E`, PLAN v1.3). SC-15 chỉ hiển thị tối đa **10** bài mới nhất nên gọi `limit=10` (trang 1) và **ẩn** nút "View more" (danh sách đầy đủ là Could); số "{n} Student Projects" lấy từ `submissionCount` của E43.

---

#### E45 · `POST /courses/:id/submissions`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓E | A | S4 | FR-18, UC-17, BR-09, NFR-05, NFR-06, SC-17 |

Nộp project. Nội dung là **`multipart/form-data`**.

**Path:** `id` — mã khóa học.

**Trường form**

| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `title` | text | ✓ | `z.string().trim().min(1).max(100)` | Tiêu đề |
| `description` | text | | `z.string().trim().max(1000).optional()` | Mô tả |
| `file` | file | ✓ | MIME ∈ {`image/png`, `image/jpeg`, `application/pdf`, `application/zip`, `text/plain`}, ≤ 10 MB | Tệp bài nộp |
| `image` | file | | MIME ∈ {`image/png`, `image/jpeg`}, ≤ 10 MB | Ảnh bìa hiển thị trên `ProjectCard` |

```bash
curl -X POST "http://192.168.1.10:4000/api/v1/courses/crs_ux_foundation/submissions" \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Wireframe" \
  -F "description=Low-fidelity wireframes for a food delivery app." \
  -F "file=@wireframe.pdf;type=application/pdf" \
  -F "image=@cover.png;type=image/png"
```

**Response `201 Created`** — `data: ProjectSubmissionDto`

```json
{
  "data": {
    "id": "sub_13",
    "title": "Wireframe",
    "description": "Low-fidelity wireframes for a food delivery app.",
    "imageUrl": "http://192.168.1.10:4000/uploads/submissions/ckx3cover.png",
    "fileUrl": "http://192.168.1.10:4000/uploads/submissions/ckx3wireframe.pdf",
    "createdAt": "2026-11-05T10:20:00.000Z",
    "user": { "id": "usr_martha", "fullName": "Martha Rosie", "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg" }
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `title` hoặc `file`; `title`/`description` quá dài |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 403 | `NOT_ENROLLED` | Chưa ghi danh khóa này |
| 404 | `COURSE_NOT_FOUND` | Khóa không tồn tại |
| 413 | `FILE_TOO_LARGE` | Tệp > 10 MB (message "File must be ≤ 10 MB") |
| 415 | `UNSUPPORTED_FILE_TYPE` | MIME/đuôi tệp ngoài whitelist |

**Quy tắc**

- Thứ tự middleware: `requireAuth` → `requireEnrolled` (kiểm tra **trước** khi nhận tệp để không tốn băng thông) → `upload` (multer `diskStorage` vào `UPLOAD_DIR/submissions/`, tên tệp ngẫu nhiên `cuid + đuôi`) → `validate` → controller.
- Kiểm tra MIME *và* đuôi tệp; xóa tệp đã lưu nếu validate hoặc ghi DB thất bại.
- Client cũng kiểm tra dung lượng ≤ 10 MB trước khi gửi (TC-PRJ-01).
- Ổ đĩa Render free không bền: tệp upload mất khi redeploy (PLAN §15.2) — giới hạn đã biết.
- Client invalidate `['course', id, 'submissions']`, `['course', id, 'project']`.

---

### 4.14 Me

#### E46 · `GET /me/stats`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-21, BR-05, BR-15, SC-20 |

**Response `200 OK`** — `data: MeStatsDto`

```json
{ "data": { "savedCount": 4, "ongoingCount": 3, "completedCount": 1 } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** `savedCount` = `COUNT(Bookmark)`; `ongoingCount` = ghi danh có `progressPercent < 100`; `completedCount` = `progressPercent = 100` (BR-05, BR-15). Mobile `staleTime = 0`; invalidate khi bookmark, checkout, hoàn thành 100 %.

---

#### E47 · `PATCH /me`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-22, UC-19, SC-21 |

Cập nhật hồ sơ. Email không sửa được.

**Body (`application/json`)** — cần ít nhất một trường

| Trường | Kiểu | Bắt buộc | Ràng buộc (zod) | Mô tả |
|---|---|---|---|---|
| `fullName` | string | | `z.string().trim().min(2).max(60)` | Họ tên mới |
| `headline` | string｜null | | `z.string().trim().max(80).nullable()` | Chức danh; chuỗi rỗng hoặc `null` để xóa |

```json
{ "fullName": "Martha Rosie", "headline": "UX/UI Designer" }
```

**Response `200 OK`** — `data: UserDto`

```json
{
  "data": {
    "id": "usr_martha",
    "email": "martha.rosie@example.com",
    "fullName": "Martha Rosie",
    "headline": "UX/UI Designer",
    "avatarUrl": "https://img.example.com/avatars/martha-rosie.jpg",
    "coverUrl": "https://img.example.com/covers/martha-rosie.jpg",
    "role": "STUDENT"
  }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body rỗng (không có trường nào), `fullName` < 2 hoặc > 60 ký tự, `headline` > 80 |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** trường không gửi thì giữ nguyên. Client `setQueryData(['me'], data)` và cập nhật `authStore.user`.

---

#### E48 · `POST /me/avatar`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-22, UC-19, NFR-05, SC-21 |

Đổi ảnh đại diện. Nội dung là **`multipart/form-data`**.

**Trường form**

| Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
|---|---|---|---|---|
| `file` | file | ✓ | MIME ∈ {`image/png`, `image/jpeg`}, **≤ 5 MB** | Ảnh vuông (client đã crop) |

**Response `200 OK`**

```json
{ "data": { "avatarUrl": "http://192.168.1.10:4000/uploads/avatars/ckx9martha.jpg" } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu trường `file` |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 413 | `FILE_TOO_LARGE` | Ảnh > 5 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | Không phải png/jpg |

**Quy tắc:** lưu vào `UPLOAD_DIR/avatars/` với tên ngẫu nhiên, ghi `User.avatarUrl` (đường dẫn tương đối, mapper ghép `PUBLIC_BASE_URL`), xóa tệp avatar cũ nếu nằm trong `uploads/`. Client `setQueryData(['me'], user đã cập nhật)` và invalidate `['home']`.

---

### 4.15 Notification

#### E49 · `GET /notifications`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-23, UC-20, SC-22, SC-04 (badge) |

**Query:** `page`, `limit` (mục 1.5).

**Response `200 OK`** — `data: NotificationDto[]`, `meta: PaginationMeta & { unreadCount: number }`

```json
{
  "data": [
    {
      "id": "not_1",
      "type": "ORDER_PAID",
      "title": "Payment successful",
      "body": "You have enrolled in 2 courses. Start learning now!",
      "data": { "courseId": "crs_ux_foundation" },
      "isRead": false,
      "createdAt": "2026-11-05T09:30:00.000Z"
    },
    {
      "id": "not_2",
      "type": "NEW_ANSWER",
      "title": "New answer",
      "body": "Jenny Barry replied to your question.",
      "data": { "courseId": "crs_ux_foundation", "questionId": "qst_martha_1" },
      "isRead": false,
      "createdAt": "2026-11-05T08:10:00.000Z"
    },
    {
      "id": "not_3",
      "type": "COURSE_COMPLETED",
      "title": "Course completed",
      "body": "Congratulations! You completed Palettes for Your App.",
      "data": { "courseId": "crs_palettes" },
      "isRead": true,
      "createdAt": "2026-11-03T10:10:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1, "unreadCount": 2 }
}
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` sai |
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** mới nhất trước (index `(userId, isRead, createdAt)`); `unreadCount` = số thông báo `isRead = false` của người dùng, **không phụ thuộc trang** (cùng giá trị với E52). Điều hướng khi bấm: `data.questionId` → SC-16, `data.courseId` → SC-09 (hoặc SC-15 nếu đã ghi danh).

---

#### E50 · `PATCH /notifications/:id/read`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-23, SC-22 |

**Path:** `id` — mã thông báo. **Body:** không.

**Response `204 No Content`**

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |
| 404 | `NOT_FOUND` | Không có thông báo này **của người dùng hiện tại** (thông báo của người khác cũng trả 404 để không lộ sự tồn tại) |

**Quy tắc:** idempotent — đã đọc vẫn `204`. Client invalidate `['notifications']`.

---

#### E51 · `PATCH /notifications/read-all`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-23, SC-22 ("Mark all as read") |

**Body:** không.

**Response `204 No Content`**

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** `updateMany({ where: { userId, isRead: false }, data: { isRead: true } })`; đường dẫn `/notifications/read-all` không xung đột với `/notifications/:id/read` (khác số đoạn).

---

#### E52 · `GET /notifications/unread-count`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| ✓ | A | S3 | FR-04, FR-23, SC-04 (badge chuông) |

Số thông báo chưa đọc — endpoint **nhẹ** dành riêng cho badge chuông ở Home (không kéo cả danh sách thông báo).

**Tham số:** không.

**Response `200 OK`** — `data: UnreadCountDto`

```json
{ "data": { "count": 2 } }
```

**Lỗi**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu/sai token |

**Quy tắc:** `count = COUNT(*) WHERE userId = ? AND isRead = false` (dùng index `(userId, isRead, createdAt)`). Query key `['notifications','unread-count']`, `staleTime` 30 s, **không persist**; refetch khi Home được focus / app quay lại foreground và bị invalidate khi đọc thông báo, `read-all`, checkout, hoặc có câu trả lời mới. Đường dẫn `/notifications/unread-count` (GET) không xung đột với `/notifications/:id/read` (PATCH). Badge ẩn khi `count = 0`, hiển thị "9+" khi lớn hơn 9.

---

### 4.16 Files

Hai route này nằm **ngoài** `/api/v1`, do `express.static` phục vụ; không có envelope `{data}` và không có `Authorization`.

#### F1 · `GET /static/*`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | W2 | NFR-08, ADR-08, M-20a |

Phục vụ `server/static/`: video mẫu (`/static/videos/clip-01.mp4`), tài liệu (`/static/resources/document-1.txt`), ảnh mẫu (`/static/images/...`).

**Response:** `200 OK` với nội dung tệp; hỗ trợ **`Range` request** (`206 Partial Content`) — bắt buộc để `expo-video` tua/seek. `Cache-Control: public, max-age=604800`, `ETag` bật.

**Lỗi:** `404 NOT_FOUND` nếu tệp không tồn tại (đi qua `notFound`).

**Quy tắc:** URL trong DTO luôn là `PUBLIC_BASE_URL + /static/...`. **Giới hạn đã biết:** đường dẫn video tĩnh không kiểm tra ghi danh — BR-01 chỉ được thực thi ở API (`GET /lessons/:id` không trả `videoUrl` khi không đủ quyền). Chấp nhận cho đồ án; cải tiến: signed URL / streaming có xác thực (PLAN §16.3).

#### F2 · `GET /uploads/*`

| Auth | Owner | Sprint | Liên quan |
|---|---|---|---|
| — | A | W2 | FR-18, FR-22 |

Phục vụ `UPLOAD_DIR` (avatar, bài nộp project). `Cache-Control: public, max-age=3600`. Tên tệp ngẫu nhiên nên không đoán được; thư mục bị `.gitignore`.

---

## 5. Mã lỗi

Mã của PLAN §9.4 (21 mã, gồm `PAYMENT_FAILED`; các mã 402/413/415/429 đã có HTTP status trong PLAN v1.3) và các mã bổ sung (đánh dấu ★). `code` là hợp đồng ổn định; `message` chỉ để hiển thị.

| Code | HTTP | Ý nghĩa | Endpoint điển hình |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query/params sai định dạng hoặc ràng buộc (`details` là mảng lỗi từng trường) | Mọi endpoint có input |
| `UNAUTHORIZED` | 401 | Thiếu/sai/hết hạn token; người dùng không còn tồn tại | Mọi endpoint `✓`, `✓E`, `opt` (token sai) |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu | E03 |
| `EMAIL_TAKEN` | 409 | Email đã được đăng ký | E02 |
| `FORBIDDEN` | 403 | Có đăng nhập nhưng không đủ quyền (dành cho phân quyền theo vai trò; hiện chưa endpoint nào dùng) | — |
| `NOT_ENROLLED` | 403 | Chưa ghi danh khóa học (BR-01, BR-08, BR-09) | E20, E34, E35, E36–E45 (mọi endpoint Q&A và Project) |
| `COURSE_NOT_FOUND` | 404 | Khóa học không tồn tại hoặc chưa publish | E09–E13, E15–E20, E28, E32, E36, E37, E43–E45 |
| `LESSON_NOT_FOUND` | 404 | Bài học không tồn tại | E34, E35 |
| `TEACHER_NOT_FOUND` | 404 | Giảng viên không tồn tại | E22–E26 |
| `QUESTION_NOT_FOUND` | 404 | Câu hỏi không tồn tại | E38–E42 |
| `ALREADY_ENROLLED` | 409 | Đã ghi danh khóa này | E28, E32 |
| `ALREADY_IN_CART` | 409 | Khóa đã có trong giỏ | E28 |
| `FREE_COURSE` | 422 | Khóa miễn phí không đưa vào giỏ | E28 |
| `PAID_COURSE` | 422 | Khóa có phí không ghi danh trực tiếp | E32 |
| `CART_EMPTY` | 422 | Giỏ rỗng khi checkout | E30 |
| `CANNOT_FOLLOW_SELF` | 422 | Tự follow chính mình (BR-14) | E25 |
| `PAYMENT_FAILED` | 402 | Thanh toán giả lập thất bại (`simulateFailure = true`, BR-07); giỏ được giữ nguyên | E30 |
| `FILE_TOO_LARGE` | 413 | Tệp upload vượt giới hạn (10 MB; avatar 5 MB) | E45, E48 |
| `UNSUPPORTED_FILE_TYPE` | 415 | Loại tệp không nằm trong whitelist | E45, E48 |
| `RATE_LIMITED` | 429 | Vượt giới hạn tần suất (10 request/phút/IP, chỉ áp cho `POST /auth/login` và `POST /auth/register`) | E02, E03 |
| `INTERNAL_ERROR` | 500 | Lỗi không lường trước (chi tiết chỉ ở log) | Mọi endpoint |
| `NOT_FOUND` ★ | 404 | Route không tồn tại hoặc tài nguyên không có mã riêng (thông báo) | E50, mọi URL sai |
| `PAYLOAD_TOO_LARGE` ★ | 413 | Body JSON vượt 100 KB | Mọi endpoint nhận JSON |

**Mã chỉ tồn tại ở client** (không do server trả; `apiClient` sinh ra khi chuẩn hóa lỗi thành `AppError`): `NETWORK_ERROR` (không kết nối được/offline), `TIMEOUT` (quá 15 s), `UNKNOWN` (phản hồi không đúng định dạng).

---

## 6. Ma trận endpoint ↔ yêu cầu

| FR | Endpoint | Business rule chính |
|---|---|---|
| FR-01 | E02 | BR — (mật khẩu ≥ 8 ký tự có chữ và số) |
| FR-02 | E03, E04 | — |
| FR-03 | — (client xóa token và cache) | — |
| FR-04 | E05, E06, E52 (badge chuông), E27 (badge giỏ) | BR-10, BR-11, BR-12 |
| FR-05 | E08, E07, E06 | BR-13 |
| FR-06 | E08, E06 | BR-10 |
| FR-07 | E08, E06 | BR-11, BR-12 |
| FR-08 | E09, E11 (nút Follow ở SC-09 thuộc FR-20) | BR-10, BR-17, BR-18 |
| FR-09 | E10, E34 | BR-01, BR-02 |
| FR-10 | E18 | — |
| FR-11 | E19, E20 | BR-08 |
| FR-12 | E12, E13, E14 | — |
| FR-13 | E27, E28, E29 | BR-06 |
| FR-14 | E30 (kèm mô phỏng thất bại), E32 | BR-07 |
| FR-15 | E33 | BR-05 |
| FR-16 | E34, E35 | BR-01, BR-03, BR-04 |
| FR-17 | E15, E16, E17 | — |
| FR-18 | E43, E44, E45 | BR-09 |
| FR-19 | E36–E42 | BR-09 |
| FR-20 | E21–E26 (gồm Follow dùng ở cả SC-09 và SC-18) | BR-14, BR-16 |
| FR-21 | E46, E14, E04 | BR-15 |
| FR-22 | E47, E48 | — |
| FR-23 | E49, E50, E51, E52 (+ sinh từ E30, E35, E40) | BR-04, BR-07, BR-09 |
| FR-24 | — (client; ngoại lệ: hàng đợi tiến độ video gửi lại E35 khi có mạng) | BR-03 |
| NFR-05 | E02, E03 (rate limit), E45, E48 (upload) | — |
| NFR-06 | E20, E34, E35, E37, E40, E45 | BR-01 |

---

## 7. Bổ sung và làm rõ so với PLAN §9

PLAN §9 (phiên bản 1.3) là nguồn sự thật. Các điểm dưới đây là **bổ sung hoặc chốt phương án** nơi PLAN chưa nêu rõ. Người điều phối cân nhắc cập nhật lại PLAN §9 (và ghi §22) cho khớp.

**Đã khớp với PLAN v1.3** (không còn là sai khác): `categoryId` nhận 1 hoặc nhiều id phân cách dấu phẩy · body checkout có `simulateFailure` và mã `PAYMENT_FAILED` (402) · endpoint `GET /notifications/unread-count` · toàn bộ `GET`/`POST`/`like` của Q&A và `GET` của project/submissions là `✓E` · rate limit chỉ `POST /auth/login|register` · HTTP status 402/413/415/429 gắn với mã lỗi · BR-18 (nhãn giảm giá tính theo BR-10, benefits không có "Certificate") · ngoại lệ offline của tiến độ video (FR-24).

| # | Chủ đề | Quyết định trong tài liệu này |
|---|---|---|
| 1 | Mã lỗi bổ sung | Thêm `NOT_FOUND` (404: route không tồn tại, thông báo không thuộc người dùng) và `PAYLOAD_TOO_LARGE` (413: body JSON > 100 KB) — PLAN §9.4 chưa có mã cho hai tình huống này |
| 2 | `optionalAuth` với token sai | Có header nhưng token sai/hết hạn → `401 UNAUTHORIZED` (không âm thầm coi là khách) để mobile đăng xuất đúng lúc |
| 3 | Định dạng `details` của `VALIDATION_ERROR` | Mảng `{ source, field, message }` (mục 1.3) |
| 4 | `POST /cart/items` | Trả `201` kèm `CartDto` mới (PLAN chỉ nêu `201`) |
| 5 | `POST /courses/:id/enroll` | Trả `201` + `EnrollmentDto` (PLAN không nêu body) |
| 6 | `PUT /courses/:id/reviews/me` | `201` khi tạo, `200` khi sửa; body `ReviewDto` |
| 7 | `TeacherDetail.localTime` | Thêm trường `localTime` (kiểu `string` hoặc `null`) (PLAN §9.2 nhắc `localTime` nhưng §9.3 không có) |
| 8 | `QuestionDto.courseId` | Thêm để SC-16 biết khóa học khi mở từ thông báo |
| 9 | `discountPercent` khi `badge = 'BEST_SELLER'` | Vẫn tính nếu có giá gốc — thanh giá ở SC-09 cần "x% Disc." ngay cả khi card hiện Best-seller (theo BR-10/BR-18, không chép "80% Disc." của design) |
| 10 | Lọc `GET /courses` | `minPrice`/`maxPrice` tính bằng **cent**; khi có `section` thì bỏ qua `sort`; `recommended` sắp theo (thuộc danh mục ưa thích) rồi `ratingAvg` |
| 11 | Đơn `FAILED` | `simulateFailure` **lưu** một `Order` `FAILED` (kèm `OrderItem`) rồi trả 402 với `details.orderId`; giỏ, ghi danh, thông báo không đổi. Đơn `FAILED` có thể xem ở `GET /orders` (Could) |
| 12 | `requireEnrolled` cho `/questions/:id/*` | Suy `courseId` từ câu hỏi (không tin `courseId` của client); câu hỏi không tồn tại → 404 trước, chưa ghi danh → 403 |
| 13 | `PUT /lessons/:id/progress` | Server tự bảo đảm ngưỡng 90 % (BR-03) và chỉ tính lại % khóa khi bài vừa hoàn thành; chỉ người đã ghi danh mới lưu được tiến độ (xem preview không lưu). Khi offline, client giữ **bản mới nhất mỗi bài** trong AsyncStorage và gửi lại khi có mạng; server nhận theo thứ tự đến (last write wins) và không bao giờ hạ `isCompleted` |
| 14 | `GET /me/courses` | Không phân trang (số khóa ghi danh nhỏ) |
| 15 | `GET /teachers/:id/courses` | Tên nhóm là `Category.name` (chỉ 6 giá trị: Business, Design, Code, Writing, Movie, Language) — khác các tiêu đề "UI/UX Design", "Graphic Design" trong ảnh `Teacher Profile.png`; PLAN §7.3 SC-18 vẫn ví dụ theo ảnh |
| 16 | Điểm giảng viên | `TeacherSummary.ratingAvg` = TB cộng `ratingAvg` các khóa published có `ratingCount > 0` (BR-11 chỉ nói "rating TB các khóa") |
| 17 | `GET /health` | Trả `503` khi DB không phản hồi |
| 18 | File tĩnh | Không kiểm tra ghi danh ở đường dẫn tĩnh — giới hạn đã biết (mục 4.16) |
| 19 | Student Projects | Client gọi E44 với `limit=10` và ẩn "View more" (PLAN §7.3 SC-15); server vẫn hỗ trợ phân trang đầy đủ |

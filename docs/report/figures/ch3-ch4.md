# Chi tiết hình Chương 3 và Chương 4 (dữ liệu để vẽ)

Tài liệu cho agent vẽ UML (U1–U4). Mọi tên endpoint, mã lỗi, bảng, cột dưới đây lấy từ **mã nguồn thật** (`server/src/**`, `server/prisma/schema.prisma`, `mobile/src/**`), không bịa. Phong cách vẽ theo ảnh mẫu `notes/report-template/reference/` (sơ đồ tuần tự: thanh kích hoạt màu cyan, thông điệp đánh số phân cấp `1`, `2.1`, `2.1.2.1`…, khung `alt`/`opt`/`loop` có nhãn điều kiện trong `[ ]`, thông điệp trả về nét đứt; sơ đồ lớp: tên lớp in đậm, thuộc tính `-ten : Kieu`, thao tác `+ten() : Kieu`, bội số `1`, `0..*`).

Quy ước chung cho mọi sơ đồ tuần tự `SQ-UCxxx`:

- Lifeline đặt từ trái sang phải theo thứ tự: **Actor** → **Màn hình** (boundary, tên màn thật) → **Hook / apiClient** (tầng mobile: hook TanStack Query + axios) → **Routes+Middleware** (chuỗi middleware của route) → **Controller** → **Service** → **Prisma/PostgreSQL** (entity). Hệ thống ngoài (Gemini, reCAPTCHA, Brevo SMTP) là lifeline riêng ở ngoài cùng bên phải.
- Có thể gộp "Hook / apiClient" thành một lifeline `Mobile (hook + apiClient)` và "Routes+Middleware+Controller" thành `API (route → controller)` nếu hình quá rộng; **Service** và **Prisma/PostgreSQL** luôn tách riêng.
- Tiêu đề khung: `sd SQ-UCxxx Tên use case`. Thông điệp lỗi ghi `status MÃ_LỖI` (ví dụ `403 NOT_ENROLLED`). Phản hồi thành công ghi `200 {data}` hoặc mã tương ứng.
- Mọi request đã đăng nhập có bước `requireAuth` (kiểm `sid`, role lấy từ DB, cache phiên 30 giây); chỉ vẽ một lần ở đầu mỗi hình, không lặp.
- Lỗi chung không cần vẽ lại từng hình: `400 VALIDATION_ERROR` (zod), `401 UNAUTHORIZED` (thiếu/hết hạn token; mobile tự refresh rồi gửi lại 1 lần), `429 RATE_LIMITED`.

---

## 1. ARCH.png — Sơ đồ kiến trúc tổng thể (Hình 3.1)

Bố cục **4 tầng từ trên xuống** (hoặc 3 cột nếu vẽ ngang), nền trắng, hộp bo góc, mũi tên có nhãn giao thức.

**Tầng 1 — Client (Expo / React Native, một mã nguồn)**
- Hộp `Android APK (EAS Build, profile preview)` + chú thích `EAS Update (OTA, channel preview)`.
- Hộp `Web SPA / PWA (expo export --platform web)` chia hai nhãn: `điện thoại < 768 px` và `PC ≥ 1024 px (nav kiểu Netflix)`; iPhone dùng PWA qua Safari.
- Bên trong khối client (hộp lồng): `Expo Router (app/ — route mỏng)` → `Screens (src/features/*/screens)` → `Hooks (TanStack Query v5, Zustand)` → `apiClient (axios, 1 instance, interceptor refresh token)`. Hai kho cạnh: `Query cache (RAM + AsyncStorage 24 giờ)`, `Token (SecureStore | localStorage trên web)`. Hộp `i18n vi/en` và `Theme sáng/tối` nằm cạnh Screens.
- Mũi tên ra ngoài: `HTTPS · REST/JSON · Bearer JWT` tới Caddy; `HTTPS fetch stream (SSE)` cho AI Tutor; `iframe/WebView YouTube` (phát video bài giảng) và `WebView reCAPTCHA v2`.

**Tầng 2 — Biên (VPS AWS EC2 Sydney, Docker Compose)**
- Hộp `Caddy 2 (HTTPS Let's Encrypt, tên miền eliuh.site)` với ba cửa ra: `app.eliuh.site / eliuh.site → web:8080`, `api.eliuh.site → api:4000 (flush_interval -1 cho SSE; chặn /metrics)`, `grafana.eliuh.site → grafana:3000`.
- Hộp `web (Caddy tĩnh, SPA fallback index.html)`.

**Tầng 3 — Backend `api` (Node 24, Express 5, TypeScript) — vẽ chi tiết nhất**
- Chuỗi middleware (hộp ngang, theo thứ tự `server/src/app.ts`): `metrics` → `pino-http` → `helmet` → `cors` → `compression` → `/static, /uploads (express.static)` → `rate limit 300/phút/IP` → `express.json (100 kb; /teacher 1 MB)` → `Router /api/v1` → `notFound` → `errorHandler`.
- Trong Router: ba nhóm quyền `public/optionalAuth`, `requireAuth`, `requireAuth + requireRole(TEACHER)` (`/teacher/*`, `/me/teacher-profile`), `requireAuth + requireRole(ADMIN)` (`/admin/*`).
- Sơ đồ lớp con: `routes → controller → service → Prisma` (mũi tên một chiều; ghi chú "chỉ service được import Prisma — ESLint cưỡng chế"). Cột bên cạnh `23 module nghiệp vụ` (liệt kê: admin, ai, auth, bookmark, cart, category, course, enrollment, health, home, lesson, like, notification, order, project, question, review, security, studio, tag, teacher, teaching, user).
- Hộp `lib/` gồm: `ai/ (provider gemini | mock, quota 3 tầng, SSE)`, `cache.ts (LRU TTL)`, `mailer (nodemailer)`, `captcha (reCAPTCHA v2 | Turnstile)`, `jwt`, `authCrypto (node:crypto)`, `metrics (prom-client)`.
- Cạnh `/metrics` ở cổng nội bộ riêng (không qua Caddy).

**Tầng 4 — Dữ liệu và dịch vụ ngoài**
- `PostgreSQL 17 (container, volume)` — mũi tên từ Prisma (adapter `pg`); hộp `backup (pg_dump hằng ngày) + EBS snapshot`. Chú thích dev: `embedded-postgres (cổng 5433)`.
- Hệ thống ngoài (hộp nét đứt): `Google Gemini API (@google/genai)`, `Google reCAPTCHA v2 (siteverify)`, `Brevo SMTP (nodemailer)`, `YouTube (nguồn video bài giảng)`, `EAS Update (u.expo.dev)`.
- Khối giám sát (hộp bên phải): `Prometheus` ← scrape `api (METRICS_PORT)`, `node-exporter`, `cAdvisor`, `postgres-exporter`; `Alloy → Loki` (log container); `Grafana` đọc Prometheus + Loki.
- Khối CI/CD (hộp dưới cùng, mũi tên ngang): `GitHub Actions: test → build image → GHCR → SSH deploy`.

---

## 2. SCREEN-flow.png — Sơ đồ luồng màn hình (Hình 3.3)

Chia **bốn vùng màu** (swimlane ngang) theo vai trò; mũi tên có nhãn hành động. Route thật nằm trong ngoặc.

**Vùng Khách (chưa đăng nhập)** — `Khởi động/Intro (app/index.tsx, SC-01)` → có phiên? Không → `Đăng nhập (login)`; `Đăng ký (register)` ↔ `Đăng nhập`; `Đăng ký` → `Xác minh email OTP (verify-email)` → vào Tabs; `Đăng nhập` → `Quên mật khẩu (forgot-password)` → `Đặt lại mật khẩu (reset-password)` → `Đăng nhập`; `Đăng nhập` → (nếu bật 2FA) `Xác thực hai lớp (two-factor)` → Tabs.

**Vùng Học viên (Bottom Tabs / thanh điều hướng PC)** — khối `Tabs`: `Trang chủ (index)`, `Tìm kiếm (search)`, `Khóa của tôi (my-courses)`, `Hồ sơ (profile)`. Từ Trang chủ: → `Chi tiết khóa (course/[id])`, `Danh sách khóa (course-list)`, `Hồ sơ giảng viên (teacher/[id])`, `Top giảng viên (teachers)`, `Giỏ hàng (cart)`, `Thông báo (notifications)`. `Tìm kiếm` → `Bộ lọc (search-filter, modal)`. `Chi tiết khóa` → `Tất cả đánh giá (course/[id]/reviews)` → `Viết đánh giá (write-review, modal)`; → `Giỏ hàng` → `Thanh toán (checkout)` → `Học bài (learn/[courseId])`; → `Học bài` (khóa miễn phí hoặc đã ghi danh). `Khóa của tôi` → `Học bài`. `Học bài` → `AI Tutor (learn/[courseId]/tutor)`, `Quiz AI (learn/[courseId]/quiz)`, `Chi tiết câu hỏi (question/[id])`, `Nộp project (submit-project, modal)`. `Hồ sơ` → `Sửa hồ sơ (profile/edit)`, `Cài đặt (settings)` → `Bảo mật & thiết bị (settings/security)` → `Bật 2FA (settings/two-factor)`. `Thông báo` → Chi tiết khóa / Câu hỏi / Học bài.

**Vùng Giảng viên** — tab thêm `Giảng dạy (studio)` đứng trước Hồ sơ: `Studio — khóa của tôi` → `Wizard soạn khóa 5 bước (studio/[id]/edit?step=)` ↔ `Chương trình học (studio/[id]/curriculum)`; `Wizard` → `AI gợi ý soạn khóa (studio/ai-draft, modal)`; `Studio` → `Trạng thái duyệt / lịch sử / bản sửa đổi (studio/[id])` → `Thống kê (studio/[id]/stats)`, `Bài nộp & chấm điểm (studio/[id]/submissions)`; `Hồ sơ` → `Sửa hồ sơ giảng viên (profile/teacher-edit)`.

**Vùng Quản trị** — tab thêm `Quản trị (admin)`: `Dashboard` → `Hàng chờ duyệt (admin/courses)` → `Xem & duyệt khóa — diff, AI kiểm duyệt (admin/courses/[id])`; `Dashboard` → `Người dùng (admin/users)`.

Ghi chú vẽ: mũi tên đứt từ vùng Giảng viên (`Gửi duyệt`) sang vùng Quản trị (`Hàng chờ duyệt`), và từ `Duyệt/Từ chối` về `Thông báo` của giảng viên (cạnh có nhãn `COURSE_APPROVED / COURSE_REJECTED`). Học viên cũng nhận `NEW_COURSE`, `PROJECT_GRADED`, `REVIEW_REPLY`. Guard: `Stack.Protected` (đăng nhập → Tabs; chưa đăng nhập → `(auth)`), `/studio` chỉ TEACHER, `/admin` chỉ ADMIN (người khác bị chuyển về Trang chủ).

---

## 3. CLASS-1.png + CLASS-2.png — Biểu đồ lớp (Hình 3.4)

Biểu đồ lớp **miền dữ liệu** (33 lớp thực thể từ `schema.prisma` + 12 kiểu liệt kê). Vẽ theo **7 gói** (khung chữ nhật có tiêu đề), thuộc tính hiển thị các cột chính (đủ khóa, khóa ngoại và cột nghiệp vụ; bỏ `createdAt/updatedAt` nếu chật, ghi chú "…" ), thao tác là hàm service thật.

| Gói | Lớp (thuộc tính chính) |
|---|---|
| **Người dùng & xác thực** | `User` (id, email, passwordHash, fullName, headline, avatarUrl, coverUrl, role : Role, emailVerifiedAt, failedLoginCount, lockedUntil, totpSecretEnc, totpEnabledAt, totpLastStep, disabledAt, disabledReason) · `TeacherProfile` (id, userId, jobTitle, bio, organization, location, timezone) · `Follow` (userId, teacherId) · `Session` (id, userId, deviceName, userAgent, ipAddress, lastUsedAt, expiresAt, revokedAt, revokedReason) · `RefreshToken` (id, sessionId, tokenHash, expiresAt, usedAt) · `OneTimeCode` (id, userId, purpose : OneTimeCodePurpose, codeHash, expiresAt, attempts, consumedAt) · `RecoveryCode` (id, userId, codeHash, usedAt) · `AuthEvent` (id, userId, type : AuthEventType, sessionId, ipAddress, userAgent, metadata) |
| **Danh mục & nội dung khóa học** | `Category` (id, name, slug, icon, color, order) · `Tag` (id, name, isHot) · `CourseTag` (courseId, tagId) · `Course` (id, title, subtitle, description, thumbnailUrl, bannerUrl, priceCents, originalPriceCents, benefits : String[], projectDescription, isBestSeller, isFeatured, status : CourseStatus, publishedAt, submittedAt, ratingAvg, ratingCount, enrollmentCount, likeCount, shareCount, lessonCount, totalDurationSec, categoryId, teacherId) · `Section` (id, courseId, title, order) · `Lesson` (id, sectionId, title, order, durationSec, videoUrl, isPreview, content) · `Resource` (id, courseId, name, fileUrl, sizeBytes, mimeType) · `Banner` (id, title, subtitle, ctaText, imageUrl, bgColor, targetType : BannerTarget, targetId, order, isActive) |
| **Học tập** | `Enrollment` (id, userId, courseId, progressPercent, lastLessonId, lastAccessedAt, enrolledAt, completedAt) · `LessonProgress` (userId, lessonId, positionSec, isCompleted) · `Bookmark` (userId, courseId) · `CourseLike` (userId, courseId) |
| **Thương mại** | `CartItem` (userId, courseId, addedAt) · `Order` (id, userId, totalCents, status : OrderStatus, paymentMethod, paidAt) · `OrderItem` (id, orderId, courseId, priceCents) |
| **Tương tác** | `Review` (id, userId, courseId, rating, content, teacherReply, teacherRepliedAt) · `Question` (id, courseId, userId, content, likeCount, answerCount) · `Answer` (id, questionId, userId, content, isPinned) · `QuestionLike` (userId, questionId) · `ProjectSubmission` (id, courseId, userId, title, description, imageUrl, fileUrl, grade, feedback, gradedAt) · `Notification` (id, userId, type : NotificationType, title, body, data : Json, isRead) |
| **AI** | `AiContent` (id, kind : AiContentKind, refId, lang, content : Json, model, expiresAt) · `AiChatMessage` (id, userId, courseId, role : AiChatRole, content) |
| **Kiểm duyệt (giảng viên – quản trị)** | `CourseRevision` (id, courseId, payload : Json, status : RevisionStatus, submittedAt) · `CourseModeration` (id, courseId, actorId, action : ModerationAction, target : ModerationTarget, reason) |

Kiểu liệt kê (hộp `<<enumeration>>` đặt cạnh lớp dùng chúng): `Role {STUDENT, TEACHER, ADMIN}` · `CourseStatus {DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED}` · `RevisionStatus {OPEN, PENDING_REVIEW, REJECTED}` · `ModerationAction {SUBMITTED, WITHDRAWN, APPROVED, REJECTED, ARCHIVED, RESTORED}` · `ModerationTarget {COURSE, REVISION}` · `OrderStatus {PENDING, PAID, FAILED}` · `NotificationType {ORDER_PAID, NEW_ANSWER, COURSE_COMPLETED, SYSTEM, COURSE_APPROVED, COURSE_REJECTED, NEW_COURSE, PROJECT_GRADED, REVIEW_REPLY}` · `BannerTarget {COURSE, CATEGORY}` · `AiContentKind {COURSE_SUMMARY, LESSON_SUMMARY, RECOMMENDATIONS, QUIZ, COURSE_DRAFT, COURSE_REVIEW}` · `AiChatRole {USER, ASSISTANT}` · `OneTimeCodePurpose {VERIFY_EMAIL, RESET_PASSWORD}` · `AuthEventType` (17 giá trị: REGISTER, EMAIL_VERIFIED, LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_LOCKED, NEW_DEVICE_LOGIN, LOGOUT, SESSION_REVOKED, REFRESH_REUSE, PASSWORD_RESET_REQUESTED, PASSWORD_RESET, PASSWORD_CHANGED, TWO_FACTOR_ENABLED, TWO_FACTOR_DISABLED, TWO_FACTOR_FAILED, RECOVERY_CODE_USED, RECOVERY_CODES_REGENERATED).

**Thao tác hiển thị trong hộp lớp** (là hàm service thật, ghi `+ten(tham số) : Kieu`):
- `User`: `+register()`, `+login()`, `+verifyEmail()`, `+refreshSession()`, `+enableTwoFactor()`, `+disableTwoFactor()`, `+revokeSession()`, `+changePassword()` (module `auth`, `security`).
- `Course`: `+listCourses()`, `+getCourseDetail()`, `+submitCourse()`, `+withdrawCourse()`, `+archiveCourse()`, `+restoreCourse()`, `+approveCourse()`, `+rejectCourse()`.
- `Enrollment`: `+enrollInFreeCourse()`, `+saveProgress()` (tính lại `progressPercent`).
- `Order`: `+checkout()`, `+listOrders()`.
- `Review`: `+upsertMyReview()` (tính lại `ratingAvg`, `ratingCount`). `Question`: `+createQuestion()`, `+createAnswer()`, `+likeQuestion()`. `ProjectSubmission`: `+createSubmission()`, `+gradeSubmission()`.
- `AiContent`: `+getOrCreateAiContent()`. `CourseRevision`: `+putRevision()`, `+submitRevision()`, `+applyRevision()`.

**Quan hệ và bội số** (đường nối, ghi bội số hai đầu; thêm nhãn nếu cần):

| Từ | Đến | Bội số (từ : đến) | Ghi chú |
|---|---|---|---|
| User | TeacherProfile | 1 : 0..1 | giảng viên có hồ sơ; xóa user → xóa hồ sơ |
| TeacherProfile | Course | 1 : 0..* | giảng viên dạy nhiều khóa |
| Category | Course | 1 : 0..* | mỗi khóa đúng một danh mục |
| Course | Tag | 0..* : 0..* | qua lớp kết hợp `CourseTag` |
| Course | Section | 1 : 0..* | thành phần (hình thoi đặc, `onDelete: Cascade`) |
| Section | Lesson | 1 : 0..* | thành phần |
| User | Enrollment | 1 : 0..* | `(userId, courseId)` duy nhất |
| Course | Enrollment | 1 : 0..* | |
| User, Lesson | LessonProgress | 1 : 0..*, 1 : 0..* | khóa chính ghép `(userId, lessonId)` |
| User, Course | Bookmark / CourseLike / CartItem | 1 : 0..* mỗi phía | khóa chính ghép |
| User | Follow | 1 : 0..* ; TeacherProfile 1 : 0..* Follow | khóa chính ghép `(userId, teacherId)` |
| User | Order | 1 : 0..* | |
| Order | OrderItem | 1 : 1..* | thành phần |
| Course | OrderItem | 1 : 0..* | không cascade (giữ lịch sử mua) |
| User, Course | Review | 1 : 0..* mỗi phía | `(userId, courseId)` duy nhất |
| Course | Question | 1 : 0..* ; User 1 : 0..* Question | |
| Question | Answer | 1 : 0..* ; User 1 : 0..* Answer | |
| User, Question | QuestionLike | 1 : 0..* mỗi phía | khóa chính ghép |
| Course | Resource | 1 : 0..* | |
| Course, User | ProjectSubmission | 1 : 0..* mỗi phía | |
| User | Notification | 1 : 0..* | |
| User, Course | AiChatMessage | 1 : 0..* mỗi phía | |
| User | Session | 1 : 0..* | |
| Session | RefreshToken | 1 : 0..* | thành phần |
| User | OneTimeCode / RecoveryCode / AuthEvent | 1 : 0..* mỗi lớp | |
| Course | CourseRevision | 1 : 0..1 | `courseId` duy nhất |
| Course | CourseModeration | 1 : 0..* ; User (actor) 1 : 0..* CourseModeration | |

Không vẽ đường nối cho ba tham chiếu **không có khóa ngoại** (ghi chú gạch đứt): `Enrollment.lastLessonId → Lesson`, `AiContent.refId → Course/Lesson/User`, `Banner.targetId → Course/Category`.

---

## 4. ERD-1/-2.png + DBDIAGRAM-1/-2.png — Sơ đồ thực thể–liên kết (Hình 3.19)

Ký hiệu **crow's foot** (chân chim). Mỗi bảng là hộp có tên bảng + danh sách cột: `PK` (khóa chính), `FK` (khóa ngoại), `UQ` (duy nhất), gạch chân/in đậm cột khóa. Dùng đúng tên bảng Prisma (`"User"`, `"Course"`…). Các bảng và cột như mục 3. Bố cục gợi ý: **hàng giữa** `User` — `Course` — `Enrollment`; phía trên nhóm xác thực (`Session`, `RefreshToken`, `OneTimeCode`, `RecoveryCode`, `AuthEvent`); phía dưới nhóm thương mại (`CartItem`, `Order`, `OrderItem`) và tương tác (`Review`, `Question`, `Answer`, `QuestionLike`, `ProjectSubmission`, `Notification`); bên phải nội dung khóa (`Category`, `Tag`, `CourseTag`, `Section`, `Lesson`, `Resource`, `LessonProgress`); góc dưới phải nhóm `CourseRevision`, `CourseModeration`, `AiContent`, `AiChatMessage`, `Banner`.

**Quan hệ, bội số crow's foot và hành vi xóa** (cột `FK` → bảng cha):

| Bảng con (FK) | Bảng cha | Bội số cha–con | ON DELETE |
|---|---|---|---|
| TeacherProfile.userId (UQ) | User | 1 — 0..1 | CASCADE |
| Course.teacherId | TeacherProfile | 1 — 0..* | RESTRICT (mặc định) |
| Course.categoryId | Category | 1 — 0..* | RESTRICT |
| CourseTag.courseId, CourseTag.tagId (PK ghép) | Course, Tag | n–n | CASCADE cả hai |
| Section.courseId | Course | 1 — 0..* | CASCADE |
| Lesson.sectionId | Section | 1 — 0..* | CASCADE |
| Enrollment.userId, .courseId (UQ ghép) | User, Course | 1 — 0..* mỗi phía | CASCADE |
| LessonProgress.userId, .lessonId (PK ghép) | User, Lesson | 1 — 0..* mỗi phía | CASCADE |
| Bookmark / CourseLike / CartItem (PK ghép userId, courseId) | User, Course | 1 — 0..* mỗi phía | CASCADE |
| Follow.userId, .teacherId (PK ghép) | User, TeacherProfile | 1 — 0..* mỗi phía | CASCADE |
| Order.userId | User | 1 — 0..* | CASCADE |
| OrderItem.orderId | Order | 1 — 1..* | CASCADE |
| OrderItem.courseId | Course | 1 — 0..* | RESTRICT |
| Review.userId, .courseId (UQ ghép) | User, Course | 1 — 0..* mỗi phía | CASCADE |
| Question.courseId, .userId | Course, User | 1 — 0..* | CASCADE |
| Answer.questionId, .userId | Question, User | 1 — 0..* | CASCADE |
| QuestionLike.userId, .questionId (PK ghép) | User, Question | 1 — 0..* | CASCADE |
| Resource.courseId | Course | 1 — 0..* | CASCADE |
| ProjectSubmission.courseId, .userId | Course, User | 1 — 0..* | CASCADE |
| Notification.userId | User | 1 — 0..* | CASCADE |
| AiChatMessage.userId, .courseId | User, Course | 1 — 0..* | CASCADE |
| Session.userId | User | 1 — 0..* | CASCADE |
| RefreshToken.sessionId | Session | 1 — 0..* | CASCADE |
| OneTimeCode / RecoveryCode / AuthEvent .userId | User | 1 — 0..* | CASCADE |
| CourseRevision.courseId (UQ) | Course | 1 — 0..1 | CASCADE |
| CourseModeration.courseId | Course | 1 — 0..* | CASCADE |
| CourseModeration.actorId | User | 1 — 0..* | CASCADE |

**Không có FK** (hộp nét đứt hoặc ghi chú, không vẽ đường): `Enrollment.lastLessonId`, `AiContent.refId`, `Banner.targetId`; bảng `AiContent` và `Banner` đứng riêng.

**Chỉ mục & ràng buộc cần ghi trong hộp** (UQ và IDX): `User.email` UQ, `User` IDX(role); `Category.name` UQ, `slug` UQ; `Tag.name` UQ; `Course` IDX(status), (categoryId), (teacherId), (enrollmentCount), (ratingAvg), (createdAt); `Section` UQ(courseId, order); `Lesson` UQ(sectionId, order); `Enrollment` UQ(userId, courseId), IDX(userId, lastAccessedAt); `Order` IDX(userId, createdAt); `OrderItem` UQ(orderId, courseId); `Review` UQ(userId, courseId), IDX(courseId, rating); `Question` IDX(courseId, createdAt); `Answer` IDX(questionId, createdAt); `ProjectSubmission` IDX(courseId, createdAt); `Notification` IDX(userId, isRead, createdAt); `AiContent` UQ(kind, refId, lang); `AiChatMessage` IDX(userId, courseId, createdAt); `Session` IDX(userId, revokedAt); `RefreshToken` UQ(tokenHash), IDX(sessionId, usedAt); `OneTimeCode` IDX(userId, purpose, createdAt); `RecoveryCode` UQ(userId, codeHash); `AuthEvent` IDX(userId, createdAt), IDX(type, createdAt); `CourseRevision` UQ(courseId); `CourseModeration` IDX(courseId, createdAt), IDX(actorId); `TeacherProfile` UQ(userId).

---

## 5. Các sơ đồ tuần tự SQ-UCxxx (Hình 3.5 – 3.18)

Mỗi hình dưới đây liệt kê **lifeline** và **thông điệp theo thứ tự** (đánh số phân cấp gợi ý). Khung `alt`/`opt`/`loop` ghi điều kiện trong `[ ]`.

### SQ-UC002 — Đăng nhập (Hình 3.5)

Lifeline: Người dùng · `LoginScreen` · `Mobile (authApi + apiClient)` · `API (POST /auth/login)` · `AuthService` · `LockoutService` · `CaptchaVerifier` (ngoài: Google reCAPTCHA) · `SessionService` · `PostgreSQL`.

1. Người dùng nhập email, mật khẩu → `LoginScreen`: kiểm tra zod phía client (email hợp lệ, mật khẩu không rỗng).
 - `alt [dữ liệu không hợp lệ]`: 1.1 hiển thị lỗi dưới từng ô, dừng.
2. `LoginScreen` → `authApi.login({email, password, captchaToken?, deviceName})` → 2.1 `POST /auth/login` (qua `authRateLimiter` 10/phút/IP và `validate(loginBody)`).
3. API → `AuthService.login`: 3.1 `findUnique User(email)` → PostgreSQL → 3.2 trả bản ghi hoặc null.
4. `LockoutService.assertNotLocked`:
 - `alt [lockedUntil còn hiệu lực]`: 4.1 `423 ACCOUNT_LOCKED {retryAfterSec}` + header `Retry-After` → màn hiện đồng hồ đếm ngược. Kết thúc.
5. `opt [failedLoginCount ≥ 3]`: 5.1 `assertCaptcha(captchaToken)` → 5.2 `POST siteverify` (reCAPTCHA) → 5.3 kết quả.
 - `alt [thiếu token]`: `400 CAPTCHA_REQUIRED {captchaRequired:true}`; `[token sai/quá hạn/sai hostname]`: `400 CAPTCHA_FAILED`; `[dịch vụ CAPTCHA không trả lời]`: `503 CAPTCHA_UNAVAILABLE`. Màn hiện widget CAPTCHA.
6. `verifyPassword` (bcrypt.compare; email không tồn tại vẫn so với hash giả).
 - `alt [sai mật khẩu hoặc email lạ]`: 6.1 `registerFailedAttempt` (tăng `failedLoginCount`, ghi `AuthEvent LOGIN_FAILED`); `[lần sai thứ 5]` → khóa 15 phút, ghi `LOGIN_LOCKED`, `423 ACCOUNT_LOCKED`; ngược lại `401 INVALID_CREDENTIALS {captchaRequired}`.
7. `alt [disabledAt ≠ null]`: `403 ACCOUNT_DISABLED`.
8. `alt [emailVerifiedAt = null]`: 8.1 nếu chưa có mã còn hạn → `issueCode(VERIFY_EMAIL)` và gửi mail (Brevo, hàng đợi nền); `403 EMAIL_NOT_VERIFIED {email, resendAfter}` → màn chuyển sang `Xác minh email`.
9. `alt [totpEnabledAt ≠ null]` (đã bật 2FA):
 - 9.1 `200 {twoFactorRequired:true, challengeToken (5 phút)}` → màn `Xác thực hai lớp`; 9.2 `POST /auth/2fa/verify {challengeToken, code | recoveryCode}` (`otpRateLimiter`) → `verifySecondFactor`; `[sai]` → `registerFailedAttempt(TWO_FACTOR_FAILED)` → `400 INVALID_CODE {attemptsLeft}` (lần 5 → khóa); `[đúng]` → tiếp bước 10.
10. `[đúng hết]`: 10.1 `resetFailures`; 10.2 `SessionService.startSession`: `INSERT Session` + `INSERT RefreshToken (tokenHash = SHA-256)`; 10.3 ký access JWT (HS256, 15 phút, claim `sub`, `sid`, `role`); 10.4 ghi `AuthEvent LOGIN_SUCCESS`.
 - `opt [thiết bị chưa từng đăng nhập]`: ghi `NEW_DEVICE_LOGIN`, tạo `Notification (SYSTEM)` và gửi email cảnh báo.
11. `200 {accessToken, refreshToken, accessTokenExpiresIn:900, user}` → `authStore.login`: lưu token vào SecureStore (web: localStorage), `setQueryData(['me'])` → điều hướng vào Tabs.

### SQ-UC005 — Tìm kiếm khóa học (Hình 3.6)

Lifeline: Người dùng · `SearchScreen` · `useSearchKeyword + useCoursesInfinite` · `apiClient` · `API (GET /courses)` · `CourseService` · `PostgreSQL`.

1. Người dùng mở tab Tìm kiếm → `opt [chưa nhập từ khóa]`: 1.1 hiện chủ đề nóng (`GET /tags/hot`, cache persist 24 giờ) và tìm kiếm gần đây (AsyncStorage, tối đa 10).
2. Người dùng gõ từ khóa → `useSearchKeyword` đặt hẹn giờ **debounce 400 ms** (gõ tiếp thì hủy hẹn giờ, chỉ gửi 1 request cho từ khóa cuối).
3. Hết 400 ms → `useCoursesInfinite({q, categoryId?, sort?, ...})` kiểm tra cache `['courses','list',params]` (staleTime 2 phút, không persist).
 - `alt [cache còn mới]`: hiện kết quả ngay. `[cache chưa có/cũ]`: 3.1 `GET /courses?q=&page=1&limit=20` (kèm `Authorization` nếu có).
4. API: `optionalAuth` → `validate(listCoursesQuery)` → `CourseService.listCourses`:
 - 4.1 `splitSearchTerms` (≤ 5 từ), `buildCourseWhere`: `status = PUBLISHED` AND (mỗi từ khớp `title | subtitle | tag.name | teacher.user.fullName`, `contains` không phân biệt hoa thường, escape `%` `_`), lọc danh mục/giá/rating nếu có; 4.2 `count(where)` và `findMany(where, orderBy, skip, take)` song song; 4.3 nếu có token: `getBookmarkedIds` để gắn `isBookmarked`.
 - `alt [section=recommended và không có sort]`: dùng `getRecommendedCourseIds` (BR-12).
5. `200 {data: CourseSummary[], meta:{page,limit,total,totalPages}}`.
6. `loop [người dùng cuộn tới cuối danh sách]`: `fetchNextPage` → `GET /courses?...&page=n+1` (`getNextPageParam` còn trang) → nối vào danh sách, loại trùng id.
7. `alt [total = 0]`: `EmptyState` + gợi ý bỏ bớt bộ lọc. `[lỗi mạng/5xx]`: `ErrorState` + nút Thử lại (retry tối đa 2 lần, 4xx không retry). Khi chạm một khóa → điều hướng `course/[id]`; thêm từ khóa vào lịch sử tìm kiếm khi nhấn Enter.

### SQ-UC008 — Xem chi tiết khóa học (Hình 3.7)

Lifeline: Người dùng · `CourseDetailScreen` · `Hooks (useCourseDetail, curriculum, similar, reviews)` · `apiClient` · `API (course, lesson, review routes)` · `CourseService / LessonService / ReviewService` · `PostgreSQL`.

1. Người dùng chạm một khóa → `CourseDetailScreen` mount → 1.1 `useCourseDetail(id)`: kiểm cache persisted `['course', id]` (staleTime 5 phút).
 - `alt [có cache]`: hiện ngay (stale-while-revalidate), tải nền; `[không có]`: skeleton.
2. `GET /courses/:id` (`optionalAuth`) → `getCourseDetail`: 2.1 `findFirst` với `visibleCourseWhere` (khóa không `PUBLISHED` chỉ trả cho người đã ghi danh/chủ khóa/admin); 2.2 song song: `loadUserCourseState` (5 truy vấn: enrollment, like, follow, cart, bookmark) và `findPreviewLessonId`.
 - `alt [không tồn tại hoặc ẩn với người xem]`: `404 COURSE_NOT_FOUND`.
 - `[hợp lệ]`: `200 CourseDetail {…, enrollment, isInCart, isBookmarked, previewLessonId}`.
3. Song song (tab Nội dung, Đánh giá, Tổng quan): 3.1 `GET /courses/:id/curriculum` → `LessonService.getCurriculum` (trạng thái bài `COMPLETED | IN_PROGRESS | UNLOCKED | LOCKED` theo BR-02); 3.2 `GET /courses/:id/similar` (tối đa 3 khóa cùng danh mục); 3.3 `GET /courses/:id/reviews?rating=` (`meta.summary` điểm trung bình + phân bố sao).
4. Màn hình quyết định nút hành động (BR-17): `alt [đã ghi danh]` "Tiếp tục học"; `[giá 0]` "Đăng ký miễn phí"; `[đã trong giỏ]` "Tới giỏ hàng"; `[còn lại]` "Thêm vào giỏ".
5. `opt [người dùng chạm bài xem thử]`: `GET /lessons/:id` (bài `isPreview` xem được không cần ghi danh) → phát video; bài khóa: `403 NOT_ENROLLED`.
6. `opt [bấm lưu khóa]`: cập nhật lạc quan `isBookmarked` rồi `PUT/DELETE /courses/:id/bookmark`; lỗi thì hoàn tác + toast.

### SQ-UC011 — Quản lý giỏ hàng (Hình 3.8)

Lifeline: Người dùng · `CourseDetailScreen / CartScreen` · `Hooks (useCart, useAddToCart)` · `API (/cart)` · `CartService` · `PostgreSQL`.

1. **Thêm vào giỏ** — Người dùng bấm "Thêm vào giỏ" → `POST /cart/items {courseId}` (`requireAuth`, `validate`).
2. `CartService.addToCart`: 2.1 `findFirst Course (id, status=PUBLISHED)`; `alt [không có]` `404 COURSE_NOT_FOUND`.
3. `alt [teacher.userId = userId]` `422 OWN_COURSE`.
4. Song song: tra `Enrollment (userId, courseId)` và `CartItem (userId, courseId)`.
 - `alt [đã ghi danh]` `409 ALREADY_ENROLLED`; `[priceCents = 0]` `422 FREE_COURSE` (app chuyển sang ghi danh trực tiếp); `[đã trong giỏ]` `409 ALREADY_IN_CART`.
5. `[hợp lệ]`: `INSERT CartItem` (khóa chính ghép chặn trùng khi hai request song song → bắt P2002 → `409 ALREADY_IN_CART`) → `201 {courseId, addedAt}` → invalidate `['cart']`, `['course', id]`; nút đổi thành "Tới giỏ hàng".
6. **Xem giỏ** — mở `CartScreen` → `GET /cart` → `getCart`: `findMany CartItem` (khóa `PUBLISHED`) kèm `CourseSummary`, `totalCents = Σ giá hiện tại` → `200 {items, totalCents}`; `alt [giỏ rỗng]` `EmptyState`.
7. **Xóa** — `DELETE /cart/items/:courseId` → `deleteMany` (idempotent) → `204` → invalidate `['cart']`; tổng tiền cập nhật.

### SQ-UC012 — Thanh toán & ghi danh (Hình 3.9)

Lifeline: Người dùng · `CheckoutScreen` · `useCheckoutFlow / useCheckout` · `API (POST /orders/checkout)` · `OrderService` · `NotifyService` · `PostgreSQL` · `HomeCache`.

1. Người dùng chọn phương thức (`MOCK_CARD` hoặc `MOCK_EWALLET`) → bấm Thanh toán → `POST /orders/checkout {paymentMethod}` (`requireAuth`, `validate`).
2. `OrderService.checkout` mở **một transaction** (`prisma.$transaction`):
 - 2.1 `findMany CartItem` (khóa `PUBLISHED`, kèm giá, `teacher.userId`).
 - `alt [có khóa của chính mình]` `422 OWN_COURSE`.
 - 2.2 lọc bỏ khóa đã ghi danh (mua song song hai thiết bị); `alt [không còn dòng nào]`: xóa giỏ, kết thúc → `422 CART_EMPTY`.
 - 2.3 `INSERT Order (totalCents = Σ giá, paymentMethod)` + `OrderItem[]` với `status` `PAID` (`paidAt = now`) hoặc `FAILED` nếu `simulateFailure` (chỉ ngoài production).
 - `alt [FAILED]`: commit đơn FAILED, giữ nguyên giỏ, **không** ghi danh → `402 PAYMENT_FAILED {orderId}` → màn "Thanh toán thất bại" + nút Thử lại.
 - `[PAID]`: 2.4 `createMany Enrollment (skipDuplicates)`; 2.5 `UPDATE Course SET enrollmentCount = enrollmentCount + 1`; 2.6 `deleteMany CartItem (userId)`; 2.7 `notify(ORDER_PAID_ONE | ORDER_PAID_MANY)` (`INSERT Notification`) — tất cả cùng transaction (một bước lỗi thì rollback hết).
3. Sau commit: `invalidateHomeCache()` (xóa khóa `home:*` của cache server).
4. `201 {order, enrolledCourseIds}` → hook invalidate `['cart']`, `['me','courses']`, `['me','stats']`, `['home']`, `['notifications']`, `['orders']`, `['course', id]`; màn hiện "Thanh toán thành công" → nút "Bắt đầu học" mở `learn/[courseId]`.
5. **Nhánh khóa miễn phí** (`alt [giá 0]`): `POST /courses/:id/enroll` → `enrollInFreeCourse`: `404 COURSE_NOT_FOUND` · `422 OWN_COURSE` · `422 PAID_COURSE` · transaction `INSERT Enrollment` + tăng `enrollmentCount`; trùng (P2002) → `409 ALREADY_ENROLLED`; thành công `201 {courseId, progressPercent:0, lastLessonId:null}`.

### SQ-UC014 — Học bài qua video & lưu tiến độ (Hình 3.10)

Lifeline: Người dùng · `LearningScreen + LessonPlayer` · `LessonProgressTracker` · `progressQueue (AsyncStorage)` · `apiClient` · `API (lesson routes)` · `LessonService` · `PostgreSQL`.

1. Người dùng chọn bài → `GET /lessons/:id` (`requireAuth`) → `LessonService.getLesson`: 1.1 `findUnique Lesson`; `alt [không có]` `404 LESSON_NOT_FOUND`. 1.2 `findUnique Enrollment`; `alt [chưa ghi danh, không phải chủ khóa/admin, bài không `isPreview`]` `403 NOT_ENROLLED` (không lộ `videoUrl`). 1.3 đọc `LessonProgress` + `nextLessonId`; `opt [đã ghi danh]` `UPDATE Enrollment SET lastLessonId, lastAccessedAt`. 1.4 `200 LessonDetail {videoUrl, positionSec, isCompleted, nextLessonId}`.
2. Player tạo `LessonProgressTracker`, seek tới `positionSec` (tự tiếp tục).
3. `loop [mỗi 1 giây, sự kiện timeUpdate]`: `tracker.update(positionSec)`:
 - `alt [≥ 90 % thời lượng, lần đầu]`: đánh dấu hoàn thành và lưu ngay; `[đã đủ 10 giây kể từ lần lưu trước]`: lưu; `[còn lại]`: không làm gì.
4. Lưu: `alt [đang online]` `PUT /lessons/:id/progress {positionSec, isCompleted?}`; `[offline hoặc lỗi mạng/5xx]` ghi `enqueuePendingProgress` (giữ bản mới nhất mỗi bài) và đánh dấu đã lưu.
5. API: `requireAuth` → `validate` → `LessonService.saveProgress`: 5.1 `$transaction`: `SELECT … FOR UPDATE` trên `Enrollment` (`alt [không ghi danh]` `403 NOT_ENROLLED`); 5.2 `upsert LessonProgress` (`positionSec` kẹp trong [0, durationSec]; đã hoàn thành thì không bỏ hoàn thành); 5.3 `opt [bài vừa hoàn thành]`: đếm `done/total`, `progressPercent = round(done/total × 100)`, `UPDATE Enrollment`; `opt [đạt 100 %]` đặt `completedAt` và `notify(COURSE_COMPLETED)`; 5.4 `200 {lessonProgress, courseProgressPercent}`.
6. Thoát màn/đổi bài/app xuống nền: `tracker.flush()`; khi có mạng lại `onlineManager` kích hoạt `flushPendingProgress` gửi hàng đợi (lỗi 403/404 thì bỏ mục; 5xx/mạng thì giữ lại).
7. Hook invalidate curriculum (dấu ✓), `['me','courses']` (%), và khi 100 % thêm `['me','stats']`, `['notifications']`.

### SQ-UC016 — Hỏi đáp (Hình 3.11)

Lifeline: Người dùng · `LearningScreen (tab Q&A) / QuestionDetailScreen` · `Hooks (qa)` · `API (question routes)` · `QuestionService` · `NotifyService` · `PostgreSQL`.

1. Mở tab Q&A → `GET /courses/:id/questions?page=` (`requireAuth`) → `assertQnaAccess`: `alt [chủ khóa]` được vào; `[chưa ghi danh]` `403 NOT_ENROLLED`; `[khóa không tồn tại]` `404 COURSE_NOT_FOUND` → `200 {Question[], meta}` (mới nhất trước, kèm `isLiked`).
2. **Đặt câu hỏi** — nhập nội dung (1–1000 ký tự) → `POST /courses/:id/questions {content}` → `assertEnrolledInCourse` (`403 NOT_ENROLLED`) → `INSERT Question` → `201 QuestionDto` → danh sách làm mới.
3. **Xem chi tiết** — `GET /questions/:id` (404 `QUESTION_NOT_FOUND`) và `GET /questions/:id/answers` (câu trả lời ghim đứng đầu, rồi cũ → mới).
4. **Trả lời** — `POST /questions/:id/answers {content}` → `$transaction`: 4.1 đọc câu hỏi + kiểm quyền (giảng viên của khóa trả lời không cần ghi danh, huy hiệu `isInstructor`); 4.2 `INSERT Answer`; 4.3 `UPDATE Question SET answerCount + 1`; 4.4 `opt [người trả lời ≠ người hỏi]` `notify(NEW_ANSWER)` cho người hỏi → `201 AnswerDto`.
5. **Thích** — `opt`: cập nhật lạc quan `likeCount/isLiked`, `PUT/DELETE /questions/:id/like` (idempotent), lỗi thì hoàn tác.

### SQ-UC017 — Nộp project & tải tài liệu (Hình 3.12)

Lifeline: Người dùng · `SubmitProjectScreen` · `Hooks (useSubmitProject, useSubmissionFiles)` · `API (multipart)` · `Middleware (requireAuth, requireEnrolled, multer)` · `ProjectService` · `PostgreSQL / ổ đĩa uploads`.

1. Mở màn Project → `GET /courses/:id/project` (`requireEnrolled`) → mô tả, danh sách `Resource` (tải tài liệu bằng `expo-file-system`/`expo-sharing`, web: tải trực tiếp), số bài nộp; `GET /courses/:id/submissions` danh sách bài của học viên khác.
2. Người dùng chọn file (pdf/zip/png/jpg/txt ≤ 10 MB) và ảnh bìa (png/jpg) → kiểm tra phía client (loại, dung lượng) → `alt [không hợp lệ]` báo lỗi tại chỗ.
3. `POST /courses/:id/submissions` (multipart `title`, `description?`, `file`, `image?`; có tiến độ upload):
 - 3.1 `requireAuth` → `validate(params)` → `requireEnrolled` (`404 COURSE_NOT_FOUND` / `403 NOT_ENROLLED`) — **trước** multer để người không đủ quyền không ghi được file lên đĩa;
 - 3.2 `multer.diskStorage` (tên ngẫu nhiên, whitelist MIME): `alt [> 10 MB]` `413 FILE_TOO_LARGE`; `[sai loại]` `415 UNSUPPORTED_FILE_TYPE`;
 - 3.3 `validate(submissionBody)`; `alt [thiếu file]` `400 VALIDATION_ERROR`; `alt [ảnh bìa không phải png/jpg]` `415`;
 - 3.4 `ProjectService.createSubmission` → `INSERT ProjectSubmission`;
 - 3.5 `alt [lỗi sau khi multer đã lưu file]` `discardUploadsOnError` xóa file mồ côi.
4. `201 ProjectSubmissionDto` → invalidate `['course', id, 'submissions']`, quay về danh sách.

### SQ-UC022 — Quản lý khóa học của tôi (soạn khóa) (Hình 3.13)

Lifeline: Giảng viên · `CourseWizardScreen / CurriculumScreen` · `Hooks (studio)` · `API (/teacher/*)` · `Middleware (requireAuth, requireRole TEACHER, assertCourseOwner)` · `StudioService` · `PostgreSQL`.

1. **Tạo nháp** — Wizard bước 1 (Ý tưởng): nhập tên, danh mục (tùy chọn dùng AI, xem SQ-UC026) → `POST /teacher/courses {title, categoryId, …}` → `requireAuth` + `requireRole('TEACHER')` (`403 FORBIDDEN` nếu không phải giảng viên) → `createDraftCourse`: `alt [danh mục/tag không tồn tại]` `404 NOT_FOUND`; `INSERT Course (status = DRAFT, thumbnailUrl "", description "")` → `201 StudioCourseDetailDto`.
2. **Sửa thông tin** — bước 2, 3: `PATCH /teacher/courses/:id` (tự lưu khi bấm Tiếp) → `assertCourseOwner` (`404 COURSE_NOT_FOUND` nếu không phải chủ — không lộ sự tồn tại) → `assertStatus`:
 - `alt [PENDING_REVIEW hoặc ARCHIVED]` `422 INVALID_COURSE_STATE`;
 - `[PUBLISHED] và có trường lớn (title, categoryId, tagIds, giá)` `422 REVISION_REQUIRED` (chuyển sang luồng bản sửa đổi, xem SQ-UC024);
 - `[hợp lệ]` `UPDATE Course` → `200`.
3. **Ảnh bìa** — `POST /teacher/uploads/image` (multipart, PNG/JPG ≤ 5 MB, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FILE_TYPE`) → `201 {url}` → gán `thumbnailUrl`.
4. **Chương trình học** — bước 4: `POST /teacher/courses/:id/sections`, `PATCH/DELETE /teacher/sections/:id`, `POST /teacher/sections/:id/lessons`, `PATCH/DELETE /teacher/lessons/:id`, `POST /teacher/courses/:id/reorder` (đổi thứ tự bằng nút lên/xuống): `loop [mỗi thao tác]` → `assertSectionOwner/assertLessonOwner` (`404`), link bài là YouTube → `normalizeYouTubeUrl` (`400 VALIDATION_ERROR` nếu sai), cập nhật `order` an toàn trong một transaction, tính lại `lessonCount`, `totalDurationSec`.
5. **Xóa nháp** — `DELETE /teacher/courses/:id`: `alt [có ghi danh]` `409 COURSE_HAS_ENROLLMENTS`; `[đã từng xuất bản hoặc đang chờ duyệt]` `422 INVALID_COURSE_STATE`; ngược lại `204`.

### SQ-UC024 — Gửi duyệt khóa học (Hình 3.14)

Lifeline: Giảng viên · `CourseWizardScreen (bước Xem lại) / CourseStatusScreen` · `Hooks (studio)` · `API (/teacher/courses/:id/submit)` · `StudioWorkflowService` · `CourseChecklist` · `PostgreSQL`.

1. Bước Xem lại hiển thị checklist (`missing[]` tính phía server trong `StudioCourseDetailDto`); người dùng bấm "Gửi duyệt".
2. **Khóa nháp/bị từ chối** — `POST /teacher/courses/:id/submit` → `requireAuth`+`requireRole(TEACHER)` → `assertCourseOwner` (`404 COURSE_NOT_FOUND`) → `assertStatus([DRAFT, REJECTED])` (`422 INVALID_COURSE_STATE`).
3. `getCourseMissing` (BR-20: tiêu đề 5–120 ký tự, mô tả ≥ 100 ký tự, có ảnh bìa và danh mục, ≥ 1 chương, ≥ 3 bài, mọi bài có link YouTube hợp lệ và thời lượng 1 giây–6 giờ, 1–3 bài xem thử, giá 0 hoặc 99–99 999 cent, giá gốc > giá).
 - `alt [còn thiếu]` `422 COURSE_INCOMPLETE {missing[]}` → màn hiện danh sách mục thiếu, nhấn mục mở đúng bước wizard.
4. `[đủ]`: `$transaction`: `updateMany Course SET status = PENDING_REVIEW, submittedAt WHERE status IN (DRAFT, REJECTED)` (`count = 0` → `422 INVALID_COURSE_STATE`, chặn hai request song song) + `INSERT CourseModeration (SUBMITTED, COURSE)` → `200 StudioCourseDetailDto`.
5. Màn đổi chip trạng thái "Chờ duyệt"; `opt [rút lại]` `POST /teacher/courses/:id/withdraw` (PENDING_REVIEW → DRAFT, ghi `WITHDRAWN`).
6. **Nhánh khóa đã xuất bản** (`alt [status = PUBLISHED]`): `POST /teacher/courses/:id/revision` (tạo `CourseRevision` OPEN từ bản hiện tại, `409 REVISION_EXISTS` nếu đã có) → `PUT /teacher/courses/:id/revision {payload}` (zod `CourseRevisionPayload`; `404 REVISION_NOT_FOUND`) → `POST /teacher/courses/:id/revision/submit` (checklist trên `snapshotFromRevision`, `422 COURSE_INCOMPLETE`) → ghi `SUBMITTED, REVISION`; học viên vẫn thấy bản đang xuất bản.

### SQ-UC026 — AI hỗ trợ soạn khóa học (Hình 3.15)

Lifeline: Giảng viên · `AiDraftScreen (sheet)` · `Hooks (useAiDraft)` · `API (POST /teacher/ai/course-draft)` · `CourseAiService` · `AiContentCache` · `AiQuota` · `AiProvider (gemini | mock)` · `Google Gemini` · `PostgreSQL`.

1. Giảng viên nhập chủ đề (3–200 ký tự), trình độ, ngôn ngữ → `POST /teacher/ai/course-draft {topic, level, lang}` (`requireAuth` + `requireRole(TEACHER)`, `validate`).
2. `createCourseDraft`: 2.1 `listCategories()` (cache server 60 giây) lấy tên danh mục đưa vào prompt.
3. `getOrCreateAiContent(kind = COURSE_DRAFT, refId = hash(topic, level, phiên bản prompt), lang)`: 3.1 `findUnique AiContent` trong PostgreSQL.
 - `alt [có bản cache còn hạn và đúng schema]`: trả luôn (không tốn lượt AI) → bước 8.
 - `[chưa có]`: 3.2 nếu đang có lệnh sinh trùng khóa thì dùng chung (`inflight`).
4. `runAi(userId, 'general')`: `AiQuota.consume` ba tầng (giờ/user, ngày/user, ngày/toàn server): `alt [hết hạn mức]` `429 AI_RATE_LIMITED {retryAfterSec}` + `Retry-After`.
5. `provider.generateJson(schema)` → `GeminiProvider` → gọi `models.generateContent` (JSON mode, `responseJsonSchema`, thời gian tối đa `AI_TIMEOUT_MS`).
 - `alt [model chính quá tải/timeout/429]`: thử `GEMINI_FALLBACK_MODEL` (mỗi model nửa thời gian chờ).
 - `alt [output sai schema]`: thử lại 1 lần (tối đa 2 lần) rồi `bad_output`.
 - `alt [bị bộ lọc an toàn]` `422 AI_BLOCKED`; `[không có key/lỗi/timeout]` `503 AI_UNAVAILABLE`. Mọi lỗi **hoàn lại lượt** quota và **không cache**.
6. `normalizeDraft` cắt về giới hạn DTO, kiểm bằng zod; sai thì coi như model trả sai (503).
7. Lưu `AiContent` (upsert theo `(kind, refId, lang)`).
8. Đối chiếu tên danh mục với danh sách hiện tại → `categoryId | null` → `200 AiCourseDraftDto {subtitle, description, benefits, categoryId, sections[], model, generatedAt}`.
9. Màn hiện gợi ý; giảng viên chọn **áp dụng từng phần** vào form (server không tự ghi vào khóa — BR-29); `alt [lỗi AI]` hiện thông báo thân thiện + nút Thử lại, vẫn soạn tay được.

### SQ-UC028 — Chấm điểm & nhận xét project (Hình 3.16)

Lifeline: Giảng viên · `TeacherSubmissionsScreen` · `Hooks (teaching)` · `API (/teacher/*)` · `TeachingService` · `NotifyService` · `PostgreSQL`.

1. Mở `studio/[id]/submissions` → `GET /teacher/courses/:id/submissions?status=all|graded|ungraded&page=` → `requireRole(TEACHER)` + `assertCourseOwner` (`404 COURSE_NOT_FOUND`) → `200 {TeacherSubmissionDto[], meta.summary}` (mới nhất trước).
2. Giảng viên mở một bài nộp, tải file (`fileUrl`), nhập điểm nguyên 0–100 và nhận xét 1–2000 ký tự (zod client).
3. `PUT /teacher/submissions/:id/grade {grade, feedback}` → `validate(gradeBody)` (`400`) → `TeachingService.gradeSubmission`: 3.1 `findUnique ProjectSubmission` (`alt [không có]` `404 NOT_FOUND`); 3.2 `assertCourseTeacher` (`alt [không phải giảng viên của khóa này]` `403 NOT_COURSE_TEACHER`).
4. `$transaction`: 4.1 `UPDATE ProjectSubmission SET grade, feedback, gradedAt`; 4.2 `notify(PROJECT_GRADED {projectTitle, courseTitle, grade})` cho người nộp (`INSERT Notification`); `opt [chấm lại]` ghi đè và gửi thông báo mới.
5. `200 TeacherSubmissionDto` → cập nhật dòng trong danh sách; học viên thấy điểm + nhận xét ở tab Projects và nhận thông báo.

### SQ-UC032 — Duyệt / từ chối khóa học (Hình 3.17)

Lifeline: Quản trị viên · `AdminCoursesScreen / AdminCourseDetailScreen` · `Hooks (admin)` · `API (/admin/*)` · `AdminModerationService` · `NotifyService + MailQueue` · `Brevo SMTP` · `PostgreSQL`.

1. Mở hàng chờ → `GET /admin/courses?type=course|revision&status=PENDING_REVIEW` → `requireAuth` + `requireRole('ADMIN')` (`403 FORBIDDEN` nếu không phải admin) → `200 {AdminCourseQueueItemDto[], meta.pending}` (FIFO theo `submittedAt`).
2. Chạm một dòng → `GET /admin/courses/:id` → `AdminCourseDetailDto` (nội dung, `diff` cũ/mới nếu là bản sửa đổi, lịch sử duyệt); song song `GET /admin/courses/:id/ai-review` (xem SQ-UC033).
3. `alt [Duyệt]` `POST /admin/courses/:id/approve`:
 - 3.1 `loadForDecision` (`404 COURSE_NOT_FOUND`); `pendingTarget` (`alt [không có gì chờ]` `422 INVALID_COURSE_STATE`); chạy lại checklist BR-20 (`422 COURSE_INCOMPLETE`).
 - 3.2 `$transaction`: `alt [target = COURSE]` `updateMany Course SET status = PUBLISHED WHERE status = PENDING_REVIEW` (chặn hai admin bấm cùng lúc), nếu **lần xuất bản đầu** đặt `publishedAt` và `notifyFollowersOfNewCourse` (`NEW_COURSE` cho mọi follower); `[target = REVISION]` xóa `CourseRevision` và `applyRevision` (cập nhật khóa/chương/bài, tính lại `lessonCount`, `totalDurationSec`); `INSERT CourseModeration (APPROVED)`; `notify(COURSE_APPROVED | REVISION_APPROVED)` cho giảng viên.
 - 3.3 sau commit: `invalidateHomeCache()`; `queueMail(courseDecisionMail)` gửi nền qua Brevo (`opt [lỗi email]` chỉ ghi log, không ảnh hưởng kết quả).
 - 3.4 `200 AdminCourseDetailDto`.
4. `alt [Từ chối]` `POST /admin/courses/:id/reject {reason 5–500}`: transaction `UPDATE Course SET status = REJECTED` (hoặc `CourseRevision.status = REJECTED`) + `INSERT CourseModeration (REJECTED, reason)` + `notify(COURSE_REJECTED, reason)` + email → `200`. Giảng viên thấy lý do, sửa và gửi lại (SQ-UC024).

### SQ-UC033 — Xem AI kiểm duyệt sơ bộ (Hình 3.18)

Lifeline: Quản trị viên · `AdminCourseDetailScreen (panel AI)` · `Hooks (useAiReview)` · `API (GET /admin/courses/:id/ai-review)` · `CourseAiService` · `AiContentCache` · `AiQuota` · `AiProvider` · `Google Gemini` · `PostgreSQL`.

1. Admin mở khóa chờ duyệt → panel AI gọi `GET /admin/courses/:id/ai-review?lang=vi|en` (`requireRole('ADMIN')`; ngôn ngữ mặc định theo `Accept-Language`).
2. `getCourseReview`: `loadReviewMaterial(courseId)`: `alt [không có khóa]` `404 COURSE_NOT_FOUND`; chọn nội dung cần xét: `[có bản sửa đổi đang PENDING_REVIEW]` bản sửa đổi, `[còn lại]` chính khóa (`target = COURSE | REVISION`).
3. `getOrCreateAiContent(kind = COURSE_REVIEW, refId = courseId + ':' + hash(nội dung), lang)`: tra `AiContent`.
 - `alt [cache hit]` (nội dung chưa đổi): trả ngay, không tốn lượt.
 - `[miss]`: `runAi` (quota như SQ-UC026) → `generateJson(courseReviewModelOutput)` → Gemini (model chính → dự phòng) → `normalizeReview` → zod → upsert `AiContent`.
 - `alt` lỗi: `429 AI_RATE_LIMITED`, `422 AI_BLOCKED`, `503 AI_UNAVAILABLE` (hoàn lượt, không cache).
4. `200 AiCourseReviewDto {courseId, target, lang, verdict (LOOKS_OK | NEEDS_ATTENTION), summary, issues[≤ 10: {severity, area, message}], model, generatedAt}` — chỉ mang tính tư vấn.
5. Panel hiển thị nhận định và danh sách vấn đề; `alt [AI lỗi]` hiện lỗi + Thử lại, admin vẫn duyệt/từ chối bình thường (BR-29). Đổi nội dung (giảng viên sửa) → `refId` đổi → lần xem sau sinh lại.

---

## 6. Gợi ý hình cho Chương 4 (không bắt buộc UML)

Chương 4 chủ yếu dùng ảnh chụp màn hình thật (`notes/tools/evidence/figma/shots/`) và đoạn mã; không cần sơ đồ mới. Nếu muốn một hình minh họa, có thể vẽ **sơ đồ luồng cache** (một hàng ngang): `Màn hình → TanStack Query (RAM, staleTime) → AsyncStorage (24 giờ, buster = version) → apiClient → API (cache LRU 60 giây cho /home) → PostgreSQL`, kèm mũi tên "ngoại tuyến: đọc cache, ghi bị chặn; tiến độ video vào hàng đợi AsyncStorage".

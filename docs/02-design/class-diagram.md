# Class diagram (D-03)

> **Tài liệu:** `docs/02-design/class-diagram.md` · **Task:** D-03 · **Owner:** C (Hoàng Ngọc Hải)
> **Nguồn:** [PLAN.md §5](../../PLAN.md) (kiến trúc, cấu trúc thư mục), [§8](../../PLAN.md) (Prisma schema), [§9](../../PLAN.md) (API/DTO). Liên quan: [database.md](database.md) · [api-spec.md](api-spec.md) · [SDS.md](SDS.md).
> Sơ đồ viết bằng Mermaid (`classDiagram`, `flowchart`) — xem trực tiếp trên GitHub/VS Code.

## Mục lục

1. [Class diagram miền (domain)](#1-class-diagram-miền-domain)
2. [Class diagram tầng server](#2-class-diagram-tầng-server)
3. [Sơ đồ module mobile](#3-sơ-đồ-module-mobile)
4. [Ánh xạ giữa các tầng](#4-ánh-xạ-giữa-các-tầng)
5. [Mẫu thiết kế được áp dụng](#5-mẫu-thiết-kế-được-áp-dụng)

---

## 1. Class diagram miền (domain)

### 1.1 Cách đọc

- Mỗi lớp tương ứng **một model Prisma** ([database.md](database.md)); thuộc tính là các cột chính (bỏ bớt `createdAt/updatedAt` và cột phụ để dễ đọc — danh sách đầy đủ ở data dictionary).
- Kiểu `String?` (cột cho phép `NULL`) được ghi là `String` trong sơ đồ vì Mermaid không có ký hiệu nullable; các cột nullable được liệt kê ở database.md.
- Bội số (multiplicity): `1` đúng một · `0..1` không hoặc một · `0..*` không hoặc nhiều · `1..*` một hoặc nhiều.
- Ký hiệu quan hệ: `*--` **composition** (con không tồn tại nếu thiếu cha, xóa cha thì xóa con — `onDelete: Cascade`) · `-->` **association** có hướng (tham chiếu) · `..>` phụ thuộc/dùng.
- Các phương thức ghi trong lớp miền (`badge()`, `statusFor()`…) là **hành vi nghiệp vụ** được hiện thực trong `service`/`mappers.ts`, **không** phải method của model Prisma.
- Do có 24 lớp nên chia 3 sơ đồ theo miền; lớp `User` và `Course` xuất hiện ở nhiều sơ đồ (chỉ ghi lại thuộc tính cần thiết cho ngữ cảnh).

### 1.2 Sơ đồ A — Người dùng, giảng viên, danh mục và nội dung khóa học

```mermaid
classDiagram
  direction LR

  class Role {
    <<enumeration>>
    STUDENT
    TEACHER
    ADMIN
  }
  class BannerTarget {
    <<enumeration>>
    COURSE
    CATEGORY
  }

  class User {
    +String id
    +String email
    -String passwordHash
    +String fullName
    +String headline
    +String avatarUrl
    +String coverUrl
    +Role role
  }
  class TeacherProfile {
    +String id
    +String jobTitle
    +String bio
    +String organization
    +String location
    +String timezone
    +localTime() String
  }
  class Follow {
    +DateTime createdAt
  }
  class Category {
    +String id
    +String name
    +String slug
    +String icon
    +String color
    +Int order
  }
  class Tag {
    +String id
    +String name
    +Boolean isHot
  }
  class CourseTag {
  }
  class Course {
    +String id
    +String title
    +String subtitle
    +String description
    +String thumbnailUrl
    +String bannerUrl
    +Int priceCents
    +Int originalPriceCents
    +List~String~ benefits
    +String projectDescription
    +Boolean isBestSeller
    +Boolean isFeatured
    +Boolean isPublished
    +Float ratingAvg
    +Int ratingCount
    +Int enrollmentCount
    +Int likeCount
    +Int shareCount
    +Int lessonCount
    +Int totalDurationSec
    +badge() String
    +discountPercent() Int
  }
  class Section {
    +String id
    +String title
    +Int order
  }
  class Lesson {
    +String id
    +String title
    +Int order
    +Int durationSec
    +String videoUrl
    +Boolean isPreview
  }
  class Resource {
    +String id
    +String name
    +String fileUrl
    +Int sizeBytes
    +String mimeType
  }
  class Banner {
    +String id
    +String title
    +String subtitle
    +String ctaText
    +String imageUrl
    +String bgColor
    +BannerTarget targetType
    +String targetId
    +Int order
    +Boolean isActive
  }

  User --> Role : role
  User "1" -- "0..1" TeacherProfile : is
  User "1" --> "0..*" Follow : follows
  TeacherProfile "1" --> "0..*" Follow : followed by
  TeacherProfile "1" --> "0..*" Course : teaches
  Category "1" --> "0..*" Course : groups
  Course "1" *-- "0..*" CourseTag : tagged
  Tag "1" *-- "0..*" CourseTag : labels
  Course "1" *-- "1..*" Section : contains
  Section "1" *-- "1..*" Lesson : contains
  Course "1" *-- "0..*" Resource : provides
  Banner --> BannerTarget : targetType
  Banner ..> Course : targets by id
  Banner ..> Category : targets by id
```

**Giải thích**

- `User` và `TeacherProfile` là quan hệ 1–0..1: mọi giảng viên là một `User` có thêm hồ sơ. `Course.teacher` trỏ tới **`TeacherProfile`** (không phải `User`).
- `Follow` và `CourseTag` là *lớp liên kết* của quan hệ n–n, mỗi lớp có khóa chính ghép.
- `Course` → `Section` → `Lesson` là chuỗi **composition** 1–1..*: xóa khóa xóa luôn chương và bài. Một khóa có ít nhất một chương, một chương có ít nhất một bài.
- `Banner` không có khóa ngoại: nó tham chiếu mềm tới `Course` hoặc `Category` theo `targetType` + `targetId` (đường nét đứt).
- `Course.badge()` và `discountPercent()` là quy tắc BR-10; `TeacherProfile.localTime()` là BR-16.

### 1.3 Sơ đồ B — Học tập và thương mại

```mermaid
classDiagram
  direction LR

  class OrderStatus {
    <<enumeration>>
    PENDING
    PAID
    FAILED
  }
  class LessonStatus {
    <<enumeration>>
    COMPLETED
    IN_PROGRESS
    UNLOCKED
    LOCKED
  }

  class User {
    +String id
  }
  class Course {
    +String id
    +Int priceCents
    +Int lessonCount
    +Int enrollmentCount
  }
  class Lesson {
    +String id
    +Int durationSec
    +Boolean isPreview
    +statusFor(user) LessonStatus
  }
  class Enrollment {
    +String id
    +Int progressPercent
    +String lastLessonId
    +DateTime lastAccessedAt
    +DateTime enrolledAt
    +DateTime completedAt
    +recalculateProgress() Int
    +isCompleted() Boolean
  }
  class LessonProgress {
    +Int positionSec
    +Boolean isCompleted
    +DateTime updatedAt
    +reachedThreshold() Boolean
  }
  class Bookmark {
    +DateTime createdAt
  }
  class CourseLike {
    +DateTime createdAt
  }
  class CartItem {
    +DateTime addedAt
  }
  class Order {
    +String id
    +Int totalCents
    +OrderStatus status
    +String paymentMethod
    +DateTime createdAt
    +DateTime paidAt
  }
  class OrderItem {
    +String id
    +Int priceCents
  }

  User "1" --> "0..*" Enrollment : enrolls
  Course "1" --> "0..*" Enrollment : has
  User "1" --> "0..*" LessonProgress : tracks
  Lesson "1" --> "0..*" LessonProgress : tracked by
  Enrollment ..> Lesson : lastLessonId soft ref
  User "1" --> "0..*" Bookmark : saves
  Course "1" --> "0..*" Bookmark : saved in
  User "1" --> "0..*" CourseLike : likes
  Course "1" --> "0..*" CourseLike : liked in
  User "1" --> "0..*" CartItem : adds
  Course "1" --> "0..*" CartItem : in cart
  User "1" --> "0..*" Order : places
  Order "1" *-- "1..*" OrderItem : contains
  Course "1" --> "0..*" OrderItem : sold as
  Order --> OrderStatus : status
  Lesson ..> LessonStatus : computed
```

**Giải thích**

- `Enrollment` là điểm trung tâm của học tập: có nó thì người dùng "sở hữu" khóa (BR-01, BR-06, BR-08, BR-09). `progressPercent` là số liệu denormalize từ `LessonProgress` (BR-04).
- `LessonProgress` là lớp liên kết `User`–`Lesson` (khóa chính ghép). `reachedThreshold()` mô tả quy tắc ≥ 90 % (BR-03).
- `Lesson.statusFor(user)` sinh `LessonStatus` (BR-02) khi dựng curriculum; trạng thái **không được lưu**.
- `Order` gồm các `OrderItem` (composition); `OrderItem.priceCents` lưu giá tại thời điểm mua. Giỏ hàng là tập `CartItem` của một người dùng (không có lớp `Cart`).
- `Enrollment.lastLessonId` chỉ là tham chiếu mềm tới `Lesson` (không có khóa ngoại).

### 1.4 Sơ đồ C — Tương tác cộng đồng và thông báo

```mermaid
classDiagram
  direction LR

  class NotificationType {
    <<enumeration>>
    ORDER_PAID
    NEW_ANSWER
    COURSE_COMPLETED
    SYSTEM
  }

  class User {
    +String id
    +String fullName
    +String avatarUrl
  }
  class Course {
    +String id
    +Float ratingAvg
    +Int ratingCount
  }
  class Review {
    +String id
    +Int rating
    +String content
    +DateTime createdAt
    +DateTime updatedAt
  }
  class Question {
    +String id
    +String content
    +Int likeCount
    +Int answerCount
    +DateTime createdAt
  }
  class Answer {
    +String id
    +String content
    +DateTime createdAt
  }
  class QuestionLike {
    +DateTime createdAt
  }
  class ProjectSubmission {
    +String id
    +String title
    +String description
    +String imageUrl
    +String fileUrl
    +DateTime createdAt
  }
  class Notification {
    +String id
    +NotificationType type
    +String title
    +String body
    +Json data
    +Boolean isRead
    +DateTime createdAt
  }

  User "1" --> "0..*" Review : writes
  Course "1" --> "0..*" Review : receives
  User "1" --> "0..*" Question : asks
  Course "1" --> "0..*" Question : has
  Question "1" *-- "0..*" Answer : has
  User "1" --> "0..*" Answer : replies
  Question "1" *-- "0..*" QuestionLike : has
  User "1" --> "0..*" QuestionLike : likes
  User "1" --> "0..*" ProjectSubmission : submits
  Course "1" --> "0..*" ProjectSubmission : receives
  User "1" --> "0..*" Notification : receives
  Notification --> NotificationType : type
  Review ..> Course : updates ratingAvg
  Answer ..> Notification : creates NEW_ANSWER
```

**Giải thích**

- `Review` bị ràng buộc `(userId, courseId)` duy nhất (BR-08); ghi/sửa review kéo theo cập nhật `Course.ratingAvg/ratingCount` cùng transaction.
- `Question` chứa `Answer` và `QuestionLike` (composition). `answerCount`/`likeCount` denormalize.
- `Answer` được tạo bởi người khác người hỏi thì sinh một `Notification` `NEW_ANSWER` (BR-09). `Notification.data` (JSON) lưu `courseId`/`questionId` để điều hướng.

---

## 2. Class diagram tầng server

### 2.1 Kiến trúc lớp chung (Router → Controller → Service → PrismaClient)

Quy tắc bắt buộc (CLAUDE.md §8): **routes → controller → service → Prisma**; controller chỉ xử lý `req/res`; **chỉ service được dùng Prisma**; không có logic nghiệp vụ trong routes.

```mermaid
classDiagram
  direction TB

  class ExpressApp {
    <<app>>
    +createApp() Express
  }
  class ApiRouter {
    <<router>>
    +mount /api/v1
  }
  class ModuleRouter {
    <<router>>
    +METHOD path middlewares handler
  }
  class Controller {
    <<controller>>
    +handler(req, res, next) void
  }
  class Service {
    <<service>>
    +businessMethod(input) Result
  }
  class PrismaClient {
    <<lib>>
    +model.findMany()
    +model.upsert()
    +transaction(fn) Result
  }
  class Mappers {
    <<lib>>
    +toCourseSummary(course, viewer) CourseSummary
    +toTeacherSummary(teacher) TeacherSummary
    +toAbsoluteUrl(path) String
  }
  class LruCache {
    <<lib>>
    +get(key) Value
    +set(key, value, ttlMs) void
    +del(key) void
    +delByPrefix(prefix) void
  }
  class ApiError {
    <<lib>>
    +Int status
    +String code
    +String message
    +Object details
  }

  ExpressApp --> ApiRouter : uses
  ApiRouter --> ModuleRouter : mounts
  ModuleRouter --> Controller : calls
  Controller --> Service : calls
  Service --> PrismaClient : queries
  Service ..> Mappers : maps to DTO
  Service ..> LruCache : caches
  Service ..> ApiError : throws
  Controller ..> ApiError : forwards via next
```

### 2.2 Middleware và tiện ích dùng chung

```mermaid
classDiagram
  direction LR

  class Error {
    <<builtin>>
    +String message
  }
  class ApiError {
    +Int status
    +String code
    +Object details
    +badRequest(details) ApiError
    +unauthorized() ApiError
    +forbidden(code) ApiError
    +notFound(code) ApiError
    +conflict(code) ApiError
    +unprocessable(code) ApiError
  }
  class RequireAuth {
    <<middleware>>
    +handle(req, res, next) void
  }
  class OptionalAuth {
    <<middleware>>
    +handle(req, res, next) void
  }
  class RequireEnrolled {
    <<middleware>>
    +handle(req, res, next) void
  }
  class Validate {
    <<middleware>>
    +validate(schema) RequestHandler
  }
  class Upload {
    <<middleware>>
    +single(field, rules) RequestHandler
    +fields(rules) RequestHandler
  }
  class RateLimit {
    <<middleware>>
    +authLimiter 10 per minute
    +appliesTo POST login and POST register
  }
  class NotFound {
    <<middleware>>
    +handle(req, res, next) void
  }
  class ErrorHandler {
    <<middleware>>
    +handle(err, req, res, next) void
  }
  class Jwt {
    <<lib>>
    +sign(payload) String
    +verify(token) JwtPayload
  }
  class Password {
    <<lib>>
    +hash(plain) String
    +compare(plain, hash) Boolean
  }
  class Pagination {
    <<lib>>
    +paginationQuery ZodSchema
    +toSkipTake(page, limit) SkipTake
    +buildMeta(page, limit, total) PaginationMeta
  }
  class Logger {
    <<lib>>
    +info(obj, msg) void
    +error(obj, msg) void
  }
  class Env {
    <<lib>>
    +NODE_ENV String
    +PORT Int
    +DATABASE_URL String
    +JWT_SECRET String
    +JWT_EXPIRES_IN String
    +CORS_ORIGIN String
    +PUBLIC_BASE_URL String
    +UPLOAD_DIR String
  }

  Error <|-- ApiError
  RequireAuth ..> Jwt : verify
  OptionalAuth ..> Jwt : verify
  RequireAuth ..> ApiError : throws 401
  OptionalAuth ..> ApiError : throws 401 on bad token
  RequireEnrolled ..> ApiError : throws 403 NOT_ENROLLED
  Validate ..> ApiError : throws 400
  Upload ..> ApiError : throws 413 or 415
  ErrorHandler ..> ApiError : maps to JSON
  ErrorHandler ..> Logger : logs 5xx
  NotFound ..> ApiError : creates NOT_FOUND
  Jwt ..> Env : JWT_SECRET
  Upload ..> Env : UPLOAD_DIR
```

**Giải thích và thứ tự middleware (trong `app.ts`)**

`helmet` → `cors` → `compression` → `pino-http` → `express.json({ limit: '100kb' })` → static (`/static`, `/uploads`) → `/api/v1` (từng route: `rateLimit` **chỉ** ở `POST /auth/login` và `POST /auth/register` → `optionalAuth`/`requireAuth` → `requireEnrolled` → `upload` → `validate(schema)` → controller) → `notFound` → `errorHandler` (luôn cuối cùng).

- `ApiError` kế thừa `Error`, mang `status` + `code` + `details`; mọi lỗi nghiệp vụ được **ném** (`throw`) từ service/middleware và `errorHandler` biến thành `{ error: { code, message, details } }`.
- `ErrorHandler` xử lý 4 nhóm: `ApiError` (dùng nguyên), `ZodError` (→ 400 `VALIDATION_ERROR`), `MulterError` (→ 413/415), lỗi body-parser (JSON hỏng → 400, quá lớn → 413), còn lại → `500 INTERNAL_ERROR` (log đầy đủ, không trả stack).
- `RequireEnrolled` là middleware dùng cho `✓E` (mọi endpoint Q&A và Project, `PUT /lessons/:id/progress`, `PUT /courses/:id/reviews/me`): đọc `courseId` từ param, hoặc suy ra từ `lessonId`/`questionId` (tra CSDL, không tin dữ liệu client), rồi kiểm tra `Enrollment`; dùng chung logic với `EnrollmentService.assertEnrolled`. Đối tượng không tồn tại → 404 trước, chưa ghi danh → `403 NOT_ENROLLED`.

### 2.3 Module Auth (chuỗi đầy đủ Router → Controller → Service → Prisma)

```mermaid
classDiagram
  direction LR

  class AuthRouter {
    <<router>>
    +POST /auth/register
    +POST /auth/login
    +GET /auth/me
  }
  class AuthController {
    <<controller>>
    +register(req, res) void
    +login(req, res) void
    +me(req, res) void
  }
  class AuthSchema {
    <<schema>>
    +registerSchema ZodSchema
    +loginSchema ZodSchema
  }
  class AuthService {
    <<service>>
    +register(input) AuthResult
    +login(input) AuthResult
    +getMe(userId) UserDto
  }
  class AuthResult {
    +String token
    +UserDto user
  }
  class PrismaClient {
    +user.findUnique()
    +user.create()
  }
  class Jwt {
    +sign(payload) String
  }
  class Password {
    +hash(plain) String
    +compare(plain, hash) Boolean
  }
  class ApiError {
    +status
    +code
  }

  AuthRouter --> AuthSchema : validate
  AuthRouter --> AuthController : handlers
  AuthController --> AuthService : calls
  AuthService --> PrismaClient : queries
  AuthService ..> Jwt : sign token
  AuthService ..> Password : hash and compare
  AuthService ..> ApiError : EMAIL_TAKEN or INVALID_CREDENTIALS
  AuthService --> AuthResult : returns
```

### 2.4 Các service nghiệp vụ chính

```mermaid
classDiagram
  direction LR

  class CourseService {
    <<course>>
    +list(query, viewer) Page~CourseSummary~
    +getDetail(id, viewer) CourseDetail
    +similar(id, viewer) List~CourseSummary~
    +like(userId, courseId) LikeResult
    +unlike(userId, courseId) LikeResult
    +share(courseId) ShareResult
  }
  class HomeService {
    <<home>>
    +getHome(viewer) HomeResponse
  }
  class BookmarkService {
    <<bookmark>>
    +add(userId, courseId) void
    +remove(userId, courseId) void
    +listMine(userId, page) Page~CourseSummary~
  }
  class CartService {
    <<cart>>
    +get(userId) CartDto
    +add(userId, courseId) CartDto
    +remove(userId, courseId) void
  }
  class OrderService {
    <<order>>
    +checkout(userId, input) CheckoutResult
    +enrollFree(userId, courseId) EnrollmentDto
    +listMine(userId, page) Page~OrderDto~
  }
  class EnrollmentService {
    <<enrollment>>
    +listMine(userId, status) List~MyCourseItem~
    +isEnrolled(userId, courseId) Boolean
    +assertEnrolled(userId, courseId) void
  }
  class LessonService {
    <<lesson>>
    +getCurriculum(courseId, viewer) List~CurriculumSection~
    +getLesson(userId, lessonId) LessonDetail
    +saveProgress(userId, lessonId, input) ProgressResult
  }
  class ReviewService {
    <<review>>
    +list(courseId, query) Page~ReviewDto~
    +getMine(userId, courseId) ReviewDto
    +upsertMine(userId, courseId, input) ReviewDto
  }
  class QuestionService {
    <<question>>
    +list(courseId, userId, page) Page~QuestionDto~
    +create(userId, courseId, content) QuestionDto
    +get(userId, id) QuestionDto
    +listAnswers(id, page) Page~AnswerDto~
    +answer(userId, id, content) AnswerDto
    +like(userId, id) LikeResult
    +unlike(userId, id) LikeResult
  }
  class ProjectService {
    <<project>>
    +getProject(courseId) ProjectDto
    +listSubmissions(courseId, page) Page~ProjectSubmissionDto~
    +submit(userId, courseId, input, files) ProjectSubmissionDto
  }
  class TeacherService {
    <<teacher>>
    +list(page) Page~TeacherSummary~
    +getDetail(id, viewer) TeacherDetail
    +coursesByCategory(id, viewer) List~TeacherCourseGroup~
    +reviews(id, page) Page~ReviewDto~
    +follow(userId, id) FollowResult
    +unfollow(userId, id) FollowResult
  }
  class UserService {
    <<user>>
    +getStats(userId) MeStatsDto
    +updateProfile(userId, input) UserDto
    +updateAvatar(userId, file) String
  }
  class NotificationService {
    <<notification>>
    +notify(tx, userId, type, payload) void
    +unreadCount(userId) Int
    +list(userId, page) NotificationPage
    +markRead(userId, id) void
    +markAllRead(userId) void
  }
  class LruCache {
    <<lib>>
    +get(key) Value
    +del(key) void
  }
  class PrismaClient {
    <<lib>>
    +transaction(fn) Result
  }

  HomeService --> CourseService : reuses mappers
  CartService ..> EnrollmentService : isEnrolled
  OrderService ..> CartService : reads cart
  OrderService ..> NotificationService : ORDER_PAID
  OrderService ..> LruCache : invalidate home
  LessonService ..> EnrollmentService : assertEnrolled
  LessonService ..> NotificationService : COURSE_COMPLETED
  ReviewService ..> EnrollmentService : assertEnrolled
  ReviewService ..> LruCache : invalidate home
  QuestionService ..> EnrollmentService : assertEnrolled
  QuestionService ..> NotificationService : NEW_ANSWER
  ProjectService ..> EnrollmentService : assertEnrolled
  CourseService --> PrismaClient
  HomeService --> PrismaClient
  BookmarkService --> PrismaClient
  CartService --> PrismaClient
  OrderService --> PrismaClient
  EnrollmentService --> PrismaClient
  LessonService --> PrismaClient
  ReviewService --> PrismaClient
  QuestionService --> PrismaClient
  ProjectService --> PrismaClient
  TeacherService --> PrismaClient
  UserService --> PrismaClient
  NotificationService --> PrismaClient
```

**Giải thích**

- **Mỗi service** đứng sau một controller cùng module (`<module>.routes.ts → .controller.ts → .service.ts + .schema.ts`, đúng CLAUDE.md §4); sơ đồ 2.3 là mẫu đầy đủ, các module khác lặp lại cấu trúc đó nên chỉ vẽ tầng service để tránh rườm rà.
- `EnrollmentService.assertEnrolled` là **điểm kiểm tra quyền duy nhất** (BR-01/08/09, NFR-06) — mọi service cần "đã ghi danh" đều gọi nó (hoặc middleware `RequireEnrolled` gọi nó).
- `NotificationService.notify(tx, …)` nhận `tx` (transaction client) để việc tạo thông báo nằm **cùng transaction** với thao tác gốc (`OrderService.checkout`, `LessonService.saveProgress`, `QuestionService.answer`).
- `OrderService.checkout` là transaction lớn nhất: tạo `Order`/`OrderItem`, `Enrollment`, tăng `enrollmentCount`, xóa `CartItem`, tạo thông báo; sau commit mới xóa cache. Nhánh `simulateFailure` chỉ lưu `Order` trạng thái `FAILED` rồi ném `ApiError 402 PAYMENT_FAILED` (giỏ giữ nguyên, không ghi danh).
- `NotificationService.unreadCount` phục vụ `GET /notifications/unread-count` (badge chuông) và `meta.unreadCount` của danh sách.
- `Page~T~` là kiểu `{ items: T[]; meta: PaginationMeta }` mà service trả cho controller; controller gói thành `{ data, meta }`.
- Phụ thuộc giữa các service được hạn chế ở chiều "đọc/kiểm tra quyền" (mũi tên nét đứt) để tránh vòng tròn.

---

## 3. Sơ đồ module mobile

### 3.1 Phân tầng mobile

Luồng dữ liệu bắt buộc (CLAUDE.md §7): **route mỏng → screen → hook → `api.ts` → `apiClient`**. Component **không** gọi axios trực tiếp; server state chỉ ở TanStack Query; Zustand chỉ giữ client state.

```mermaid
flowchart TB
  subgraph R["app/ - Expo Router (route mỏng)"]
    routes["_layout, index, (auth), (tabs), course/[id], learn/[courseId], ..."]
  end

  subgraph F["src/features/{feature}"]
    direction TB
    screens["screens/ (XxxScreen)"]
    comps["components/ (thành phần riêng của feature)"]
    hooks["hooks.ts (useQuery, useMutation)"]
    api["api.ts (hàm gọi HTTP có kiểu)"]
    types["types.ts"]
    screens --> comps
    screens --> hooks
    comps --> hooks
    hooks --> api
    api --> types
  end

  subgraph UI["src/components/ui - UI kit dùng chung"]
    ui["AppText, Button, TextField, Chip, Badge, SegmentedTabs, Skeleton, EmptyState, ErrorState, Avatar, ProgressBar, Toast, OfflineBanner, ScreenHeader, ..."]
  end

  subgraph L["src/lib"]
    apiClient["apiClient.ts (axios, interceptors, AppError)"]
    queryClient["queryClient.ts + persister.ts"]
    queryKeys["queryKeys.ts (factory)"]
    secure["secureStorage.ts"]
  end

  subgraph S["src/stores (Zustand)"]
    auth["authStore.ts (token, user, status)"]
    filter["searchFilterStore.ts"]
  end

  subgraph T["src/theme + constants + utils + types"]
    theme["theme: colors, typography, spacing, radius, shadows"]
    consts["constants: strings, config"]
    utils["utils: formatPrice, formatDuration, ..."]
    dto["types/api.ts (DTO khớp api-spec.md)"]
  end

  routes --> screens
  screens --> ui
  comps --> ui
  ui --> theme
  screens --> theme
  hooks --> queryKeys
  hooks --> queryClient
  api --> apiClient
  api --> dto
  apiClient --> secure
  apiClient --> auth
  auth --> secure
  screens --> auth
  screens --> filter
  screens --> utils
  screens --> consts
  apiClient -->|HTTPS REST JSON| server[("Express API /api/v1")]
```

**Giải thích**

- **`app/`** chỉ chứa route: lấy `useLocalSearchParams()` rồi render `<XxxScreen />` (file route dùng `default export`; mọi nơi khác dùng named export).
- **`features/<feature>/`** gói gọn một tính năng: `api.ts` (hàm thuần trả `Promise<Dto>`), `hooks.ts` (bọc TanStack Query, dùng key từ `queryKeys.ts`), `components/` (thành phần riêng), `screens/`, `types.ts`, và test cạnh file nguồn.
- **`lib/apiClient.ts`** là instance axios duy nhất: gắn `Authorization` từ `authStore`, chuẩn hóa lỗi thành `AppError`, 401 → gọi `authStore.logout()`.
- **`stores/authStore.ts`** giữ `token`, `user`, `status` (`loading | authenticated | unauthenticated`); token lưu ở SecureStore. **Không** copy dữ liệu API vào Zustand.
- **`theme/`** là nguồn duy nhất của màu/chữ/khoảng cách; UI kit và màn hình chỉ đọc từ đây.

### 3.2 Các feature và phụ thuộc chéo

```mermaid
flowchart LR
  subgraph Features["src/features"]
    auth["auth"]
    home["home"]
    search["search"]
    category["category"]
    course["course"]
    cart["cart"]
    my["my-courses"]
    learning["learning"]
    qa["qa"]
    project["project"]
    review["review"]
    teacher["teacher"]
    profile["profile"]
    notification["notification"]
  end

  home --> course
  home --> teacher
  home --> category
  search --> course
  search --> category
  category --> course
  course --> learning
  course --> review
  course --> teacher
  course --> cart
  cart --> my
  my --> learning
  learning --> qa
  learning --> project
  profile --> course
  profile --> my
  teacher --> course
  teacher --> review
  notification --> qa
  notification --> course
  auth -.->|authStore| stores[("stores/authStore")]
```

Ý nghĩa mũi tên: `A --> B` nghĩa là màn hình/component của A **dùng component hoặc hook** của B (không gọi ngược lại).

| Feature | Owner | Thành phần tái dùng cho feature khác |
|---|---|---|
| `course` | B (khung, Overview) | `CourseCardVertical`, `CourseCardHorizontal`, `PriceTag`, `useCourseDetail` — dùng ở Home, Search, Profile, Teacher |
| `learning` | C | `CurriculumList` (`SectionAccordion` + `LessonRow`) — nhúng vào tab Lessons của SC-09 (course) và SC-15 |
| `review` | C | `ReviewCard`, `ReviewSummary` — nhúng vào tab Review của SC-09 và tab Review của SC-18 (teacher) |
| `my-courses` | C | `CourseProgressCard`; hook bookmark `useToggleBookmark` + `BookmarkButton` (C) dùng ở mọi card |
| `project` | B | Tab Projects trong SC-15 (`ProjectCard`, `UploadBox`, `ResourceItem`) |
| `qa` | C | Tab Q&A trong SC-15, SC-16 (`QuestionCard`, `Composer`) |
| `teacher` | A | `TeacherCard` (dùng ở Home, SC-19) |
| `notification` | A | Badge chuông ở Home |
| `profile` | B (SC-20) · A (SC-21 Edit profile) | — |

### 3.3 Lớp lõi của mobile

```mermaid
classDiagram
  direction LR

  class AppError {
    +String code
    +Int status
    +String message
    +Object details
    +isNetworkError() Boolean
    +isUnauthorized() Boolean
    +fieldErrors() Map
  }
  class ApiClient {
    <<lib>>
    +axiosInstance
    +get(url, config) Response
    +post(url, body, config) Response
    +put(url, body, config) Response
    +patch(url, body, config) Response
    +delete(url, config) Response
    -attachToken(config) config
    -normalizeError(err) AppError
  }
  class AuthStore {
    <<store>>
    +String token
    +UserDto user
    +String status
    +bootstrap() void
    +login(token, user) void
    +logout() void
    +setUser(user) void
  }
  class SecureStorage {
    <<lib>>
    +getToken() String
    +setToken(token) void
    +clearToken() void
  }
  class QueryClientProvider {
    <<lib>>
    +queryClient
    +persister
    +buster String
    +maxAge 24h
  }
  class QueryKeys {
    <<lib>>
    +me() Key
    +home() Key
    +course(id) Key
    +courseCurriculum(id) Key
    +coursesList(params) Key
    +cart() Key
  }
  class FeatureApi {
    <<api>>
    +fetchX(params) Dto
    +mutateX(input) Dto
  }
  class FeatureHooks {
    <<hooks>>
    +useX(params) QueryResult
    +useMutateX() MutationResult
  }
  class Screen {
    <<screen>>
    +render() ReactNode
  }
  class NetInfoBridge {
    <<lib>>
    +onlineManager.setEventListener()
    +isOffline() Boolean
  }
  class ProgressSyncQueue {
    <<queue>>
    +enqueue(lessonId, positionSec, isCompleted) void
    +flush() void
    -latestByLesson Map
  }
  class AsyncStorage {
    <<storage>>
    +getItem(key) String
    +setItem(key, value) void
  }

  Screen --> FeatureHooks : uses
  FeatureHooks --> FeatureApi : queryFn or mutationFn
  FeatureHooks ..> QueryKeys : keys
  FeatureHooks ..> QueryClientProvider : cache
  FeatureApi --> ApiClient : http
  ApiClient ..> AuthStore : reads token and logout on 401
  ApiClient ..> AppError : throws
  AuthStore --> SecureStorage : persist token
  QueryClientProvider ..> NetInfoBridge : online state
  Screen ..> AuthStore : session
  FeatureHooks ..> ProgressSyncQueue : offline progress only
  ProgressSyncQueue --> AsyncStorage : persist latest per lesson
  ProgressSyncQueue ..> NetInfoBridge : flush when online
  ProgressSyncQueue --> FeatureApi : PUT progress
```

**Giải thích**

- `ApiClient.normalizeError` chuyển mọi lỗi (mạng, timeout, phản hồi `{error}`) thành `AppError` với `code` ổn định; các hook/screen rẽ nhánh theo `code`, không theo chuỗi message.
- `AuthStore.bootstrap()` chạy ở SC-01: đọc token → `GET /auth/me` → đặt `status`; `logout()` xóa token + `queryClient.clear()` + persisted cache (FR-03).
- `QueryKeys` là *factory* tập trung — không viết mảng key rải rác (CLAUDE.md §7); bảng key/`staleTime` đầy đủ ở [SDS §4.5](SDS.md#45-state-và-cache).
- `NetInfoBridge` nối `@react-native-community/netinfo` với `onlineManager` của TanStack Query: offline thì query tạm dừng và mutation ghi bị chặn kèm toast "You're offline".
- `ProgressSyncQueue` là **ngoại lệ có chủ đích** của việc chặn ghi khi offline (FR-24, NFR-10): chỉ riêng tiến độ video được giữ tạm trong AsyncStorage (bản mới nhất mỗi bài) và tự gửi lại `PUT /lessons/:id/progress` khi có mạng; mọi mutation khác vẫn bị chặn.

---

## 4. Ánh xạ giữa các tầng

| Khái niệm | Domain (Prisma model) | Server (service) | DTO (API) | Mobile (feature) |
|---|---|---|---|---|
| Người dùng | `User` | `AuthService`, `UserService` | `UserDto`, `MeStatsDto` | `auth`, `profile` |
| Giảng viên | `TeacherProfile`, `Follow` | `TeacherService` | `TeacherSummary`, `TeacherDetail`, `TeacherCourseGroup` | `teacher` |
| Danh mục / thẻ | `Category`, `Tag`, `CourseTag` | `CourseService`, `HomeService` | `CategoryDto`, `TagDto` | `category`, `search` |
| Khóa học | `Course`, `Section`, `Lesson`, `Resource` | `CourseService`, `LessonService` | `CourseSummary`, `CourseDetail`, `CurriculumSection` | `course`, `home` |
| Ghi danh / tiến độ | `Enrollment`, `LessonProgress` | `EnrollmentService`, `LessonService` | `MyCourseItem`, `LessonDetail`, `EnrollmentDto`, `LessonProgressDto` | `my-courses`, `learning` |
| Lưu / thích | `Bookmark`, `CourseLike` | `BookmarkService`, `CourseService` | (204 / `{ likeCount, isLiked }`) | `useToggleBookmark` |
| Giỏ / đơn | `CartItem`, `Order`, `OrderItem` | `CartService`, `OrderService` | `CartDto`, `OrderDto` | `cart` |
| Đánh giá | `Review` | `ReviewService` | `ReviewDto`, `ReviewSummaryDto` | `review` |
| Hỏi đáp | `Question`, `Answer`, `QuestionLike` | `QuestionService` | `QuestionDto`, `AnswerDto` | `qa` |
| Project | `ProjectSubmission`, `Resource` | `ProjectService` | `ProjectSubmissionDto`, `ResourceDto` | `project` |
| Thông báo | `Notification` | `NotificationService` | `NotificationDto` | `notification` |
| Banner | `Banner` | `HomeService` | `BannerDto` | `home` |

---

## 5. Mẫu thiết kế được áp dụng

| Mẫu | Vị trí | Mục đích |
|---|---|---|
| **Layered architecture** | Server: router → controller → service → Prisma; mobile: screen → hook → api → apiClient | Tách trách nhiệm, dễ test (mock tầng dưới) |
| **Feature module** | `server/src/modules/*`, `mobile/src/features/*` | Gói gọn theo tính năng, giảm xung đột merge giữa 3 thành viên |
| **DTO + Mapper** | `lib/mappers.ts` (`toCourseSummary`, `toTeacherSummary`, `toAbsoluteUrl`) | Không lộ hình dạng DB, quy tắc BR-10 ở một nơi |
| **Singleton** | `lib/prisma.ts`, `lib/cache.ts`, `apiClient`, `queryClient` | Một instance dùng chung |
| **Facade** | `apiClient`, `AuthService` | Che giấu chi tiết axios/JWT/bcrypt sau giao diện đơn giản |
| **Middleware chain (Chain of Responsibility)** | Express middlewares | `auth → enrolled → upload → validate → controller` |
| **Centralized error handling** | `ApiError` + `errorHandler`; `AppError` ở mobile | Một định dạng lỗi thống nhất toàn hệ thống |
| **Unit of Work** | `prisma.$transaction` | Checkout, tiến độ, review — nguyên tử (NFR-10) |
| **Cache-aside** | `LruCache` cho `/home`, `/categories`, `/tags/hot`; TanStack Query ở client | Giảm truy vấn DB và độ trễ |
| **Observer** | Zustand store, TanStack Query subscribe | UI phản ứng khi state/cache đổi |
| **Optimistic update + rollback** | `useToggleBookmark`, like, follow | Phản hồi tức thì, quay lui khi lỗi |
| **Factory** | `queryKeys.ts`; factories dữ liệu ở `server/tests/helpers/factories.ts` | Khóa cache nhất quán; dữ liệu test dễ dựng |

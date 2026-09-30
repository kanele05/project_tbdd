# Sequence diagrams (D-04)

> **Tài liệu:** `docs/02-design/sequence-diagrams.md` · **Task:** D-04 · **Owner:** C (Hoàng Ngọc Hải)
> **Nguồn:** [PLAN.md §7.3](../../PLAN.md) (đặc tả màn hình), [§6.5](../../PLAN.md) (business rules), [§9](../../PLAN.md) (API), [§10](../../PLAN.md) (cache). Liên quan: [api-spec.md](api-spec.md) · [class-diagram.md](class-diagram.md) · [SDS.md](SDS.md).

## Mục lục

0. [Cách đọc và quy ước](#0-cách-đọc-và-quy-ước)
1. [Đăng nhập và bootstrap tự đăng nhập lại](#1-đăng-nhập-và-bootstrap-tự-đăng-nhập-lại) (1a, 1b)
2. [Tìm kiếm có debounce và cache](#2-tìm-kiếm-có-debounce-và-cache)
3. [Add to cart và Checkout](#3-add-to-cart-và-checkout) (3a, 3b)
4. [Học video: resume, lưu tiến độ, hoàn thành](#4-học-video-resume-lưu-tiến-độ-hoàn-thành)
5. [Đặt câu hỏi Q&A và trả lời sinh thông báo](#5-đặt-câu-hỏi-qa-và-trả-lời-sinh-thông-báo) (5a, 5b)
6. [Bookmark với optimistic update và rollback](#6-bookmark-với-optimistic-update-và-rollback)
7. [Bảng truy vết](#7-bảng-truy-vết)

---

## 0. Cách đọc và quy ước

Tài liệu có **6 luồng nghiệp vụ, gồm 9 sơ đồ tuần tự** (1a, 1b, 2, 3a, 3b, 4, 5a, 5b, 6). Năm luồng đầu (1 đến 5) là 5 luồng bắt buộc của PLAN §12; luồng 6 bổ sung vì là điểm nhấn "Nội dung đặc biệt" (optimistic UI).

**Người tham gia (participants) dùng chung**

| Ký hiệu | Thành phần | Ghi chú |
|---|---|---|
| `U` | User | Người dùng cầm điện thoại |
| `S` | Screen | Màn hình React Native (`features/<x>/screens`), gồm component con |
| `H` | Hook | `features/<x>/hooks.ts` — `useQuery` / `useMutation` / `useInfiniteQuery` của TanStack Query |
| `A` | apiClient | `lib/apiClient.ts` — axios, gắn token, chuẩn hóa lỗi thành `AppError` |
| `X` | Express | Chuỗi middleware (`rateLimit`, `optionalAuth`/`requireAuth`, `requireEnrolled`, `upload`, `validate`) + controller |
| `V` | Service | `modules/<x>/<x>.service.ts` — quy tắc nghiệp vụ |
| `D` | Prisma / DB | `PrismaClient` → PostgreSQL |

Một số sơ đồ thêm: `T` (AuthStore — Zustand + SecureStore), `Q` (Query cache — bộ nhớ + AsyncStorage), `P` (Player `expo-video`), `N` (NotificationService), `C` (cache in-memory của server).

**Quy ước**

- `autonumber` đánh số bước để tham chiếu khi review.
- `alt / else` = rẽ nhánh loại trừ (thành công/lỗi); `opt` = bước tùy chọn; `loop` = lặp; `par` = song song; khung màu nhạt = một giai đoạn.
- Mọi lỗi đi ngược: Service `throw ApiError` → `errorHandler` → JSON `{ error: { code, message, details } }` → `apiClient` chuẩn hóa thành `AppError` → hook `onError` → Screen hiển thị (skeleton/ErrorState/toast/lỗi dưới field).
- Tên endpoint/body/mã lỗi khớp [api-spec.md](api-spec.md); query key khớp PLAN §10 (`queryKeys.ts`).

---

## 1. Đăng nhập và bootstrap tự đăng nhập lại

**Liên quan:** FR-01, FR-02, FR-03 · UC-01, UC-02 · SC-01, SC-02 · NFR-05 · ADR-07 (JWT 7 ngày, SecureStore).

### 1a. Bootstrap khi mở app (SC-01)

Splash được giữ cho đến khi load xong font, đọc token và restore cache đã persist. Có token thì xác thực bằng `GET /auth/me`; mạng lỗi mà đã có user trong cache thì vào app ở chế độ offline.

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as Screen (RootLayout)
  participant T as AuthStore (Zustand + SecureStore)
  participant Q as Query cache (AsyncStorage)
  participant H as Hook (useMe)
  participant A as apiClient
  participant X as Express
  participant V as AuthService
  participant D as Prisma / DB

  U->>S: Mở app
  Note over S: Giữ Splash cho đến khi font, token và cache sẵn sàng
  par Khởi tạo song song
    S->>S: Load font Epilogue và Inter
  and
    S->>Q: Restore persisted cache (tối đa 24 giờ, đúng buster)
  and
    S->>T: bootstrap()
    T->>T: Đọc token từ SecureStore
  end

  alt Không có token
    T-->>S: status = unauthenticated
    S->>S: Ẩn Splash, Redirect tới (auth)/login
    S-->>U: Hiện màn Login
  else Có token
    T->>H: status = loading, bật useMe
    H->>A: GET /auth/me
    A->>X: GET /api/v1/auth/me (Authorization: Bearer token)
    X->>X: requireAuth: jwt.verify (chữ ký và hạn)
    alt Token hợp lệ
      X->>V: getMe(userId)
      V->>D: user.findUnique(id)
      D-->>V: User
      V-->>X: UserDto
      X-->>A: 200 {data: UserDto}
      A-->>H: UserDto
      H->>Q: setQueryData(['me'])
      H->>T: setUser(user), status = authenticated
      T-->>S: authenticated
      S->>S: Ẩn Splash, vào (tabs)
      S-->>U: Home hiện ngay từ cache, refetch nền (stale-while-revalidate)
    else Token hết hạn hoặc sai, hoặc user không còn tồn tại
      X-->>A: 401 UNAUTHORIZED
      A->>T: logout(): xóa token, queryClient.clear(), xóa persisted cache
      T-->>S: unauthenticated
      S-->>U: Redirect Login
    else Không có mạng hoặc timeout
      A-->>H: AppError NETWORK_ERROR
      alt Đã có user trong cache persisted
        H->>T: setUser(user cache), status = authenticated
        S-->>U: Vào (tabs) chế độ offline, OfflineBanner hiện
      else Chưa có cache
        S-->>U: ErrorState "Can't connect" và nút Retry
      end
    end
  end
```

**Điểm cần lưu ý**

- Auth guard dùng `Stack.Protected guard={isLoggedIn}` trong `app/_layout.tsx` (PLAN §7.3 SC-01): route `(auth)` chỉ vào được khi chưa đăng nhập, `(tabs)` khi đã đăng nhập; đổi `status` là guard tự chuyển màn.
- Một request 401 bất kỳ về sau (không chỉ `/auth/me`) cũng kích hoạt `logout()` qua interceptor của `apiClient`.
- Đăng xuất chủ động (FR-03) dùng cùng hàm `logout()` để không lộ dữ liệu người trước.

### 1b. Đăng nhập (SC-02)

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as Screen (LoginScreen)
  participant H as Hook (useLogin)
  participant A as apiClient
  participant X as Express
  participant V as AuthService
  participant D as Prisma / DB
  participant T as AuthStore (Zustand + SecureStore)

  U->>S: Nhập email và mật khẩu, bấm "Log in"
  S->>S: react-hook-form + zod: email hợp lệ, mật khẩu không rỗng
  alt Dữ liệu chưa hợp lệ
    S-->>U: Hiện lỗi dưới từng field, không gửi request
  else Hợp lệ
    S->>S: Disable nút, hiện spinner
    S->>H: mutate({email, password})
    H->>A: post('/auth/login', body)
    A->>X: POST /api/v1/auth/login
    X->>X: rateLimit (10 request/phút/IP)
    alt Vượt giới hạn
      X-->>A: 429 RATE_LIMITED
      A-->>H: AppError RATE_LIMITED
      H-->>S: onError
      S-->>U: Toast "Too many attempts. Please try again later"
    else Trong giới hạn
      X->>X: validate(loginSchema): trim, lowercase email
      X->>V: login({email, password})
      V->>D: user.findUnique({ email })
      D-->>V: User hoặc null
      V->>V: bcrypt.compare(password, hash hoặc hash giả)
      alt Sai email hoặc sai mật khẩu
        V-->>X: throw ApiError 401 INVALID_CREDENTIALS
        X-->>A: 401 {error: INVALID_CREDENTIALS}
        A-->>H: AppError INVALID_CREDENTIALS
        H-->>S: onError
        S-->>U: Lỗi dưới form "Incorrect email or password", vẫn ở Login (TC-AUTH-03)
      else Đúng
        V->>V: jwt.sign({sub: userId, role}, JWT_SECRET, 7d)
        V-->>X: {token, user}
        X-->>A: 200 {data: {token, user}}
        A-->>H: AuthResult
        H->>T: login(token, user)
        T->>T: SecureStore.setItemAsync(token)
        H->>H: queryClient.setQueryData(['me'], user)
        H-->>S: onSuccess
        S->>S: router.replace('/(tabs)')
        S-->>U: Home ("Hello, Rosie!")
      end
    end
    opt Lỗi mạng hoặc timeout
      A-->>H: AppError NETWORK_ERROR
      S-->>U: Lỗi dưới form "Can't reach the server. Check your connection"
    end
  end
```

**Điểm cần lưu ý**

- Đăng ký (`POST /auth/register`) đi cùng luồng này: sau `201` cũng `login(token, user)` rồi vào Home; lỗi `409 EMAIL_TAKEN` hiện "Email already in use" (TC-AUTH-02).
- Token **không** lưu ở AsyncStorage (CLAUDE.md §7). `passwordHash` không bao giờ rời server.
- Cả hai trường hợp "email không tồn tại" và "sai mật khẩu" cùng trả `INVALID_CREDENTIALS` để không lộ email nào đã đăng ký.

---

## 2. Tìm kiếm có debounce và cache

**Liên quan:** FR-05, FR-06 · UC-05, UC-06 · SC-05, SC-06, SC-07 · BR-13 · NFR-01, NFR-03 · PLAN §17.1, §17.2 (số request khi gõ "javascript": 10 → 1–2).

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as Screen (SearchScreen)
  participant H as Hook (useCourseSearch, useInfiniteQuery)
  participant Q as Query cache (memory)
  participant A as apiClient
  participant X as Express
  participant V as CourseService
  participant D as Prisma / DB

  Note over S: Chế độ khám phá: dùng ['tags','hot'] và ['categories'] đã có trong cache (staleTime 24 giờ)

  loop Mỗi lần gõ phím (ví dụ gõ "javascript", 10 phím)
    U->>S: Gõ ký tự
    S->>S: setInput(text), reset timer debounce 400 ms
  end
  Note over S: Chỉ sau 400 ms không gõ mới cập nhật keyword, nên còn 1 đến 2 request thay vì 10
  S->>S: keyword = "javascript" (đã debounce)
  opt Người dùng bấm Search trên bàn phím
    U->>S: Submit
    S->>S: Bỏ chờ debounce, cập nhật keyword ngay
  end
  S->>H: useCourseSearch({q, filters từ searchFilterStore})
  H->>Q: Tra key ['courses','list', params]

  alt Có cache và còn tươi (staleTime 2 phút)
    Q-->>H: pages đã lưu
    H-->>S: data (không gọi mạng)
    S-->>U: Hiện kết quả ngay
  else Có cache nhưng đã cũ
    Q-->>H: pages cũ
    H-->>S: data cũ, isFetching = true
    S-->>U: Hiện kết quả cũ ngay
  else Chưa có cache
    H-->>S: isLoading = true
    S-->>U: Skeleton danh sách
  end

  opt Cần lấy từ mạng (cache cũ hoặc chưa có)
    H->>A: get('/courses', {q, page: 1, limit: 20, ...filters}, signal)
    A->>X: GET /api/v1/courses?q=javascript&page=1&limit=20
    X->>X: optionalAuth, validate(query) bằng zod
    X->>V: list(query, viewer)
    V->>D: course.findMany(where isPublished, OR title, subtitle, tag, teacher, orderBy, skip, take)
    V->>D: course.count(where) (chạy song song findMany)
    D-->>V: items, total
    opt Có token
      V->>D: bookmark.findMany(userId, courseId in ids) (1 query cho cả trang)
      D-->>V: bookmarks
    end
    V->>V: toCourseSummary(...): badge BR-10, isBookmarked
    V-->>X: {items, meta}
    alt Thành công
      X-->>A: 200 {data: CourseSummary[], meta: PaginationMeta}
      A-->>H: pages[0]
      H->>Q: Lưu vào cache theo key (chỉ trong bộ nhớ, không persist)
      H-->>S: data, isFetching = false
      S-->>U: "120 Results" và FlashList
    else Tham số sai
      X-->>A: 400 VALIDATION_ERROR
      A-->>H: AppError
      H-->>S: isError
      S-->>U: ErrorState và nút Retry
    end
  end

  alt Không có kết quả
    S-->>U: EmptyState "No courses found" và gợi ý hot topics
  end

  opt Cuộn tới cuối danh sách
    U->>S: onEndReached
    S->>H: fetchNextPage() (chỉ khi hasNextPage)
    H->>A: get('/courses', {..., page: 2})
    A->>X: GET /api/v1/courses?...&page=2
    X-->>A: 200 {data, meta: {page: 2}}
    A-->>H: page kế tiếp
    H-->>S: nối vào danh sách
  end

  opt Người dùng đổi từ khóa hoặc bộ lọc trong lúc request đang chạy
    U->>S: Gõ tiếp hoặc Apply filter
    S->>H: key mới
    H->>A: Hủy request cũ (AbortSignal), gửi request theo key mới
  end

  opt Xóa từ khóa và tắt hết bộ lọc
    U->>S: Bấm nút xóa
    S-->>U: Quay về chế độ khám phá (không gọi API)
  end

  alt Mất mạng khi tìm (danh sách không persist)
    A-->>H: AppError NETWORK_ERROR
    H-->>S: isError
    S-->>U: ErrorState "You're offline" và nút Retry
  end
```

**Điểm cần lưu ý**

- **Hai lớp giảm request:** debounce 400 ms (giảm số lần gõ thành request) và cache TanStack Query theo key gồm cả `params` (mở lại đúng từ khóa/bộ lọc thì không gọi mạng khi còn tươi).
- `['courses','list',params]` **không persist** offline (PLAN §10) nên mất mạng thì không có kết quả cũ cho từ khóa mới; nhưng các key khác (`['home']`, `['categories']`, `['tags','hot']`) vẫn đọc được từ cache.
- Phân trang: `getNextPageParam = meta.page < meta.totalPages ? meta.page + 1 : undefined`; `limit = 20`.
- Server tính `total` cùng lúc với trang dữ liệu (`Promise.all`) để màn hình hiển thị "{total} Results" chính xác.

---

## 3. Add to cart và Checkout

**Liên quan:** FR-13, FR-14 · UC-11, UC-12 · SC-09, SC-12, SC-13 · BR-06, BR-07, BR-17 · NFR-10 (checkout trong 1 transaction) · ADR-10 (thanh toán giả lập).

### 3a. Thêm khóa học vào giỏ

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as Screen (CourseDetailScreen)
  participant H as Hook (useAddToCart)
  participant Q as Query cache
  participant A as apiClient
  participant X as Express
  participant V as CartService
  participant D as Prisma / DB

  U->>S: Bấm "Add to cart" (BR-17: chưa ghi danh, giá lớn hơn 0, chưa trong giỏ)
  S->>H: mutate({courseId})
  H->>H: onlineManager: đang offline thì chặn, toast "You're offline"
  H->>A: post('/cart/items', {courseId})
  A->>X: POST /api/v1/cart/items (Bearer token)
  X->>X: requireAuth, validate(body)
  X->>V: add(userId, courseId)
  V->>D: course.findFirst({ id, isPublished })
  D-->>V: Course hoặc null
  alt Khóa không tồn tại
    V-->>X: throw 404 COURSE_NOT_FOUND
  else Khóa miễn phí (priceCents = 0)
    V-->>X: throw 422 FREE_COURSE
  else
    V->>D: enrollment.findUnique(userId, courseId)
    alt Đã ghi danh
      V-->>X: throw 409 ALREADY_ENROLLED
    else
      V->>D: cartItem.create(userId, courseId)
      alt Trùng khóa chính ghép
        D-->>V: lỗi unique
        V-->>X: throw 409 ALREADY_IN_CART
      else Thêm được
        V->>D: cartItem.findMany(userId) include course
        D-->>V: items
        V-->>X: CartDto (totalCents = tổng giá hiện tại)
        X-->>A: 201 {data: CartDto}
        A-->>H: CartDto
        H->>Q: setQueryData(['cart'], cart), invalidate ['course', id]
        H-->>S: onSuccess
        S-->>U: Nút đổi thành "Go to cart", badge giỏ ở Home tăng
      end
    end
  end
  opt Server trả lỗi 4xx nghiệp vụ
    X-->>A: {error: code}
    A-->>H: AppError
    H->>Q: invalidate ['course', id] để đồng bộ trạng thái nút
    H-->>S: onError
    S-->>U: Toast theo code (ALREADY_IN_CART: "Already in your cart", ALREADY_ENROLLED: "You already own this course", FREE_COURSE: đổi nút thành "Enroll for free")
  end
```

### 3b. Xem giỏ và Checkout (thanh toán giả lập)

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as Screen (CartScreen, CheckoutScreen)
  participant H as Hook (useCart, useCheckout)
  participant Q as Query cache
  participant A as apiClient
  participant X as Express
  participant V as OrderService
  participant N as NotificationService
  participant D as Prisma / DB
  participant C as Cache server (LRU)

  rect rgb(235, 253, 255)
    Note over U,D: Giai đoạn 1 - Xem giỏ hàng (SC-12)
    U->>S: Mở giỏ (icon giỏ ở Home hoặc "Go to cart")
    S->>H: useCart() (staleTime 0)
    H->>A: get('/cart')
    A->>X: GET /api/v1/cart
    X->>D: cartItem.findMany(userId) include course
    D-->>X: items
    X-->>A: 200 {data: {items, totalCents}}
    A-->>H: CartDto
    H-->>S: data
    S-->>U: Danh sách khóa và tổng tiền, nút Checkout
    opt Xóa một khóa
      U->>S: Bấm icon xóa và xác nhận
      S->>H: removeItem(courseId)
      H->>A: delete('/cart/items/:courseId')
      A->>X: DELETE /api/v1/cart/items/crs_id
      X->>D: cartItem.deleteMany(userId, courseId)
      X-->>A: 204 No Content
      H->>Q: invalidate ['cart'], ['course', courseId]
    end
  end

  rect rgb(243, 244, 246)
    Note over U,D: Giai đoạn 2 - Thanh toán (SC-13)
    U->>S: Chọn Mock Card hoặc Mock E-wallet
    opt Demo luồng lỗi
      U->>S: Bật công tắc "Simulate payment failure"
    end
    U->>S: Bấm "Pay $X"
    S->>S: Disable nút, spinner tối thiểu khoảng 1,5 giây (giả lập cổng thanh toán)
    S->>H: mutate({paymentMethod, simulateFailure})
    H->>H: Offline thì chặn và toast "You're offline"
    H->>A: post('/orders/checkout', {paymentMethod, simulateFailure})
    A->>X: POST /api/v1/orders/checkout
    X->>X: requireAuth, validate(paymentMethod thuộc MOCK_CARD, MOCK_EWALLET, simulateFailure tùy chọn)
    X->>V: checkout(userId, input)
    V->>D: BEGIN transaction (prisma.$transaction)
    V->>D: cartItem.findMany(userId) include course (published)
    V->>D: enrollment.findMany(userId, courseId in cart)
    V->>V: Loại khóa đã ghi danh, tính total = tổng priceCents hiện tại

    alt Giỏ rỗng sau khi lọc
      V->>D: ROLLBACK
      V-->>X: throw 422 CART_EMPTY
      X-->>A: 422 {error: CART_EMPTY}
      A-->>H: AppError
      H-->>S: onError
      S-->>U: Toast "Your cart is empty", quay về giỏ
    else Còn khóa để thanh toán
      V->>D: order.create(status PENDING, totalCents, paymentMethod) và orderItem.createMany(priceCents tại thời điểm mua)
      alt simulateFailure = true (giả lập cổng thanh toán từ chối)
        V->>D: order.update(status FAILED, paidAt = null)
        V->>D: COMMIT (chỉ lưu Order FAILED làm dấu vết, giỏ và ghi danh không đổi)
        V-->>X: throw ApiError 402 PAYMENT_FAILED (details: orderId)
        X-->>A: 402 {error: PAYMENT_FAILED}
        A-->>H: AppError PAYMENT_FAILED
        H-->>S: onError (không invalidate ['cart'])
        S-->>U: Màn "Payment failed" - giỏ còn nguyên, nút "Try again" và "Back to cart"
      else Thanh toán giả lập thành công
        V->>D: order.update(status PAID, paidAt = now)
        V->>D: enrollment.createMany(userId, courseIds, progressPercent 0, lastAccessedAt now)
        V->>D: course.updateMany(enrollmentCount tăng 1 cho từng khóa)
        V->>D: cartItem.deleteMany(userId)
        V->>N: notify(tx, userId, ORDER_PAID, courseId đầu tiên)
        N->>D: notification.create (cùng transaction)

        alt Có lỗi bất kỳ ở các bước trên
          D-->>V: lỗi
          V->>D: ROLLBACK (không có đơn nửa vời, giỏ còn nguyên)
          V-->>X: throw lỗi
          X-->>A: 500 INTERNAL_ERROR
          A-->>H: AppError
          H-->>S: onError
          S-->>U: "Payment failed. Please try again"
        else Thành công
          V->>D: COMMIT
          V->>C: del('home:public') (enrollmentCount đã đổi)
          V-->>X: {order, enrolledCourseIds}
          X-->>A: 201 {data: {order, enrolledCourseIds}}
          A-->>H: CheckoutResult
          H->>Q: invalidate ['cart'], ['me','courses'], ['me','stats'], ['course'] (mọi khóa), ['home'], ['notifications'], ['notifications','unread-count']
          H-->>S: onSuccess
          S-->>U: Màn kết quả "Payment successful"
          alt Bấm "Start learning"
            U->>S: Start learning
            S->>S: router.replace('/learn/' + khóa đầu tiên)
          else Bấm "Go to My Courses"
            U->>S: Go to My Courses
            S->>S: router.replace('/(tabs)/my-courses')
          end
        end
      end
    end
  end
```

**Điểm cần lưu ý**

- **Một transaction duy nhất** (BR-07, NFR-10): tạo đơn, ghi danh, tăng `enrollmentCount`, xóa giỏ, tạo thông báo đều nằm trong `prisma.$transaction`; lỗi bất kỳ thì rollback toàn bộ. Xóa cache server làm **sau khi commit** để không xóa cache cho giao dịch bị hủy.
- Độ trễ ~1,5 s ở màn thanh toán là hiệu ứng phía client; server phản hồi ngay.
- **Mô phỏng thất bại (BR-07):** khi `simulateFailure = true`, server lưu `Order` `FAILED` rồi trả `402 PAYMENT_FAILED` — đây là kết quả nghiệp vụ hợp lệ, **khác** lỗi kỹ thuật `500` (rollback). Cả hai đều giữ nguyên giỏ và không ghi danh; màn hình cho phép "Try again" hoặc về giỏ. Công tắc "Simulate payment failure" chỉ phục vụ demo/kiểm thử luồng lỗi.
- Bấm Pay hai lần liên tiếp: nút bị disable; nếu vẫn lọt request thứ hai thì giỏ đã rỗng nên nhận `422 CART_EMPTY` (an toàn, không mua hai lần).
- Sau `201`, `['course', id]` bị invalidate nên nút ở trang chi tiết đổi thành "Continue learning" (BR-17), My Courses có khóa mới với 0 %, và có thông báo `ORDER_PAID` (TC-PAY-01).
- Khóa miễn phí không đi qua giỏ: dùng `POST /courses/:id/enroll` (`422 PAID_COURSE` nếu khóa có phí).

---

## 4. Học video: resume, lưu tiến độ, hoàn thành

**Liên quan:** FR-16 · UC-14 · SC-15 · BR-01, BR-02, BR-03, BR-04 · NFR-06, NFR-10 · ADR-08 (expo-video, sự kiện `timeUpdate`) · PLAN §17.1 (throttle 10 s: ~30 request thay vì ~300 cho 5 phút xem).

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as Screen (LearningScreen)
  participant P as Player (expo-video)
  participant H as Hook (useLesson, useSaveProgress)
  participant Y as ProgressSyncQueue (AsyncStorage)
  participant Q as Query cache
  participant A as apiClient
  participant X as Express
  participant V as LessonService
  participant N as NotificationService
  participant D as Prisma / DB

  rect rgb(235, 253, 255)
    Note over U,D: Giai đoạn 1 - Mở bài học và resume vị trí cũ
    U->>S: Mở khóa từ My Courses (hoặc "Continue learning")
    S->>S: lessonId = Enrollment.lastLessonId, nếu null thì bài đầu tiên
    S->>H: useLesson(lessonId) (staleTime 0)
    H->>A: get('/lessons/:id')
    A->>X: GET /api/v1/lessons/les_ux_02
    X->>X: requireAuth
    X->>V: getLesson(userId, lessonId)
    V->>D: lesson.findUnique include section.course
    D-->>V: Lesson
    V->>D: enrollment.findUnique(userId, courseId)
    D-->>V: Enrollment hoặc null
    alt Chưa ghi danh và isPreview = false (BR-01)
      V-->>X: throw 403 NOT_ENROLLED
      X-->>A: 403 {error: NOT_ENROLLED} (không có videoUrl)
      A-->>H: AppError
      H-->>S: onError
      S-->>U: Quay về SC-09 và toast "Enroll to unlock this lesson"
    else Bài không tồn tại
      V-->>X: throw 404 LESSON_NOT_FOUND
      X-->>A: 404
      S-->>U: ErrorState
    else Đủ quyền
      V->>D: lessonProgress.findUnique(userId, lessonId)
      D-->>V: positionSec, isCompleted (mặc định 0, false)
      V->>D: Tìm nextLessonId theo thứ tự chương và bài
      V-->>X: LessonDetail
      X-->>A: 200 {data: LessonDetail}
      A-->>H: LessonDetail
      H-->>S: videoUrl, positionSec, nextLessonId
      S->>P: player.replace(videoUrl)
      P-->>S: statusChange readyToPlay
      S->>P: currentTime = positionSec (seek tới vị trí đã lưu)
      S->>P: play()
      S-->>U: Video chạy từ đúng vị trí cũ (TC-LRN-01)
    end
  end

  rect rgb(243, 244, 246)
    Note over U,D: Giai đoạn 2 - Đang xem: lưu tiến độ throttle 10 giây
    loop Mỗi 1 giây khi đang phát (sự kiện timeUpdate)
      P-->>S: timeUpdate(currentTime)
      S->>S: positionRef = currentTime (chỉ ghi biến ref, không setState)
      opt Đã 10 giây kể từ lần lưu gần nhất và chưa đạt 90 phần trăm
        S->>H: saveProgress({lessonId, positionSec})
        H->>A: put('/lessons/:id/progress', {positionSec})
        A->>X: PUT /api/v1/lessons/les_ux_02/progress
        X->>X: requireAuth, requireEnrolled(courseId của bài), validate
        X->>V: saveProgress(userId, lessonId, input)
        V->>D: BEGIN transaction
        V->>D: lessonProgress.upsert(positionSec, giữ nguyên isCompleted)
        V->>D: enrollment.update(lastLessonId, lastAccessedAt = now)
        V->>D: COMMIT
        V-->>X: {lessonProgress, courseProgressPercent hiện có}
        X-->>A: 200
        A-->>H: kết quả
        S->>S: lastSavedAt = now
      end
    end
  end

  rect rgb(235, 253, 255)
    Note over U,D: Giai đoạn 3 - Hoàn thành bài (đạt 90 phần trăm hoặc phát hết) và cập nhật phần trăm của khóa
    P-->>S: timeUpdate: currentTime đạt 90 phần trăm durationSec (hoặc sự kiện playToEnd)
    S->>H: saveProgress({positionSec, isCompleted: true}) ngay lập tức
    H->>A: put('/lessons/:id/progress', {positionSec, isCompleted: true})
    A->>X: PUT /api/v1/lessons/les_ux_02/progress
    X->>X: requireAuth, requireEnrolled, validate
    X->>V: saveProgress(...)
    V->>D: BEGIN transaction
    V->>D: lessonProgress.upsert(isCompleted = true)
    V->>D: enrollment.update(lastLessonId, lastAccessedAt)
    opt Bài vừa chuyển từ chưa xong sang xong (BR-03)
      V->>D: Đếm bài isCompleted của khóa
      D-->>V: completedCount
      V->>V: percent = round(completedCount / Course.lessonCount * 100) (BR-04)
      V->>D: enrollment.update(progressPercent = percent)
      opt percent = 100 và completedAt còn null
        V->>D: enrollment.update(completedAt = now)
        V->>N: notify(tx, userId, COURSE_COMPLETED, courseId)
        N->>D: notification.create (cùng transaction)
      end
    end
    V->>D: COMMIT
    V-->>X: {lessonProgress, courseProgressPercent}
    X-->>A: 200 {data: {lessonProgress: {isCompleted: true}, courseProgressPercent: 17}}
    A-->>H: kết quả
    H->>Q: setQueryData(['course', id, 'curriculum']) đánh dấu bài COMPLETED, invalidate ['me','courses']
    opt percent = 100
      H->>Q: invalidate ['me','stats'], ['notifications']
    end
    H-->>S: onSuccess
    S-->>U: Icon bài đổi thành dấu tích, phần trăm của khóa tăng đúng công thức (TC-LRN-02)
  end

  rect rgb(243, 244, 246)
    Note over U,D: Giai đoạn 4 - Lưu ngay khi rời bài (flush)
    alt Người dùng pause
      U->>P: Pause
      P-->>S: playingChange(false)
    else Chuyển sang bài khác
      U->>S: Bấm bài khác trong CurriculumList
    else Rời màn hình hoặc bấm Back
      U->>S: Back (unmount hoặc blur)
    else App xuống nền
      Note over S: AppState chuyển sang background
    end
    S->>H: saveProgress({lessonId, positionSec: positionRef}) (flush)
    H->>A: put('/lessons/:id/progress', {positionSec})
    A->>X: PUT /api/v1/lessons/les_ux_02/progress
    X-->>A: 200
    opt Chuyển sang bài khác
      S->>H: useLesson(bài mới) và lặp lại giai đoạn 1
    end
  end

  alt Mất mạng hoặc timeout khi lưu tiến độ (ngoại lệ FR-24)
    A-->>H: AppError NETWORK_ERROR
    H->>Y: enqueue(lessonId, positionSec, isCompleted) - chỉ giữ bản mới nhất mỗi bài
    Note over S: Không chặn việc lưu như các thao tác ghi khác và không toast mỗi 10 giây. Video vẫn phát bình thường
    opt Có mạng trở lại (NetInfo) hoặc mở lại app
      Y->>A: flush(): put('/lessons/:id/progress', bản mới nhất của từng bài)
      A->>X: PUT /api/v1/lessons/les_ux_02/progress
      X-->>A: 200
      A-->>Y: xóa mục đã gửi
      Y->>Q: invalidate ['course', id, 'curriculum'], ['me','courses']
    end
  else Lỗi 5xx tạm thời
    H->>H: retry tối đa 2 lần, giữ bản mới nhất và thử lại ở lần lưu kế tiếp
  else Bị 403 NOT_ENROLLED khi đang xem
    X-->>A: 403
    S-->>U: Dừng player, quay về SC-09 và toast
  end
```

**Điểm cần lưu ý**

- **Hai nguồn kích hoạt hoàn thành:** client gửi `isCompleted: true` khi đạt 90 % hoặc `playToEnd`; server cũng tự nâng cờ nếu `positionSec` ≥ ⌊0,9 × `durationSec`⌋ (phòng thủ kép — [api-spec E35](api-spec.md#e35--put-lessonsidprogress)). Đã hoàn thành thì **không** bị bỏ hoàn thành khi xem lại.
- **Tối ưu server:** chỉ đếm lại bài đã xong và tính lại `progressPercent` khi bài *vừa chuyển trạng thái* sang hoàn thành; các lần lưu vị trí thường chỉ là một `upsert` + một `update` nhỏ.
- **Không mất tiến độ (NFR-10):** lưu định kỳ mỗi 10 s + lưu khi pause/chuyển bài/rời màn/xuống nền, nên trường hợp xấu nhất mất tối đa ~10 s vị trí nếu app bị kill đột ngột.
- **Offline là ngoại lệ của quy tắc "chặn ghi" (FR-24):** mọi mutation khác bị chặn khi offline, riêng tiến độ video được lưu tạm vào AsyncStorage (bản mới nhất mỗi bài) và tự đồng bộ khi có mạng; server nhận theo thứ tự đến và không bao giờ hạ `isCompleted`.
- **`timeUpdate` mỗi giây** chỉ cập nhật `ref` (không `setState`) để tránh render lại toàn màn; thanh tiến độ do `VideoView` native tự vẽ.
- Xem preview khi **chưa ghi danh** vẫn phát được (BR-01) nhưng client không gọi `PUT /progress` (sẽ bị `403`).

---

## 5. Đặt câu hỏi Q&A và trả lời sinh thông báo

**Liên quan:** FR-19, FR-23 · UC-16 · SC-15 (tab Q&A), SC-16, SC-22 · BR-09 · NFR-06.

### 5a. Đặt câu hỏi (học viên A)

```mermaid
sequenceDiagram
  autonumber
  actor U as User (học viên A)
  participant S as Screen (QaTab, Composer)
  participant H as Hook (useQuestions, useCreateQuestion)
  participant Q as Query cache
  participant A as apiClient
  participant X as Express
  participant V as QuestionService
  participant D as Prisma / DB

  U->>S: Mở tab Q&A của khóa đã ghi danh
  S->>H: useQuestions(courseId) (staleTime 30 giây)
  H->>A: get('/courses/:id/questions', {page: 1, limit: 20})
  A->>X: GET /api/v1/courses/crs_ux/questions?page=1&limit=20
  X->>X: requireAuth, requireEnrolled(courseId), validate
  X->>V: list(courseId, userId, page)
  V->>D: question.findMany(courseId, orderBy createdAt giảm dần) và count
  V->>D: questionLike.findMany(userId, questionId in ids) (isLiked)
  D-->>V: items, total, likes
  V-->>X: {items, meta}
  X-->>A: 200 {data: QuestionDto[], meta}
  A-->>H: page
  H-->>S: data
  S-->>U: Danh sách QuestionCard (mới nhất trước)
  opt Chưa ghi danh (SC-15 không cho vào, nhưng server vẫn kiểm tra)
    X-->>A: 403 {error: NOT_ENROLLED}
    S-->>U: Quay về SC-09 và toast
  end

  U->>S: Bấm emoji nhanh (chèn vào ô nhập) và gõ nội dung
  U->>S: Bấm nút Gửi
  S->>S: Kiểm tra 1 đến 1000 ký tự (zod), disable nút Gửi
  S->>H: mutate({courseId, content})
  H->>H: Offline thì chặn và toast "You're offline"
  H->>A: post('/courses/:id/questions', {content})
  A->>X: POST /api/v1/courses/crs_ux/questions
  X->>X: requireAuth
  X->>X: requireEnrolled(courseId)
  X->>D: enrollment.findUnique(userId, courseId)
  alt Chưa ghi danh (BR-09)
    D-->>X: null
    X-->>A: 403 {error: NOT_ENROLLED}
    A-->>H: AppError
    H-->>S: onError
    S-->>U: Toast "Enroll to ask a question"
  else Đã ghi danh
    D-->>X: Enrollment
    X->>X: validate(body): content trim 1 đến 1000
    X->>V: create(userId, courseId, content)
    V->>D: question.create(courseId, userId, content, likeCount 0, answerCount 0)
    D-->>V: Question
    V-->>X: QuestionDto
    X-->>A: 201 {data: QuestionDto}
    A-->>H: QuestionDto
    H->>Q: invalidate ['course', id, 'questions']
    H-->>S: onSuccess
    S-->>U: Câu hỏi xuất hiện đầu danh sách kèm emoji, ô nhập được xóa (TC-QA-01)
  end
  opt Nội dung không hợp lệ (rỗng hoặc quá 1000 ký tự)
    X-->>A: 400 VALIDATION_ERROR
    S-->>U: Lỗi dưới ô nhập
  end
```

### 5b. Học viên B trả lời và học viên A nhận thông báo

```mermaid
sequenceDiagram
  autonumber
  actor UB as User (học viên B)
  actor UA as User (học viên A, người hỏi)
  participant S as Screen (QuestionDetail, Notifications)
  participant H as Hook (useAnswers, useCreateAnswer, useNotifications)
  participant Q as Query cache
  participant A as apiClient
  participant X as Express
  participant V as QuestionService
  participant N as NotificationService
  participant D as Prisma / DB

  rect rgb(235, 253, 255)
    Note over UB,D: Giai đoạn 1 - B trả lời trên thiết bị của B (SC-16)
    UB->>S: Mở câu hỏi của A (bấm "5 Comment")
    S->>H: useQuestion(id) và useAnswers(id)
    H->>A: get('/questions/:id') và get('/questions/:id/answers')
    A->>X: GET /api/v1/questions/qst_1 và /answers
    X->>X: requireAuth, requireEnrolled (courseId suy ra từ câu hỏi)
    X-->>A: 200 QuestionDto, 200 AnswerDto[] (cũ nhất trước)
    A-->>H: dữ liệu
    H-->>S: render
    UB->>S: Gõ "Figma is enough..." và bấm Gửi
    S->>H: mutate({questionId, content})
    H->>A: post('/questions/:id/answers', {content})
    A->>X: POST /api/v1/questions/qst_1/answers
    X->>X: requireAuth, requireEnrolled (theo khóa của câu hỏi), validate
    X->>V: answer(userId B, questionId, content)
    V->>D: question.findUnique(id)
    alt Câu hỏi không tồn tại
      D-->>V: null
      V-->>X: throw 404 QUESTION_NOT_FOUND
      X-->>A: 404
      A-->>H: AppError
      S-->>UB: Toast "This question no longer exists"
    else Chưa ghi danh khóa của câu hỏi
      X-->>A: 403 NOT_ENROLLED
      S-->>UB: Toast "Enroll to answer"
    else Hợp lệ
      V->>D: BEGIN transaction
      V->>D: answer.create(questionId, userId B, content)
      V->>D: question.update(answerCount tăng 1)
      opt Người trả lời khác người hỏi (BR-09)
        V->>N: notify(tx, userId A, NEW_ANSWER, courseId và questionId)
        N->>D: notification.create(userId A, type NEW_ANSWER, isRead false)
      end
      V->>D: COMMIT
      V-->>X: AnswerDto
      X-->>A: 201 {data: AnswerDto}
      A-->>H: AnswerDto
      H->>Q: invalidate ['question', id, 'answers'], ['course', courseId, 'questions']
      H-->>S: onSuccess
      S-->>UB: Trả lời hiện ở cuối danh sách, số comment tăng
    end
  end

  rect rgb(243, 244, 246)
    Note over UA,D: Giai đoạn 2 - A nhận thông báo trên thiết bị của A (SC-22)
    Note over UA,S: Không có push. Badge cập nhật khi ['notifications','unread-count'] được refetch (mở app, focus Home, quá staleTime 30 giây)
    UA->>S: Mở lại Home hoặc kéo để refresh
    S->>H: useHome() và useUnreadCount()
    H->>A: get('/home') và get('/notifications/unread-count')
    A->>X: GET /api/v1/home, GET /api/v1/notifications/unread-count
    X->>D: notification.count(userId, isRead false)
    D-->>X: count
    X-->>A: 200 {data: {count: 1}}
    A-->>H: dữ liệu
    H-->>S: badge chuông = 1
    S-->>UA: Chấm/badge trên icon chuông
    UA->>S: Bấm chuông, mở danh sách thông báo
    S-->>UA: Item "New answer" (chấm xanh chưa đọc)
    UA->>S: Bấm item
    S->>H: markRead(notificationId)
    H->>A: patch('/notifications/:id/read')
    A->>X: PATCH /api/v1/notifications/not_1/read
    X->>D: notification.updateMany(id, userId, isRead true)
    alt Không tìm thấy thông báo của người dùng
      X-->>A: 404 NOT_FOUND
    else Cập nhật được
      X-->>A: 204 No Content
      H->>Q: invalidate ['notifications'], ['notifications','unread-count']
    end
    S->>S: Điều hướng theo data: router.push('/question/' + questionId)
    S->>H: useQuestion(questionId), useAnswers(questionId)
    S-->>UA: SC-16 hiện câu trả lời của B
  end
```

**Điểm cần lưu ý**

- **Cùng transaction:** tạo `Answer`, tăng `answerCount` và tạo `Notification` nằm chung một `prisma.$transaction` (`NotificationService.notify` nhận `tx`), nên không thể có câu trả lời mà thiếu thông báo (hoặc ngược lại).
- **Không tự thông báo cho mình:** khi chính người hỏi tự trả lời câu hỏi của mình thì bỏ qua `notify`.
- **Thông báo là pull, không phải push** (push thật thuộc mục *Won't*, PLAN §2.2): badge cập nhật khi refetch. `['notifications','unread-count']` (từ `GET /notifications/unread-count`) và `['notifications']` đều có `staleTime` 30 s; khi mở danh sách thông báo thì `meta.unreadCount` của `GET /notifications` cho cùng giá trị. Đọc thông báo, `read-all` hoặc có câu trả lời mới đều invalidate cả hai key.
- `requireEnrolled` cho `POST /questions/:id/answers` suy ra `courseId` từ chính câu hỏi (không tin `courseId` do client gửi).

---

## 6. Bookmark với optimistic update và rollback

**Liên quan:** FR-12 · UC-10 · nhiều màn (Home, Search, Details, Profile, Teacher) · PLAN §10 (mutation toggle), §17.1 (Optimistic UI). Cùng mẫu áp dụng cho like khóa học, follow giảng viên, like câu hỏi.

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as Screen (card + BookmarkButton)
  participant H as Hook (useToggleBookmark)
  participant Q as Query cache
  participant A as apiClient
  participant X as Express
  participant V as BookmarkService
  participant D as Prisma / DB

  U->>S: Bấm icon bookmark trên một card
  S->>H: mutate({courseId, isBookmarked: false})
  alt Đang offline
    H-->>S: Chặn mutation (onlineManager)
    S-->>U: Toast "You're offline" (TC-OFF-01)
  else Online
    Note over H,Q: onMutate: chạy đồng bộ trước khi gọi mạng
    H->>Q: cancelQueries(['home'], ['courses','list'], ['course', id], ['me','bookmarks'])
    H->>Q: Chụp snapshot các cache liên quan
    H->>Q: setQueryData: isBookmarked = true ở Home, mọi trang danh sách, chi tiết khóa
    Q-->>S: Render lại
    S-->>U: Icon đổi trạng thái ngay lập tức
    H->>A: put('/courses/:id/bookmark')
    A->>X: PUT /api/v1/courses/crs_ux/bookmark
    X->>X: requireAuth
    X->>V: add(userId, courseId)
    V->>D: bookmark.createMany({skipDuplicates: true}) sau khi kiểm tra khóa published
    alt Server thành công
      D-->>V: ok
      X-->>A: 204 No Content
      A-->>H: thành công
      Note over H,Q: onSettled
      H->>Q: invalidate ['me','stats'], ['me','bookmarks'], ['course', id]
      Q-->>S: Đồng bộ lại với server
    else Server lỗi (404 COURSE_NOT_FOUND, 401, 5xx hoặc mất mạng giữa chừng)
      X-->>A: {error}
      A-->>H: AppError
      Note over H,Q: onError
      H->>Q: setQueryData(snapshot) - khôi phục trạng thái cũ
      Q-->>S: Render lại
      S-->>U: Icon quay về trạng thái cũ và toast "Couldn't save. Try again"
      H->>Q: invalidate để đồng bộ
    end
  end
  opt Bỏ lưu ở tab "Saved courses" (SC-20)
    U->>S: Bấm bookmark đang bật
    S->>H: mutate({courseId, isBookmarked: true})
    H->>Q: Gỡ item khỏi ['me','bookmarks'] ngay (optimistic)
    S-->>U: Item biến mất và toast "Removed - Undo"
    H->>A: delete('/courses/:id/bookmark')
    A->>X: DELETE /api/v1/courses/crs_ux/bookmark
    X->>V: remove(userId, courseId)
    V->>D: bookmark.deleteMany(userId, courseId)
    X-->>A: 204 No Content
    opt Bấm Undo
      U->>S: Undo
      S->>H: mutate({courseId, isBookmarked: false}) (lưu lại)
    end
  end
```

**Điểm cần lưu ý**

- `PUT` và `DELETE` đều **idempotent** ở server nên việc retry hoặc bấm nhanh nhiều lần không gây trùng dữ liệu.
- Cập nhật lạc quan phải chạm **mọi** cache chứa khóa đó (Home, các trang `infinite` của danh sách, chi tiết, `Saved courses`) — đây là lý do hook `useToggleBookmark` do C viết một lần và dùng chung cho mọi card.
- Rollback dùng snapshot chụp ở `onMutate`, không refetch cả màn nên phản hồi vẫn tức thì kể cả khi lỗi.

---

## 7. Bảng truy vết

| Sơ đồ | Luồng | FR / UC | Endpoint (api-spec) | Query key (PLAN §10) | Màn hình | Test case mẫu |
|---|---|---|---|---|---|---|
| 1a | Bootstrap | FR-02, FR-03 | E04 | `['me']` | SC-01 | TC-AUTH-04 |
| 1b | Đăng nhập | FR-01, FR-02 · UC-02 | E03 (E02 khi đăng ký) | `['me']` | SC-02, SC-03 | TC-AUTH-01, 02, 03 |
| 2 | Tìm kiếm | FR-05, FR-06 · UC-05, UC-06 | E08, E07, E06 | `['courses','list',params]`, `['tags','hot']`, `['categories']` | SC-05, SC-06, SC-07 | TC-SRCH-01, 02 |
| 3a | Thêm giỏ | FR-13 · UC-11 | E28 | `['cart']`, `['course',id]` | SC-09 | TC-CART-01 |
| 3b | Giỏ và Checkout (gồm mô phỏng thất bại) | FR-13, FR-14 · UC-11, UC-12 | E27, E29, E30 (402 `PAYMENT_FAILED`) | `['cart']`, `['me','courses']`, `['me','stats']`, `['course',*]`, `['home']`, `['notifications']`, `['notifications','unread-count']` | SC-12, SC-13 | TC-PAY-01 |
| 4 | Học video (gồm lưu tạm khi offline) | FR-16, FR-24 · UC-14 | E34, E35 (E10) | `['lesson',id]`, `['course',id,'curriculum']`, `['me','courses']` | SC-15 | TC-LRN-01, TC-LRN-02, TC-SEC-01 |
| 5a | Đặt câu hỏi | FR-19 · UC-16 | E36, E37 (`✓E`) | `['course',id,'questions']` | SC-15 | TC-QA-01 |
| 5b | Trả lời và thông báo | FR-19, FR-23 · UC-16 | E38, E39, E40, E52, E49, E50 | `['question',id,'answers']`, `['notifications']`, `['notifications','unread-count']` | SC-16, SC-22 | TC-QA-01 (mở rộng) |
| 6 | Bookmark optimistic | FR-12 · UC-10 | E12, E13, E14 | `['home']`, `['courses','list']`, `['course',id]`, `['me','bookmarks']`, `['me','stats']` | Nhiều màn | TC-OFF-01 |

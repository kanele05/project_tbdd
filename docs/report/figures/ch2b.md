# Mô tả để vẽ biểu đồ hoạt động (Chương 2, mục 2.6) – 14 use case lõi

Tệp này là **bản mô tả đủ chi tiết để vẽ lại từng biểu đồ hoạt động** `AC-UCxxx` (SVG/HTML rồi render PNG, xem PLAN.md §12.3). Mỗi biểu đồ khớp với bảng đặc tả cùng mã ở `docs/report/chapters/ch2b-dac-ta.md` và với mã nguồn đã đóng băng ngày 24/10/2026.

## Quy ước chung khi vẽ

- **Làn bơi (swimlane)** từ trái sang phải: *Tác nhân* (Learner, Teacher, Admin hoặc Guest) · *Mobile* (ứng dụng Expo: mobile hoặc web) · *Server* (API Express, Prisma, PostgreSQL) · *Hệ thống ngoài* (Gemini, reCAPTCHA, Brevo, Payment Gateway giả lập, YouTube – chỉ vẽ khi có tham gia).
- **Ký hiệu:** nút tròn đặc = bắt đầu; nút tròn có viền kép = kết thúc; hình chữ nhật bo góc = hành động; hình thoi = quyết định (ghi điều kiện trên mỗi nhánh ra, ví dụ `[email đã dùng]`); thanh dọc = chia nhánh hoặc hợp nhất; mũi tên đứt nét = lời gọi API sang làn khác. Điểm kết thúc lỗi vẽ màu đỏ nhạt, điểm kết thúc thành công màu xanh nhạt.
- **Nhãn gọi API** ghi trên mũi tên dạng `METHOD /đường-dẫn`; mã lỗi ghi dạng `HTTP MÃ_LỖI`.
- Mọi biểu đồ có **một khung tiêu đề** `AC-UCxxx – <Tên use case>` và các đường lỗi dùng chung ghi gọn: *401* (hết phiên, ứng dụng gọi refresh rồi về Login), *offline* (chặn thao tác ghi, toast thông báo), *429 RATE_LIMITED*. Các đường này vẽ một lần ở cuối mỗi biểu đồ nếu không có nhánh riêng.
- Số thứ tự `n.` trong mỗi bước dùng làm nhãn nút khi vẽ; `→ m` nghĩa là đi tiếp tới bước `m`.

---

## Hình 2.20 – AC-UC002 – Đăng nhập

**Tệp:** `docs/uml/png/AC-UC002.png` · **Làn:** Guest · Mobile · Server · reCAPTCHA và Brevo.

**Phần A – Khởi động và khôi phục phiên (SC-01)**

1. (Bắt đầu) Mobile: mở ứng dụng, intro; đọc token từ SecureStore (web: localStorage). → 2
2. Quyết định `[có token đã lưu?]`: có → 3; không → 12 (màn Login).
3. Mobile: `GET /auth/me` (kèm access token). → Server: kiểm tra chữ ký JWT, `sid` còn hiệu lực. → 4
4. Quyết định `[access token còn hạn?]`: còn hạn → 10 (vào Home); hết hạn (401) → 5.
5. Mobile: `POST /auth/refresh` với refresh token. Server: đổi token (xoay vòng, hạn trượt 30 ngày). → 6
6. Quyết định `[refresh hợp lệ?]`: hợp lệ → Server trả cặp token mới → Mobile lưu token → 10; không hợp lệ hoặc token cũ bị dùng lại (`401 INVALID_REFRESH_TOKEN`; server thu hồi phiên) hoặc tài khoản bị khóa (`403 ACCOUNT_DISABLED`) → Mobile xóa token → 12.

**Phần B – Đăng nhập bằng mật khẩu**

12. Guest: mở màn Login (SC-02), nhập email và mật khẩu. (Liên kết phụ: nút "Quên mật khẩu" → chuyển sang UC039, vẽ bằng hộp "Hoạt động con".) → 13
13. Mobile: kiểm tra form bằng zod. Quyết định `[hợp lệ?]`: không → hiện lỗi dưới từng ô, quay lại 12; có → 14.
14. Mobile: `POST /auth/login` (email, mật khẩu, tên thiết bị). → 15
15. Server: tìm người dùng theo email. Quyết định `[đang bị khóa tạm?]`: có → trả `423 ACCOUNT_LOCKED` + `Retry-After` → Mobile hiện thời gian chờ → (Kết thúc lỗi). Không → 16.
16. Quyết định `[đã sai từ 3 lần?]`: có → Mobile hiện ô reCAPTCHA; Guest giải; Mobile gửi lại kèm `captchaToken`; Server gọi dịch vụ reCAPTCHA `siteverify`; quyết định `[CAPTCHA hợp lệ?]`: không → `400 CAPTCHA_REQUIRED` hoặc `CAPTCHA_FAILED` → Mobile báo lỗi, quay lại 12; có → 17. Không cần CAPTCHA → 17.
17. Server: so sánh mật khẩu bằng bcrypt (email không tồn tại vẫn so với hash giả). Quyết định `[mật khẩu đúng?]`:
    - sai → Server tăng bộ đếm; quyết định `[đạt 5 lần sai?]`: có → khóa 15 phút → `423 ACCOUNT_LOCKED` (Kết thúc lỗi); không → `401 INVALID_CREDENTIALS` (`captchaRequired = true` từ lần 3) → Mobile hiện thông báo chung "Email hoặc mật khẩu không đúng" → quay lại 12.
    - đúng → 18.
18. Quyết định `[bị quản trị viên khóa?]`: có → `403 ACCOUNT_DISABLED` (Kết thúc lỗi). Không → 19.
19. Quyết định `[email đã xác minh?]`: chưa → Server gửi OTP qua Brevo nếu chưa có mã còn hạn, trả `403 EMAIL_NOT_VERIFIED` → Mobile mở màn Verify email (UC038) (Kết thúc, chuyển sang UC038). Đã xác minh → 20.
20. Quyết định `[tài khoản bật 2FA?]`:
    - có → Server trả `twoFactorRequired` + `challengeToken` (hiệu lực 5 phút) → Mobile mở màn Two-factor → Guest nhập mã TOTP 6 số hoặc mã khôi phục → Mobile `POST /auth/2fa/verify` → Server kiểm tra; quyết định `[challenge hợp lệ?]`: không → `401 INVALID_CHALLENGE` → Mobile về Login (12). Có → quyết định `[mã đúng?]`: sai → `400 INVALID_CODE` (kèm `attemptsLeft`; sai lần 5 khóa tạm `423`) → Mobile báo lỗi, quay lại bước nhập mã; đúng (mã khôi phục dùng xong bị vô hiệu) → 21.
    - không → Server đặt lại bộ đếm sai → 21.
21. Server: tạo `Session` và cặp token (refresh token lưu SHA-256), ghi `LOGIN_SUCCESS`. Quyết định `[thiết bị mới?]`: có → tạo thông báo `SYSTEM` và gửi email cảnh báo qua Brevo (chạy song song, vẽ bằng thanh chia nhánh). → 22
22. Server: trả `AuthSessionDto`. Mobile: lưu token vào SecureStore, `GET /auth/me`, cập nhật session. → 10
10. Mobile: chuyển vào Home (SC-04). (Kết thúc thành công)

**Điểm kết thúc:** thành công = vào Home; lỗi = khóa tạm, tài khoản bị khóa, chuyển sang xác minh email, về Login sau khi phiên không hợp lệ.

---

## Hình 2.21 – AC-UC005 – Tìm kiếm khóa học

**Tệp:** `docs/uml/png/AC-UC005.png` · **Làn:** Learner · Mobile · Server.

1. (Bắt đầu) Learner: mở tab Search.
2. Mobile: hiển thị chế độ khám phá (SC-05): đọc "tìm kiếm gần đây" từ AsyncStorage (tối đa 10); `GET /tags/hot` → Server trả các thẻ nổi bật.
3. Learner: chọn một mục: gõ từ khóa, bấm tìm kiếm gần đây, hoặc bấm chủ đề nổi bật.
4. Quyết định `[nhập bằng cách gõ?]`: có → Mobile chờ 400 ms sau phím cuối (debounce; nếu gõ tiếp thì hủy chờ); không (chọn gợi ý hoặc Enter) → bỏ chờ. → 5
5. Quyết định `[từ khóa rỗng?]`: có → quay lại chế độ khám phá (2). Không → 6.
6. Mobile: `GET /courses?q=…&page=1&limit=20` (mặc định `sort=popular`). Quyết định `[offline?]`: có và có cache → hiện kết quả cache kèm banner offline; có và không cache → hiện lỗi mạng kèm "Thử lại" (Kết thúc lỗi). Không offline → 7.
7. Server: tách từ khóa (tối đa 5 từ); với mỗi từ, điều kiện khớp tên khóa hoặc phụ đề hoặc tên thẻ hoặc tên giảng viên, không phân biệt hoa thường; chỉ lấy `status = PUBLISHED`; sắp xếp; phân trang; trả danh sách và `meta.total`. Quyết định `[tham số hợp lệ?]`: không → `400 VALIDATION_ERROR` → Mobile hiện lỗi; có → 8.
8. Mobile: chuyển sang chế độ kết quả (SC-06). Quyết định `[có kết quả?]`: không → trạng thái rỗng "Không tìm thấy", gợi ý đổi từ khóa (Kết thúc, người dùng sửa từ khóa quay lại 3); có → hiển thị số kết quả và danh sách (FlashList). → 9
9. Mobile: lưu từ khóa vào danh sách tìm kiếm gần đây (loại trùng, tối đa 10).
10. Vòng lặp `[Learner cuộn tới cuối danh sách?]`: có và còn trang (`page < totalPages`) → Mobile `GET /courses?q=…&page=n+1` → Server trả trang kế → nối thêm vào danh sách → lặp; hết trang → dừng. Lỗi tải trang kế → hiện dòng "Thử lại" ở cuối danh sách.
11. Learner (tùy chọn): bấm "Filter" → chuyển sang UC006 (hoạt động con); bấm một thẻ → UC008 (Kết thúc, chuyển use case).

**Điểm kết thúc:** thành công = danh sách kết quả hiển thị; rỗng = trạng thái không có kết quả; lỗi = thông báo kèm Thử lại.

---

## Hình 2.22 – AC-UC008 – Xem chi tiết khóa học

**Tệp:** `docs/uml/png/AC-UC008.png` · **Làn:** Learner · Mobile · Server · Gemini (nhánh tóm tắt AI).

1. (Bắt đầu) Learner: bấm thẻ khóa học (từ Home, Search, danh mục hoặc thông báo).
2. Mobile: mở `course/[id]` (SC-09); nếu có cache thì hiển thị ngay.
3. Mobile → Server (thanh chia nhánh, ba lời gọi song song): `GET /courses/:id`, `GET /courses/:id/curriculum`, `GET /courses/:id/similar`.
4. Server: kiểm tra quyền xem khóa. Quyết định `[khóa PUBLISHED, hoặc người xem đã ghi danh, hoặc là chủ khóa, hoặc là Admin?]`: không → `404 COURSE_NOT_FOUND` → Mobile hiện "Không tìm thấy khóa học" (Kết thúc lỗi). Có → 5.
5. Server: ghép trạng thái từng bài theo BR-02 (`COMPLETED`, `IN_PROGRESS`, `UNLOCKED`, `LOCKED`), `isBookmarked`, `isLiked`, `isInCart`, thông tin ghi danh; trả dữ liệu. Quyết định `[lỗi mạng hoặc 5xx?]`: có → nếu có cache thì hiện cache kèm banner offline, nếu không thì hiện lỗi kèm "Thử lại" (Kết thúc lỗi).
6. Mobile: hiển thị phần đầu trang (ảnh, tiêu đề, nhãn Best-seller hoặc "x% Off" theo BR-10, điểm, số học viên), thanh hành động phía dưới và ba tab. Learner chọn tab (vòng lặp, các tab độc lập, vẽ thành ba nhánh song song):
   - **Tab Overview:** thẻ giảng viên (bấm → UC018), mô tả có "See more", danh sách lợi ích (dòng số giờ video tính từ tổng thời lượng, bỏ "Certificate"), khóa tương tự (bấm → mở lại bước 1 với khóa khác); nút "Tóm tắt khóa bằng AI": Mobile `GET /courses/:id/ai/summary` → Server tìm cache `AiContent`; quyết định `[cache hit?]`: có → trả ngay; không → kiểm tra hạn mức, gọi Gemini, lưu cache; quyết định `[AI lỗi?]` → hiện lỗi thân thiện kèm Thử lại (`429 AI_RATE_LIMITED`, `422 AI_BLOCKED`, `503 AI_UNAVAILABLE`), phần còn lại của trang vẫn dùng được.
   - **Tab Lessons:** accordion chương; mỗi bài hiện trạng thái. Learner bấm một bài: quyết định `[bài có cờ xem thử?]`: có → chuyển sang UC009; không → quyết định `[đã ghi danh?]`: có → chuyển UC014; chưa → toast "Hãy ghi danh khóa học này để mở khóa nội dung" (không gọi API phát video).
   - **Tab Review:** Mobile `GET /courses/:id/reviews`; hiển thị điểm trung bình, tổng số, phân bố; Learner chọn lọc theo sao → `GET /courses/:id/reviews?rating=n`; quyết định `[có đánh giá?]`: không → trạng thái rỗng; có → danh sách, bấm "Xem tất cả" → SC-10.
7. Learner bấm nút hành động ở thanh dưới. Quyết định (nhãn nút tính ở Mobile theo BR-17):
   - `[đã ghi danh]` "Continue learning" → UC014.
   - `[là chủ khóa]` "Open course" → mở màn Học ở chế độ chủ khóa.
   - `[giá 0]` "Enroll for free" → UC012 (luồng ghi danh trực tiếp).
   - `[đã có trong giỏ]` "Go to cart" → SC-12.
   - `[còn lại]` "Add to cart" → UC011.
8. Learner (tùy chọn, độc lập): bấm bookmark → UC010; tim hoặc chia sẻ → UC021.

**Điểm kết thúc:** thành công = chi tiết hiển thị và người dùng chuyển sang hành động kế tiếp; lỗi = 404 hoặc lỗi mạng.

---

## Hình 2.23 – AC-UC011 – Quản lý giỏ hàng

**Tệp:** `docs/uml/png/AC-UC011.png` · **Làn:** Learner · Mobile · Server.

**Nhánh thêm vào giỏ**

1. (Bắt đầu) Learner: ở trang chi tiết (nút "Add to cart") bấm thêm.
2. Mobile: quyết định `[offline?]`: có → toast offline (Kết thúc). Không → `POST /cart/items` `{courseId}`.
3. Server kiểm tra lần lượt (mỗi điều kiện không thỏa là một nhánh lỗi):
   - `[khóa không tồn tại hoặc chưa PUBLISHED?]` → `404 COURSE_NOT_FOUND`.
   - `[khóa của chính giảng viên?]` → `422 OWN_COURSE`.
   - `[đã ghi danh?]` → `409 ALREADY_ENROLLED`.
   - `[khóa miễn phí (giá 0)?]` → `422 FREE_COURSE` (Mobile hướng dẫn ghi danh trực tiếp, UC012).
   - `[đã có trong giỏ?]` → `409 ALREADY_IN_CART` (kể cả khi hai yêu cầu song song, nhờ khóa chính ghép).
   - Đạt cả → tạo `CartItem` → `201 {courseId, addedAt}`.
4. Mobile: với lỗi → toast thông báo tương ứng và đồng bộ lại nút (ví dụ đổi thành "Go to cart" nếu `ALREADY_IN_CART`); thành công → cập nhật nút thành "Go to cart", tăng huy hiệu giỏ.

**Nhánh xem và xóa**

5. Learner: mở giỏ hàng (SC-12). Mobile: `GET /cart`. Server: lấy các `CartItem` của người dùng có khóa `PUBLISHED` (khóa bị ẩn không hiện), sắp mới thêm trước; tính `totalCents` = tổng giá hiện tại. Quyết định `[lỗi tải?]` → lỗi kèm "Thử lại".
6. Quyết định `[giỏ rỗng?]`: có → trạng thái rỗng kèm nút "Khám phá khóa học" (Kết thúc). Không → hiển thị danh sách và tổng tiền.
7. Vòng lặp `[Learner bấm xóa một mục?]`: có → Mobile `DELETE /cart/items/:courseId` → Server `deleteMany` (idempotent) → `204` → Mobile cập nhật danh sách, tổng tiền, huy hiệu; quay lại bước 6 (giỏ có thể về rỗng).
8. Learner: bấm "Checkout" → chuyển sang UC012 (Kết thúc, chuyển use case).

**Điểm kết thúc:** giỏ cập nhật; hoặc chuyển sang thanh toán; hoặc báo lỗi.

---

## Hình 2.24 – AC-UC012 – Thanh toán và ghi danh

**Tệp:** `docs/uml/png/AC-UC012.png` · **Làn:** Learner · Mobile · Server · Payment Gateway (giả lập).

**Nhánh A – Thanh toán giỏ hàng**

1. (Bắt đầu) Learner: ở giỏ hàng bấm "Checkout".
2. Mobile: mở SC-13, hiển thị tóm tắt đơn và hai phương thức giả lập (`MOCK_CARD`, `MOCK_EWALLET`). Learner chọn phương thức và xác nhận thanh toán.
3. Mobile: quyết định `[offline?]` → toast offline (Kết thúc). Không → `POST /orders/checkout` `{paymentMethod}` (nút bị khóa trong lúc chờ để tránh bấm hai lần).
4. Server mở **một transaction** (khung bao quanh bước 4 đến 8):
   4. Đọc giỏ (chỉ khóa `PUBLISHED`). Quyết định `[có khóa của chính giảng viên?]`: có → rollback, `422 OWN_COURSE` (Kết thúc lỗi).
   5. Loại các khóa đã ghi danh (mua song song). Quyết định `[không còn dòng nào?]`: có → xóa các mục giỏ thừa, `422 CART_EMPTY` (Kết thúc lỗi).
   6. Tạo `Order` + `OrderItem` với giá hiện tại; tổng = tổng giá.
   7. Server gọi Payment Gateway (giả lập) xác nhận. Quyết định `[thanh toán thành công?]`:
      - **không** (chỉ khi cờ `simulateFailure` ở dev hoặc test; production bỏ qua cờ): đơn `FAILED` được lưu (commit), giữ nguyên giỏ, không ghi danh → `402 PAYMENT_FAILED` `{orderId}` → Mobile hiện màn "Thanh toán thất bại" kèm nút "Thử lại" (quay lại bước 2) (Kết thúc lỗi).
      - **có** → đơn `PAID`, `paidAt`.
   8. Tạo `Enrollment` cho từng khóa, tăng `enrollmentCount`, xóa toàn bộ giỏ, tạo thông báo `ORDER_PAID` (một khóa hoặc nhiều khóa). Commit.
9. Server: xóa cache Home; trả `201 {order, enrolledCourseIds}`.
10. Mobile: làm mới `cart`, `me/courses`, thông báo; hiển thị màn "Thanh toán thành công". Quyết định `[Learner chọn gì?]`: "Học ngay" → UC014; "Khóa học của tôi" → UC013. (Kết thúc thành công)

**Nhánh B – Ghi danh khóa miễn phí (đường tắt, vẽ ở phía trên bước 1)**

B1. Learner: ở trang chi tiết bấm "Enroll for free". Mobile: `POST /courses/:id/enroll`.
B2. Server kiểm tra: `[khóa không tồn tại hoặc chưa PUBLISHED]` → `404 COURSE_NOT_FOUND`; `[khóa của chính mình]` → `422 OWN_COURSE`; `[giá lớn hơn 0]` → `422 PAID_COURSE` (hướng người dùng dùng giỏ); `[đã ghi danh]` → `409 ALREADY_ENROLLED`. Đạt cả → trong một transaction tạo `Enrollment` và tăng `enrollmentCount` → `201 {courseId, progressPercent: 0, lastLessonId: null}`.
B3. Mobile: đổi nút thành "Continue learning", làm mới "Khóa học của tôi" (Kết thúc thành công).

---

## Hình 2.25 – AC-UC014 – Học bài qua video và lưu tiến độ

**Tệp:** `docs/uml/png/AC-UC014.png` · **Làn:** Learner · Mobile · Server · YouTube/nguồn video.

1. (Bắt đầu) Learner: chọn khóa từ "Khóa học của tôi" hoặc "Continue learning".
2. Mobile: mở `learn/[courseId]` (SC-15); `GET /courses/:id/curriculum` và `GET /lessons/:id` (bài `lastLessonId`, hoặc bài đầu nếu chưa có).
3. Server: quyết định `[bài tồn tại?]`: không → `404 LESSON_NOT_FOUND`. Quyết định `[đã ghi danh, hoặc chủ khóa hoặc Admin, hoặc bài có cờ xem thử?]`: không → `403 NOT_ENROLLED` (không trả `videoUrl`) → Mobile chuyển về trang chi tiết khóa kèm toast "Hãy ghi danh khóa học này…" (Kết thúc lỗi). Có → 4.
4. Server: nếu đã ghi danh, cập nhật `lastLessonId` và `lastAccessedAt`; trả `videoUrl`, `positionSec`, `isCompleted`, `nextLessonId`.
5. Mobile: dựng trình phát (YouTube nhúng hoặc MP4); quyết định `[video tải được?]`: không → khung lỗi kèm "Thử lại" (nhánh lỗi, quay lại 2 khi bấm); có → seek tới `positionSec` và phát.
6. **Vòng lặp theo dõi tiến độ** (khung lặp, chạy trong lúc phát):
   6a. Mỗi 10 giây (và khi tạm dừng, đổi bài, rời màn hình, ứng dụng xuống nền): Mobile gọi `PUT /lessons/:id/progress` `{positionSec}`.
   6b. Quyết định `[offline?]`: có → lưu mục mới nhất của bài vào hàng đợi AsyncStorage (mỗi bài một mục, ghi đè); khi có mạng lại tự gửi (mục cũ hơn 30 ngày bị bỏ, chỉ gửi bằng token của đúng chủ mục). Không → gửi.
   6c. Server (transaction, khóa hàng ghi danh `FOR UPDATE`): quyết định `[đã ghi danh?]`: không → `403 NOT_ENROLLED`. Làm tròn và kẹp `positionSec` trong khoảng 0 đến thời lượng; upsert `LessonProgress`.
   6d. Quyết định `[vị trí từ 90% thời lượng hoặc video phát hết?]` (Mobile): có → gửi thêm `isCompleted: true`; không → tiếp tục vòng lặp.
7. Server khi nhận `isCompleted: true` lần đầu cho bài: quyết định `[bài đã hoàn thành trước đó?]`: có → giữ nguyên (không bỏ hoàn thành). Không → đếm số bài xong và tổng số bài; `progressPercent` = round(xong ÷ tổng × 100); cập nhật ghi danh. Quyết định `[đạt 100%?]`: có → ghi `completedAt` và tạo thông báo `COURSE_COMPLETED` (một lần).
8. Server trả `{lessonProgress, courseProgressPercent}`. Mobile: làm mới danh sách bài (dấu ✓), "Khóa học của tôi", và nếu đạt 100% thì thống kê hồ sơ và thông báo.
9. Quyết định `[còn bài kế tiếp (nextLessonId)?]`: có → Mobile tự chuyển sang bài kế → quay lại bước 2 cho bài mới; không → hiện trạng thái hoàn thành khóa (Kết thúc thành công).
10. **Nhánh mở rộng song song** (hộp "Hoạt động con", Learner chọn ở các tab/thẻ của màn Học): tab Q&A → UC016; tab Projects → UC017; viết đánh giá → UC015; thẻ AI Tutor → UC043; tóm tắt và quiz → UC044.
11. Chủ khóa hoặc Admin: ở bước 3 được vào không cần ghi danh; vòng lặp 6 **không** ghi tiến độ (nhánh ngắn, vẽ ghi chú).

---

## Hình 2.26 – AC-UC016 – Hỏi đáp (Q&A)

**Tệp:** `docs/uml/png/AC-UC016.png` · **Làn:** Learner · Mobile · Server · (Giảng viên của khóa, chỉ ghi chú).

1. (Bắt đầu) Learner: mở tab Q&A trong màn Học.
2. Mobile: `GET /courses/:id/questions` (mới nhất trước). Server: quyết định `[khóa tồn tại?]` không → `404 COURSE_NOT_FOUND`. Quyết định `[là giảng viên của khóa?]`: có → được vào; không → quyết định `[đã ghi danh?]`: không → `403 NOT_ENROLLED` → Mobile chuyển về trang chi tiết khóa (Kết thúc lỗi). Có → trả danh sách phân trang kèm `isLiked`.
3. Mobile: quyết định `[có câu hỏi?]`: không → trạng thái rỗng khuyến khích đặt câu hỏi đầu tiên; có → hiển thị danh sách (câu có câu trả lời được ghim hiện dấu).
4. Learner chọn một trong ba hoạt động (nhánh song song, có thể lặp):
   - **Đặt câu hỏi:** nhập nội dung (có thể chèn emoji nhanh). Mobile quyết định `[1 đến 1000 ký tự?]` không → lỗi dưới ô nhập. Có → `POST /courses/:id/questions` → Server kiểm tra quyền như bước 2 → tạo `Question`, tăng số liệu → `201` → Mobile thêm vào đầu danh sách.
   - **Thích:** Mobile cập nhật ngay (optimistic) → `PUT` hoặc `DELETE /questions/:id/like` → Server tạo hoặc xóa, trả `{likeCount, isLiked}`; quyết định `[lỗi?]` → Mobile hoàn tác và toast lỗi.
   - **Mở câu hỏi** (SC-16): `GET /questions/:id` và `GET /questions/:id/answers`; quyết định `[câu hỏi tồn tại?]` không → `404 QUESTION_NOT_FOUND`. Hiển thị câu hỏi và các trả lời (trả lời được ghim xếp đầu, trả lời của giảng viên có huy hiệu). Learner nhập trả lời → quyết định `[1 đến 1000 ký tự?]` → `POST /questions/:id/answers` → Server kiểm tra quyền (đã ghi danh hoặc giảng viên của khóa), tạo `Answer`; quyết định `[người trả lời khác người hỏi?]`: có → tạo thông báo `NEW_ANSWER` cho người hỏi (một thanh chia nhánh); trả `201` → Mobile cập nhật danh sách trả lời và số trả lời.
5. Quyết định `[offline?]` ở mọi thao tác ghi: có → chặn và toast offline.

**Điểm kết thúc:** danh sách hoặc chi tiết cập nhật; lỗi quyền chuyển về trang khóa.

---

## Hình 2.27 – AC-UC017 – Nộp project và tải tài liệu

**Tệp:** `docs/uml/png/AC-UC017.png` · **Làn:** Learner · Mobile · Server · (Giảng viên, chỉ ghi chú cho bước chấm).

1. (Bắt đầu) Learner: mở tab Projects trong màn Học.
2. Mobile (chia nhánh song song): `GET /courses/:id/project` và `GET /courses/:id/submissions`. Server: quyết định `[khóa tồn tại?]` không → `404 COURSE_NOT_FOUND`; quyết định `[đã ghi danh?]` không → `403 NOT_ENROLLED` (Kết thúc lỗi). Có → trả mô tả, danh sách tài liệu, số bài nộp, danh sách bài nộp (mới nhất trước; bài đã chấm có điểm và nhận xét).
3. Mobile: hiển thị mô tả, tài liệu, bài nộp của cả lớp (rỗng thì trạng thái rỗng).
4. **Nhánh tải tài liệu:** Learner bấm tải một tài liệu → Mobile tải tệp về bộ nhớ đệm có phần trăm tiến độ → quyết định `[tải được?]`: có → mở bảng chia sẻ hệ điều hành; không (offline hoặc nền tảng không hỗ trợ) → toast lỗi "Không tải được tệp này" (Kết thúc nhánh).
5. **Nhánh nộp bài:** Learner bấm "Nộp bài" → Mobile mở form SC-17: nhập tiêu đề, mô tả, chọn tệp, chọn ảnh bìa (tùy chọn).
6. Mobile kiểm tra phía client. Quyết định `[thiếu tiêu đề hoặc tiêu đề dài hơn 100 ký tự hoặc mô tả dài hơn 1000 ký tự?]` → lỗi dưới ô. Quyết định `[chưa chọn tệp?]` → lỗi. Quyết định `[loại tệp ngoài PDF, ZIP, PNG, JPG, TXT?]` → báo "loại tệp không được hỗ trợ". Quyết định `[tệp lớn hơn 10 MB?]` → báo "tệp quá lớn". Các nhánh lỗi quay lại bước 5.
7. Mobile: quyết định `[offline?]` có → chặn tải lên, toast offline. Không → `POST /courses/:id/submissions` (multipart) với thanh tiến độ tải lên.
8. Server: quyết định `[đã ghi danh?]` không → `403 NOT_ENROLLED`. Quyết định `[quá 10 MB?]` → `413 FILE_TOO_LARGE`. Quyết định `[loại tệp ngoài danh sách cho phép hoặc ảnh bìa không phải PNG, JPG?]` → `415 UNSUPPORTED_FILE_TYPE`. Quyết định `[thiếu tệp hoặc tiêu đề?]` → `400 VALIDATION_ERROR`. Đạt cả → lưu tệp tên ngẫu nhiên vào `uploads`, tạo `ProjectSubmission` → `201`.
9. Mobile: đóng form, thêm bài nộp vào danh sách, tăng số bài nộp.
10. (Ghi chú) Khi giảng viên chấm (UC028): bài nộp hiển thị điểm, nhận xét và học viên nhận thông báo `PROJECT_GRADED`.

---

## Hình 2.28 – AC-UC022 – Quản lý khóa học của tôi

**Tệp:** `docs/uml/png/AC-UC022.png` · **Làn:** Teacher · Mobile · Server.

1. (Bắt đầu) Teacher: mở tab "Giảng dạy" (SC-23).
2. Mobile: `GET /teacher/courses?status=&page=`. Server: quyết định `[là TEACHER?]` không → `403 FORBIDDEN`. Trả danh sách khóa của chính giảng viên kèm tóm tắt. Mobile: quyết định `[có khóa?]` không → trạng thái rỗng kèm nút "Tạo khóa mới"; có → danh sách với chip trạng thái và bộ lọc trạng thái.
3. Teacher chọn một trong ba hoạt động:
   - **Tạo khóa mới:** Mobile mở wizard bước Ý tưởng (SC-24). Teacher nhập tên khóa (5–120 ký tự), danh mục, trình độ; (tùy chọn) mở sheet AI gợi ý → hoạt động con UC026. Bấm Tiếp. Mobile quyết định `[dữ liệu hợp lệ?]` không → lỗi dưới ô. Có → `POST /teacher/courses`. Server kiểm tra: `[danh mục không tồn tại]` → `404 NOT_FOUND`; tạo khóa `DRAFT` thuộc hồ sơ giảng viên → trả chi tiết. Mobile ghi `?step=` lên URL.
   - **Sửa khóa:** Teacher chọn khóa → wizard bước Giới thiệu, rồi Giá và thẻ (và bước Bài học: hoạt động con UC023; bước Xem lại: hoạt động con UC024). Mỗi lần bấm Tiếp: `PATCH /teacher/courses/:id`. Ảnh bìa: `POST /teacher/uploads/image`; quyết định ở Server `[PNG hoặc JPG và nhỏ hơn hoặc bằng 5 MB?]` không → `415 UNSUPPORTED_FILE_TYPE` hoặc `413 FILE_TOO_LARGE`. Server cho `PATCH`: quyết định `[khóa của giảng viên này?]` không → `404 COURSE_NOT_FOUND`. Quyết định `[trạng thái DRAFT, REJECTED hoặc PUBLISHED?]` không (đang chờ duyệt hoặc đã ẩn) → `422 INVALID_COURSE_STATE`. Quyết định `[khóa PUBLISHED và request đổi trường lớn (tiêu đề, giá, giá gốc, danh mục, thẻ)?]` có → `422 REVISION_REQUIRED` `{fields}` → Mobile hướng dẫn tạo bản sửa đổi (UC025). Không → lưu; trường nhỏ của khóa PUBLISHED áp dụng ngay. Tải lại trang (F5): quyết định `[có thay đổi chưa lưu?]` có → hộp thoại cảnh báo bỏ thay đổi.
   - **Xóa nháp:** Teacher bấm xóa → Mobile hỏi xác nhận → `DELETE /teacher/courses/:id`. Server: quyết định `[PENDING_REVIEW?]` có → `422 INVALID_COURSE_STATE` (phải rút lại); quyết định `[có học viên ghi danh?]` có → `409 COURSE_HAS_ENROLLMENTS`; quyết định `[từng xuất bản hoặc đang PUBLISHED hoặc ARCHIVED?]` có → `422 INVALID_COURSE_STATE` (chỉ được ẩn, UC031). Không → xóa → `204` → Mobile quay về danh sách và cập nhật.
4. (Kết thúc) khóa nháp được tạo, cập nhật hoặc xóa; hoặc báo lỗi tương ứng.

---

## Hình 2.29 – AC-UC024 – Gửi duyệt khóa học

**Tệp:** `docs/uml/png/AC-UC024.png` · **Làn:** Teacher · Mobile · Server · Admin (chỉ ghi chú ở nhánh duyệt).

1. (Bắt đầu) Teacher: mở bước Xem lại của wizard (SC-24).
2. Mobile: hiển thị thẻ xem trước khóa và checklist; mục còn thiếu có liên kết nhảy đúng bước. Quyết định `[checklist đủ?]` (tính ở phía client để bật hoặc tắt nút): chưa đủ → nút "Gửi duyệt" mờ; Teacher bấm liên kết tới bước thiếu để sửa rồi quay lại 2. Đủ → nút sáng.
3. Teacher bấm "Gửi duyệt". Mobile: `POST /teacher/courses/:id/submit`.
4. Server: quyết định `[khóa của giảng viên này?]` không → `404 COURSE_NOT_FOUND`. Quyết định `[trạng thái DRAFT hoặc REJECTED?]` không → `422 INVALID_COURSE_STATE`.
5. Server chạy checklist BR-20. Quyết định `[thiếu mục nào?]`: có → `422 COURSE_INCOMPLETE` `{missing[]}` (các mã `TITLE_LENGTH`, `DESCRIPTION_TOO_SHORT`, `NO_THUMBNAIL`, `NO_CATEGORY`, `NO_SECTION`, `NOT_ENOUGH_LESSONS`, `LESSON_VIDEO_INVALID`, `LESSON_DURATION_INVALID`, `PREVIEW_COUNT`, `PRICE_INVALID`, `ORIGINAL_PRICE_INVALID`) → Mobile mở đúng bước chứa mục thiếu (Kết thúc lỗi, quay lại 2). Không thiếu → 6.
6. Server (transaction, cập nhật có điều kiện `status IN (DRAFT, REJECTED)`): quyết định `[cập nhật được 1 dòng?]`: không (có yêu cầu song song đã chuyển trạng thái) → `422 INVALID_COURSE_STATE`. Có → `status = PENDING_REVIEW`, `submittedAt = now`, ghi `CourseModeration` hành động `SUBMITTED` mục tiêu `COURSE`. Trả chi tiết khóa.
7. Mobile: chuyển sang trang trạng thái (SC-26): chip "Chờ duyệt", lịch sử "Đã gửi duyệt", nút "Rút lại khỏi hàng chờ".
8. Teacher chọn (hoặc chờ): quyết định `[Teacher rút lại?]`: có → `POST /teacher/courses/:id/withdraw` → Server: quyết định `[trạng thái PENDING_REVIEW?]` không → `422 INVALID_COURSE_STATE`; có → `DRAFT`, ghi `WITHDRAWN` → Mobile hiện chip "Nháp" (Kết thúc). Không → chờ quản trị viên (UC032).
9. Kết quả duyệt (hộp "Hoạt động con" UC032, Admin): `[được duyệt]` → trạng thái `PUBLISHED`; Teacher nhận thông báo và email → (Kết thúc thành công). `[bị từ chối]` → trạng thái `REJECTED`; trang trạng thái hiện lý do; Teacher sửa (quay lại wizard, bước 1) rồi gửi lại (vòng lặp về 3).
10. (Ghi chú, nhánh tương tự cho bản sửa đổi) Khóa `PUBLISHED` có bản sửa đổi đi qua `POST /teacher/courses/:id/revision/submit` cùng checklist (UC025).

---

## Hình 2.30 – AC-UC026 – AI hỗ trợ soạn khóa học

**Tệp:** `docs/uml/png/AC-UC026.png` · **Làn:** Teacher · Mobile · Server · Gemini.

1. (Bắt đầu) Teacher: ở bước Ý tưởng (hoặc "Viết giúp" ở bước Giới thiệu, hoặc "Gợi ý dàn ý bằng AI" ở bước Bài học), bấm mở sheet AI (SC-27).
2. Teacher: nhập chủ đề (3–200 ký tự), chọn trình độ (beginner, intermediate, advanced), chọn ngôn ngữ; bấm "Tạo gợi ý". Mobile quyết định `[hợp lệ?]` không → lỗi dưới ô. Có → hiện trạng thái loading.
3. Mobile: `POST /teacher/ai/course-draft` `{topic, level, lang}`. Quyết định `[offline?]` có → toast offline (Kết thúc).
4. Server: `requireRole(TEACHER)`; validate; đọc danh sách danh mục hiện có (cache 60 giây). Tìm `AiContent` loại `COURSE_DRAFT` theo (chủ đề, trình độ, ngôn ngữ). Quyết định `[cache hit?]`: có → 9.
5. Không: Server kiểm tra hạn mức (giờ, ngày của người dùng, ngày toàn hệ thống). Quyết định `[còn hạn mức?]`: không → `429 AI_RATE_LIMITED` `{retryAfterSec}` → Mobile báo lỗi kèm thời gian chờ (Kết thúc lỗi, Teacher có thể soạn tay).
6. Server → Gemini (qua lớp provider): gửi chủ đề, trình độ, ngôn ngữ, tên các danh mục. Quyết định `[Gemini phản hồi?]`: model chính lỗi hoặc quá thời gian → thử model dự phòng (một nửa thời gian chờ mỗi model); vẫn lỗi hoặc thiếu khóa → hoàn lại lượt, `503 AI_UNAVAILABLE` → Mobile báo lỗi thân thiện kèm "Thử lại" (Kết thúc lỗi); bị bộ lọc an toàn chặn → hoàn lượt, `422 AI_BLOCKED` → Mobile báo (Kết thúc lỗi).
7. Server: chuẩn hóa kết quả theo giới hạn DTO (phụ đề, mô tả 100–1500 ký tự, 3–6 lợi ích, danh mục, 3–6 chương, mỗi chương 2–5 bài). Quyết định `[hợp lệ sau chuẩn hóa?]`: không → hoàn lượt, `503 AI_UNAVAILABLE` (không cache). Có → 8.
8. Server: lưu `AiContent` (cache). → 9
9. Server: đối chiếu tên danh mục với danh sách hiện tại (không thấy thì `categoryId = null`); trả `AiCourseDraftDto`.
10. Mobile: hiển thị các thẻ gợi ý (danh mục, phụ đề, mô tả, lợi ích, dàn ý). Vòng lặp `[Teacher thao tác?]`:
    - sửa chữ trong gợi ý;
    - bấm "Áp dụng" một thẻ → điền vào form wizard (chưa lưu), thẻ hiện "Đã áp dụng";
    - bấm "Tạo lại" → quay lại 2.
11. Quyết định `[đã áp dụng hết các phần?]`: có → nút "Tiếp tục sang bước sau" → Mobile `POST /teacher/courses` nếu chưa có nháp (tiêu đề lấy từ chủ đề nếu trống) hoặc `PATCH`, rồi chuyển bước kế (Kết thúc thành công). Không → Teacher đóng sheet và tự lưu bằng nút Tiếp (BR-29: AI không tự lưu).

---

## Hình 2.31 – AC-UC028 – Chấm điểm và nhận xét project

**Tệp:** `docs/uml/png/AC-UC028.png` · **Làn:** Teacher · Mobile · Server · Learner (chỉ nhận thông báo).

1. (Bắt đầu) Teacher: mở màn Bài nộp của một khóa (SC-29).
2. Mobile: `GET /teacher/courses/:id/submissions?status=all|graded|ungraded`. Server: quyết định `[khóa của giảng viên này?]` không → `404 COURSE_NOT_FOUND` (Kết thúc lỗi). Có → trả danh sách và `meta.summary {gradedCount, ungradedCount}`.
3. Mobile: quyết định `[có bài nộp?]` không → trạng thái rỗng; có → danh sách (chip lọc Tất cả, Đã chấm, Chưa chấm).
4. Teacher: mở một bài nộp (xem tệp, ảnh bìa, mô tả) rồi mở bảng chấm điểm (nếu đã chấm: điền sẵn điểm cũ, nút "Sửa điểm").
5. Teacher: nhập điểm và nhận xét. Mobile quyết định `[điểm là số nguyên từ 0 đến 100 và nhận xét từ 1 đến 2000 ký tự?]`: không → lỗi "Điểm phải là số nguyên từ 0 đến 100", không gọi API, quay lại 5. Có → 6.
6. Mobile: quyết định `[offline?]` có → chặn. Không → `PUT /teacher/submissions/:id/grade` `{grade, feedback}`.
7. Server: quyết định `[bài nộp tồn tại?]` không → `404 NOT_FOUND`. Quyết định `[người gọi là giảng viên của khóa chứa bài nộp?]` không → `403 NOT_COURSE_TEACHER`. Quyết định `[dữ liệu hợp lệ (điểm nguyên 0–100, nhận xét 1–2000)?]` không → `400 VALIDATION_ERROR`.
8. Server (một transaction): cập nhật `grade`, `feedback`, `gradedAt = now` (ghi đè nếu chấm lại); tạo thông báo `PROJECT_GRADED` cho học viên nộp bài. Commit. Trả bài nộp đã cập nhật.
9. Mobile: toast "Học viên đã nhận thông báo"; cập nhật dòng bài nộp (điểm, nút "Sửa điểm") và bộ đếm đã chấm.
10. (Ghi chú, làn Learner) Học viên thấy thông báo `PROJECT_GRADED` (UC020) và thẻ bài nộp có điểm, nhận xét (UC017).
11. Quyết định `[Teacher chấm bài khác?]`: có → quay lại 4; không → (Kết thúc).

---

## Hình 2.32 – AC-UC032 – Duyệt hoặc từ chối khóa học

**Tệp:** `docs/uml/png/AC-UC032.png` · **Làn:** Admin · Mobile · Server · Brevo SMTP · (Teacher và Learner chỉ nhận kết quả).

1. (Bắt đầu) Admin: mở tab "Quản trị" rồi "Hàng chờ duyệt" (SC-32).
2. Mobile: `GET /admin/courses?type=course|revision&status=`. Server: quyết định `[là ADMIN?]` không → `403 FORBIDDEN`. Trả danh sách kèm số mục chờ. Mobile: hai tab "Khóa học mới" và "Bản sửa đổi"; quyết định `[hàng chờ trống?]` có → trạng thái rỗng (Kết thúc).
3. Admin: chọn một mục. Mobile: `GET /admin/courses/:id`; quyết định `[khóa tồn tại?]` không → `404 COURSE_NOT_FOUND`. Server trả nội dung, chương và bài, lịch sử duyệt, và nếu là bản sửa đổi thì khối so sánh (giá trị cũ, giá trị mới).
4. Admin (tùy chọn): bấm "Chạy kiểm tra AI" → hoạt động con UC033; kết quả chỉ để tham khảo.
5. Quyết định `[Admin quyết định gì?]`:

**Nhánh Duyệt**

6a. Admin bấm "Duyệt". Mobile: `POST /admin/courses/:id/approve`.
7a. Server: xác định đối tượng chờ. Quyết định `[khóa PENDING_REVIEW, hoặc PUBLISHED có bản sửa đổi PENDING_REVIEW?]` không → `422 INVALID_COURSE_STATE` (Kết thúc lỗi; ví dụ hai Admin bấm cùng lúc). Có → chạy lại checklist BR-20 trên nội dung hiện tại. Quyết định `[đạt?]` không → `422 COURSE_INCOMPLETE` `{missing[]}` (Kết thúc lỗi).
8a. Server (một transaction, có điều kiện trạng thái): quyết định `[đối tượng là khóa mới?]`:
    - có → `status = PUBLISHED`; quyết định `[publishedAt còn rỗng (xuất bản lần đầu)?]`: có → đặt `publishedAt`, tạo thông báo `NEW_COURSE` hàng loạt cho người theo dõi giảng viên (UC036); không → bỏ qua.
    - không (bản sửa đổi) → xóa bản sửa đổi và áp dụng nội dung vào khóa (bài giữ `id` thì cập nhật, bài bị bỏ thì xóa, bài mới thì tạo; tính lại số bài, thời lượng, tiến độ).
    Ghi `CourseModeration` `APPROVED`; tạo thông báo `COURSE_APPROVED` (hoặc `REVISION_APPROVED`) cho giảng viên. Commit.
9a. Sau commit, Server: xóa cache Home; gửi email kết quả qua Brevo ở nền; quyết định `[gửi email lỗi?]` có → chỉ ghi log, không hủy việc duyệt. Trả chi tiết khóa.
10a. Mobile: toast "Đã duyệt khóa học", cập nhật trạng thái (Kết thúc thành công).

**Nhánh Từ chối**

6b. Admin bấm "Từ chối" → Mobile mở hộp thoại nhập lý do. Quyết định `[lý do từ 5 đến 500 ký tự?]` không → lỗi "Nhập ít nhất 5 ký tự", quay lại hộp thoại. Có → `POST /admin/courses/:id/reject` `{reason}`.
7b. Server: kiểm tra đối tượng chờ (như 7a, không chạy checklist). Server (một transaction): khóa mới → `REJECTED`; bản sửa đổi → `REJECTED`. Ghi `CourseModeration` `REJECTED` kèm lý do; tạo thông báo `COURSE_REJECTED` (hoặc `REVISION_REJECTED`) kèm lý do cho giảng viên. Commit.
8b. Server: gửi email từ chối qua Brevo ở nền (lỗi chỉ ghi log). Trả chi tiết khóa.
9b. Mobile: quay về hàng chờ (Kết thúc). (Teacher thấy trạng thái Bị từ chối kèm lý do và sửa gửi lại, UC024.)

---

## Hình 2.33 – AC-UC033 – Xem AI kiểm duyệt sơ bộ

**Tệp:** `docs/uml/png/AC-UC033.png` · **Làn:** Admin · Mobile · Server · Gemini.

1. (Bắt đầu) Admin: đang xem chi tiết một khóa (SC-33), bấm "Chạy kiểm tra AI".
2. Mobile: hiện trạng thái loading trong panel AI; `GET /admin/courses/:id/ai-review?lang=` (ngôn ngữ của Admin).
3. Server: `requireRole(ADMIN)`; quyết định `[là ADMIN?]` không → `403 FORBIDDEN` (Kết thúc lỗi). Nạp nội dung cần kiểm tra: quyết định `[khóa tồn tại?]` không → `404 COURSE_NOT_FOUND`. Đối tượng kiểm tra là khóa, hoặc bản sửa đổi đang chờ nếu có.
4. Server: tính mã băm nội dung và tìm `AiContent` loại `COURSE_REVIEW` theo (khóa, mã băm, ngôn ngữ). Quyết định `[cache hit?]`: có → 8 (không tốn lượt AI).
5. Không: Server kiểm tra hạn mức. Quyết định `[còn hạn mức?]`: không → `429 AI_RATE_LIMITED` `{retryAfterSec}` → Mobile báo lỗi (Kết thúc lỗi; Admin vẫn duyệt hoặc từ chối được).
6. Server → Gemini: gửi nội dung khóa (tiêu đề, mô tả, chương trình, giá) và ngôn ngữ. Quyết định `[Gemini phản hồi?]`: bị bộ lọc an toàn chặn → hoàn lượt, `422 AI_BLOCKED`; lỗi, quá thời gian (đã thử model dự phòng) hoặc thiếu khóa → hoàn lượt, `503 AI_UNAVAILABLE`. Cả hai → Mobile hiện lỗi thân thiện kèm "Thử lại" (Kết thúc lỗi).
7. Server: chuẩn hóa kết quả (tối đa 10 vấn đề, tóm tắt tối đa 600 ký tự). Quyết định `[hợp lệ?]`: không → hoàn lượt, `503 AI_UNAVAILABLE`, không cache. Có → lưu `AiContent`.
8. Server: trả `AiCourseReviewDto` (`verdict`, `summary`, `issues[]` gồm `severity` low, medium, high, `area`, `message`, cùng `model`, `generatedAt`).
9. Mobile: quyết định `[verdict?]`: `LOOKS_OK` → nhãn "Có vẻ ổn"; `NEEDS_ATTENTION` → nhãn "Cần chú ý". Hiển thị nhận định; quyết định `[danh sách vấn đề rỗng?]`: có → "AI không phát hiện vấn đề nào"; không → danh sách vấn đề theo mức độ và phần; hiện "Tạo bởi <model>" và lưu ý "chỉ mang tính tham khảo".
10. Admin: đọc nhận định rồi tự quyết định → chuyển sang bước 5 của AC-UC032 (duyệt hoặc từ chối). (Kết thúc.) AI không đổi trạng thái khóa (BR-29).

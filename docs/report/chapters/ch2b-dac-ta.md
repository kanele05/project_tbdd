## 2.6 Đặc tả use case

### 2.6.1 Cách đọc các bảng đặc tả

Mục này đặc tả **đủ 37 use case** UC001 đến UC037 (tương ứng UC-01…UC-37 trong PLAN.md §6.2 và §2.4.2). Mỗi use case là một bảng theo mẫu của báo cáo gồm các dòng: *Mã UC, Tên use case, Tác nhân, Mô tả, Điều kiện tiên quyết, Điều kiện sau, Luồng sự kiện chính, Luồng thay thế và ngoại lệ, Quy tắc nghiệp vụ, Yêu cầu liên quan, Màn hình*. Nội dung được đối chiếu với mã nguồn thật (`server/src/modules/**`, `mobile/src/features/**`) tại thời điểm đóng băng mã nguồn ngày 24/10/2026, không chỉ chép từ kế hoạch.

Quy ước dùng trong các bảng:

- **Mã lỗi** (ví dụ `NOT_ENROLLED`, `EMAIL_TAKEN`) là mã nghiệp vụ trả về trong phần `error.code` của phản hồi lỗi, kèm mã HTTP; bảng mã đầy đủ ở PLAN.md §9.4 và `server/src/lib/errorCodes.ts`.
- **BR-xx** là quy tắc nghiệp vụ (mục 2.9), **FR-xx** là yêu cầu chức năng (mục 2.7), **SC-xx** là mã màn hình theo PLAN.md §7.1 và §2.4.7. Các màn hình xác thực mở rộng của giai đoạn 2 (xác minh email, quên và đặt lại mật khẩu, xác thực hai bước, cài đặt, bảo mật, AI Tutor, bài quiz AI) chưa được đánh mã SC trong kế hoạch nên được ghi theo tên màn hình và đường dẫn (route) trong `mobile/app/`.
- Mọi thao tác ghi dữ liệu đều có thêm các ngoại lệ chung, không nhắc lại ở từng bảng: `401 UNAUTHORIZED` khi token thiếu hoặc hết hạn (ứng dụng tự gọi `POST /auth/refresh`, thất bại thì về màn Login), `400 VALIDATION_ERROR` khi dữ liệu vào sai định dạng, `429 RATE_LIMITED` khi vượt giới hạn tốc độ, `500 INTERNAL_ERROR` và mất kết nối mạng (ứng dụng chặn thao tác ghi khi offline và hiện thông báo; xem FR-24).
- Tác nhân **Teacher** và **Admin** kế thừa **Learner** (generalization, PLAN.md §2.4.1): họ làm được mọi thao tác của học viên, trừ việc mua hoặc ghi danh khóa của chính mình (BR-23).

**Use case bổ sung của giai đoạn 2.** Ngoài 37 use case của PLAN.md, báo cáo có thêm tám use case UC038 đến UC045 cho các chức năng giai đoạn 2 của Học viên (Bảng 2.8 ở mục 2.5.2): xác minh email OTP (UC038), quên và đặt lại mật khẩu (UC039), bật hoặc tắt 2FA và đăng nhập hai bước (UC040), quản lý phiên và thiết bị (UC041), cài đặt ngôn ngữ và giao diện (UC042), hỏi AI Tutor (UC043), tóm tắt và làm quiz AI (UC044), xem gợi ý lộ trình AI (UC045). Các use case này được đặc tả ở mục 2.6.5 và liên kết với use case gốc theo quan hệ ở Bảng 2.9: UC001 `include` UC038; UC002 `extend` UC039 và UC040; UC014 `extend` UC043 và UC044; UC008 `extend` UC044 (tóm tắt khóa học); UC004 dẫn tới UC045. Mục 2.6 sắp xếp theo mã use case để dễ tra cứu.

**Use case lõi có biểu đồ hoạt động.** Mười bốn use case lõi (UC002, UC005, UC008, UC011, UC012, UC014, UC016, UC017, UC022, UC024, UC026, UC028, UC032, UC033) có thêm **biểu đồ hoạt động** (AC-UCxxx) ngay sau bảng đặc tả và **biểu đồ tuần tự** (SQ-UCxxx) ở Chương 3 mục 3.8. Các use case còn lại chỉ có bảng đặc tả. Mô tả chi tiết để vẽ từng biểu đồ hoạt động nằm trong `docs/report/figures/ch2b.md`.

### 2.6.2 Nhóm Học viên: tài khoản và khám phá khóa học

**Bảng 2.20 – Đặc tả UC001 – Đăng ký tài khoản**

| Mục | Nội dung |
|---|---|
| Mã UC | UC001 |
| Tên use case | Đăng ký tài khoản |
| Tác nhân | Guest. Hệ thống ngoài: Google reCAPTCHA, Brevo SMTP |
| Mô tả | Người dùng mới tạo tài khoản bằng họ tên, email, mật khẩu, chọn vai trò Học viên hoặc Giảng viên. Hệ thống không cấp token ngay khi đăng ký: tài khoản chỉ dùng được sau khi xác minh email bằng mã OTP 6 số (UC038, quan hệ `include`). |
| Điều kiện tiên quyết | Người dùng chưa đăng nhập; thiết bị có kết nối mạng; email chưa được dùng cho tài khoản khác. |
| Điều kiện sau | Thành công: có bản ghi `User` (vai trò STUDENT hoặc TEACHER; giảng viên có kèm `TeacherProfile` rỗng), email được đánh dấu đã xác minh, một phiên đăng nhập mới được tạo (access token 15 phút, refresh token 30 ngày) và ứng dụng vào Home. Thất bại: không tạo phiên; tài khoản chưa xác minh vẫn còn trong CSDL và có thể xác minh sau. |
| Luồng sự kiện chính | 1) Guest mở màn Register (SC-03), nhập họ tên (2–60 ký tự), email, mật khẩu (8–72 ký tự, có chữ và số), xác nhận mật khẩu, chọn vai trò (mặc định Học viên) và hoàn thành CAPTCHA.<br>2) Ứng dụng kiểm tra form bằng zod (lỗi hiện dưới từng ô) rồi gọi `POST /auth/register`.<br>3) Server xác minh CAPTCHA với dịch vụ reCAPTCHA, kiểm tra email chưa tồn tại, băm mật khẩu bằng bcrypt, tạo `User` và ghi sự kiện `REGISTER`.<br>4) Server sinh mã OTP 6 số (hết hạn sau 10 phút), gửi email qua Brevo ở nền, trả `201` kèm `emailVerificationRequired` và **không** có token.<br>5) Ứng dụng chuyển sang màn Verify email và thực hiện UC038 (nhập mã OTP, server đặt `emailVerifiedAt`, tạo phiên và trả `AuthSessionDto`).<br>6) Ứng dụng lưu token (SecureStore, hoặc localStorage trên web) và chuyển vào Home. |
| Luồng thay thế / ngoại lệ | A1) Email đã dùng: `409 EMAIL_TAKEN` (cả khi hai yêu cầu song song, nhờ unique index).<br>A2) Dữ liệu sai quy tắc: lỗi từng ô ở phía ứng dụng; nếu lọt tới server thì `400 VALIDATION_ERROR`.<br>A3) Vai trò ADMIN hoặc giá trị ngoài danh sách: `400 VALIDATION_ERROR` (không cho tự đăng ký quản trị viên).<br>A4) Thiếu hoặc sai CAPTCHA: `400 CAPTCHA_REQUIRED` hoặc `400 CAPTCHA_FAILED`; production thiếu cấu hình khóa bí mật: `503 CAPTCHA_UNAVAILABLE`.<br>A5) Lỗi ở bước xác minh OTP (mã sai, hết hạn, sai quá 5 lần, gửi lại quá sớm): xem các luồng thay thế của UC038.<br>A6) Quá 10 yêu cầu đăng ký hoặc đăng nhập mỗi phút trên một IP: `429 RATE_LIMITED`. |
| Quy tắc nghiệp vụ | BR-30 (không đăng ký được ADMIN, mặc định STUDENT); quy tắc CAPTCHA của FR-30; NFR-05 (bcrypt, giới hạn tốc độ). |
| Yêu cầu liên quan | FR-01, FR-30 |
| Màn hình | SC-03 Register; Verify email (`(auth)/verify-email`, xem UC038) |

**Bảng 2.21 – Đặc tả UC002 – Đăng nhập**

| Mục | Nội dung |
|---|---|
| Mã UC | UC002 |
| Tên use case | Đăng nhập |
| Tác nhân | Guest. Hệ thống ngoài: Google reCAPTCHA, Brevo SMTP |
| Mô tả | Người dùng đăng nhập bằng email và mật khẩu. Nếu đã bật 2FA thì nhập thêm mã TOTP hoặc mã khôi phục (UC040, quan hệ `extend`); nếu quên mật khẩu thì đặt lại bằng mã gửi qua email (UC039, quan hệ `extend`). Ứng dụng tự khôi phục phiên bằng refresh token xoay vòng (UC041). |
| Điều kiện tiên quyết | Tài khoản đã tồn tại và đã xác minh email; không đang bị khóa tạm hoặc bị quản trị viên khóa. |
| Điều kiện sau | Thành công: có phiên mới (bản ghi `Session`, refresh token lưu dạng băm), token được lưu an toàn, ghi sự kiện `LOGIN_SUCCESS`; nếu là thiết bị chưa từng dùng thì có thông báo `SYSTEM` và email cảnh báo. Thất bại: tăng bộ đếm đăng nhập sai; không có phiên. |
| Luồng sự kiện chính | 1) Guest mở màn Login (SC-02), nhập email và mật khẩu.<br>2) Ứng dụng kiểm tra form rồi gọi `POST /auth/login` kèm tên thiết bị.<br>3) Server tìm người dùng, kiểm tra tài khoản không bị khóa tạm; nếu đã sai từ 3 lần thì yêu cầu CAPTCHA; so sánh mật khẩu bằng bcrypt (email không tồn tại vẫn so với hash giả để không lộ email); kiểm tra tài khoản không bị quản trị viên khóa và email đã xác minh.<br>4) Nếu tài khoản không bật 2FA: server tạo phiên và trả `AuthSessionDto` (access token, refresh token, thông tin người dùng).<br>5) Ứng dụng lưu token, gọi `GET /auth/me` và chuyển vào Home. Mỗi lần mở lại ứng dụng, phiên được khôi phục từ token đã lưu. |
| Luồng thay thế / ngoại lệ | A1) Sai email hoặc mật khẩu: `401 INVALID_CREDENTIALS` với cùng một thông báo cho cả hai trường hợp; `details.captchaRequired` là `true` từ lần sai thứ 3.<br>A2) Cần CAPTCHA mà thiếu hoặc sai: `400 CAPTCHA_REQUIRED` hoặc `400 CAPTCHA_FAILED`.<br>A3) Sai 5 lần liên tiếp: `423 ACCOUNT_LOCKED` kèm header `Retry-After` (khóa 15 phút).<br>A4) Chưa xác minh email: `403 EMAIL_NOT_VERIFIED`; server gửi mã mới nếu chưa có mã còn hạn, ứng dụng mở màn Verify email (UC038).<br>A5) Tài khoản bị quản trị viên khóa: `403 ACCOUNT_DISABLED` (cả khi đăng nhập lẫn khi refresh token).<br>A6) Tài khoản bật 2FA: bước 3 trả `twoFactorRequired` kèm `challengeToken` (hiệu lực 5 phút); ứng dụng mở màn Two-factor và thực hiện bước nhập mã của UC040 (`POST /auth/2fa/verify`; lỗi `INVALID_CODE`, `INVALID_CHALLENGE`).<br>A7) Người dùng bấm "Quên mật khẩu": chuyển sang UC039.<br>A8) Access token hết hạn khi dùng: ứng dụng gọi `POST /auth/refresh` (xoay vòng token, UC041). Dùng lại refresh token cũ hoặc token không hợp lệ: `401 INVALID_REFRESH_TOKEN`, server thu hồi phiên và ứng dụng về Login.<br>A9) Quá giới hạn tốc độ: `429 RATE_LIMITED`. |
| Quy tắc nghiệp vụ | BR-28 (tài khoản bị khóa không đăng nhập được); quy tắc CAPTCHA và khóa tài khoản của FR-30; NFR-05. |
| Yêu cầu liên quan | FR-02, FR-30 (mở rộng: FR-26, FR-28, FR-29 qua UC039, UC040, UC041) |
| Màn hình | SC-01 Khởi động (khôi phục phiên); SC-02 Login; Two-factor (`(auth)/two-factor`); Verify email (`(auth)/verify-email`) |

![Hình 2.20 – Biểu đồ hoạt động UC002 – Đăng nhập](../../uml/png/AC-UC002.png)

*Hình 2.20 – Biểu đồ hoạt động UC002 – Đăng nhập*

**Bảng 2.22 – Đặc tả UC003 – Đăng xuất**

| Mục | Nội dung |
|---|---|
| Mã UC | UC003 |
| Tên use case | Đăng xuất |
| Tác nhân | Learner (cũng áp dụng cho Teacher và Admin) |
| Mô tả | Người dùng kết thúc phiên đăng nhập trên thiết bị hiện tại; phiên bị thu hồi ở server, token và dữ liệu lưu tạm của người dùng bị xóa khỏi thiết bị. |
| Điều kiện tiên quyết | Đang đăng nhập. |
| Điều kiện sau | Phiên hiện tại bị thu hồi (refresh token không còn dùng được); token trong SecureStore (hoặc localStorage), phiên trong Zustand và cache truy vấn đã lưu xuống đĩa bị xóa; ứng dụng ở màn Login. |
| Luồng sự kiện chính | 1) Learner mở tab Profile (SC-20) và bấm "Đăng xuất" (hoặc trong menu avatar trên web).<br>2) Ứng dụng hiện hộp thoại xác nhận.<br>3) Learner xác nhận; ứng dụng gọi `POST /auth/logout` kèm refresh token.<br>4) Server thu hồi phiên và trả `204`.<br>5) Ứng dụng xóa token, cache persisted và trạng thái phiên, chuyển về Login. |
| Luồng thay thế / ngoại lệ | A1) Người dùng hủy hộp thoại: giữ nguyên phiên.<br>A2) Lỗi mạng hoặc server không phản hồi: ứng dụng vẫn xóa phiên cục bộ (FR-03).<br>A3) Access token đã hết hạn: vẫn đăng xuất được vì endpoint không bắt buộc token hợp lệ, thu hồi theo refresh token trong body; gọi lặp lại vẫn thành công (idempotent).<br>A4) Phiên bị thu hồi từ xa ở thiết bị khác: yêu cầu kế tiếp bị từ chối `401`, ứng dụng tự đưa người dùng về Login (xem UC041). |
| Quy tắc nghiệp vụ | Quy tắc phiên của FR-29 (thu hồi theo refresh token); NFR-05. |
| Yêu cầu liên quan | FR-03, FR-29 |
| Màn hình | SC-20 User profile (nút Đăng xuất); SC-02 Login |

**Bảng 2.23 – Đặc tả UC004 – Xem trang chủ**

| Mục | Nội dung |
|---|---|
| Mã UC | UC004 |
| Tên use case | Xem trang chủ |
| Tác nhân | Learner |
| Mô tả | Trang chủ gom nội dung khám phá vào một màn: lời chào theo tên, banner khuyến mãi, 6 danh mục, khóa học phổ biến, gợi ý cho bạn, khóa nổi bật, giảng viên hàng đầu, mục "Tiếp tục học", cùng huy hiệu số lượng giỏ hàng và thông báo chưa đọc. Trang chủ cũng hiển thị thẻ gợi ý lộ trình học bằng AI (UC045). |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Người dùng thấy nội dung Home; dữ liệu được lưu cache trong bộ nhớ và trên đĩa (24 giờ) để mở lại tức thì. Không làm thay đổi dữ liệu nghiệp vụ. |
| Luồng sự kiện chính | 1) Learner mở tab Home (SC-04).<br>2) Ứng dụng hiển thị ngay dữ liệu đã lưu từ lần trước (nếu có), đồng thời gọi `GET /home` (một yêu cầu cho cả 6 khối).<br>3) Server trả `HomeResponse`; phần công khai được cache trong bộ nhớ server 60 giây, phần theo người dùng (đã lưu, gợi ý) ghép sau.<br>4) Ứng dụng hiển thị các khối, huy hiệu giỏ hàng và thông báo.<br>5) Learner bấm một banner, danh mục, thẻ khóa học hoặc giảng viên để chuyển tới màn tương ứng (UC005, UC007, UC008, UC018).<br>6) Thẻ gợi ý AI tải độc lập với các khối còn lại (UC045).<br>7) Kéo xuống để làm mới. |
| Luồng thay thế / ngoại lệ | A1) Lỗi tải: màn báo lỗi kèm nút "Thử lại".<br>A2) Mất mạng: hiện dữ liệu đã lưu cùng banner "offline"; thao tác ghi bị chặn.<br>A3) Một khối rỗng (ví dụ chưa học khóa nào): khối "Tiếp tục học" ẩn hoặc hiện trạng thái rỗng.<br>A4) Thẻ AI lỗi: không ảnh hưởng các khối khác của Home (xem lỗi AI ở UC045).<br>A5) Banner trỏ tới đích không còn: bỏ qua thao tác. |
| Quy tắc nghiệp vụ | BR-10 (nhãn Best-seller hoặc phần trăm giảm), BR-11 (Popular, Course that inspires, Top teachers), BR-12 (Recommended for you); NFR-01, NFR-04. |
| Yêu cầu liên quan | FR-04, FR-24 (gợi ý AI: FR-34 qua UC045) |
| Màn hình | SC-04 Home |

**Bảng 2.24 – Đặc tả UC005 – Tìm kiếm khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC005 |
| Tên use case | Tìm kiếm khóa học |
| Tác nhân | Learner |
| Mô tả | Học viên tìm khóa học theo từ khóa (tên khóa, phụ đề, thẻ, tên giảng viên), xem gợi ý chủ đề nổi bật và lịch sử tìm kiếm, xem số kết quả và cuộn vô hạn. |
| Điều kiện tiên quyết | Đã đăng nhập; mở tab Search. |
| Điều kiện sau | Danh sách kết quả hiển thị; từ khóa được thêm vào lịch sử tìm kiếm gần đây (tối đa 10, lưu trong AsyncStorage). Không đổi dữ liệu nghiệp vụ. |
| Luồng sự kiện chính | 1) Learner mở tab Search (SC-05, chế độ khám phá): hiện tìm kiếm gần đây và chủ đề nổi bật (`GET /tags/hot`).<br>2) Learner gõ từ khóa; ứng dụng chờ 400 ms sau phím cuối (debounce) hoặc nhận Enter, hoặc người dùng chọn một gợi ý.<br>3) Ứng dụng gọi `GET /courses?q=...&page=1&limit=20`.<br>4) Server tách từ khóa (tối đa 5 từ); mỗi từ phải khớp tên khóa, phụ đề, tên thẻ hoặc tên giảng viên, không phân biệt hoa thường; chỉ lấy khóa `PUBLISHED`; mặc định sắp xếp theo độ phổ biến.<br>5) Ứng dụng chuyển sang chế độ kết quả (SC-06), hiện số kết quả; cuộn xuống cuối thì nạp trang kế tiếp (20 mục mỗi lần).<br>6) Từ khóa được lưu vào lịch sử gần đây. Learner bấm một thẻ để xem UC008. |
| Luồng thay thế / ngoại lệ | A1) Không có kết quả: hiện trạng thái rỗng gợi ý đổi từ khóa.<br>A2) Lỗi tải: hiện lỗi kèm nút "Thử lại".<br>A3) Xóa hết từ khóa: quay về chế độ khám phá.<br>A4) Mất mạng: hiện kết quả đã cache nếu có; trang kế chưa tải sẽ báo offline.<br>A5) Tham số truy vấn sai (ví dụ `limit` quá 50): `400 VALIDATION_ERROR`.<br>A6) Người dùng xóa từng mục hoặc toàn bộ lịch sử tìm kiếm gần đây. |
| Quy tắc nghiệp vụ | BR-13 (cách khớp từ khóa, chỉ khóa đã xuất bản); NFR-03 (danh sách dài dùng FlashList), NFR-04. |
| Yêu cầu liên quan | FR-05 |
| Màn hình | SC-05 Search (khám phá), SC-06 Search (kết quả) |

![Hình 2.21 – Biểu đồ hoạt động UC005 – Tìm kiếm khóa học](../../uml/png/AC-UC005.png)

*Hình 2.21 – Biểu đồ hoạt động UC005 – Tìm kiếm khóa học*

**Bảng 2.25 – Đặc tả UC006 – Lọc và sắp xếp kết quả**

| Mục | Nội dung |
|---|---|
| Mã UC | UC006 |
| Tên use case | Lọc và sắp xếp kết quả |
| Tác nhân | Learner |
| Mô tả | Học viên thu hẹp danh sách khóa học theo một hoặc nhiều danh mục, giá (miễn phí hoặc có phí, khoảng giá), điểm đánh giá tối thiểu và chọn cách sắp xếp. |
| Điều kiện tiên quyết | Đang ở màn kết quả tìm kiếm hoặc danh sách khóa học. |
| Điều kiện sau | Danh sách hiển thị theo bộ lọc đã áp dụng; bộ lọc tạm lưu ở client (Zustand) cho tới khi đặt lại. |
| Luồng sự kiện chính | 1) Learner bấm "Filter": trên điện thoại mở màn modal SC-07, trên desktop dùng thanh lọc ngay trên danh sách.<br>2) Chọn danh mục (nhiều lựa chọn), giá (Free, Paid, khoảng giá), điểm đánh giá tối thiểu và cách sắp xếp (Popular, Rating, Newest, Price tăng hoặc giảm).<br>3) Bấm áp dụng; ứng dụng gọi `GET /courses` với các tham số `categoryId` (danh sách phân cách dấu phẩy), `isFree`, `minPrice`, `maxPrice`, `minRating`, `sort`.<br>4) Server lọc rồi sắp xếp, trả danh sách phân trang kèm tổng số kết quả.<br>5) Ứng dụng cập nhật danh sách và số kết quả; có thể đổi nhanh cách sắp xếp bằng các chip. |
| Luồng thay thế / ngoại lệ | A1) Bấm "Đặt lại": xóa mọi bộ lọc.<br>A2) Không có khóa học thỏa mãn: trạng thái rỗng.<br>A3) Tham số không hợp lệ (ví dụ `sort` ngoài danh sách): `400 VALIDATION_ERROR`.<br>A4) Lỗi tải: hiện lỗi kèm nút "Thử lại". |
| Quy tắc nghiệp vụ | BR-13 (chỉ khóa đã xuất bản), BR-10 (nhãn giá). |
| Yêu cầu liên quan | FR-06 |
| Màn hình | SC-07 Filter; SC-06 Search (kết quả) |

**Bảng 2.26 – Đặc tả UC007 – Duyệt khóa học theo danh mục hoặc nhóm**

| Mục | Nội dung |
|---|---|
| Mã UC | UC007 |
| Tên use case | Duyệt khóa học theo danh mục hoặc nhóm |
| Tác nhân | Learner |
| Mô tả | Học viên xem danh sách khóa học của một danh mục (6 danh mục) hoặc của một nhóm nổi bật ("View more" của Popular, Recommended, Course that inspires). |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Danh sách khóa học của danh mục hoặc nhóm được hiển thị với cuộn vô hạn. |
| Luồng sự kiện chính | 1) Learner bấm một danh mục ở Home hoặc Search, hoặc bấm "View more" của một nhóm.<br>2) Ứng dụng mở màn Course list (SC-08) với tiêu đề tương ứng.<br>3) Ứng dụng gọi `GET /courses?categoryId=...` hoặc `GET /courses?section=` với giá trị `popular`, `recommended` hoặc `inspires`.<br>4) Server trả danh sách phân trang; nhóm `recommended` giữ thứ tự gợi ý, các nhóm khác sắp xếp theo quy tắc BR-11.<br>5) Ứng dụng hiển thị lưới hoặc danh sách, nạp thêm khi cuộn; bấm một thẻ để xem UC008. |
| Luồng thay thế / ngoại lệ | A1) Danh mục chưa có khóa nào: trạng thái rỗng.<br>A2) Lỗi tải: lỗi kèm nút "Thử lại".<br>A3) Mất mạng: hiện dữ liệu đã cache nếu có. |
| Quy tắc nghiệp vụ | BR-11, BR-12, BR-13 |
| Yêu cầu liên quan | FR-07 |
| Màn hình | SC-08 Course list; SC-04 Home, SC-05 Search (điểm vào) |

**Bảng 2.27 – Đặc tả UC008 – Xem chi tiết khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC008 |
| Tên use case | Xem chi tiết khóa học |
| Tác nhân | Learner |
| Mô tả | Học viên xem thông tin một khóa học qua ba tab: Overview (giảng viên, mô tả, lợi ích, khóa tương tự), Lessons (chương trình học dạng accordion kèm trạng thái từng bài) và Review (điểm trung bình, lọc theo số sao, danh sách đánh giá). Thanh hành động phía dưới đổi theo trạng thái người xem. |
| Điều kiện tiên quyết | Đã đăng nhập; khóa học ở trạng thái đã xuất bản (hoặc người xem đã ghi danh, hoặc là chủ khóa, hoặc là Admin). |
| Điều kiện sau | Chi tiết khóa học hiển thị; dữ liệu được cache cho phép xem lại khi offline. Không đổi dữ liệu nghiệp vụ. |
| Luồng sự kiện chính | 1) Learner bấm một thẻ khóa học (từ UC004, UC005, UC007 hoặc thông báo); ứng dụng mở `course/[id]` (SC-09).<br>2) Ứng dụng gọi song song `GET /courses/:id`, `GET /courses/:id/curriculum` và `GET /courses/:id/similar`.<br>3) Server chỉ trả khóa mà người xem được phép thấy; chương trình học kèm trạng thái từng bài `COMPLETED`, `IN_PROGRESS`, `UNLOCKED` hoặc `LOCKED`.<br>4) Tab Overview: thẻ giảng viên (mở UC018), mô tả có "See more", danh sách lợi ích (số giờ video tính từ tổng thời lượng, không có "Certificate"), khóa tương tự, nhãn Best-seller hoặc phần trăm giảm giá. Tab Lessons: accordion các chương; bài xem thử mở được (UC009), bài còn khóa hiện biểu tượng khóa. Tab Review: `GET /courses/:id/reviews` hiển thị điểm trung bình, tổng số và danh sách; lọc theo số sao bằng tham số `rating`; "Xem tất cả" mở SC-10.<br>5) Thanh hành động phía dưới: đã ghi danh thì "Continue learning" (mở UC014); khóa miễn phí thì "Enroll for free"; đã có trong giỏ thì "Go to cart"; còn lại "Add to cart" (UC011). Chủ khóa thấy "Open course".<br>6) Từ trang này người dùng có thể lưu khóa (UC010), thích hoặc chia sẻ (UC021) và xem tóm tắt khóa bằng AI (UC044). |
| Luồng thay thế / ngoại lệ | A1) Khóa không tồn tại, chưa xuất bản (bản nháp, chờ duyệt, bị từ chối) hoặc đã bị ẩn mà người xem chưa ghi danh: `404 COURSE_NOT_FOUND` (không lộ sự tồn tại).<br>A2) Lọc đánh giá theo số sao không có kết quả: trạng thái rỗng của tab Review; phần tóm tắt điểm vẫn tính trên toàn bộ đánh giá.<br>A3) Bấm bài còn khóa khi chưa ghi danh: ứng dụng báo cần ghi danh, không gọi API phát video.<br>A4) Lỗi tải: lỗi kèm nút "Thử lại"; mất mạng: hiện bản cache nếu đã xem trước đó.<br>A5) Người xem đã ghi danh một khóa bị ẩn vẫn xem được trang này và học tiếp (BR-22). |
| Quy tắc nghiệp vụ | BR-01 (quyền xem bài), BR-02 (trạng thái bài), BR-10 (nhãn giá), BR-17 (nút hành động), BR-18 (không dùng dữ liệu của design), BR-19 và BR-22 (ai xem được khóa theo trạng thái), BR-23 (chủ khóa). |
| Yêu cầu liên quan | FR-08, FR-09, FR-10 |
| Màn hình | SC-09 Course Details (Overview, Lessons, Review), SC-10 All reviews |

![Hình 2.22 – Biểu đồ hoạt động UC008 – Xem chi tiết khóa học](../../uml/png/AC-UC008.png)

*Hình 2.22 – Biểu đồ hoạt động UC008 – Xem chi tiết khóa học*

**Bảng 2.28 – Đặc tả UC009 – Xem trước bài học miễn phí**

| Mục | Nội dung |
|---|---|
| Mã UC | UC009 |
| Tên use case | Xem trước bài học miễn phí (preview) |
| Tác nhân | Learner. Hệ thống ngoài: YouTube (nguồn video) |
| Mô tả | Học viên chưa mua khóa học vẫn xem được các bài giảng viên đánh dấu xem thử, và video giới thiệu ở phần đầu trang chi tiết. |
| Điều kiện tiên quyết | Đã đăng nhập; đang ở trang chi tiết khóa học; bài có cờ xem thử (`isPreview`). |
| Điều kiện sau | Video của bài xem thử được phát. Không ghi tiến độ và không đổi bài đang học vì người xem chưa ghi danh. |
| Luồng sự kiện chính | 1) Learner chọn một bài xem thử trong tab Lessons, hoặc bấm nút "Xem giới thiệu" ở phần đầu trang.<br>2) Ứng dụng gọi `GET /lessons/:id`.<br>3) Server kiểm tra: người xem đã ghi danh, hoặc bài có `isPreview = true`; trả `videoUrl`, vị trí xem và bài kế tiếp (chỉ trả bài kế nếu bài đó cũng là xem thử).<br>4) Ứng dụng mở trình phát (video YouTube nhúng hoặc MP4) và phát; trên web việc phát bắt đầu bằng thao tác bấm Play của người dùng. |
| Luồng thay thế / ngoại lệ | A1) Bài không phải xem thử và người xem chưa ghi danh: `403 NOT_ENROLLED`, server không trả `videoUrl`; ứng dụng hiện thông báo cần ghi danh.<br>A2) Bài không tồn tại: `404 LESSON_NOT_FOUND`.<br>A3) Video không tải được: khung video hiện trạng thái lỗi kèm nút "Thử lại".<br>A4) Mất mạng: không phát được video chưa tải; ứng dụng báo offline. |
| Quy tắc nghiệp vụ | BR-01 (đã ghi danh hoặc xem thử mới được xem), BR-02 (trạng thái bài), NFR-06 (server kiểm quyền, không chỉ ẩn trên giao diện). |
| Yêu cầu liên quan | FR-09 |
| Màn hình | SC-09 Course Details (tab Lessons, trình phát xem thử) |

**Bảng 2.29 – Đặc tả UC010 – Lưu hoặc bỏ lưu khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC010 |
| Tên use case | Lưu hoặc bỏ lưu khóa học |
| Tác nhân | Learner |
| Mô tả | Học viên đánh dấu một khóa học để xem sau bằng biểu tượng bookmark ở mọi thẻ khóa học và trang chi tiết; danh sách khóa đã lưu nằm ở trang Profile. |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Bản ghi bookmark được tạo hoặc xóa; số "Save" trong Profile cập nhật theo. |
| Luồng sự kiện chính | 1) Learner bấm biểu tượng bookmark trên một thẻ hoặc trong trang chi tiết.<br>2) Ứng dụng cập nhật ngay trên mọi màn đang hiển thị khóa đó (optimistic update).<br>3) Ứng dụng gọi `PUT /courses/:id/bookmark` (lưu) hoặc `DELETE /courses/:id/bookmark` (bỏ lưu); cả hai đều idempotent và trả `204`.<br>4) Xem danh sách đã lưu: tab Profile gọi `GET /me/bookmarks` (phân trang). |
| Luồng thay thế / ngoại lệ | A1) Server lỗi hoặc mất mạng: ứng dụng hoàn tác trạng thái (rollback) và hiện thông báo lỗi; khi offline thao tác ghi bị chặn ngay.<br>A2) Lưu khóa không tồn tại hoặc không thấy được: `404 COURSE_NOT_FOUND`; bỏ lưu một khóa không tồn tại vẫn trả `204`.<br>A3) Lưu lặp lại một khóa đã lưu: không lỗi, không tạo trùng. |
| Quy tắc nghiệp vụ | BR-15 (số "Save" trong thống kê hồ sơ); quy ước optimistic update cho thao tác toggle (CLAUDE.md §7). |
| Yêu cầu liên quan | FR-12, FR-21 (danh sách đã lưu) |
| Màn hình | Mọi thẻ khóa học; SC-09; SC-20 User profile (danh sách đã lưu) |

**Bảng 2.30 – Đặc tả UC011 – Quản lý giỏ hàng**

| Mục | Nội dung |
|---|---|
| Mã UC | UC011 |
| Tên use case | Quản lý giỏ hàng |
| Tác nhân | Learner |
| Mô tả | Học viên thêm khóa có phí vào giỏ, xem danh sách và tổng tiền, xóa khóa khỏi giỏ trước khi thanh toán. |
| Điều kiện tiên quyết | Đã đăng nhập; khóa học đã xuất bản, có phí, chưa ghi danh và không phải khóa của chính mình. |
| Điều kiện sau | Giỏ hàng phản ánh đúng các khóa đã chọn; huy hiệu số lượng giỏ ở Home và thanh điều hướng cập nhật. |
| Luồng sự kiện chính | 1) Ở trang chi tiết (UC008), Learner bấm "Add to cart".<br>2) Ứng dụng gọi `POST /cart/items` với `courseId`.<br>3) Server kiểm tra khóa tồn tại và đã xuất bản, không phải khóa của chính người mua, chưa ghi danh, không miễn phí, chưa có trong giỏ; tạo mục giỏ và trả `201`.<br>4) Nút đổi thành "Go to cart"; Learner mở giỏ hàng (SC-12).<br>5) Ứng dụng gọi `GET /cart`; server trả các khóa còn được bán (trạng thái đã xuất bản) và `totalCents` bằng tổng giá hiện tại.<br>6) Để xóa, Learner bấm xóa ở một mục: `DELETE /cart/items/:courseId` (`204`, idempotent); tổng tiền và huy hiệu cập nhật.<br>7) Learner bấm "Checkout" để sang UC012. |
| Luồng thay thế / ngoại lệ | A1) Đã ghi danh: `409 ALREADY_ENROLLED`.<br>A2) Đã có trong giỏ: `409 ALREADY_IN_CART` (cả khi hai yêu cầu song song).<br>A3) Khóa miễn phí: `422 FREE_COURSE`, ứng dụng hướng dẫn ghi danh trực tiếp (UC012).<br>A4) Khóa của chính giảng viên: `422 OWN_COURSE`.<br>A5) Khóa không tồn tại hoặc không còn bán: `404 COURSE_NOT_FOUND`.<br>A6) Giỏ rỗng: trạng thái rỗng kèm nút khám phá khóa học.<br>A7) Khóa trong giỏ bị ẩn sau khi thêm: không còn hiện trong giỏ và không tính vào tổng tiền. |
| Quy tắc nghiệp vụ | BR-06 (điều kiện thêm vào giỏ), BR-07 (tổng tiền theo giá hiện tại), BR-17 (nút hành động), BR-23 (không mua khóa của mình). |
| Yêu cầu liên quan | FR-13 |
| Màn hình | SC-09 Course Details (thanh hành động), SC-12 Cart |

![Hình 2.23 – Biểu đồ hoạt động UC011 – Quản lý giỏ hàng](../../uml/png/AC-UC011.png)

*Hình 2.23 – Biểu đồ hoạt động UC011 – Quản lý giỏ hàng*

**Bảng 2.31 – Đặc tả UC012 – Thanh toán và ghi danh**

| Mục | Nội dung |
|---|---|
| Mã UC | UC012 |
| Tên use case | Thanh toán và ghi danh |
| Tác nhân | Learner. Hệ thống ngoài: Payment Gateway (giả lập) |
| Mô tả | Học viên thanh toán giả lập các khóa trong giỏ để được ghi danh; khóa miễn phí được ghi danh trực tiếp không qua giỏ. Toàn bộ việc thanh toán và ghi danh chạy trong một transaction. |
| Điều kiện tiên quyết | Đã đăng nhập; giỏ có ít nhất một khóa chưa ghi danh (luồng thanh toán), hoặc khóa miễn phí chưa ghi danh (luồng ghi danh trực tiếp). |
| Điều kiện sau | Thành công: có `Order` ở trạng thái `PAID` kèm các dòng giá tại thời điểm mua; mỗi khóa có một `Enrollment` mới; `enrollmentCount` của khóa tăng 1; giỏ hàng bị xóa; có thông báo `ORDER_PAID`; cache Home bị xóa. Thất bại: không có ghi danh, giỏ được giữ nguyên. |
| Luồng sự kiện chính | 1) Từ giỏ hàng, Learner bấm "Checkout" mở màn thanh toán (SC-13): xem tóm tắt đơn hàng và chọn phương thức giả lập (thẻ hoặc ví điện tử, `MOCK_CARD` hoặc `MOCK_EWALLET`).<br>2) Learner xác nhận; ứng dụng gọi `POST /orders/checkout`.<br>3) Server mở một transaction: đọc giỏ (chỉ khóa đã xuất bản), loại khóa đã được ghi danh (mua song song ở thiết bị khác), tạo `Order` với tổng bằng tổng giá hiện tại.<br>4) Cổng thanh toán giả lập xác nhận thành công: đơn chuyển `PAID`, tạo `Enrollment` cho từng khóa, tăng `enrollmentCount`, xóa giỏ, tạo thông báo `ORDER_PAID`; server xóa cache Home và trả `201` kèm `order` và `enrolledCourseIds`.<br>5) Ứng dụng làm mới giỏ, "Khóa học của tôi" và huy hiệu; hiện màn "Thanh toán thành công" với nút vào học (UC014) hoặc xem khóa của tôi (UC013).<br>6) Luồng khóa miễn phí: ở trang chi tiết, Learner bấm "Enroll for free", ứng dụng gọi `POST /courses/:id/enroll`; server tạo `Enrollment`, tăng `enrollmentCount` và trả `201`. |
| Luồng thay thế / ngoại lệ | A1) Giỏ rỗng, hoặc mọi khóa trong giỏ đã được ghi danh: `422 CART_EMPTY`.<br>A2) Thanh toán giả lập thất bại (chỉ kích hoạt được trong bản dev và test bằng cờ `simulateFailure`; production bỏ qua cờ này): đơn được lưu ở trạng thái `FAILED`, server trả `402 PAYMENT_FAILED` kèm `details.orderId`, giữ nguyên giỏ, không ghi danh; ứng dụng hiện màn "Thanh toán thất bại" và cho thử lại.<br>A3) Giỏ chứa khóa của chính giảng viên: `422 OWN_COURSE`.<br>A4) Ghi danh trực tiếp khóa có phí: `422 PAID_COURSE`; đã ghi danh: `409 ALREADY_ENROLLED`; khóa không tồn tại hoặc không còn bán: `404 COURSE_NOT_FOUND`; khóa của chính mình: `422 OWN_COURSE`.<br>A5) Lỗi mạng giữa chừng: transaction không commit, giỏ giữ nguyên; ứng dụng báo lỗi để thử lại. |
| Quy tắc nghiệp vụ | BR-07 (checkout trong một transaction, giả lập thất bại), BR-06, BR-23; NFR-10 (tính toàn vẹn khi thanh toán). |
| Yêu cầu liên quan | FR-14 |
| Màn hình | SC-12 Cart, SC-13 Checkout và kết quả thanh toán, SC-09 (ghi danh khóa miễn phí) |

![Hình 2.24 – Biểu đồ hoạt động UC012 – Thanh toán và ghi danh](../../uml/png/AC-UC012.png)

*Hình 2.24 – Biểu đồ hoạt động UC012 – Thanh toán và ghi danh*

**Bảng 2.32 – Đặc tả UC013 – Xem khóa học của tôi**

| Mục | Nội dung |
|---|---|
| Mã UC | UC013 |
| Tên use case | Xem khóa học của tôi |
| Tác nhân | Learner |
| Mô tả | Học viên xem các khóa đã ghi danh theo tab Tất cả, Đang học, Hoàn thành, kèm phần trăm hoàn thành, số bài đã học, thống kê học tập và khối "Tiếp tục học" cho khóa học gần nhất. |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Danh sách khóa của người dùng hiển thị; không đổi dữ liệu nghiệp vụ. |
| Luồng sự kiện chính | 1) Learner mở tab My Courses (SC-14).<br>2) Ứng dụng gọi `GET /me/courses?status=all\|ongoing\|completed` và `GET /me/stats`.<br>3) Server trả danh sách sắp theo lần học gần nhất; mỗi mục có phần trăm hoàn thành, số bài, số bài đã xong và bài đang học.<br>4) Ứng dụng hiển thị chip thống kê (đang học, hoàn thành, giờ đã học), khối "Tiếp tục học", các tab lọc và thẻ có thanh tiến độ.<br>5) Learner bấm một thẻ để vào UC014 và tiếp tục đúng bài. |
| Luồng thay thế / ngoại lệ | A1) Chưa ghi danh khóa nào, hoặc tab lọc không có khóa: trạng thái rỗng kèm nút khám phá.<br>A2) Lỗi tải: lỗi kèm nút "Thử lại".<br>A3) Mất mạng: hiện dữ liệu đã cache (tối đa 24 giờ).<br>A4) Khóa đã bị ẩn sau khi mua vẫn xuất hiện và học được. |
| Quy tắc nghiệp vụ | BR-04 (phần trăm khóa học), BR-05 (Đang học, Hoàn thành, thứ tự sắp xếp), BR-22 (khóa bị ẩn vẫn học được); NFR-04. |
| Yêu cầu liên quan | FR-15, FR-24 |
| Màn hình | SC-14 My Courses |

### 2.6.3 Nhóm Học viên: học tập và tương tác

**Bảng 2.33 – Đặc tả UC014 – Học bài qua video và lưu tiến độ**

| Mục | Nội dung |
|---|---|
| Mã UC | UC014 |
| Tên use case | Học bài qua video và lưu tiến độ |
| Tác nhân | Learner. Hệ thống ngoài: YouTube (nguồn video bài học) |
| Mô tả | Học viên đã ghi danh xem video bài học, chuyển bài, và hệ thống lưu vị trí xem để tiếp tục đúng chỗ, tự đánh dấu hoàn thành bài khi xem đủ 90% và cập nhật phần trăm hoàn thành khóa học. Màn Học còn có các tab Projects (UC017), Q&A (UC016), đánh giá (UC015) và thẻ AI (UC043, UC044). |
| Điều kiện tiên quyết | Đã đăng nhập và đã ghi danh khóa học (hoặc là chủ khóa hoặc Admin, chỉ xem, không ghi tiến độ). |
| Điều kiện sau | Vị trí xem (`positionSec`) của bài được lưu; bài đạt 90% hoặc phát hết được đánh dấu hoàn thành (không bao giờ bị bỏ hoàn thành); `progressPercent` của ghi danh được tính lại; đạt 100% thì ghi `completedAt` và tạo thông báo `COURSE_COMPLETED` một lần. |
| Luồng sự kiện chính | 1) Learner chọn khóa từ UC013 (hoặc "Continue learning" ở UC008); ứng dụng mở `learn/[courseId]` (SC-15).<br>2) Ứng dụng gọi `GET /courses/:id/curriculum` và `GET /lessons/:id` cho bài đang học (hoặc bài đầu tiên).<br>3) Server kiểm tra quyền (BR-01), ghi bài đang học (`lastLessonId`, `lastAccessedAt`) và trả `videoUrl`, `positionSec`, `isCompleted`, `nextLessonId`.<br>4) Ứng dụng phát video và tua tới `positionSec`.<br>5) Trong khi xem, bộ theo dõi tiến độ gọi `PUT /lessons/:id/progress` mỗi 10 giây; đồng thời gửi ngay khi tạm dừng, đổi bài, rời màn hình hoặc ứng dụng xuống nền.<br>6) Khi vị trí xem đạt từ 90% thời lượng trở lên hoặc video phát hết, ứng dụng gửi `isCompleted: true`.<br>7) Server trong một transaction (khóa hàng ghi danh `FOR UPDATE` để các lần lưu song song không đếm lệch) lưu tiến độ bài, tính lại `progressPercent` bằng round(số bài xong ÷ tổng số bài × 100), cập nhật ghi danh; đạt 100% thì tạo thông báo `COURSE_COMPLETED`; trả `lessonProgress` và `courseProgressPercent`.<br>8) Ứng dụng làm mới danh sách bài (dấu ✓) và "Khóa học của tôi", rồi tự chuyển sang bài kế tiếp. |
| Luồng thay thế / ngoại lệ | A1) Chưa ghi danh và bài không phải xem thử: `403 NOT_ENROLLED`; ứng dụng đưa người dùng về trang chi tiết khóa học kèm thông báo cần ghi danh. Lưu tiến độ khi chưa ghi danh cũng bị `403 NOT_ENROLLED`.<br>A2) Bài không tồn tại: `404 LESSON_NOT_FOUND`.<br>A3) Mất mạng khi đang xem: vị trí xem mới nhất của từng bài được lưu tạm trong AsyncStorage và tự đồng bộ khi có mạng lại (mỗi bài chỉ giữ giá trị mới nhất, bỏ mục cũ hơn 30 ngày, và chỉ gửi bằng token của đúng chủ sở hữu mục đó).<br>A4) Video không tải được: khung video hiện lỗi kèm nút "Thử lại".<br>A5) Chủ khóa hoặc Admin: xem được mọi bài, không ghi tiến độ (BR-23).<br>A6) Bài đã hoàn thành được xem lại: `isCompleted` không đổi từ true về false; `positionSec` được làm tròn và kẹp trong khoảng 0 đến thời lượng bài.<br>A7) Dùng AI trong màn Học: xem UC043 (AI Tutor) và UC044 (tóm tắt, quiz) cùng các lỗi AI của chúng. |
| Quy tắc nghiệp vụ | BR-01, BR-02, BR-03 (hoàn thành khi xem từ 90%), BR-04 (phần trăm khóa), BR-22, BR-23; NFR-10 (không mất tiến độ), NFR-06. |
| Yêu cầu liên quan | FR-16, FR-24 (ngoại lệ lưu tiến độ khi offline), FR-15 |
| Màn hình | SC-15 Learning (tab Lessons) |

![Hình 2.25 – Biểu đồ hoạt động UC014 – Học bài qua video và lưu tiến độ](../../uml/png/AC-UC014.png)

*Hình 2.25 – Biểu đồ hoạt động UC014 – Học bài qua video và lưu tiến độ*

**Bảng 2.34 – Đặc tả UC015 – Đánh giá khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC015 |
| Tên use case | Đánh giá khóa học |
| Tác nhân | Learner |
| Mô tả | Học viên đã ghi danh viết hoặc sửa đánh giá của mình cho khóa học gồm số sao từ 1 đến 5 và nội dung. Mỗi người có một đánh giá cho mỗi khóa. |
| Điều kiện tiên quyết | Đã đăng nhập và đã ghi danh khóa học. |
| Điều kiện sau | Đánh giá được tạo hoặc cập nhật; `ratingAvg` và `ratingCount` của khóa được tính lại trong cùng transaction; cache Home bị xóa; đánh giá hiện đầu danh sách. |
| Luồng sự kiện chính | 1) Learner bấm "Viết đánh giá" ở tab Review hoặc trong màn Học; ứng dụng mở form (SC-11, dạng modal). Nếu đã từng đánh giá, ứng dụng gọi `GET /courses/:id/reviews/me` và điền sẵn nội dung cũ (chưa có đánh giá thì trả `null`).<br>2) Learner chọn số sao và nhập nội dung (10–1000 ký tự); ứng dụng kiểm tra bằng zod.<br>3) Ứng dụng gọi `PUT /courses/:id/reviews/me`.<br>4) Server kiểm tra ghi danh, tạo mới hoặc sửa đánh giá, tính lại điểm trung bình và số đánh giá của khóa.<br>5) Ứng dụng đóng form, hiện thông báo thành công và làm mới danh sách đánh giá cùng điểm trung bình. |
| Luồng thay thế / ngoại lệ | A1) Chưa ghi danh: `403 NOT_ENROLLED`.<br>A2) Chưa chọn sao hoặc nội dung dưới 10 hay trên 1000 ký tự: lỗi ngay trên form; nếu lọt tới server là `400 VALIDATION_ERROR`.<br>A3) Khóa không tồn tại: `404 COURSE_NOT_FOUND`.<br>A4) Mất mạng: thao tác ghi bị chặn, hiện thông báo offline.<br>A5) Giảng viên của khóa phản hồi đánh giá: xem UC030. |
| Quy tắc nghiệp vụ | BR-08 (chỉ người đã ghi danh, một đánh giá mỗi khóa, 1–5 sao, nội dung 10–1000 ký tự, cập nhật điểm trong cùng transaction). |
| Yêu cầu liên quan | FR-11, FR-10 |
| Màn hình | SC-11 Write review, SC-10 All reviews |

**Bảng 2.35 – Đặc tả UC016 – Hỏi đáp (Q&A)**

| Mục | Nội dung |
|---|---|
| Mã UC | UC016 |
| Tên use case | Hỏi đáp (Q&A) |
| Tác nhân | Learner |
| Mô tả | Học viên đã ghi danh xem danh sách câu hỏi của khóa, đặt câu hỏi (có chèn emoji nhanh), thích câu hỏi, xem và gửi trả lời. Người hỏi nhận thông báo khi có người khác trả lời. |
| Điều kiện tiên quyết | Đã đăng nhập và đã ghi danh khóa học (giảng viên của khóa được vào không cần ghi danh, xem UC029). |
| Điều kiện sau | Câu hỏi hoặc trả lời mới được lưu và hiện trong danh sách; số trả lời và số thích cập nhật; người hỏi có thông báo `NEW_ANSWER` khi người khác trả lời. |
| Luồng sự kiện chính | 1) Learner mở tab Q&A trong màn Học (SC-15); ứng dụng gọi `GET /courses/:id/questions` (mới nhất trước, kèm `isLiked` của người xem).<br>2) Learner nhập câu hỏi (1–1000 ký tự, có thể chèn emoji nhanh) và gửi: `POST /courses/:id/questions` trả `201`.<br>3) Learner thích hoặc bỏ thích một câu hỏi: ứng dụng cập nhật ngay (optimistic) và gọi `PUT` hoặc `DELETE /questions/:id/like`, nhận `{likeCount, isLiked}`.<br>4) Bấm vào câu hỏi mở màn chi tiết (SC-16): `GET /questions/:id` và `GET /questions/:id/answers`.<br>5) Learner nhập trả lời (1–1000 ký tự) và gửi: `POST /questions/:id/answers` trả `201`.<br>6) Server tạo thông báo `NEW_ANSWER` cho người hỏi nếu người trả lời là người khác; ứng dụng làm mới danh sách và số trả lời. |
| Luồng thay thế / ngoại lệ | A1) Chưa ghi danh: `403 NOT_ENROLLED`.<br>A2) Khóa không tồn tại: `404 COURSE_NOT_FOUND`; câu hỏi không tồn tại: `404 QUESTION_NOT_FOUND`.<br>A3) Nội dung rỗng hoặc dài quá 1000 ký tự: lỗi ngay trên form, hoặc `400 VALIDATION_ERROR`.<br>A4) Thích lỗi hoặc mất mạng: ứng dụng hoàn tác (rollback) và báo lỗi; thao tác ghi bị chặn khi offline.<br>A5) Danh sách rỗng: trạng thái rỗng khuyến khích đặt câu hỏi đầu tiên.<br>A6) Giảng viên của khóa trả lời: được vào không cần ghi danh, câu trả lời có huy hiệu "Giảng viên" và có thể được ghim (UC029). |
| Quy tắc nghiệp vụ | BR-09 (chỉ người đã ghi danh; độ dài nội dung; thông báo `NEW_ANSWER`), BR-24 (giảng viên của khóa); NFR-06. |
| Yêu cầu liên quan | FR-19 |
| Màn hình | SC-15 Learning (tab Q&A), SC-16 Question detail |

![Hình 2.26 – Biểu đồ hoạt động UC016 – Hỏi đáp (Q&A)](../../uml/png/AC-UC016.png)

*Hình 2.26 – Biểu đồ hoạt động UC016 – Hỏi đáp (Q&A)*

**Bảng 2.36 – Đặc tả UC017 – Nộp project và tải tài liệu**

| Mục | Nội dung |
|---|---|
| Mã UC | UC017 |
| Tên use case | Nộp project và tải tài liệu |
| Tác nhân | Learner |
| Mô tả | Học viên đã ghi danh xem mô tả project, tải tài liệu của khóa, nộp bài (tệp kèm ảnh bìa tùy chọn), xem bài nộp của các học viên khác, và xem điểm cùng nhận xét sau khi giảng viên chấm. |
| Điều kiện tiên quyết | Đã đăng nhập và đã ghi danh khóa học. |
| Điều kiện sau | Bài nộp được lưu cùng tệp trong thư mục upload và hiện trong danh sách bài nộp của khóa; số bài nộp tăng. Chưa có điểm cho tới khi giảng viên chấm (UC028). |
| Luồng sự kiện chính | 1) Learner mở tab Projects trong màn Học (SC-15); ứng dụng gọi `GET /courses/:id/project` (mô tả, tài liệu, số bài nộp) và `GET /courses/:id/submissions` (bài nộp của cả lớp, mới nhất trước).<br>2) Tải tài liệu: bấm nút tải một tài liệu; ứng dụng tải tệp về bộ nhớ đệm và mở bảng chia sẻ của hệ điều hành.<br>3) Learner bấm "Nộp bài" mở form (SC-17): nhập tiêu đề (1–100 ký tự), mô tả (tối đa 1000 ký tự), chọn tệp (PDF, ZIP, PNG, JPG hoặc TXT, tối đa 10 MB) và ảnh bìa tùy chọn (PNG hoặc JPG).<br>4) Ứng dụng gọi `POST /courses/:id/submissions` dạng multipart, có thanh tiến độ tải lên.<br>5) Server kiểm tra ghi danh, lưu tệp với tên ngẫu nhiên, tạo `ProjectSubmission` và trả `201`.<br>6) Ứng dụng đóng form, hiện bài nộp trong danh sách; khi bài được chấm, thẻ bài hiện điểm và nhận xét của giảng viên. |
| Luồng thay thế / ngoại lệ | A1) Chưa ghi danh: `403 NOT_ENROLLED`.<br>A2) Thiếu tiêu đề hoặc tệp: lỗi trên form, hoặc `400 VALIDATION_ERROR`.<br>A3) Loại tệp ngoài danh sách cho phép, hoặc ảnh bìa không phải PNG hay JPG: `415 UNSUPPORTED_FILE_TYPE`.<br>A4) Tệp lớn hơn 10 MB: `413 FILE_TOO_LARGE`.<br>A5) Mất mạng: chặn tải lên và báo offline.<br>A6) Khóa không có tài liệu hoặc chưa có bài nộp: trạng thái rỗng.<br>A7) Lỗi tải tài liệu (không có mạng hoặc không hỗ trợ trên nền tảng): toast lỗi; khi kiểm thử trên web, tải tài liệu từng bị lỗi (BUG-LEARN-01, đã sửa và kiểm lại Đạt). |
| Quy tắc nghiệp vụ | BR-09 (chỉ người đã ghi danh được nộp bài), BR-26 (điểm, nhận xét, chấm lại hiển thị cho học viên); giới hạn upload 10 MB và whitelist MIME (CLAUDE.md §8). |
| Yêu cầu liên quan | FR-18 |
| Màn hình | SC-15 Learning (tab Projects), SC-17 Submit project |

![Hình 2.27 – Biểu đồ hoạt động UC017 – Nộp project và tải tài liệu](../../uml/png/AC-UC017.png)

*Hình 2.27 – Biểu đồ hoạt động UC017 – Nộp project và tải tài liệu*

**Bảng 2.37 – Đặc tả UC018 – Xem hồ sơ giảng viên và theo dõi**

| Mục | Nội dung |
|---|---|
| Mã UC | UC018 |
| Tên use case | Xem hồ sơ giảng viên và theo dõi |
| Tác nhân | Learner |
| Mô tả | Học viên xem thông tin giảng viên (chức danh, giới thiệu, tổ chức, địa điểm, giờ địa phương, thống kê), các khóa của họ nhóm theo danh mục, các đánh giá, và theo dõi hoặc bỏ theo dõi giảng viên. |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Quan hệ theo dõi (`Follow`) được tạo hoặc xóa; số người theo dõi cập nhật; người theo dõi sẽ nhận thông báo khi giảng viên có khóa mới (UC036). |
| Luồng sự kiện chính | 1) Learner bấm tên hoặc ảnh giảng viên ở trang chi tiết khóa học, Home hoặc danh sách Top teachers (SC-19: `GET /teachers?sort=top`); ứng dụng mở `teacher/[id]` (SC-18).<br>2) Ứng dụng gọi `GET /teachers/:id`; server trả thông tin, thống kê, `isFollowed` và giờ địa phương (`localTime`, dạng `hh:mm AM/PM` theo múi giờ của giảng viên).<br>3) Tab Overview hiển thị giới thiệu; tab Courses gọi `GET /teachers/:id/courses` (nhóm theo danh mục); tab Review gọi `GET /teachers/:id/reviews`.<br>4) Learner bấm "Follow": ứng dụng cập nhật ngay (optimistic) rồi gọi `PUT /teachers/:id/follow`; server trả `{followerCount, isFollowed}`. Bấm lại để bỏ theo dõi (`DELETE`). |
| Luồng thay thế / ngoại lệ | A1) Giảng viên không tồn tại: `404 TEACHER_NOT_FOUND`.<br>A2) Tự theo dõi chính mình: `422 CANNOT_FOLLOW_SELF`.<br>A3) Theo dõi lặp lại hoặc bỏ theo dõi khi chưa theo dõi: không lỗi (idempotent).<br>A4) Lỗi hoặc mất mạng khi theo dõi: ứng dụng hoàn tác và báo lỗi.<br>A5) Giảng viên chưa có khóa nào đã xuất bản: tab Courses ở trạng thái rỗng. |
| Quy tắc nghiệp vụ | BR-11 (Top teachers), BR-14 (một lần theo dõi cho mỗi cặp, không tự theo dõi), BR-16 (giờ địa phương). |
| Yêu cầu liên quan | FR-20 |
| Màn hình | SC-18 Teacher profile, SC-19 Top teachers |

**Bảng 2.38 – Đặc tả UC019 – Xem và chỉnh sửa hồ sơ cá nhân**

| Mục | Nội dung |
|---|---|
| Mã UC | UC019 |
| Tên use case | Xem và chỉnh sửa hồ sơ cá nhân |
| Tác nhân | Learner |
| Mô tả | Học viên xem hồ sơ (ảnh bìa, ảnh đại diện, tên, headline, thống kê Save, On going, Completed, danh sách khóa đã lưu) và chỉnh sửa họ tên, headline, ảnh đại diện. Từ Profile người dùng cũng vào Cài đặt (UC042) và Bảo mật (UC040, UC041, đổi mật khẩu ở UC039). |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Thông tin cá nhân được cập nhật ở server, trong session của ứng dụng và trong cache; ảnh đại diện mới được lưu thành URL tuyệt đối. |
| Luồng sự kiện chính | 1) Learner mở tab Profile (SC-20); ứng dụng gọi `GET /auth/me`, `GET /me/stats` và `GET /me/bookmarks`.<br>2) Learner bấm chỉnh sửa (SC-21): form hiện họ tên (2–60 ký tự), headline (tối đa 100 ký tự) và ảnh đại diện.<br>3) Nếu chọn ảnh mới (PNG hoặc JPG, tối đa 5 MB), ứng dụng gọi `POST /me/avatar` dạng multipart và nhận `avatarUrl`.<br>4) Learner bấm Lưu; ứng dụng kiểm tra bằng zod rồi gọi `PATCH /me` và nhận người dùng đã cập nhật.<br>5) Ứng dụng cập nhật session và cache, quay lại Profile. |
| Luồng thay thế / ngoại lệ | A1) Họ tên hoặc headline sai độ dài: lỗi dưới từng ô; nếu lọt tới server là `400 VALIDATION_ERROR`.<br>A2) Ảnh sai loại: `415 UNSUPPORTED_FILE_TYPE`; ảnh quá 5 MB: `413 FILE_TOO_LARGE`.<br>A3) Tài khoản không còn tồn tại: `401 UNAUTHORIZED`.<br>A4) Mất mạng: thao tác lưu bị chặn, báo offline. |
| Quy tắc nghiệp vụ | BR-15 (số liệu Save, On going, Completed), BR-05. |
| Yêu cầu liên quan | FR-21, FR-22 |
| Màn hình | SC-20 User profile, SC-21 Edit profile |

**Bảng 2.39 – Đặc tả UC020 – Xem thông báo**

| Mục | Nội dung |
|---|---|
| Mã UC | UC020 |
| Tên use case | Xem thông báo |
| Tác nhân | Learner |
| Mô tả | Học viên xem danh sách thông báo, đánh dấu từng thông báo hoặc tất cả là đã đọc, và thấy huy hiệu số thông báo chưa đọc ở biểu tượng chuông. Nội dung thông báo hiển thị theo ngôn ngữ đang chọn. |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Trạng thái đã đọc của thông báo được lưu; huy hiệu chưa đọc cập nhật. |
| Luồng sự kiện chính | 1) Hệ thống tạo thông báo theo sự kiện: thanh toán thành công (`ORDER_PAID`), có người trả lời câu hỏi (`NEW_ANSWER`), hoàn thành khóa (`COURSE_COMPLETED`), đăng nhập từ thiết bị mới (`SYSTEM`), khóa được duyệt hoặc bị từ chối (`COURSE_APPROVED`, `COURSE_REJECTED`), khóa mới của giảng viên đang theo dõi (`NEW_COURSE`), project được chấm (`PROJECT_GRADED`), được giảng viên phản hồi đánh giá (`REVIEW_REPLY`).<br>2) Learner thấy huy hiệu chưa đọc ở biểu tượng chuông (`GET /notifications/unread-count`) và bấm vào để mở SC-22.<br>3) Ứng dụng gọi `GET /notifications`; server trả danh sách phân trang kèm `meta.unreadCount`.<br>4) Learner bấm một thông báo: ứng dụng đánh dấu đã đọc ngay (optimistic) và gọi `PATCH /notifications/:id/read` (`204`), rồi chuyển tới khóa học hoặc câu hỏi liên quan.<br>5) Bấm "Đọc tất cả" gọi `PATCH /notifications/read-all` (`204`). |
| Luồng thay thế / ngoại lệ | A1) Chưa có thông báo: trạng thái rỗng.<br>A2) Đánh dấu thông báo không phải của mình hoặc không tồn tại: `404 NOT_FOUND`.<br>A3) Lỗi tải: lỗi kèm nút "Thử lại"; mất mạng: hiện bản cache.<br>A4) Đánh dấu đã đọc thất bại: hoàn tác trạng thái. |
| Quy tắc nghiệp vụ | BR-04 (thông báo hoàn thành khóa), BR-07 (thông báo thanh toán), BR-09 (thông báo trả lời), BR-25 đến BR-27 (thông báo của giảng viên và quản trị). |
| Yêu cầu liên quan | FR-23, FR-54 |
| Màn hình | SC-22 Notifications |

**Bảng 2.40 – Đặc tả UC021 – Thích hoặc chia sẻ khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC021 |
| Tên use case | Thích hoặc chia sẻ khóa học |
| Tác nhân | Learner |
| Mô tả | Học viên thích (hoặc bỏ thích) một khóa học và chia sẻ khóa học qua bảng chia sẻ của hệ điều hành; số lượt thích và lượt chia sẻ được đếm. |
| Điều kiện tiên quyết | Đã đăng nhập; đang ở trang chi tiết khóa học. |
| Điều kiện sau | Trạng thái thích và `likeCount` cập nhật; mỗi lần chia sẻ thật làm `shareCount` tăng 1. |
| Luồng sự kiện chính | 1) Thích: Learner bấm biểu tượng trái tim; ứng dụng cập nhật ngay (optimistic) và gọi `PUT /courses/:id/like` hoặc `DELETE /courses/:id/like`, nhận `{likeCount, isLiked}`.<br>2) Chia sẻ: Learner bấm biểu tượng chia sẻ; ứng dụng mở bảng chia sẻ hệ điều hành (hoặc Web Share API) với tên khóa và tên giảng viên.<br>3) Khi người dùng thực sự chia sẻ, ứng dụng gọi `POST /courses/:id/share` và nhận `{shareCount}`. |
| Luồng thay thế / ngoại lệ | A1) Trình duyệt web không có Web Share API (phần lớn máy tính): ứng dụng sao chép đường dẫn khóa học vào clipboard, hiện thông báo "đã sao chép" và vẫn đếm lượt chia sẻ; sao chép lỗi thì báo lỗi.<br>A2) Người dùng đóng bảng chia sẻ: không đếm.<br>A3) Đếm lượt chia sẻ lỗi (ví dụ mất mạng): bỏ qua âm thầm vì việc chia sẻ đã thực hiện.<br>A4) Thích lỗi: hoàn tác và báo lỗi.<br>A5) Khóa không tồn tại hoặc không thấy được: `404 COURSE_NOT_FOUND`. |
| Quy tắc nghiệp vụ | Quy ước optimistic update cho thao tác toggle (CLAUDE.md §7). |
| Yêu cầu liên quan | FR-17 |
| Màn hình | SC-09 Course Details (hàng nút thích, chia sẻ), SC-15 Learning |

### 2.6.4 Nhóm Giảng viên và Quản trị

Các route `/teacher/*` yêu cầu vai trò TEACHER và chỉ thao tác trên khóa do chính giảng viên đó sở hữu (khóa của người khác trả `404 COURSE_NOT_FOUND`, không lộ sự tồn tại); người không có vai trò phù hợp nhận `403 FORBIDDEN`. Các route `/admin/*` yêu cầu vai trò ADMIN (nếu không, `403 FORBIDDEN`). Hai ràng buộc chung này (BR-23) không nhắc lại ở từng bảng.

**Bảng 2.41 – Đặc tả UC022 – Quản lý khóa học của tôi**

| Mục | Nội dung |
|---|---|
| Mã UC | UC022 |
| Tên use case | Quản lý khóa học của tôi (tạo nháp, sửa, xóa nháp) |
| Tác nhân | Teacher |
| Mô tả | Giảng viên xem danh sách khóa của mình theo trạng thái, tạo khóa nháp mới bằng wizard soạn khóa năm bước, sửa thông tin khóa (ý tưởng, giới thiệu, giá và thẻ) và xóa khóa nháp. |
| Điều kiện tiên quyết | Đã đăng nhập với vai trò Teacher. |
| Điều kiện sau | Khóa nháp (`DRAFT`) được tạo hoặc cập nhật, hoặc bị xóa hẳn; thông tin sửa được lưu mỗi khi giảng viên bấm Tiếp sang bước sau. |
| Luồng sự kiện chính | 1) Giảng viên mở tab "Giảng dạy" (SC-23); ứng dụng gọi `GET /teacher/courses?status=&page=`, hiển thị danh sách khóa kèm chip trạng thái (Nháp, Chờ duyệt, Đã xuất bản, Bị từ chối, Đã ẩn) và tóm tắt số liệu; có thể lọc theo trạng thái.<br>2) Bấm "Tạo khóa mới" mở wizard (SC-24), bước Ý tưởng: nhập tên khóa (5–120 ký tự), chọn danh mục, trình độ (có thể dùng gợi ý AI, UC026).<br>3) Bấm Tiếp: ứng dụng gọi `POST /teacher/courses`; server tạo khóa `DRAFT` thuộc hồ sơ giảng viên và trả chi tiết khóa.<br>4) Bước Giới thiệu: phụ đề (tối đa 200 ký tự), mô tả (tối đa 5000 ký tự), các lợi ích (tối đa 10), mô tả project (tối đa 2000 ký tự), ảnh bìa (tải lên `POST /teacher/uploads/image`, PNG hoặc JPG tối đa 5 MB). Bước Giá và thẻ: miễn phí hoặc có phí (0 hoặc từ 99 đến 99 999 cent), giá gốc (nếu có phải lớn hơn giá), tối đa 5 thẻ có sẵn. Mỗi lần bấm Tiếp, ứng dụng gọi `PATCH /teacher/courses/:id` để lưu.<br>5) Wizard nhớ bước hiện tại trên URL (`?step=`) nên tải lại trang vẫn giữ bước; thay đổi chưa lưu khi tải lại hoặc rời đi bị cảnh báo.<br>6) Xóa nháp: ở trang trạng thái, giảng viên bấm xóa và xác nhận; ứng dụng gọi `DELETE /teacher/courses/:id`. |
| Luồng thay thế / ngoại lệ | A1) Khóa của người khác hoặc không tồn tại: `404 COURSE_NOT_FOUND`.<br>A2) Tên khóa hoặc trường vượt giới hạn: lỗi trên form, hoặc `400 VALIDATION_ERROR`; danh mục hoặc thẻ không tồn tại: `404 NOT_FOUND`.<br>A3) Khóa đang `PUBLISHED` mà sửa trường lớn (tiêu đề, giá, giá gốc, danh mục, thẻ): `422 REVISION_REQUIRED` kèm `details.fields`; ứng dụng hướng dẫn tạo bản sửa đổi (UC025). Trường nhỏ (phụ đề, mô tả, lợi ích, mô tả project, ảnh bìa) áp dụng ngay.<br>A4) Sửa khóa đang chờ duyệt: `422 INVALID_COURSE_STATE` (phải rút lại trước).<br>A5) Ảnh bìa sai loại: `415 UNSUPPORTED_FILE_TYPE`; quá 5 MB: `413 FILE_TOO_LARGE`; URL ảnh không phải do endpoint upload trả về: `400`.<br>A6) Xóa khóa đang chờ duyệt: `422 INVALID_COURSE_STATE`; khóa đã có học viên: `409 COURSE_HAS_ENROLLMENTS`; khóa từng xuất bản hoặc đang ẩn: `422 INVALID_COURSE_STATE` (chỉ được ẩn, xem UC031).<br>A7) Danh sách rỗng: trạng thái rỗng kèm nút tạo khóa đầu tiên. |
| Quy tắc nghiệp vụ | BR-19 (vòng đời khóa), BR-20 (giới hạn nhập liệu), BR-21 (trường nhỏ và lớn), BR-22 (xóa hoặc ẩn), BR-23 (quyền chủ khóa). |
| Yêu cầu liên quan | FR-39 |
| Màn hình | SC-23 Studio, SC-24 Wizard soạn khóa (các bước Ý tưởng, Giới thiệu, Giá và thẻ), SC-26 Trạng thái khóa |

![Hình 2.28 – Biểu đồ hoạt động UC022 – Quản lý khóa học của tôi](../../uml/png/AC-UC022.png)

*Hình 2.28 – Biểu đồ hoạt động UC022 – Quản lý khóa học của tôi*

**Bảng 2.42 – Đặc tả UC023 – Soạn chương trình học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC023 |
| Tên use case | Soạn chương trình học (chương, bài, video YouTube, bài xem thử) |
| Tác nhân | Teacher. Hệ thống ngoài: YouTube (nguồn video) |
| Mô tả | Giảng viên thêm, sửa, xóa chương và bài, đổi thứ tự, gắn link video YouTube, nhập thời lượng, đánh dấu bài xem thử và nhập nội dung chữ (dùng làm nguồn cho AI). |
| Điều kiện tiên quyết | Giảng viên là chủ khóa; khóa ở trạng thái `DRAFT` hoặc `REJECTED`. |
| Điều kiện sau | Chương trình học được lưu; `lessonCount` và `totalDurationSec` của khóa được tính lại. Thứ tự chương và bài luôn là dãy liên tục 1..n. |
| Luồng sự kiện chính | 1) Ở bước Bài học của wizard (SC-24, trình soạn SC-25), giảng viên bấm "Thêm chương" và nhập tên chương (tối đa 120 ký tự): `POST /teacher/courses/:id/sections`.<br>2) Bấm "Thêm bài" trong một chương, form bài mở dạng sheet: tiêu đề (tối đa 160 ký tự), link YouTube, thời lượng nhập dạng phút:giây (1 giây đến 6 giờ), cờ xem thử, nội dung chữ (tối đa 3000 ký tự). Ứng dụng gọi `POST /teacher/sections/:id/lessons`.<br>3) Server chuẩn hóa link YouTube về dạng `watch?v=` (giữ tham số `start`, `end`; chấp nhận dạng chia sẻ như `t=30s`, `t=1m30s`), tạo bài và tính lại số bài, tổng thời lượng.<br>4) Sửa hoặc xóa: `PATCH` hoặc `DELETE /teacher/sections/:id` và `/teacher/lessons/:id`.<br>5) Đổi thứ tự bằng nút lên, xuống (không kéo thả): `POST /teacher/courses/:id/reorder` với `target` là `sections` hoặc `lessons` và danh sách `ids` mới; server thực hiện trong một transaction.<br>6) Giảng viên có thể áp dụng dàn ý do AI gợi ý để tạo nhanh chương và bài (UC026). |
| Luồng thay thế / ngoại lệ | A1) Link không phải YouTube hợp lệ: `400 VALIDATION_ERROR` (lỗi dưới ô link).<br>A2) Khóa đang `PUBLISHED`: `422 REVISION_REQUIRED`, phải sửa qua bản sửa đổi (UC025); khóa chờ duyệt hoặc đã ẩn: `422 INVALID_COURSE_STATE`.<br>A3) Vượt giới hạn 20 chương hoặc 100 bài mỗi khóa, tiêu đề quá dài: `400 VALIDATION_ERROR`.<br>A4) Danh sách `ids` khi đổi thứ tự không đúng bằng tập hiện có: `400 VALIDATION_ERROR`.<br>A5) Chương hoặc bài không thuộc khóa của giảng viên: `404` (`NOT_FOUND` với chương, `LESSON_NOT_FOUND` với bài).<br>A6) Xóa chương: các bài trong chương cũng bị xóa; thứ tự còn lại được đánh số lại. |
| Quy tắc nghiệp vụ | BR-19, BR-20 (mỗi bài phải có link YouTube hợp lệ và thời lượng 1 giây đến 6 giờ; 1 đến 3 bài xem thử), BR-21, BR-23. |
| Yêu cầu liên quan | FR-40 |
| Màn hình | SC-24 Wizard soạn khóa (bước Bài học), SC-25 Soạn chương trình học |

**Bảng 2.43 – Đặc tả UC024 – Gửi duyệt khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC024 |
| Tên use case | Gửi duyệt khóa học |
| Tác nhân | Teacher |
| Mô tả | Giảng viên xem checklist các mục còn thiếu ở bước Xem lại, gửi khóa đạt yêu cầu vào hàng chờ của quản trị viên, theo dõi trạng thái và lịch sử duyệt, rút lại yêu cầu khi đang chờ, và sửa rồi gửi lại khi bị từ chối. |
| Điều kiện tiên quyết | Giảng viên là chủ khóa; khóa ở trạng thái `DRAFT` hoặc `REJECTED`. |
| Điều kiện sau | Khóa chuyển sang `PENDING_REVIEW`, `submittedAt` được ghi và lịch sử duyệt có thêm dòng `SUBMITTED`. Rút lại thì quay về `DRAFT` (ghi `WITHDRAWN`). |
| Luồng sự kiện chính | 1) Ở bước Xem lại (SC-24), ứng dụng hiển thị thẻ xem trước khóa và checklist các mục còn thiếu; nút "Gửi duyệt" mờ nếu còn thiếu.<br>2) Giảng viên bấm "Gửi duyệt"; ứng dụng gọi `POST /teacher/courses/:id/submit`.<br>3) Server kiểm tra trạng thái cho phép, chạy checklist (tiêu đề 5–120 ký tự, mô tả từ 100 ký tự, có ảnh bìa và danh mục, ít nhất một chương và ba bài, mọi bài có link YouTube hợp lệ và thời lượng hợp lệ, 1 đến 3 bài xem thử, giá hợp lệ, giá gốc lớn hơn giá).<br>4) Trong một transaction có điều kiện, server chuyển trạng thái sang `PENDING_REVIEW`, ghi `submittedAt` và dòng lịch sử `SUBMITTED`.<br>5) Ứng dụng chuyển sang trang trạng thái (SC-26): chip "Chờ duyệt", lịch sử duyệt và nút "Rút lại khỏi hàng chờ" (`POST /teacher/courses/:id/withdraw`, trả về `DRAFT`).<br>6) Khi quản trị viên từ chối (UC032), trang trạng thái hiện lý do; giảng viên sửa rồi gửi lại bằng cùng luồng. |
| Luồng thay thế / ngoại lệ | A1) Thiếu mục trong checklist: `422 COURSE_INCOMPLETE` kèm `details.missing[]` với các mã như `TITLE_LENGTH`, `DESCRIPTION_TOO_SHORT`, `NO_THUMBNAIL`, `NO_CATEGORY`, `NO_SECTION`, `NOT_ENOUGH_LESSONS`, `LESSON_VIDEO_INVALID`, `LESSON_DURATION_INVALID`, `PREVIEW_COUNT`, `PRICE_INVALID`, `ORIGINAL_PRICE_INVALID`; ứng dụng mở đúng bước chứa mục thiếu.<br>A2) Khóa không ở `DRAFT` hoặc `REJECTED` (đã chờ duyệt, đã xuất bản, đã ẩn): `422 INVALID_COURSE_STATE`.<br>A3) Hai yêu cầu gửi duyệt song song: chỉ một yêu cầu thành công, yêu cầu còn lại nhận `422 INVALID_COURSE_STATE`.<br>A4) Rút lại khi khóa không ở `PENDING_REVIEW`: `422 INVALID_COURSE_STATE`.<br>A5) Với bản sửa đổi của khóa đã xuất bản, gửi duyệt dùng `POST /teacher/courses/:id/revision/submit` và cùng checklist (UC025). |
| Quy tắc nghiệp vụ | BR-19 (vòng đời), BR-20 (checklist gửi duyệt), BR-21, BR-27 (thông báo kết quả duyệt). |
| Yêu cầu liên quan | FR-41 |
| Màn hình | SC-24 Wizard (bước Xem lại), SC-26 Gửi duyệt, trạng thái và lịch sử |

![Hình 2.29 – Biểu đồ hoạt động UC024 – Gửi duyệt khóa học](../../uml/png/AC-UC024.png)

*Hình 2.29 – Biểu đồ hoạt động UC024 – Gửi duyệt khóa học*

**Bảng 2.44 – Đặc tả UC025 – Sửa khóa đã xuất bản (bản sửa đổi)**

| Mục | Nội dung |
|---|---|
| Mã UC | UC025 |
| Tên use case | Sửa khóa đã xuất bản (bản sửa đổi) |
| Tác nhân | Teacher |
| Mô tả | Với khóa đã xuất bản, giảng viên sửa trường nhỏ (áp dụng ngay) hoặc tạo một bản sửa đổi cho trường lớn (tiêu đề, giá, giá gốc, danh mục, thẻ, toàn bộ chương và bài), gửi duyệt bản sửa đổi; trong lúc chờ, học viên vẫn thấy bản đang xuất bản. |
| Điều kiện tiên quyết | Giảng viên là chủ khóa; khóa ở trạng thái `PUBLISHED`; khóa chưa có bản sửa đổi đang mở. |
| Điều kiện sau | Bản sửa đổi (`CourseRevision`) được tạo, lưu và gửi duyệt; nội dung công khai chưa thay đổi cho tới khi quản trị viên duyệt (UC032). |
| Luồng sự kiện chính | 1) Ở trang trạng thái của khóa đã xuất bản (SC-26), giảng viên bấm "Tạo bản sửa đổi"; ứng dụng gọi `POST /teacher/courses/:id/revision`.<br>2) Server chụp các trường lớn của khóa hiện tại thành bản sửa đổi ở trạng thái `OPEN`.<br>3) Wizard mở ở chế độ sửa bản sửa đổi, hiển thị thông báo đang sửa bản sửa đổi; giảng viên chỉnh các trường và bấm lưu: `PUT /teacher/courses/:id/revision` với toàn bộ nội dung (kiểm tra bằng zod; id chương và bài phải thuộc khóa).<br>4) Giảng viên bấm gửi duyệt: `POST /teacher/courses/:id/revision/submit`; server chạy checklist trên nội dung ghép giữa bản sửa đổi và trường nhỏ hiện tại, chuyển bản sửa đổi sang `PENDING_REVIEW` và ghi lịch sử (`SUBMITTED`, mục tiêu `REVISION`).<br>5) Khi quản trị viên duyệt, bản sửa đổi được áp dụng vào khóa trong một transaction (UC032). |
| Luồng thay thế / ngoại lệ | A1) Khóa chưa xuất bản: `422 INVALID_COURSE_STATE`.<br>A2) Đã có bản sửa đổi: `409 REVISION_EXISTS`.<br>A3) Lưu hoặc gửi khi không có bản sửa đổi: `404 REVISION_NOT_FOUND`.<br>A4) Sửa bản sửa đổi đang chờ duyệt: `422 INVALID_COURSE_STATE` (phải rút lại trước); gửi lại bản đang chờ: `422 INVALID_COURSE_STATE`.<br>A5) Nội dung không đạt checklist: `422 COURSE_INCOMPLETE` kèm `details.missing[]`. Bài giữ nguyên video đang lưu (ví dụ video mẫu của khóa seed) vẫn được chấp nhận; bài mới hoặc đổi link phải là YouTube.<br>A6) Quản trị viên từ chối: bản sửa đổi chuyển `REJECTED`, giảng viên sửa tiếp và gửi lại.<br>A7) Giảng viên hủy bản sửa đổi: `DELETE /teacher/courses/:id/revision` (nếu đang chờ thì ghi `WITHDRAWN`).<br>A8) Sửa trực tiếp trường lớn bằng `PATCH`: `422 REVISION_REQUIRED`. |
| Quy tắc nghiệp vụ | BR-21 (trường nhỏ áp dụng ngay, trường lớn qua bản sửa đổi, tối đa một bản mở mỗi khóa; khi duyệt, bài giữ `id` thì cập nhật, bài bị bỏ thì xóa và mất tiến độ bài đó, bài mới thì tạo; tính lại số bài và tổng thời lượng), BR-20, BR-23. |
| Yêu cầu liên quan | FR-42 |
| Màn hình | SC-26 Gửi duyệt, trạng thái và bản sửa đổi; SC-24 Wizard (chế độ bản sửa đổi) |

**Bảng 2.45 – Đặc tả UC026 – AI hỗ trợ soạn khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC026 |
| Tên use case | AI hỗ trợ soạn khóa học |
| Tác nhân | Teacher. Hệ thống ngoài: Google Gemini |
| Mô tả | Từ chủ đề, trình độ và ngôn ngữ, AI gợi ý phụ đề, mô tả, lợi ích, danh mục và dàn ý chương, bài. Giảng viên chọn áp dụng từng phần vào form; AI không tự lưu gì. |
| Điều kiện tiên quyết | Đã đăng nhập với vai trò Teacher; còn hạn mức AI. |
| Điều kiện sau | Kết quả gợi ý được cache trong `AiContent` (loại `COURSE_DRAFT`); các phần giảng viên đã áp dụng được điền vào form (chưa lưu cho tới khi bấm Tiếp hoặc lưu). |
| Luồng sự kiện chính | 1) Ở bước Ý tưởng (hoặc "Viết giúp" ở bước Giới thiệu, hoặc "Gợi ý dàn ý bằng AI" ở bước Bài học), giảng viên mở sheet AI gợi ý (SC-27), nhập chủ đề (3–200 ký tự), chọn trình độ (beginner, intermediate, advanced) và ngôn ngữ, bấm "Tạo gợi ý".<br>2) Ứng dụng gọi `POST /teacher/ai/course-draft`.<br>3) Server tìm trong cache theo chủ đề và trình độ; nếu chưa có, kiểm tra hạn mức, gọi Gemini qua lớp provider với danh sách danh mục hiện có, kiểm tra và chuẩn hóa kết quả theo giới hạn của DTO (phụ đề, mô tả 100–1500 ký tự, 3–6 lợi ích, 3–6 chương, mỗi chương 2–5 bài) rồi lưu cache.<br>4) Ứng dụng hiển thị gợi ý: giảng viên có thể sửa chữ trong gợi ý, bấm "Áp dụng" cho từng phần (danh mục, phụ đề, mô tả, lợi ích, dàn ý); phần đã áp dụng hiện nhãn "Đã áp dụng".<br>5) Khi đã áp dụng hết, nút "Tiếp tục sang bước sau" tạo nháp (dùng chủ đề làm tiêu đề nếu trống) và chuyển sang bước kế tiếp. |
| Luồng thay thế / ngoại lệ | A1) Hết hạn mức AI (theo giờ, theo ngày của người dùng hoặc của toàn hệ thống): `429 AI_RATE_LIMITED` kèm `details.retryAfterSec`; lượt gọi lỗi được hoàn lại hạn mức.<br>A2) Nội dung bị bộ lọc an toàn chặn: `422 AI_BLOCKED`.<br>A3) Thiếu khóa AI, model lỗi hoặc quá thời gian: `503 AI_UNAVAILABLE` (có model dự phòng); kết quả sai định dạng không được cache và cũng trả `503`; ứng dụng báo lỗi thân thiện kèm nút thử lại.<br>A4) Chủ đề quá ngắn hoặc trình độ không hợp lệ: `400 VALIDATION_ERROR`.<br>A5) AI lỗi không chặn việc soạn tay: giảng viên đóng sheet và nhập thủ công.<br>A6) Danh mục do AI chọn không còn tồn tại: `categoryId` trả `null`. |
| Quy tắc nghiệp vụ | BR-29 (AI chỉ điền form, giảng viên tự lưu; dùng quota AI và cache `AiContent`; AI lỗi vẫn soạn tay được), NFR-14. |
| Yêu cầu liên quan | FR-44 |
| Màn hình | SC-27 AI gợi ý soạn khóa; SC-24 Wizard (các bước Ý tưởng, Giới thiệu, Bài học) |

![Hình 2.30 – Biểu đồ hoạt động UC026 – AI hỗ trợ soạn khóa học](../../uml/png/AC-UC026.png)

*Hình 2.30 – Biểu đồ hoạt động UC026 – AI hỗ trợ soạn khóa học*

**Bảng 2.46 – Đặc tả UC027 – Xem thống kê khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC027 |
| Tên use case | Xem thống kê khóa học |
| Tác nhân | Teacher |
| Mô tả | Giảng viên xem số liệu của một khóa: số học viên, số người đã hoàn thành, doanh thu (giả lập), tiến độ trung bình, phân bố số sao, số bài nộp và bài đã chấm, và biểu đồ học viên mới trong 30 ngày. |
| Điều kiện tiên quyết | Giảng viên là chủ khóa. |
| Điều kiện sau | Số liệu được hiển thị; không đổi dữ liệu. |
| Luồng sự kiện chính | 1) Từ Studio hoặc trang trạng thái của khóa, giảng viên mở màn thống kê (SC-28).<br>2) Ứng dụng gọi `GET /teacher/courses/:id/stats`.<br>3) Server tổng hợp: số ghi danh và tiến độ trung bình, số ghi danh đã hoàn thành, doanh thu từ các đơn `PAID`, phân bố điểm đánh giá, số bài nộp và số bài đã chấm, và số học viên mới theo từng ngày UTC trong 30 ngày gần nhất.<br>4) Ứng dụng vẽ các thẻ số liệu và biểu đồ SVG học viên mới theo ngày. |
| Luồng thay thế / ngoại lệ | A1) Khóa không thuộc giảng viên hoặc không tồn tại: `404 COURSE_NOT_FOUND`.<br>A2) Khóa chưa có học viên: số liệu bằng 0 và biểu đồ phẳng.<br>A3) Lỗi tải: lỗi kèm nút "Thử lại". |
| Quy tắc nghiệp vụ | BR-23 (quyền chủ khóa). Doanh thu là số liệu giả lập từ thanh toán mô phỏng (BR-07). |
| Yêu cầu liên quan | FR-45 |
| Màn hình | SC-28 Thống kê khóa |

**Bảng 2.47 – Đặc tả UC028 – Chấm điểm và nhận xét project**

| Mục | Nội dung |
|---|---|
| Mã UC | UC028 |
| Tên use case | Chấm điểm và nhận xét project |
| Tác nhân | Teacher |
| Mô tả | Giảng viên xem danh sách bài nộp của khóa, chấm điểm nguyên từ 0 đến 100 kèm nhận xét, và chấm lại khi cần. Học viên thấy điểm, nhận xét và nhận thông báo. |
| Điều kiện tiên quyết | Giảng viên là chủ khóa; có bài nộp của học viên (UC017). |
| Điều kiện sau | Bài nộp có `grade`, `feedback`, `gradedAt`; học viên có thông báo `PROJECT_GRADED`. Chấm lại ghi đè điểm cũ và cập nhật `gradedAt`. |
| Luồng sự kiện chính | 1) Giảng viên mở màn Bài nộp và chấm điểm (SC-29); ứng dụng gọi `GET /teacher/courses/:id/submissions?status=all\|graded\|ungraded`, nhận danh sách mới nhất trước kèm `meta.summary` (số đã chấm, số chưa chấm).<br>2) Giảng viên mở một bài nộp (xem tệp, ảnh bìa, mô tả) rồi mở bảng chấm điểm: nhập điểm nguyên 0 đến 100 và nhận xét (1–2000 ký tự).<br>3) Ứng dụng gọi `PUT /teacher/submissions/:id/grade`.<br>4) Server kiểm tra người gọi là giảng viên của khóa chứa bài nộp, trong một transaction cập nhật điểm, nhận xét, `gradedAt` và tạo thông báo `PROJECT_GRADED` cho học viên.<br>5) Ứng dụng cập nhật danh sách, nút đổi thành "Sửa điểm"; học viên thấy điểm trong tab Projects (UC017). |
| Luồng thay thế / ngoại lệ | A1) Điểm không phải số nguyên 0–100, hoặc nhận xét rỗng hoặc quá 2000 ký tự: lỗi trên form ("Điểm phải là số nguyên từ 0 đến 100"), hoặc `400 VALIDATION_ERROR`; không lưu.<br>A2) Bài nộp không tồn tại: `404 NOT_FOUND`.<br>A3) Bài nộp của khóa mà người gọi không phải giảng viên: `403 NOT_COURSE_TEACHER`.<br>A4) Khóa không thuộc giảng viên khi xem danh sách: `404 COURSE_NOT_FOUND`.<br>A5) Chấm lại: cho phép, ghi đè.<br>A6) Chưa có bài nộp: trạng thái rỗng. |
| Quy tắc nghiệp vụ | BR-26 (chỉ giảng viên của khóa; điểm nguyên 0–100; nhận xét 1–2000 ký tự; chấm lại được; thông báo `PROJECT_GRADED`). |
| Yêu cầu liên quan | FR-46 |
| Màn hình | SC-29 Bài nộp và chấm điểm; SC-15 Learning, tab Projects (phía học viên) |

![Hình 2.31 – Biểu đồ hoạt động UC028 – Chấm điểm và nhận xét project](../../uml/png/AC-UC028.png)

*Hình 2.31 – Biểu đồ hoạt động UC028 – Chấm điểm và nhận xét project*

**Bảng 2.48 – Đặc tả UC029 – Trả lời Q&A với vai trò giảng viên**

| Mục | Nội dung |
|---|---|
| Mã UC | UC029 |
| Tên use case | Trả lời Q&A với vai trò giảng viên (huy hiệu, ghim) |
| Tác nhân | Teacher |
| Mô tả | Giảng viên của khóa trả lời câu hỏi trong Q&A mà không cần ghi danh; câu trả lời có huy hiệu "Giảng viên" và giảng viên có thể ghim một câu trả lời để hiện đầu danh sách. |
| Điều kiện tiên quyết | Giảng viên là chủ khóa; câu hỏi tồn tại. |
| Điều kiện sau | Câu trả lời mới có `isInstructor = true`; câu trả lời được ghim hiện đầu danh sách, câu được ghim trước đó của cùng câu hỏi bị bỏ ghim. |
| Luồng sự kiện chính | 1) Giảng viên mở Q&A của khóa mình và mở một câu hỏi (SC-16); server cho vào vì là giảng viên của khóa.<br>2) Giảng viên nhập câu trả lời (1–1000 ký tự) và gửi: `POST /questions/:id/answers`; câu trả lời hiện kèm huy hiệu "Giảng viên"; người hỏi nhận thông báo `NEW_ANSWER`.<br>3) Giảng viên bấm "Ghim" ở một câu trả lời (của học viên hoặc của mình): `PUT /teacher/answers/:id/pin`.<br>4) Server khóa hàng câu hỏi (`FOR UPDATE`), bỏ ghim câu cũ và ghim câu mới, nên mỗi câu hỏi có tối đa một câu trả lời được ghim.<br>5) Bỏ ghim: `DELETE /teacher/answers/:id/pin`. Câu được ghim có viền và nhãn "Đã ghim". |
| Luồng thay thế / ngoại lệ | A1) Người không phải giảng viên của khóa và chưa ghi danh: `403 NOT_ENROLLED` khi trả lời; khi ghim: `403 NOT_COURSE_TEACHER`.<br>A2) Câu hỏi hoặc câu trả lời không tồn tại: `404 QUESTION_NOT_FOUND` hoặc `404 NOT_FOUND`.<br>A3) Nội dung rỗng hoặc quá 1000 ký tự: `400 VALIDATION_ERROR`.<br>A4) Ghim lặp lại cùng một câu: không lỗi.<br>A5) Mất mạng: chặn thao tác ghi. |
| Quy tắc nghiệp vụ | BR-24 (giảng viên không cần ghi danh; trả `isInstructor`; ghim tối đa một câu trả lời mỗi câu hỏi; câu ghim xếp đầu), BR-09. |
| Yêu cầu liên quan | FR-47, FR-19 |
| Màn hình | SC-16 Question detail; SC-15 Learning (tab Q&A) |

**Bảng 2.49 – Đặc tả UC030 – Phản hồi đánh giá**

| Mục | Nội dung |
|---|---|
| Mã UC | UC030 |
| Tên use case | Phản hồi đánh giá |
| Tác nhân | Teacher |
| Mô tả | Giảng viên của khóa viết một phản hồi công khai dưới đánh giá của học viên; phản hồi sửa và xóa được. |
| Điều kiện tiên quyết | Giảng viên là chủ khóa; đánh giá tồn tại (UC015). |
| Điều kiện sau | Đánh giá có `teacherReply` và `teacherRepliedAt`; người đánh giá nhận thông báo `REVIEW_REPLY` ở lần phản hồi đầu tiên. |
| Luồng sự kiện chính | 1) Giảng viên mở danh sách đánh giá của khóa mình (SC-09 hoặc SC-10) và bấm "Phản hồi" dưới một đánh giá; một bảng nhập mở ra.<br>2) Giảng viên nhập phản hồi (1–1000 ký tự) và gửi: `PUT /teacher/reviews/:id/reply`.<br>3) Server kiểm tra người gọi là giảng viên của khóa, lưu phản hồi và thời điểm; nếu đây là lần phản hồi đầu thì tạo thông báo cho người đánh giá. Đánh giá được trả về kèm phản hồi.<br>4) Sửa phản hồi dùng lại `PUT` (không gửi thêm thông báo); xóa bằng `DELETE /teacher/reviews/:id/reply` (idempotent), đánh giá trả về với `teacherReply = null`. |
| Luồng thay thế / ngoại lệ | A1) Không phải giảng viên của khóa: `403 NOT_COURSE_TEACHER`.<br>A2) Đánh giá không tồn tại: `404 NOT_FOUND`.<br>A3) Phản hồi rỗng hoặc quá 1000 ký tự: `400 VALIDATION_ERROR`.<br>A4) Mất mạng: chặn thao tác ghi. |
| Quy tắc nghiệp vụ | BR-25 (chỉ giảng viên của khóa; một phản hồi mỗi đánh giá; 1–1000 ký tự; sửa, xóa được; thông báo `REVIEW_REPLY` lần đầu). |
| Yêu cầu liên quan | FR-48 |
| Màn hình | SC-09 Course Details (tab Review), SC-10 All reviews |

**Bảng 2.50 – Đặc tả UC031 – Ẩn hoặc khôi phục khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC031 |
| Tên use case | Ẩn hoặc khôi phục khóa học |
| Tác nhân | Teacher, Admin |
| Mô tả | Giảng viên (chủ khóa) hoặc quản trị viên ẩn một khóa đã xuất bản khỏi danh mục và tìm kiếm, và khôi phục khóa đang ẩn về trạng thái đã xuất bản. Học viên đã mua khóa vẫn học được khi khóa bị ẩn. |
| Điều kiện tiên quyết | Khóa ở trạng thái `PUBLISHED` (để ẩn) hoặc `ARCHIVED` (để khôi phục). Giảng viên phải là chủ khóa; quản trị viên có vai trò ADMIN. |
| Điều kiện sau | Trạng thái khóa chuyển giữa `PUBLISHED` và `ARCHIVED`; lịch sử duyệt có thêm dòng `ARCHIVED` hoặc `RESTORED` (kèm lý do nếu quản trị viên nhập); cache Home bị xóa. Khóa ẩn biến khỏi Home, tìm kiếm, danh mục và hồ sơ giảng viên; không thêm vào giỏ hoặc mua được. |
| Luồng sự kiện chính | 1) Giảng viên: ở trang trạng thái khóa (SC-26), bấm "Ẩn khóa học" rồi xác nhận; ứng dụng gọi `POST /teacher/courses/:id/archive`. Khôi phục dùng `POST /teacher/courses/:id/restore`.<br>2) Quản trị viên: ở chi tiết khóa (SC-33), bấm "Ẩn khóa học", nhập lý do (5–500 ký tự, không bắt buộc) và xác nhận; ứng dụng gọi `POST /admin/courses/:id/archive` (khôi phục: `/restore`).<br>3) Server chuyển trạng thái có điều kiện trong một transaction (chặn hai thao tác đồng thời), ghi lịch sử và xóa cache Home.<br>4) Ứng dụng cập nhật chip trạng thái ("Đã ẩn" và nút "Khôi phục"). |
| Luồng thay thế / ngoại lệ | A1) Ẩn khóa không ở `PUBLISHED`, hoặc khôi phục khóa không ở `ARCHIVED`: `422 INVALID_COURSE_STATE`.<br>A2) Khóa của giảng viên khác: `404 COURSE_NOT_FOUND` (giảng viên); khóa không tồn tại: `404 COURSE_NOT_FOUND` (quản trị viên).<br>A3) Lý do của quản trị viên ngắn hơn 5 hoặc dài hơn 500 ký tự: `400 VALIDATION_ERROR`.<br>A4) Người dùng chưa mua truy cập khóa đang ẩn: `404 COURSE_NOT_FOUND`; người đã mua vẫn thấy khóa trong "Khóa học của tôi" và học bình thường (UC013, UC014). |
| Quy tắc nghiệp vụ | BR-19 (`PUBLISHED` và `ARCHIVED` chuyển qua lại), BR-22 (khóa ẩn: người chưa ghi danh nhận 404, người đã mua vẫn học), BR-23. |
| Yêu cầu liên quan | FR-43 |
| Màn hình | SC-26 Gửi duyệt, trạng thái và lịch sử; SC-33 Quản trị: xem và duyệt khóa |

**Bảng 2.51 – Đặc tả UC032 – Duyệt hoặc từ chối khóa học**

| Mục | Nội dung |
|---|---|
| Mã UC | UC032 |
| Tên use case | Duyệt hoặc từ chối khóa học (gồm cả bản sửa đổi) |
| Tác nhân | Admin. Hệ thống ngoài: Brevo SMTP |
| Mô tả | Quản trị viên xem hàng chờ gồm khóa mới và bản sửa đổi, xem trước nội dung (với bản sửa đổi có so sánh cũ và mới), tham khảo nhận định của AI (UC033), rồi duyệt hoặc từ chối kèm lý do. Giảng viên nhận thông báo và email kết quả. |
| Điều kiện tiên quyết | Đăng nhập với vai trò ADMIN; khóa ở trạng thái `PENDING_REVIEW`, hoặc khóa `PUBLISHED` có bản sửa đổi ở trạng thái `PENDING_REVIEW`. |
| Điều kiện sau | Duyệt khóa mới: khóa thành `PUBLISHED`, đặt `publishedAt` ở lần xuất bản đầu và tạo thông báo `NEW_COURSE` cho người theo dõi (UC036). Duyệt bản sửa đổi: nội dung được áp dụng vào khóa, bản sửa đổi bị xóa. Từ chối: khóa hoặc bản sửa đổi thành `REJECTED`. Cả hai ghi lịch sử duyệt, tạo thông báo cho giảng viên và gửi email. |
| Luồng sự kiện chính | 1) Quản trị viên mở màn hàng chờ (SC-32): `GET /admin/courses?type=course\|revision&status=`; có thẻ số lượng đang chờ và hai tab "Khóa học mới" và "Bản sửa đổi".<br>2) Bấm một mục mở chi tiết (SC-33): `GET /admin/courses/:id` trả đầy đủ nội dung, chương và bài (có nút mở video), lịch sử duyệt, và với bản sửa đổi là khối so sánh các trường đã đổi (giá trị cũ gạch bỏ, giá trị mới).<br>3) Quản trị viên có thể chạy kiểm tra AI (UC033).<br>4) Duyệt: bấm "Duyệt"; ứng dụng gọi `POST /admin/courses/:id/approve`. Server xác định đối tượng chờ duyệt, chạy lại checklist (nội dung có thể đã đổi từ lúc gửi), rồi trong một transaction chuyển trạng thái (hoặc áp dụng bản sửa đổi), ghi lịch sử `APPROVED`, tạo thông báo `COURSE_APPROVED` cho giảng viên.<br>5) Sau khi commit, server gửi email kết quả ở nền, xóa cache Home và trả chi tiết khóa; ứng dụng báo "Đã duyệt khóa học".<br>6) Từ chối: bấm "Từ chối", nhập lý do (5–500 ký tự), gửi `POST /admin/courses/:id/reject` với `{reason}`; server chuyển sang `REJECTED`, ghi lịch sử kèm lý do, tạo thông báo `COURSE_REJECTED` và gửi email; ứng dụng quay về hàng chờ. |
| Luồng thay thế / ngoại lệ | A1) Không phải ADMIN: `403 FORBIDDEN`.<br>A2) Khóa không có gì đang chờ duyệt: `422 INVALID_COURSE_STATE`; hai quản trị viên bấm cùng lúc: người sau nhận `422 INVALID_COURSE_STATE`.<br>A3) Nội dung không còn đạt checklist lúc duyệt (kể cả danh mục của bản sửa đổi đã bị xóa): `422 COURSE_INCOMPLETE` kèm `details.missing[]`.<br>A4) Lý do từ chối ngắn hơn 5 hoặc dài hơn 500 ký tự: lỗi trên form ("Nhập ít nhất 5 ký tự"), hoặc `400 VALIDATION_ERROR`.<br>A5) Khóa không tồn tại: `404 COURSE_NOT_FOUND`.<br>A6) Gửi email lỗi: chỉ ghi log, không làm hỏng thao tác duyệt (BR-27).<br>A7) Bộ lọc không hợp lệ (ví dụ `status` không thuộc loại đang chọn): `400 VALIDATION_ERROR`. |
| Quy tắc nghiệp vụ | BR-19 (vòng đời), BR-20 (checklist chạy lại), BR-21 (áp dụng bản sửa đổi trong một transaction), BR-27 (thông báo, email, lỗi email không chặn), BR-23, BR-29 (AI chỉ tư vấn). |
| Yêu cầu liên quan | FR-50, FR-54 |
| Màn hình | SC-32 Hàng chờ duyệt, SC-33 Xem và duyệt khóa |

![Hình 2.32 – Biểu đồ hoạt động UC032 – Duyệt hoặc từ chối khóa học](../../uml/png/AC-UC032.png)

*Hình 2.32 – Biểu đồ hoạt động UC032 – Duyệt hoặc từ chối khóa học*

**Bảng 2.52 – Đặc tả UC033 – Xem AI kiểm duyệt sơ bộ**

| Mục | Nội dung |
|---|---|
| Mã UC | UC033 |
| Tên use case | Xem AI kiểm duyệt sơ bộ |
| Tác nhân | Admin. Hệ thống ngoài: Google Gemini |
| Mô tả | Khi xem một khóa chờ duyệt, quản trị viên yêu cầu AI đọc nội dung gửi duyệt và trả nhận định cùng danh sách vấn đề (mức độ, phần liên quan, mô tả) theo ngôn ngữ của quản trị viên. Kết quả chỉ mang tính tư vấn. |
| Điều kiện tiên quyết | Đăng nhập với vai trò ADMIN; mở chi tiết một khóa (UC032); còn hạn mức AI. |
| Điều kiện sau | Kết quả được cache trong `AiContent` (loại `COURSE_REVIEW`) theo mã băm của nội dung được kiểm tra nên nội dung đổi thì kiểm tra lại; không thay đổi trạng thái khóa. |
| Luồng sự kiện chính | 1) Ở chi tiết khóa (SC-33), quản trị viên bấm "Chạy kiểm tra AI".<br>2) Ứng dụng gọi `GET /admin/courses/:id/ai-review?lang=`.<br>3) Server nạp nội dung cần kiểm tra (khóa, hoặc bản sửa đổi đang chờ), tìm trong cache theo khóa học và mã băm nội dung; nếu chưa có thì kiểm tra hạn mức, gọi Gemini qua lớp provider, kiểm tra và chuẩn hóa kết quả rồi lưu cache.<br>4) Server trả `verdict` (`LOOKS_OK` hoặc `NEEDS_ATTENTION`), tóm tắt và tối đa 10 vấn đề, mỗi vấn đề có mức độ `low`, `medium` hoặc `high`, phần (`title`, `description`, `curriculum`, `pricing`, `media`, `policy`, `other`) và mô tả.<br>5) Panel AI hiển thị nhãn ("Có vẻ ổn" hoặc "Cần chú ý"), nhận định, danh sách vấn đề, model đã dùng, thời điểm tạo và lưu ý tham khảo; quản trị viên tự quyết định duyệt hay từ chối. |
| Luồng thay thế / ngoại lệ | A1) Khóa không tồn tại: `404 COURSE_NOT_FOUND`.<br>A2) Hết hạn mức AI: `429 AI_RATE_LIMITED` (kèm `details.retryAfterSec`, lượt lỗi được hoàn lại hạn mức).<br>A3) Bị bộ lọc an toàn chặn: `422 AI_BLOCKED`.<br>A4) Dịch vụ AI không dùng được hoặc kết quả sai định dạng: `503 AI_UNAVAILABLE` (không cache); panel báo lỗi thân thiện và quản trị viên vẫn duyệt hoặc từ chối bình thường.<br>A5) Không phải ADMIN: `403 FORBIDDEN`.<br>A6) Kết quả AI không phát hiện vấn đề: panel ghi "AI không phát hiện vấn đề nào". |
| Quy tắc nghiệp vụ | BR-29 (AI chỉ tư vấn, quản trị viên quyết định; dùng quota AI và cache `AiContent`; AI lỗi vẫn duyệt được), NFR-14. |
| Yêu cầu liên quan | FR-51 |
| Màn hình | SC-33 Xem và duyệt khóa (panel AI kiểm duyệt) |

![Hình 2.33 – Biểu đồ hoạt động UC033 – Xem AI kiểm duyệt sơ bộ](../../uml/png/AC-UC033.png)

*Hình 2.33 – Biểu đồ hoạt động UC033 – Xem AI kiểm duyệt sơ bộ*

**Bảng 2.53 – Đặc tả UC034 – Quản lý người dùng (khóa hoặc mở tài khoản)**

| Mục | Nội dung |
|---|---|
| Mã UC | UC034 |
| Tên use case | Quản lý người dùng (khóa / mở tài khoản) |
| Tác nhân | Admin |
| Mô tả | Quản trị viên tìm và lọc người dùng theo tên, email, vai trò và trạng thái, khóa tài khoản kèm lý do và mở khóa lại. Khóa tài khoản thu hồi mọi phiên đăng nhập. |
| Điều kiện tiên quyết | Đăng nhập với vai trò ADMIN. |
| Điều kiện sau | Khóa: tài khoản có `disabledAt` và `disabledReason`, mọi phiên và refresh token bị thu hồi, người dùng không đăng nhập được; khóa học của giảng viên bị khóa giữ nguyên trạng thái. Mở khóa: `disabledAt` về rỗng (người dùng phải đăng nhập lại). |
| Luồng sự kiện chính | 1) Quản trị viên mở màn Người dùng (SC-34); ứng dụng gọi `GET /admin/users?search=&role=&status=&page=`.<br>2) Server tìm theo họ tên hoặc email (không phân biệt hoa thường, ký tự đặc biệt được thoát nghĩa), lọc theo vai trò và trạng thái (`active`, `disabled`), trả bảng người dùng kèm vai trò, số khóa (giảng viên), số lượt ghi danh, ngày tham gia và trạng thái.<br>3) Bấm "Khóa" ở một người dùng, nhập lý do (5–500 ký tự) và xác nhận: `POST /admin/users/:id/disable`.<br>4) Server đặt `disabledAt` và lý do, thu hồi mọi phiên của người đó, ghi log và trả người dùng đã cập nhật; dòng người dùng hiện nhãn "Bị khóa" kèm lý do và nút "Mở khóa".<br>5) Mở khóa: `POST /admin/users/:id/enable` (idempotent). |
| Luồng thay thế / ngoại lệ | A1) Khóa tài khoản ADMIN (kể cả chính mình): `422 CANNOT_DISABLE_ADMIN`.<br>A2) Người dùng không tồn tại: `404 NOT_FOUND`.<br>A3) Lý do ngắn hơn 5 hoặc dài hơn 500 ký tự: `400 VALIDATION_ERROR`.<br>A4) Khóa lại tài khoản đã bị khóa: chỉ cập nhật lý do.<br>A5) Người bị khóa đăng nhập hoặc làm mới token: `403 ACCOUNT_DISABLED` (UC002); các yêu cầu đang dùng access token hiện có bị từ chối ngay vì phiên đã thu hồi.<br>A6) Không có kết quả tìm kiếm: trạng thái rỗng. |
| Quy tắc nghiệp vụ | BR-28 (không khóa admin; lý do 5–500 ký tự; thu hồi phiên; `ACCOUNT_DISABLED`), BR-30. |
| Yêu cầu liên quan | FR-52 |
| Màn hình | SC-34 Quản trị: người dùng |

**Bảng 2.54 – Đặc tả UC035 – Xem dashboard hệ thống**

| Mục | Nội dung |
|---|---|
| Mã UC | UC035 |
| Tên use case | Xem dashboard hệ thống |
| Tác nhân | Admin |
| Mô tả | Quản trị viên xem tổng quan hệ thống: số người dùng theo vai trò, số tài khoản bị khóa, người dùng mới 7 và 30 ngày, số khóa học theo trạng thái, số mục chờ duyệt, số đơn và doanh thu (giả lập), và 5 khóa nhiều học viên nhất. |
| Điều kiện tiên quyết | Đăng nhập với vai trò ADMIN. |
| Điều kiện sau | Số liệu được hiển thị; không đổi dữ liệu. |
| Luồng sự kiện chính | 1) Quản trị viên mở tab "Quản trị" (SC-31).<br>2) Ứng dụng gọi `GET /admin/stats`.<br>3) Server tổng hợp song song: số người dùng theo vai trò, số bị khóa, người dùng mới trong 7 và 30 ngày, số khóa theo từng trạng thái, số khóa mới và bản sửa đổi đang chờ duyệt, số đơn `PAID` cùng tổng doanh thu, và 5 khóa đã xuất bản có `enrollmentCount` cao nhất kèm doanh thu.<br>4) Ứng dụng hiển thị các thẻ số liệu; bấm thẻ "Đang chờ duyệt" mở hàng chờ (UC032) và thẻ người dùng mở UC034. |
| Luồng thay thế / ngoại lệ | A1) Không phải ADMIN: `403 FORBIDDEN`; người dùng không có vai trò Admin cũng không thấy tab "Quản trị".<br>A2) Lỗi tải: lỗi kèm nút "Thử lại".<br>A3) Hệ thống chưa có dữ liệu: các số bằng 0, danh sách top rỗng. |
| Quy tắc nghiệp vụ | BR-23 (quyền theo vai trò), BR-30 (tài khoản Admin chỉ tạo bằng seed hoặc script). |
| Yêu cầu liên quan | FR-53 |
| Màn hình | SC-31 Quản trị: dashboard |

**Bảng 2.55 – Đặc tả UC036 – Nhận thông báo khóa mới của giảng viên đang theo dõi**

| Mục | Nội dung |
|---|---|
| Mã UC | UC036 |
| Tên use case | Nhận thông báo khóa mới của giảng viên đang theo dõi |
| Tác nhân | Learner (người theo dõi). Kích hoạt bởi Admin khi duyệt khóa |
| Mô tả | Khi một khóa học của giảng viên được xuất bản lần đầu, mọi học viên đang theo dõi giảng viên đó nhận thông báo `NEW_COURSE`. Bản sửa đổi của khóa đã xuất bản không phát thông báo này. |
| Điều kiện tiên quyết | Học viên đã theo dõi giảng viên (UC018); quản trị viên duyệt khóa mới của giảng viên đó (UC032). |
| Điều kiện sau | Mỗi người theo dõi có một thông báo `NEW_COURSE` kèm tham chiếu tới khóa; huy hiệu chưa đọc tăng. |
| Luồng sự kiện chính | 1) Quản trị viên duyệt khóa ở trạng thái `PENDING_REVIEW` mà `publishedAt` còn rỗng (lần xuất bản đầu).<br>2) Trong cùng transaction với việc duyệt, server lấy danh sách người theo dõi của giảng viên (loại chính giảng viên) và tạo hàng loạt thông báo `NEW_COURSE` với nội dung gồm tên giảng viên và tên khóa.<br>3) Học viên thấy huy hiệu chưa đọc ở biểu tượng chuông; mở danh sách thông báo (UC020) và bấm thông báo để vào trang chi tiết khóa (UC008). Nội dung hiển thị theo ngôn ngữ đang chọn. |
| Luồng thay thế / ngoại lệ | A1) Giảng viên chưa có người theo dõi: không tạo thông báo.<br>A2) Duyệt bản sửa đổi của khóa đã xuất bản, hoặc khôi phục khóa đã ẩn: không phát `NEW_COURSE`.<br>A3) Học viên bỏ theo dõi trước khi duyệt: không nhận thông báo.<br>A4) Khóa bị xóa giữa chừng: `404 COURSE_NOT_FOUND` và việc duyệt không hoàn tất. |
| Quy tắc nghiệp vụ | BR-14 (theo dõi), BR-27 (`NEW_COURSE` khi xuất bản lần đầu cho follower), BR-19. |
| Yêu cầu liên quan | FR-54, FR-23 |
| Màn hình | SC-22 Notifications; SC-09 Course Details (đích của thông báo) |

**Bảng 2.56 – Đặc tả UC037 – Cập nhật hồ sơ giảng viên**

| Mục | Nội dung |
|---|---|
| Mã UC | UC037 |
| Tên use case | Cập nhật hồ sơ giảng viên |
| Tác nhân | Teacher |
| Mô tả | Giảng viên sửa hồ sơ công khai của mình gồm chức danh, giới thiệu, tổ chức, địa điểm và múi giờ; thông tin này hiển thị ở trang hồ sơ giảng viên (UC018) và dùng để tính giờ địa phương. |
| Điều kiện tiên quyết | Đăng nhập với vai trò Teacher. |
| Điều kiện sau | `TeacherProfile` được cập nhật; trang hồ sơ giảng viên hiển thị thông tin mới. |
| Luồng sự kiện chính | 1) Giảng viên mở menu ở màn Profile (SC-20) và chọn "Hồ sơ giảng viên"; ứng dụng mở màn SC-30.<br>2) Ứng dụng gọi `GET /me/teacher-profile` và điền sẵn form.<br>3) Giảng viên sửa chức danh (1–100 ký tự), giới thiệu (tối đa 2000 ký tự), tổ chức, địa điểm (tối đa 100 ký tự mỗi ô) và múi giờ IANA (ví dụ `Asia/Ho_Chi_Minh`).<br>4) Bấm Lưu; ứng dụng gọi `PATCH /me/teacher-profile` (ít nhất một trường).<br>5) Server kiểm tra rồi lưu; ứng dụng hiện thông báo thành công và làm mới hồ sơ. |
| Luồng thay thế / ngoại lệ | A1) Chức danh rỗng hoặc vượt độ dài: lỗi dưới từng ô, hoặc `400 VALIDATION_ERROR`.<br>A2) Múi giờ không phải tên IANA hợp lệ: `400 VALIDATION_ERROR`.<br>A3) Gửi body không có trường nào: `400 VALIDATION_ERROR`.<br>A4) Người dùng không phải Teacher: `403 FORBIDDEN`.<br>A5) Mất mạng: chặn thao tác lưu. |
| Quy tắc nghiệp vụ | BR-16 (giờ địa phương theo múi giờ), BR-23 (quyền theo vai trò). |
| Yêu cầu liên quan | FR-49 |
| Màn hình | SC-30 Sửa hồ sơ giảng viên |

### 2.6.5 Nhóm Học viên bổ sung của giai đoạn 2 (UC038 đến UC045)

Tám use case dưới đây là các chức năng giai đoạn 2 (xác thực chuẩn ứng dụng thật, cài đặt, AI) được đánh số tiếp theo UC037. Chúng không phải use case lõi nên chỉ có bảng đặc tả, không có biểu đồ hoạt động và tuần tự riêng; luồng của chúng cũng được thể hiện một phần trong biểu đồ hoạt động của UC002 (đăng nhập, 2FA) và UC014 (học bài).

**Bảng 2.57 – Đặc tả UC038 – Xác minh email bằng OTP**

| Mục | Nội dung |
|---|---|
| Mã UC | UC038 |
| Tên use case | Xác minh email bằng OTP |
| Tác nhân | Guest. Hệ thống ngoài: Brevo SMTP (gửi email) |
| Mô tả | Sau khi đăng ký (UC001), người dùng nhập mã OTP 6 số gửi qua email để chứng minh quyền sở hữu hộp thư. Chưa xác minh thì không đăng nhập được. Xác minh thành công thì cấp phiên đăng nhập ngay. |
| Điều kiện tiên quyết | Tài khoản đã được tạo (UC001) hoặc người dùng đăng nhập khi chưa xác minh (UC002, `EMAIL_NOT_VERIFIED`); có mã còn hạn trong hộp thư. |
| Điều kiện sau | `emailVerifiedAt` được đặt; ghi sự kiện `EMAIL_VERIFIED` và `LOGIN_SUCCESS`; người dùng có phiên đăng nhập (access token 15 phút, refresh token 30 ngày) và vào Home. |
| Luồng sự kiện chính | 1) Ứng dụng mở màn Verify email, hiển thị địa chỉ email và đồng hồ đếm lùi cho phép gửi lại.<br>2) Người dùng nhập mã 6 số nhận qua email (mã có hiệu lực 10 phút).<br>3) Ứng dụng gọi `POST /auth/verify-email` với email, mã và tên thiết bị.<br>4) Server kiểm tra mã (chỉ lưu dạng băm, dùng một lần), đánh dấu email đã xác minh, tạo phiên và trả `AuthSessionDto`.<br>5) Ứng dụng lưu token và chuyển vào Home. |
| Luồng thay thế / ngoại lệ | A1) Mã sai: `400 INVALID_CODE` kèm `details.attemptsLeft`; sai lần thứ 5: `429 TOO_MANY_ATTEMPTS` ngay (phải yêu cầu mã mới).<br>A2) Mã hết hạn: `400 CODE_EXPIRED`; người dùng bấm "Gửi lại mã".<br>A3) Gửi lại: `POST /auth/resend-verification`; gửi trước 60 giây kể từ mã trước: `429 RESEND_TOO_SOON` (kèm `retryAfterSec`); email không tồn tại hoặc đã xác minh vẫn trả 200 như thường để không lộ thông tin.<br>A4) Email đã xác minh rồi: `409 ALREADY_VERIFIED`.<br>A5) Email không có tài khoản: `400 INVALID_CODE` (không phân biệt với mã sai).<br>A6) Giới hạn tốc độ: `429 RATE_LIMITED`.<br>A7) Không nhận được email (không kiểm chứng được trên môi trường kiểm thử, xem TC-AUTH-31): người dùng bấm gửi lại sau khi hết thời gian chờ. |
| Quy tắc nghiệp vụ | Quy tắc OTP của FR-25: 6 số, hết hạn 10 phút, tối đa 5 lần sai, gửi lại sau 60 giây, chưa xác minh không đăng nhập được; NFR-05. |
| Yêu cầu liên quan | FR-25 |
| Màn hình | Verify email (`(auth)/verify-email`) |

**Bảng 2.58 – Đặc tả UC039 – Quên và đặt lại mật khẩu**

| Mục | Nội dung |
|---|---|
| Mã UC | UC039 |
| Tên use case | Quên và đặt lại mật khẩu (kèm đổi mật khẩu trong Cài đặt) |
| Tác nhân | Guest (quên mật khẩu); Learner (đổi mật khẩu). Hệ thống ngoài: Google reCAPTCHA, Brevo SMTP |
| Mô tả | Người dùng không nhớ mật khẩu nhận mã OTP qua email để đặt mật khẩu mới mà không bị lộ việc email có tồn tại hay không. Người dùng đã đăng nhập đổi mật khẩu trong Cài đặt, các thiết bị khác bị đăng xuất. |
| Điều kiện tiên quyết | Quên mật khẩu: có quyền truy cập email của tài khoản. Đổi mật khẩu: đã đăng nhập và biết mật khẩu hiện tại. |
| Điều kiện sau | Mật khẩu mới được băm bcrypt và lưu. Đặt lại: mọi phiên bị thu hồi, email được đánh dấu đã xác minh, bộ đếm đăng nhập sai và khóa tạm được xóa, 2FA (nếu bật) giữ nguyên; gửi email thông báo đổi mật khẩu. Đổi trong Cài đặt: các phiên khác bị thu hồi, phiên hiện tại giữ nguyên; gửi email thông báo. |
| Luồng sự kiện chính | 1) Quên mật khẩu: ở màn Login, người dùng bấm "Quên mật khẩu", nhập email và hoàn thành CAPTCHA (màn Forgot password).<br>2) Ứng dụng gọi `POST /auth/forgot-password`; server xác minh CAPTCHA và luôn trả `200` kèm thời hạn mã và thời gian chờ gửi lại; nếu email có tài khoản (và không trong thời gian chờ) thì gửi mã OTP 6 số hết hạn sau 10 phút.<br>3) Ứng dụng chuyển sang màn Reset password; người dùng nhập mã và mật khẩu mới (8–72 ký tự, có chữ và số).<br>4) Ứng dụng gọi `POST /auth/reset-password`; server kiểm tra mã, đặt mật khẩu, thu hồi mọi phiên, gửi email thông báo và trả `204`.<br>5) Ứng dụng đưa người dùng về Login để đăng nhập lại.<br>6) Đổi mật khẩu trong Cài đặt: ở màn Bảo mật (Settings), người dùng nhập mật khẩu hiện tại và mật khẩu mới rồi gọi `POST /me/password` (`204`). |
| Luồng thay thế / ngoại lệ | A1) Thiếu hoặc sai CAPTCHA: `400 CAPTCHA_REQUIRED` hoặc `400 CAPTCHA_FAILED`; production thiếu cấu hình: `503 CAPTCHA_UNAVAILABLE`.<br>A2) Email không có tài khoản: vẫn trả `200` như nhau (không lộ email); gửi lại trong thời gian chờ cũng im lặng trả `200`.<br>A3) Mã sai: `400 INVALID_CODE` (kèm `attemptsLeft`); hết hạn: `400 CODE_EXPIRED`; sai quá số lần: `429 TOO_MANY_ATTEMPTS`.<br>A4) Mật khẩu mới không đạt quy tắc: `400 VALIDATION_ERROR`; lỗi hiện dưới ô nhập.<br>A5) Đổi mật khẩu với mật khẩu hiện tại sai: `422 INVALID_PASSWORD`.<br>A6) Giới hạn tốc độ: `429 RATE_LIMITED` (5 yêu cầu gửi mã mỗi phút, 10 yêu cầu nhập mã mỗi phút trên một IP).<br>A7) Không nhận được email: chưa kiểm chứng được trên môi trường kiểm thử (TC-AUTH-32); có integration test thay thế. |
| Quy tắc nghiệp vụ | Quy tắc OTP và CAPTCHA của FR-26, FR-27 và FR-30 (không tiết lộ email tồn tại; đặt lại và đổi mật khẩu đều thu hồi phiên); NFR-05. |
| Yêu cầu liên quan | FR-26, FR-27, FR-30 |
| Màn hình | Forgot password (`(auth)/forgot-password`), Reset password (`(auth)/reset-password`), Settings → Bảo mật (`settings/security`) |

**Bảng 2.59 – Đặc tả UC040 – Bật hoặc tắt 2FA và đăng nhập hai bước**

| Mục | Nội dung |
|---|---|
| Mã UC | UC040 |
| Tên use case | Bật hoặc tắt 2FA và đăng nhập hai bước |
| Tác nhân | Learner (cũng áp dụng cho Teacher và Admin) |
| Mô tả | Người dùng bật xác thực hai bước bằng ứng dụng tạo mã TOTP (quét mã QR hoặc nhập khóa thủ công) và nhận 10 mã khôi phục dùng một lần; sau đó mỗi lần đăng nhập phải nhập thêm mã TOTP hoặc mã khôi phục. Có thể tạo lại mã khôi phục và tắt 2FA. |
| Điều kiện tiên quyết | Đã đăng nhập (để bật, tắt, tạo lại mã); tài khoản đã bật 2FA (để dùng bước đăng nhập thứ hai). |
| Điều kiện sau | Bật: tài khoản có `totpEnabledAt`, bí mật TOTP lưu mã hóa (AES-GCM), 10 mã khôi phục lưu dạng băm. Tắt: xóa bí mật và mã khôi phục. Đăng nhập thành công bằng bước hai: có phiên mới; mã khôi phục dùng xong bị vô hiệu. |
| Luồng sự kiện chính | 1) Bật: ở Settings → Xác thực hai bước, người dùng bấm "Bật"; ứng dụng gọi `POST /me/2fa/setup`, server tạo bí mật và trả khóa base32 cùng `otpauthUrl`; ứng dụng vẽ mã QR và hiện khóa nhập tay.<br>2) Người dùng thêm vào ứng dụng xác thực, nhập mã 6 số hiện tại; ứng dụng gọi `POST /me/2fa/enable`.<br>3) Server kiểm tra mã TOTP (bước 30 giây, chấp nhận lệch một bước, chống dùng lại mã), bật 2FA và trả 10 mã khôi phục (chỉ hiển thị một lần); người dùng lưu lại.<br>4) Đăng nhập hai bước: ở UC002, sau khi mật khẩu đúng, server trả `challengeToken` (hiệu lực 5 phút); ứng dụng mở màn Two-factor, người dùng nhập mã TOTP hoặc mã khôi phục; ứng dụng gọi `POST /auth/2fa/verify`, server tạo phiên (mã khôi phục dùng xong bị vô hiệu) và trả `AuthSessionDto`.<br>5) Tạo lại mã khôi phục: `POST /me/2fa/recovery-codes` với mã TOTP hoặc mã khôi phục.<br>6) Tắt: `POST /me/2fa/disable` với mật khẩu và một mã (TOTP hoặc khôi phục). |
| Luồng thay thế / ngoại lệ | A1) Bật khi đã bật: `409 TWO_FACTOR_ALREADY_ENABLED`; bật khi chưa gọi setup: `422 TWO_FACTOR_NOT_SETUP`.<br>A2) Tắt hoặc tạo lại mã khi chưa bật: `422 TWO_FACTOR_NOT_ENABLED`.<br>A3) Mã sai hoặc đã dùng: `400 INVALID_CODE` (ở bước đăng nhập kèm `attemptsLeft`; sau 5 lần sai tài khoản bị khóa tạm, `423 ACCOUNT_LOCKED`).<br>A4) Mật khẩu sai khi tắt: `422 INVALID_PASSWORD`.<br>A5) Challenge hết hạn hoặc không hợp lệ: `401 INVALID_CHALLENGE`, người dùng đăng nhập lại.<br>A6) Cả `code` và `recoveryCode` hoặc không có cái nào: `400 VALIDATION_ERROR`.<br>A7) Giới hạn tốc độ: `429 RATE_LIMITED`. |
| Quy tắc nghiệp vụ | Quy tắc 2FA của FR-28 (TOTP RFC 6238, 10 mã khôi phục dùng một lần, tắt cần mật khẩu và mã, challenge 5 phút); NFR-05. |
| Yêu cầu liên quan | FR-28, FR-02 |
| Màn hình | Settings → Xác thực hai bước (`settings/two-factor`), Two-factor (`(auth)/two-factor`), Settings → Bảo mật |

**Bảng 2.60 – Đặc tả UC041 – Quản lý phiên và thiết bị**

| Mục | Nội dung |
|---|---|
| Mã UC | UC041 |
| Tên use case | Quản lý phiên và thiết bị |
| Tác nhân | Learner (cũng áp dụng cho Teacher và Admin) |
| Mô tả | Mỗi lần đăng nhập tạo một phiên gắn với một thiết bị. Người dùng xem danh sách thiết bị đang đăng nhập, đăng xuất từ xa một thiết bị hoặc mọi thiết bị khác, và nhận cảnh báo khi có đăng nhập từ thiết bị mới. Refresh token xoay vòng và phát hiện bị dùng lại. |
| Điều kiện tiên quyết | Đã đăng nhập. |
| Điều kiện sau | Phiên bị thu hồi thì refresh token của phiên bị xóa và access token cũ bị từ chối ngay; thiết bị bị đăng xuất phải đăng nhập lại. |
| Luồng sự kiện chính | 1) Người dùng mở Settings → Bảo mật (`settings/security`); ứng dụng gọi `GET /me/security` và `GET /me/sessions` (danh sách phiên chưa thu hồi, chưa hết hạn, dùng gần nhất trước, đánh dấu thiết bị hiện tại bằng `isCurrent`).<br>2) Người dùng bấm "Đăng xuất" ở một thiết bị khác: `DELETE /me/sessions/:id` (`204`); thiết bị đó bị từ chối ở yêu cầu kế tiếp (`401`) và về màn Login.<br>3) Người dùng bấm "Đăng xuất mọi thiết bị khác": `DELETE /me/sessions` trả `{revokedCount}`.<br>4) Khi mở lại ứng dụng hoặc access token (15 phút) hết hạn, ứng dụng gọi `POST /auth/refresh`; server đổi refresh token cũ lấy cặp mới (xoay vòng, hạn trượt 30 ngày).<br>5) Khi đăng nhập từ thiết bị chưa từng dùng, server tạo thông báo `SYSTEM` và gửi email cảnh báo kèm tên thiết bị. |
| Luồng thay thế / ngoại lệ | A1) Phiên không thuộc người dùng hoặc đã thu hồi: `404 SESSION_NOT_FOUND`.<br>A2) Refresh token cũ bị trình lại, hoặc token sai hoặc hết hạn: `401 INVALID_REFRESH_TOKEN`; khi bị dùng lại server thu hồi cả phiên (nghi bị sao chép) và ghi sự kiện `REFRESH_REUSE`; ứng dụng về Login. Không kiểm chứng được trên giao diện, có integration test (TC-AUTH-34).<br>A3) Tài khoản bị khóa lúc làm mới: `403 ACCOUNT_DISABLED`.<br>A4) Người dùng đăng xuất chính thiết bị hiện tại bằng thao tác này: cũng được phép, tương đương UC003.<br>A5) Đổi hoặc đặt lại mật khẩu (UC039) cũng thu hồi các phiên liên quan. |
| Quy tắc nghiệp vụ | Quy tắc phiên của FR-29 (refresh token xoay vòng, dùng lại thì thu hồi phiên; danh sách thiết bị; cảnh báo thiết bị mới); NFR-05 (token lưu SecureStore, kiểm `sid` và thu hồi phiên). |
| Yêu cầu liên quan | FR-29 |
| Màn hình | Settings → Bảo mật (`settings/security`), Notifications (cảnh báo thiết bị mới) |

**Bảng 2.61 – Đặc tả UC042 – Cài đặt ngôn ngữ và giao diện**

| Mục | Nội dung |
|---|---|
| Mã UC | UC042 |
| Tên use case | Cài đặt ngôn ngữ và giao diện |
| Tác nhân | Learner (cũng áp dụng cho Teacher và Admin) |
| Mô tả | Người dùng chọn ngôn ngữ giao diện (theo máy, tiếng Việt hoặc tiếng Anh) và giao diện sáng, tối hay theo hệ thống; lựa chọn được ghi nhớ giữa các lần mở ứng dụng. Lựa chọn ngôn ngữ cũng quyết định ngôn ngữ trả lời của AI và của thông báo. |
| Điều kiện tiên quyết | Ứng dụng đang mở (không bắt buộc đăng nhập để dùng giao diện; màn Cài đặt nằm sau đăng nhập). |
| Điều kiện sau | Tùy chọn được lưu trong thiết bị (kho tùy chọn lưu bằng AsyncStorage); toàn bộ ứng dụng hiển thị theo tùy chọn mới ngay lập tức; thẻ `<html lang>` trên web cập nhật. |
| Luồng sự kiện chính | 1) Người dùng mở Settings (từ Profile).<br>2) Mục Ngôn ngữ cho chọn "Theo thiết bị", "Tiếng Việt" hoặc "English"; mục Giao diện cho chọn "Theo hệ thống", "Sáng" hoặc "Tối".<br>3) Khi chọn, ứng dụng đổi ngôn ngữ (i18n) và theme ngay, lưu tùy chọn.<br>4) Mở lại ứng dụng: tùy chọn được khôi phục; mặc định "Theo thiết bị" lấy ngôn ngữ của máy. Các yêu cầu AI và email gửi kèm ngôn ngữ đang chọn (`lang` hoặc `Accept-Language`). |
| Luồng thay thế / ngoại lệ | A1) Ngôn ngữ của máy không phải vi hoặc en: dùng ngôn ngữ dự phòng.<br>A2) Dữ liệu lưu trữ lỗi hoặc không đọc được: ứng dụng dùng giá trị mặc định (theo thiết bị, theo hệ thống) thay vì lỗi.<br>A3) Dữ liệu mẫu (tên khóa, nội dung bài) giữ tiếng Anh theo quyết định của nhóm; chỉ chuỗi giao diện, thông báo, lỗi và nội dung AI đổi ngôn ngữ. |
| Quy tắc nghiệp vụ | Mọi chuỗi giao diện nằm trong file ngôn ngữ (không hard-code); chữ đạt tương phản WCAG AA ở cả giao diện sáng và tối (NFR-13). |
| Yêu cầu liên quan | FR-35, FR-36 |
| Màn hình | Settings (`settings/index`) |

**Bảng 2.62 – Đặc tả UC043 – Hỏi AI Tutor**

| Mục | Nội dung |
|---|---|
| Mã UC | UC043 |
| Tên use case | Hỏi AI Tutor |
| Tác nhân | Learner. Hệ thống ngoài: Google Gemini |
| Mô tả | Học viên đã ghi danh hỏi trợ lý AI về nội dung khóa học; câu trả lời được truyền dần về ứng dụng theo luồng SSE, có lịch sử riêng của người dùng trong khóa và có thể xóa. |
| Điều kiện tiên quyết | Đã đăng nhập và đã ghi danh khóa học; còn hạn mức AI chat. |
| Điều kiện sau | Cặp câu hỏi và câu trả lời hoàn chỉnh được lưu vào lịch sử chat của người dùng trong khóa. Tin nhắn chỉ được lưu khi trả lời hoàn tất nên câu hỏi thất bại hoặc bị ngắt không để lại tin mồ côi. |
| Luồng sự kiện chính | 1) Từ thẻ AI trong màn Học (SC-15), học viên bấm "Hỏi AI Tutor"; ứng dụng mở màn AI Tutor (`learn/[courseId]/tutor`) với các gợi ý câu hỏi và lịch sử cũ (`GET /courses/:id/ai/chat`, mới nhất trước).<br>2) Học viên nhập câu hỏi (1–1000 ký tự) và gửi; ứng dụng gọi `POST /courses/:id/ai/chat` kèm `lang`.<br>3) Server kiểm tra ghi danh, trừ lượt hạn mức, dựng ngữ cảnh từ nội dung khóa và 10 tin gần nhất của người dùng, mở luồng tới Gemini.<br>4) Server trả luồng SSE gồm các sự kiện `delta` (từng đoạn chữ) rồi `done` (mã tin nhắn); ứng dụng hiển thị chữ chạy dần.<br>5) Học viên có thể xóa toàn bộ lịch sử bằng `DELETE /courses/:id/ai/chat` (`204`). |
| Luồng thay thế / ngoại lệ | A1) Chưa ghi danh: `403 NOT_ENROLLED`.<br>A2) Tin nhắn rỗng hoặc dài quá 1000 ký tự: `400 VALIDATION_ERROR`.<br>A3) Hết hạn mức (giờ, ngày của người dùng hoặc ngày của toàn hệ thống): `429 AI_RATE_LIMITED` kèm `retryAfterSec`; lượt lỗi được hoàn lại.<br>A4) Bị bộ lọc an toàn chặn: `422 AI_BLOCKED`; dịch vụ AI không dùng được hoặc quá thời gian: `503 AI_UNAVAILABLE` (lỗi xảy ra trước chữ đầu tiên trả JSON lỗi thường).<br>A5) Lỗi giữa chừng khi đã có chữ: server gửi sự kiện `error` trong luồng; ứng dụng hiện lỗi ở lượt hỏi và cho gửi lại, giữ nguyên lịch sử.<br>A6) Khóa không tồn tại: `404 COURSE_NOT_FOUND`.<br>A7) Mất mạng: chặn gửi, báo offline. |
| Quy tắc nghiệp vụ | NFR-14 (hạn mức theo giờ, theo ngày của người dùng và của hệ thống; lỗi AI hoàn lượt; không log khóa hoặc toàn văn nội dung người dùng), NFR-06, BR-01. |
| Yêu cầu liên quan | FR-32 |
| Màn hình | AI Tutor (`learn/[courseId]/tutor`), SC-15 Learning (thẻ AI) |

**Bảng 2.63 – Đặc tả UC044 – Tóm tắt và làm quiz AI**

| Mục | Nội dung |
|---|---|
| Mã UC | UC044 |
| Tên use case | Tóm tắt và làm quiz AI |
| Tác nhân | Learner. Hệ thống ngoài: Google Gemini |
| Mô tả | Học viên xem tóm tắt khóa học (ở trang chi tiết) hoặc tóm tắt bài học, và làm bài quiz 5 câu, mỗi câu 4 đáp án, do AI sinh theo nội dung bài, có giải thích đúng sai, điểm số và làm lại. |
| Điều kiện tiên quyết | Đã đăng nhập. Tóm tắt khóa: khóa được phép xem. Tóm tắt bài: đã ghi danh hoặc bài xem thử. Quiz: bắt buộc đã ghi danh (kể cả với bài xem thử). |
| Điều kiện sau | Kết quả tóm tắt và quiz được cache trong `AiContent` theo nội dung và ngôn ngữ nên lần sau không tốn lượt AI; điểm quiz tính ở ứng dụng, không lưu vào CSDL. |
| Luồng sự kiện chính | 1) Tóm tắt khóa: ở trang chi tiết (UC008), học viên mở thẻ tóm tắt AI; ứng dụng gọi `GET /courses/:id/ai/summary?lang=`.<br>2) Tóm tắt bài: ở thẻ AI của màn Học, học viên bấm "Tóm tắt"; ứng dụng hiện trạng thái loading rồi gọi `GET /lessons/:id/ai/summary?lang=` và hiển thị kết quả.<br>3) Server kiểm tra quyền, tìm trong cache, nếu chưa có thì kiểm tra hạn mức, gọi Gemini qua lớp provider, kiểm tra kết quả rồi lưu cache.<br>4) Quiz: học viên bấm "Làm quiz"; ứng dụng mở màn quiz (`learn/[courseId]/quiz`) và gọi `POST /lessons/:id/ai/quiz`; server trả 5 câu, mỗi câu 4 đáp án kèm đáp án đúng và giải thích.<br>5) Học viên chọn đáp án từng câu và nhận phản hồi đúng, sai kèm giải thích; cuối bài hiện điểm và nút "Làm lại" (tạo lại lượt làm mới với cùng bộ câu hỏi). |
| Luồng thay thế / ngoại lệ | A1) Bài chưa đủ quyền (chưa ghi danh và không phải bài xem thử): `403 NOT_ENROLLED`; làm quiz khi chưa ghi danh: `403 NOT_ENROLLED`.<br>A2) Khóa hoặc bài không tồn tại: `404 COURSE_NOT_FOUND` hoặc `404 LESSON_NOT_FOUND`.<br>A3) Hết hạn mức: `429 AI_RATE_LIMITED` (cache hit không tốn lượt); bị chặn an toàn: `422 AI_BLOCKED`; dịch vụ lỗi hoặc quá thời gian: `503 AI_UNAVAILABLE` (không cache).<br>A4) Lỗi hiển thị thân thiện kèm nút "Thử lại"; các chức năng khác của màn Học vẫn dùng được.<br>A5) Mất mạng: chặn gọi AI, báo offline. |
| Quy tắc nghiệp vụ | BR-01 (quyền xem bài theo ghi danh hoặc xem thử), NFR-14, NFR-06. |
| Yêu cầu liên quan | FR-31, FR-33 |
| Màn hình | SC-09 Course Details (thẻ tóm tắt AI), SC-15 Learning (thẻ AI), Quiz (`learn/[courseId]/quiz`) |

**Bảng 2.64 – Đặc tả UC045 – Xem gợi ý lộ trình AI**

| Mục | Nội dung |
|---|---|
| Mã UC | UC045 |
| Tên use case | Xem gợi ý lộ trình AI |
| Tác nhân | Learner. Hệ thống ngoài: Google Gemini |
| Mô tả | Từ các khóa người dùng đã học và đã lưu, AI đề xuất tối đa 5 khóa chưa học kèm lý do và một lời khích lệ, hiển thị ở thẻ trên trang chủ. |
| Điều kiện tiên quyết | Đã đăng nhập; còn hạn mức AI. |
| Điều kiện sau | Lộ trình gợi ý được cache trong `AiContent` (loại `RECOMMENDATIONS`); bản cache bị bỏ khi người dùng ghi danh một khóa đang nằm trong gợi ý. Không đổi dữ liệu nghiệp vụ khác. |
| Luồng sự kiện chính | 1) Khi Home hiển thị (UC004), thẻ gợi ý AI gọi `GET /me/ai/recommendations?lang=`; thẻ hiển thị khung chờ (skeleton).<br>2) Server tìm trong cache; nếu chưa có thì kiểm tra hạn mức, dựng ngữ cảnh từ các khóa đã ghi danh, đã lưu và danh sách ứng viên chưa học, gọi Gemini qua lớp provider và lưu cache.<br>3) Ứng dụng hiển thị lộ trình các khóa kèm lý do và lời khích lệ; bấm một khóa mở trang chi tiết (UC008). |
| Luồng thay thế / ngoại lệ | A1) Hết hạn mức: `429 AI_RATE_LIMITED`; bị chặn an toàn: `422 AI_BLOCKED`; dịch vụ AI không dùng được hoặc quá thời gian: `503 AI_UNAVAILABLE`. Thẻ hiện trạng thái lỗi thân thiện kèm nút "Thử lại" và không ảnh hưởng các khối khác của Home.<br>A2) Người dùng mới chưa có khóa nào: gợi ý dựa trên các khóa nổi bật.<br>A3) Mất mạng: thẻ không tải, Home vẫn hiển thị dữ liệu đã cache. |
| Quy tắc nghiệp vụ | BR-12 (khóa gợi ý không gồm khóa đã ghi danh), NFR-14. |
| Yêu cầu liên quan | FR-34 |
| Màn hình | SC-04 Home (thẻ gợi ý AI) |

## 2.7 Yêu cầu chức năng (FR)

Hệ thống có **54 yêu cầu chức năng** FR-01 đến FR-54 (PLAN.md §6.3 và §2.4.3). Cột *Trạng thái* ghi tình trạng tại thời điểm đóng băng mã nguồn (24/10/2026): tất cả 54 yêu cầu đều **đã hiện thực** và đã được kiểm thử tự động; kết quả kiểm thử chức năng có minh chứng nằm ở Chương 5 và được truy vết ở mục 2.10. Một tính năng nằm ngoài danh sách FR là **mở khóa ứng dụng bằng sinh trắc học** (task AUTH-10, `expo-local-authentication`): ngày 27/10/2026 nhóm quyết định **bỏ** và chuyển vào hướng phát triển (PLAN.md §22, v2.27). Cột *UC* cho biết use case hiện thực yêu cầu; FR-24, FR-37 và FR-38 là tính chất xuyên suốt nên không gắn với một use case riêng (mục 2.5.2).

**Bảng 2.65 – Yêu cầu chức năng FR-01 đến FR-24 (nhóm tài khoản, khám phá, mua và học)**

| FR | Mô tả | Ưu tiên | UC | Trạng thái |
|---|---|---|---|---|
| FR-01 | Đăng ký bằng họ tên, email, mật khẩu (8–72 ký tự, có chữ và số), CAPTCHA và vai trò Học viên hoặc Giảng viên (mặc định Học viên, không cho tự chọn Admin); email không trùng; chưa cấp token cho tới khi xác minh OTP | Must | UC001 | Đã hiện thực |
| FR-02 | Đăng nhập bằng email và mật khẩu, thêm bước TOTP hoặc mã khôi phục nếu bật 2FA; tự khôi phục phiên bằng access token 15 phút và refresh token 30 ngày | Must | UC002, UC040 | Đã hiện thực |
| FR-03 | Đăng xuất: thu hồi phiên ở server, xóa token và cache lưu trên máy, về Login; lỗi mạng vẫn xóa phiên cục bộ | Must | UC003 | Đã hiện thực |
| FR-04 | Home: lời chào theo tên, banner, 6 danh mục, Popular, Recommended, Course that inspires, Top teachers; huy hiệu giỏ hàng và thông báo | Must | UC004 | Đã hiện thực |
| FR-05 | Tìm kiếm theo từ khóa (tên khóa, tên giảng viên, thẻ), gợi ý chủ đề nổi bật, hiển thị số kết quả, cuộn vô hạn | Must | UC005 | Đã hiện thực |
| FR-06 | Lọc theo danh mục (một hoặc nhiều), giá, điểm đánh giá tối thiểu; sắp xếp Popular, Rating, Newest, Price tăng hoặc giảm | Should | UC006 | Đã hiện thực |
| FR-07 | Xem danh sách khóa theo danh mục hoặc theo nhóm "View more" | Must | UC007 | Đã hiện thực |
| FR-08 | Chi tiết khóa, tab Overview: giảng viên, mô tả, lợi ích, khóa tương tự; thanh giá và nút hành động theo trạng thái | Must | UC008 | Đã hiện thực |
| FR-09 | Tab Lessons: chương dạng accordion, bài với trạng thái hoàn thành, đang học, mở, khóa; xem bài xem thử | Must | UC008, UC009 | Đã hiện thực |
| FR-10 | Tab Review: điểm trung bình, tổng số, lọc theo số sao, danh sách đánh giá | Must | UC008 | Đã hiện thực |
| FR-11 | Viết hoặc sửa đánh giá (1–5 sao và nội dung) khi đã ghi danh | Should | UC015 | Đã hiện thực |
| FR-12 | Lưu hoặc bỏ lưu khóa học ở mọi thẻ và trang chi tiết (cập nhật lạc quan) | Must | UC010 | Đã hiện thực |
| FR-13 | Giỏ hàng: thêm, xóa, xem tổng tiền; không thêm khóa đã sở hữu hoặc đã có trong giỏ | Must | UC011 | Đã hiện thực |
| FR-14 | Thanh toán giả lập tạo đơn PAID và ghi danh mọi khóa trong giỏ; ghi danh trực tiếp khóa miễn phí | Must | UC012 | Đã hiện thực |
| FR-15 | Khóa học của tôi: tab Tất cả, Đang học, Hoàn thành; phần trăm hoàn thành; tổng thời lượng | Must | UC013 | Đã hiện thực |
| FR-16 | Học: phát video, chuyển bài, lưu vị trí mỗi 10 giây và khi rời màn, tiếp tục đúng vị trí, tự hoàn thành khi xem từ 90%, cập nhật phần trăm khóa | Must | UC014 | Đã hiện thực |
| FR-17 | Thích hoặc bỏ thích khóa; chia sẻ qua bảng chia sẻ (đếm lượt chia sẻ) | Could | UC021 | Đã hiện thực |
| FR-18 | Project: xem mô tả, tải tài liệu, nộp bài (tệp tối đa 10 MB), xem bài của học viên khác | Should | UC017 | Đã hiện thực |
| FR-19 | Q&A: xem câu hỏi, đặt câu hỏi (emoji nhanh), thích, xem và gửi trả lời | Should | UC016 | Đã hiện thực |
| FR-20 | Hồ sơ giảng viên: thông tin, giờ địa phương, tab Overview, Courses (nhóm theo danh mục), Review; theo dõi giảng viên | Should | UC018 | Đã hiện thực |
| FR-21 | Hồ sơ cá nhân: ảnh bìa, ảnh đại diện, tên, headline, thống kê Save, On going, Completed, danh sách đã lưu | Must | UC019, UC010 | Đã hiện thực |
| FR-22 | Chỉnh sửa tên, headline, ảnh đại diện | Should | UC019 | Đã hiện thực |
| FR-23 | Thông báo: danh sách, đánh dấu đã đọc từng cái hoặc tất cả, huy hiệu chưa đọc; sinh khi thanh toán thành công, có người trả lời câu hỏi, hoàn thành khóa | Should | UC020 | Đã hiện thực |
| FR-24 | Xem lại dữ liệu đã tải khi mất mạng, hiện banner offline, chặn thao tác ghi khi offline (ngoại lệ: tiến độ video lưu tạm và tự đồng bộ) | Should | Xuyên suốt (UC004, UC013, UC014) | Đã hiện thực |

**Bảng 2.66 – Yêu cầu chức năng FR-25 đến FR-38 (nhóm giai đoạn 2: xác thực, AI, giao diện)**

| FR | Mô tả | Ưu tiên | UC | Trạng thái |
|---|---|---|---|---|
| FR-25 | Xác minh email bằng OTP 6 số, hết hạn 10 phút, tối đa 5 lần sai, gửi lại sau 60 giây; chưa xác minh không đăng nhập được | Must | UC038 | Đã hiện thực |
| FR-26 | Quên mật khẩu bằng mã email (không tiết lộ email tồn tại); đặt lại thành công thu hồi mọi phiên | Must | UC039 | Đã hiện thực |
| FR-27 | Đổi mật khẩu trong Cài đặt, thu hồi các thiết bị khác và gửi email thông báo | Must | UC039 | Đã hiện thực |
| FR-28 | 2FA TOTP: mã QR hoặc khóa nhập tay, 10 mã khôi phục dùng một lần; tắt cần mật khẩu và mã; challenge đăng nhập 5 phút | Must | UC040 | Đã hiện thực |
| FR-29 | Phiên và thiết bị: refresh token xoay vòng (dùng lại thì thu hồi phiên), danh sách thiết bị, đăng xuất từ xa, cảnh báo thiết bị mới | Must | UC041 | Đã hiện thực |
| FR-30 | CAPTCHA ở đăng ký và quên mật khẩu, và ở đăng nhập sau 3 lần sai; khóa tài khoản 15 phút sau 5 lần sai (HTTP 423) | Must | UC001, UC002, UC039 | Đã hiện thực (provider hiện dùng: reCAPTCHA v2, Turnstile giữ tương thích) |
| FR-31 | AI tóm tắt khóa và bài học theo ngôn ngữ, cache trong CSDL; quyền bài học theo ghi danh hoặc bài xem thử | Must | UC044 | Đã hiện thực |
| FR-32 | AI Tutor theo nội dung khóa qua SSE, lịch sử và xóa lịch sử của mình; chỉ người đã ghi danh | Must | UC043 | Đã hiện thực |
| FR-33 | AI quiz 5 câu × 4 đáp án theo bài, giải thích đúng sai, điểm và làm lại; bắt buộc ghi danh | Should | UC044 | Đã hiện thực |
| FR-34 | AI gợi ý lộ trình các khóa chưa học kèm lý do và lời khích lệ | Should | UC045 | Đã hiện thực |
| FR-35 | Tiếng Việt và tiếng Anh, mặc định theo máy, đổi trong Cài đặt; định dạng ngày và số, thông báo lỗi và AI theo ngôn ngữ chọn | Must | UC042 | Đã hiện thực |
| FR-36 | Giao diện sáng, tối, theo hệ thống; lưu lựa chọn; Cài đặt và thanh tab kính nổi theo phong cách Noir | Must | UC042 | Đã hiện thực |
| FR-37 | Web và PWA: khung nội dung theo màn hình (điện thoại, tablet, desktop), manifest và icon, token dự phòng localStorage, `<html lang>` | Must | Xuyên suốt | Đã hiện thực |
| FR-38 | Màn hình khởi động (intro wordmark), chạy song song với nạp font và phiên; tôn trọng Reduce Motion | Should | Xuyên suốt (SC-01) | Đã hiện thực |

**Bảng 2.67 – Yêu cầu chức năng FR-39 đến FR-54 (nhóm Giảng viên và Quản trị)**

| FR | Mô tả | Ưu tiên | UC | Trạng thái |
|---|---|---|---|---|
| FR-39 | Giảng viên tạo khóa nháp; sửa tiêu đề, phụ đề, mô tả, danh mục, tối đa 5 thẻ, giá, giá gốc, lợi ích, mô tả project, ảnh bìa (PNG, JPG); xóa khóa chưa từng xuất bản và chưa có học viên | Must | UC022 | Đã hiện thực |
| FR-40 | Soạn chương và bài: thêm, sửa, xóa, đổi thứ tự bằng nút lên xuống; bài có tiêu đề, link YouTube chuẩn hóa, thời lượng, cờ xem thử, nội dung chữ | Must | UC023 | Đã hiện thực |
| FR-41 | Gửi duyệt khi đạt checklist; trạng thái Nháp, Chờ duyệt, Đã xuất bản, Bị từ chối (kèm lý do), Đã ẩn | Must | UC024 | Đã hiện thực |
| FR-42 | Khóa đã xuất bản: trường nhỏ áp dụng ngay, trường lớn qua bản sửa đổi chờ duyệt; học viên vẫn thấy bản cũ | Must | UC025 | Đã hiện thực |
| FR-43 | Giảng viên hoặc quản trị viên ẩn khóa, khôi phục về Đã xuất bản; học viên đã mua vẫn học được | Must | UC031 | Đã hiện thực |
| FR-44 | AI soạn khóa: từ chủ đề, trình độ, ngôn ngữ gợi ý phụ đề, mô tả, lợi ích, danh mục, dàn ý; giảng viên chọn áp dụng từng phần, không tự lưu | Should | UC026 | Đã hiện thực |
| FR-45 | Thống kê khóa: số học viên, doanh thu (giả lập), tiến độ trung bình, phân bố số sao, học viên mới 30 ngày (biểu đồ) | Should | UC027 | Đã hiện thực |
| FR-46 | Danh sách bài nộp; chấm điểm 0–100 kèm nhận xét, chấm lại được; học viên thấy điểm và nhận thông báo | Must | UC028 | Đã hiện thực |
| FR-47 | Giảng viên của khóa trả lời Q&A không cần ghi danh, có huy hiệu Giảng viên, ghim một câu trả lời mỗi câu hỏi | Must | UC029 | Đã hiện thực |
| FR-48 | Giảng viên phản hồi đánh giá (một phản hồi mỗi đánh giá, sửa và xóa được); người đánh giá nhận thông báo | Should | UC030 | Đã hiện thực |
| FR-49 | Giảng viên sửa hồ sơ: chức danh, giới thiệu, tổ chức, địa điểm, múi giờ | Must | UC037 | Đã hiện thực |
| FR-50 | Admin xem hàng chờ (khóa mới và bản sửa đổi), xem trước nội dung (so sánh cũ và mới), duyệt hoặc từ chối kèm lý do; lưu lịch sử; giảng viên nhận thông báo và email | Must | UC032 | Đã hiện thực |
| FR-51 | AI kiểm duyệt sơ bộ: nhận định và danh sách vấn đề theo ngôn ngữ của admin; chỉ tư vấn; cache theo nội dung | Must | UC033 | Đã hiện thực |
| FR-52 | Admin tìm và lọc người dùng (vai trò, trạng thái), khóa tài khoản kèm lý do (thu hồi mọi phiên), mở khóa | Should | UC034 | Đã hiện thực |
| FR-53 | Dashboard: người dùng theo vai trò, người dùng mới 7 và 30 ngày, doanh thu, đơn hàng, khóa theo trạng thái, số chờ duyệt, top 5 khóa | Should | UC035 | Đã hiện thực |
| FR-54 | Khi khóa xuất bản **lần đầu**: thông báo `NEW_COURSE` cho mọi người theo dõi giảng viên | Must | UC036 (kích hoạt từ UC032) | Đã hiện thực |

**Bảng 2.68 – Chức năng đã bỏ**

| Mã | Mô tả | Quyết định | Trạng thái |
|---|---|---|---|
| AUTH-10 (task, không có mã FR) | Mở khóa ứng dụng bằng sinh trắc học (`expo-local-authentication`), ưu tiên Should | Nhóm quyết định ngày 27/10/2026 bỏ để tập trung hoàn thiện tài liệu; chuyển vào hướng phát triển (Chương 7 và Kết luận) | Đã bỏ |

## 2.8 Yêu cầu phi chức năng (NFR)

Mười bốn yêu cầu phi chức năng NFR-01 đến NFR-14 (PLAN.md §6.4) được trình bày với **cách đáp ứng trong hệ thống** và **minh chứng** có thật. Số liệu lấy từ `notes/performance-server.md`, `notes/performance-mobile.md`, `notes/test-coverage-*.md`, kết quả kiểm thử `docs/04-testing/evidence/*/results.md` và các tệp cấu hình trong kho mã. Nhóm ghi rõ những chỉ tiêu **chưa đo được trên thiết bị thật** vì cuộc kiểm thử cuối được thực hiện trên môi trường local dùng trình duyệt (điện thoại 390×844, desktop 1440×900) và phần công khai của production, không có thiết bị Android hay iOS thật.

**Bảng 2.69 – Yêu cầu phi chức năng, cách đáp ứng và minh chứng**

| NFR | Nhóm | Yêu cầu đo được | Cách đáp ứng | Minh chứng và trạng thái |
|---|---|---|---|---|
| NFR-01 | Hiệu năng | Home chuẩn bị nội dung từ cache dưới 1 giây; lần đầu (Wi-Fi) dưới 3 giây; báo riêng thời gian intro (khoảng 2,15 giây) | `GET /home` gom 6 khối vào một yêu cầu; cache server trong bộ nhớ 60 giây; cache TanStack Query lưu xuống đĩa 24 giờ (hiện dữ liệu cũ ngay rồi làm mới nền); ảnh `expo-image` với `cachePolicy="memory-disk"` | Phía server: `GET /home` cho khách giảm p50 từ 13,6 ms xuống 3,8 ms (−72%) khi cache hit (cache miss p95 20,4 ms). **Chưa đo thời gian Home trên điện thoại thật** (PLAN.md §17.2 để trống mục này) |
| NFR-02 | Hiệu năng | p95 của API dưới 500 ms với dữ liệu seed | Prisma `select` chỉ lấy cột cần, index cho truy vấn hay dùng, trường denormalize (`ratingAvg`, `enrollmentCount`...) cập nhật trong cùng transaction, nén gzip | `perf.ts` (03/10/2026): 11/11 endpoint đạt, p95 lớn nhất 18,4 ms (server và CSDL cùng máy, không có độ trễ mạng); payload `/courses?limit=20` giảm từ 8 130 B xuống 1 506 B nhờ gzip (−81,5%). Trên production, độ trễ `GET /health` đo từ Việt Nam tới Sydney là 339–1705 ms (TC-PROD-01), chủ yếu là độ trễ mạng |
| NFR-03 | Hiệu năng | Danh sách 100+ mục cuộn mượt (JS FPS từ 55) | `@shopify/flash-list` cho danh sách dài; `React.memo` và `useCallback`; cuộn vô hạn 20 mục mỗi lần; debounce tìm kiếm 400 ms | Debounce giảm số yêu cầu khi gõ "javascript" từ 10 xuống 1 (−90%); lưu tiến độ mỗi 10 giây giảm 300 xuống 30 yêu cầu trong 5 phút video (−90%). **Chưa đo FPS bằng Perf Monitor trên Android thật** |
| NFR-04 | Offline | Home, Khóa học của tôi, chi tiết khóa đã xem mở được khi mất mạng (cache tối đa 24 giờ) | NetInfo nối với `onlineManager` của TanStack Query; persister lưu cache xuống AsyncStorage 24 giờ (xóa khi đăng xuất); banner offline; thao tác ghi bị chặn kèm thông báo | Kiểm thử đơn vị `persister.test.ts` (maxAge 24 giờ, lọc truy vấn được lưu, xóa khi đăng xuất), `queryClient.test.ts`; chưa có ca kiểm thử tay tắt Wi-Fi trên thiết bị thật |
| NFR-05 | Bảo mật | bcrypt; JWT 15 phút và refresh 30 ngày xoay vòng; token lưu SecureStore; OTP, TOTP, CAPTCHA, khóa tài khoản; validate input; giới hạn tốc độ; helmet; upload có whitelist | bcryptjs (cost 10); refresh token chỉ lưu SHA-256, dùng lại thì thu hồi phiên; `sid` trong access token kiểm tra phiên mỗi yêu cầu; zod validate mọi input; rate limit theo route (đăng ký và đăng nhập 10/phút/IP, OTP 10, gửi email 5, refresh 30, chung 300); helmet; multer giới hạn 10 MB và whitelist MIME; lỗi không trả stack trace | Production: HTTPS hợp lệ (Let's Encrypt) và chuyển 308 từ HTTP, header HSTS, nosniff, CSP, Referrer-Policy, 401 và 404 đúng định dạng, không lộ stack (TC-PROD-02 đến TC-PROD-05, TC-PROD-07, TC-PROD-08: Đạt). Khóa tài khoản và xoay vòng refresh token được kiểm bằng integration test (TC-AUTH-33, TC-AUTH-34: không kiểm được qua giao diện) |
| NFR-06 | Phân quyền | Video bài không xem thử, Q&A, nộp project, đánh giá chỉ cho người đã ghi danh; server kiểm tra | Hàm dùng chung `assertEnrolled` và `assertEnrolledInCourse`; `GET /lessons/:id` không trả `videoUrl` khi không đủ quyền; route `/teacher/*` và `/admin/*` có `requireRole` và guard chủ khóa (404 cho khóa của người khác) | TC-LEARN-09 (chặn người chưa ghi danh vào bài khóa phí: Đạt), TC-LEARN-49 (AI chỉ cho người đã ghi danh: Đạt), TC-STU-23 (giảng viên không mua khóa của mình: Đạt); integration test các endpoint ✓E |
| NFR-07 | Khả dụng | Mọi màn có skeleton, rỗng, lỗi với Thử lại; vùng chạm từ 48 dp (Android) và 44 pt (iOS); safe area; chữ scale theo hệ thống; lỗi dễ hiểu | Quy ước bốn trạng thái dữ liệu (loading, error có Retry, empty, success); `hitSlop` và `accessibilityLabel` cho nút biểu tượng; `react-native-safe-area-context`; không tắt `allowFontScaling` | Kiểm thử chức năng có ảnh trạng thái rỗng, lỗi, đang tải ở nhiều màn (ví dụ TC-DISC-05, TC-LEARN-08, TC-LEARN-46 đến TC-LEARN-48). UI audit giai đoạn 1 ngày 03/10/2026: 15/20 điểm, 0 lỗi P0 (`notes/ui-audit.md`); chưa kiểm tra TalkBack và VoiceOver trên thiết bị thật |
| NFR-08 | Tương thích | Android 10+ (Expo Go), iOS 16+ (Expo Go); màn hình 360–430 dp | Expo SDK 57 managed; bản APK Android qua EAS Build (profile `preview`) và cập nhật EAS Update; bản web/PWA cho desktop và iPhone (Safari, Thêm vào MH chính) | Đã kiểm thử bố cục trên trình duyệt ở 390×844 (điện thoại) và 1440×900 (desktop), sáng và tối, vi và en. **Chưa kiểm thử trên thiết bị Android và iOS thật** trong đợt kiểm thử cuối |
| NFR-09 | Bảo trì | TypeScript strict, ESLint và Prettier, cấu trúc module; coverage service server từ 70%, hook và utils mobile từ 60% | `strict: true`, cấm `any`; kiến trúc lớp routes, controller, service, Prisma; tách `features/<tên>` ở mobile; CI chặn nếu typecheck, lint, định dạng hoặc test đỏ | Ngày 26/10/2026: server **120 suite, 1729 test**, mobile **287 suite, 2241 test**, typecheck, lint, Prettier sạch. Coverage đo ngày 03/10/2026: service server 98,55% lines (mọi service 100% khi chỉ tính unit test), mobile phạm vi hẹp 98,24% lines |
| NFR-10 | Tin cậy | Lưu tiến độ không mất khi thoát giữa chừng; checkout trong một transaction | Lưu tiến độ định kỳ 10 giây, khi tạm dừng, đổi bài, rời màn, xuống nền; hàng đợi AsyncStorage khi offline tự đồng bộ; `POST /orders/checkout` chạy trong một transaction, khóa hàng ghi danh `FOR UPDATE` khi lưu tiến độ | TC-LEARN-04, TC-LEARN-05 (lưu vị trí và tiếp tục đúng chỗ: Đạt, chưa thử đóng tab đột ngột); TC-DISC-36, TC-DISC-37 (thất bại giữ giỏ, thành công ghi danh: Đạt); `progressQueue.test.ts`, integration test checkout |
| NFR-11 | Quan sát | `/metrics` nội bộ, không gắn id người dùng vào nhãn; Prometheus và Grafana 4 dashboard; Loki; có metric AI; không log secret hay nội dung người dùng | `prom-client` mở cổng metrics riêng (không publish ra ngoài); node-exporter, cAdvisor, postgres-exporter; Grafana 4 dashboard (`api`, `infrastructure`, `postgres`, `logs`); Loki và Alloy thu log; logger pino ẩn thông tin nhạy cảm | Tệp dashboard trong `deploy/grafana/dashboards/`; cấu hình Prometheus, Loki, Alloy trong `deploy/`; `metrics.test.ts`. Ảnh dashboard dùng ở Chương 6 |
| NFR-12 | Triển khai | CI typecheck, lint, format, test, build Docker trên PR; CD test, GHCR, SSH; Caddy HTTPS; sao lưu CSDL hằng ngày | GitHub Actions `ci.yml` (server: typecheck, lint, Prettier, test với PostgreSQL thật; mobile: typecheck, lint, Prettier, kiểm tra tương phản, test; build Docker api và web) và `deploy.yml` (kiểm tra secret, kiểm thử, build và đẩy image lên GHCR, triển khai qua SSH); Caddy tự cấp HTTPS; container `backup` chạy `pg_dump` hằng ngày giữ 7 bản; sao lưu thủ công trước mỗi lần phát hành | Pipeline chạy xanh trước mỗi lần deploy (khoảng 6–7 phút); production chạy 12 container Docker Compose tại `eliuh.site` và `api.eliuh.site` (TC-PROD-01 đến TC-PROD-10: Đạt) |
| NFR-13 | Tiếp cận | Chữ đạt WCAG AA từ 4,5:1 ở cả sáng và tối; có kiểm tra tương phản tự động | Token màu ngữ nghĩa sáng và tối trong `src/theme`; script `npm run check:contrast` (`scripts/contrast-report.mjs`) kiểm các cặp màu, chạy trong CI; đã đổi màu chữ sang tông đậm hơn khi kiểm tra phát hiện cặp thấp hơn 4,5:1 | Bước CI "Kiểm tra tương phản màu"; `notes/contrast-fix.md` ghi bảng các cặp màu đã sửa; ảnh kiểm thử ma trận sáng/tối (TC-AUTH-26, TC-AUTH-27: Đạt) |
| NFR-14 | AI | Hạn mức theo giờ, theo ngày của người dùng và theo ngày của máy chủ; cache hit không tốn lượt; lỗi AI hoàn lượt và không cache; lỗi thân thiện kèm Thử lại; không log khóa hoặc toàn văn nội dung | Lớp provider `gemini` hoặc `mock`; mặc định chat 20 lượt/giờ, các tính năng khác 30 lượt/giờ, 60 lượt/ngày mỗi người, 400 lượt/ngày toàn hệ thống (cấu hình bằng biến môi trường); cache bảng `AiContent`; model dự phòng `GEMINI_FALLBACK_MODEL`; mã lỗi `AI_RATE_LIMITED`, `AI_BLOCKED`, `AI_UNAVAILABLE` | Kiểm thử đơn vị `quota.test.ts`, `gemini.provider.test.ts`; TC-LEARN-46, TC-LEARN-47, TC-LEARN-48 (trạng thái lỗi AI hiển thị và gửi lại: Đạt); TC-STU-05 và TC-ADM-04 chạy với Gemini thật |

## 2.9 Quy tắc nghiệp vụ (BR)

Ba mươi quy tắc nghiệp vụ BR-01 đến BR-30 (PLAN.md §6.5 và §2.4.4) là nguồn chung cho đặc tả use case, kiểm thử và hiện thực. Cột *UC áp dụng* liên kết ngược tới các bảng ở mục 2.6; cột *Hiện thực chính* chỉ ra nơi quy tắc được áp dụng trong mã nguồn (đường dẫn rút gọn).

**Bảng 2.70 – Quy tắc nghiệp vụ BR-01 đến BR-18 (học viên)**

| BR | Quy tắc | UC áp dụng | Hiện thực chính |
|---|---|---|---|
| BR-01 | Quyền xem bài: được xem nếu đã ghi danh hoặc bài có cờ xem thử; ngược lại API không trả `videoUrl` và trả `403 NOT_ENROLLED` | UC008, UC009, UC014, UC044 | `server/src/modules/lesson/lesson.service.ts`, `lib/enrollmentGuard.ts` |
| BR-02 | Trạng thái bài: `COMPLETED`, `IN_PROGRESS` (là bài đang học, chưa xong), `UNLOCKED` (đã ghi danh hoặc xem thử), `LOCKED` | UC008, UC009, UC014 | `lesson/lesson.logic.ts` (`buildCurriculum`) |
| BR-03 | Hoàn thành bài khi vị trí xem từ 90% thời lượng hoặc phát hết; đã hoàn thành thì không bị bỏ hoàn thành | UC014 | `mobile/.../learning/progressTracker.ts`; `lesson.service.ts` (`saveProgress`) |
| BR-04 | Phần trăm khóa = round(số bài hoàn thành ÷ tổng số bài × 100); đạt 100% đặt `completedAt` và tạo thông báo `COURSE_COMPLETED` | UC013, UC014, UC020 | `lesson.service.ts` (`saveProgress`) |
| BR-05 | Khóa học của tôi: Đang học (đã ghi danh, dưới 100%), Hoàn thành (100%), Tất cả; sắp theo lần học gần nhất | UC013, UC019 | `server/src/modules/enrollment/enrollment.service.ts` |
| BR-06 | Giỏ hàng: không thêm khóa đã ghi danh (`ALREADY_ENROLLED`), đã có trong giỏ (`ALREADY_IN_CART`), khóa miễn phí (`FREE_COURSE`) | UC011 | `cart/cart.service.ts` |
| BR-07 | Checkout trong một transaction: giỏ rỗng `CART_EMPTY`; tổng bằng tổng giá hiện tại; thành công thì đơn PAID, tạo ghi danh, tăng `enrollmentCount`, xóa giỏ, thông báo `ORDER_PAID`; thất bại giả lập thì đơn FAILED, `402 PAYMENT_FAILED`, giữ giỏ | UC011, UC012 | `order/order.service.ts` |
| BR-08 | Đánh giá: chỉ người đã ghi danh; một đánh giá mỗi khóa (PUT là tạo hoặc sửa); 1–5 sao; nội dung 10–1000 ký tự; cập nhật `ratingAvg`, `ratingCount` trong cùng transaction | UC015 | `review/review.service.ts`, `review.schema.ts` |
| BR-09 | Q&A và Project: chỉ người đã ghi danh được đăng câu hỏi, trả lời, nộp project; nội dung 1–1000 ký tự; người khác trả lời thì người hỏi nhận `NEW_ANSWER` | UC016, UC017 | `question/question.service.ts`, `project/project.service.ts` |
| BR-10 | Nhãn trên thẻ: `isBestSeller` thì "Best-seller"; ngược lại nếu giá gốc lớn hơn giá thì "x% Off" với x = round((1 − giá ÷ giá gốc) × 100) | UC004 đến UC008 | `mobile/src/utils/discount.ts` |
| BR-11 | Popular = `enrollmentCount` giảm dần; Course that inspires = `isFeatured`; Top teachers = điểm trung bình các khóa giảm dần (có ít nhất một khóa) | UC004, UC007, UC018 | `home/home.service.ts`, `course/course.service.ts` |
| BR-12 | Recommended for you: khóa thuộc danh mục đã ghi danh hoặc lưu, loại khóa đã ghi danh, sắp theo điểm; thiếu 10 khóa thì bổ sung khóa điểm cao nhất | UC004, UC007, UC045 | `course/course.service.ts` (`getRecommendedCourseIds`) |
| BR-13 | Tìm kiếm không phân biệt hoa thường, khớp tên, phụ đề, tên thẻ, tên giảng viên; từ v2.16 chỉ khóa `status = PUBLISHED` (thay cho `isPublished`) | UC005, UC006, UC007 | `course/course.service.ts` (`splitSearchTerms`, tối đa 5 từ) |
| BR-14 | Theo dõi: mỗi cặp (người dùng, giảng viên) một lần; không tự theo dõi (422 `CANNOT_FOLLOW_SELF`) | UC018, UC036 | `teacher/teacher.service.ts` |
| BR-15 | Thống kê hồ sơ: Save = số bookmark; On going và Completed theo BR-05 | UC010, UC019 | `user/user.service.ts` |
| BR-16 | Giờ địa phương của giảng viên theo `timezone`, định dạng `hh:mm A` | UC018, UC037 | `teacher/localTime.ts` |
| BR-17 | Nút hành động trang chi tiết: đã ghi danh thì "Continue learning"; giá 0 thì "Enroll for free"; đã trong giỏ thì "Go to cart"; còn lại "Add to cart" (mã nguồn có thêm nhánh "Open course" cho chủ khóa) | UC008, UC011, UC012 | `mobile/src/features/course/courseAction.ts` |
| BR-18 | Dữ liệu design không phải quy tắc: nhãn giảm giá luôn tính theo BR-10; phần lợi ích không ghi "Certificate" vì chứng chỉ ngoài phạm vi | UC008 | `courseAction.ts` (`buildBenefits`) |

**Bảng 2.71 – Quy tắc nghiệp vụ BR-19 đến BR-30 (giảng viên và quản trị)**

| BR | Quy tắc | UC áp dụng | Hiện thực chính |
|---|---|---|---|
| BR-19 | Vòng đời `CourseStatus`: `DRAFT` → (gửi) `PENDING_REVIEW` → (duyệt) `PUBLISHED` hoặc (từ chối) `REJECTED` → (sửa, gửi lại) `PENDING_REVIEW`; rút lại `PENDING_REVIEW` → `DRAFT`; `PUBLISHED` ↔ `ARCHIVED`; sai trạng thái trả `422 INVALID_COURSE_STATE`; chỉ `PUBLISHED` hiện ở danh mục, tìm kiếm, Home, hồ sơ giảng viên | UC022, UC024, UC025, UC031, UC032 | `studio/studioWorkflow.service.ts`, `admin/adminModeration.service.ts` |
| BR-20 | Checklist gửi duyệt (`COURSE_INCOMPLETE`, `details.missing[]`): tiêu đề 5–120 ký tự; mô tả từ 100 ký tự; có ảnh bìa và danh mục; ít nhất một chương và ba bài; mọi bài có link YouTube hợp lệ và thời lượng 1 giây đến 6 giờ; 1 đến 3 bài xem thử; giá 0 hoặc 99–99 999 cent; giá gốc lớn hơn giá | UC022, UC023, UC024, UC025, UC032 | `server/src/lib/courseChecklist.ts` |
| BR-21 | Sửa khóa đã xuất bản: trường nhỏ (phụ đề, mô tả, lợi ích, mô tả project, ảnh bìa) áp dụng ngay; trường lớn (tiêu đề, giá, giá gốc, danh mục, thẻ, chương và bài) qua một bản sửa đổi (tối đa một bản đang mở); duyệt thì áp dụng trong một transaction (bài giữ `id` thì cập nhật, bị bỏ thì xóa và mất tiến độ, mới thì tạo; tính lại số bài và thời lượng) | UC022, UC023, UC025, UC032 | `studio/studioRevision.service.ts`, `admin/adminRevisionApply.service.ts` |
| BR-22 | Xóa hoặc ẩn: chỉ xóa khóa chưa từng xuất bản và chưa có ghi danh, ngược lại chỉ ẩn; khóa `ARCHIVED` trả 404 cho người chưa ghi danh, người đã mua vẫn học, không thêm giỏ hoặc mua được | UC008, UC013, UC014, UC022, UC031 | `studio/studio.service.ts` (`deleteMyCourse`), `lib/courseVisibility.ts` |
| BR-23 | Quyền theo vai trò: `/teacher/*` cần TEACHER và là chủ khóa (không phải chủ thì 404 `COURSE_NOT_FOUND`); `/admin/*` cần ADMIN (403 `FORBIDDEN`); giảng viên không thêm giỏ, ghi danh, mua khóa của mình (422 `OWN_COURSE`); chủ khóa và admin xem mọi bài mà không ghi tiến độ | UC008, UC011, UC012, UC014, UC022 đến UC037 | `middlewares/requireRole.ts`, `lib/courseOwnership.ts` |
| BR-24 | Q&A giảng viên: giảng viên của khóa trả lời không cần ghi danh; DTO trả `isInstructor`; ghim tối đa một câu trả lời mỗi câu hỏi (ghim mới thì bỏ ghim cũ), câu ghim xếp đầu | UC016, UC029 | `question/question.service.ts`, `teaching/teaching.service.ts` (`setAnswerPinned`) |
| BR-25 | Phản hồi đánh giá: chỉ giảng viên của khóa; một phản hồi mỗi đánh giá, 1–1000 ký tự, sửa và xóa được; thông báo `REVIEW_REPLY` ở lần phản hồi đầu | UC030 | `teaching/teaching.service.ts` (`replyToReview`) |
| BR-26 | Chấm project: chỉ giảng viên của khóa; điểm nguyên 0–100; nhận xét 1–2000 ký tự; chấm lại ghi đè và cập nhật `gradedAt`; thông báo `PROJECT_GRADED` | UC017, UC028 | `teaching/teaching.service.ts` (`gradeSubmission`) |
| BR-27 | Thông báo: duyệt thì `COURSE_APPROVED`, từ chối thì `COURSE_REJECTED` (kèm lý do) cho giảng viên và gửi email (lỗi email không làm hỏng thao tác); xuất bản lần đầu thì `NEW_COURSE` cho người theo dõi; admin xem số chờ duyệt bằng huy hiệu | UC020, UC032, UC036 | `admin/adminModeration.service.ts`, `lib/courseNotify.ts` |
| BR-28 | Khóa tài khoản: admin không khóa chính mình hoặc admin khác (422 `CANNOT_DISABLE_ADMIN`); lý do 5–500 ký tự; thu hồi mọi phiên; đăng nhập hoặc refresh trả 403 `ACCOUNT_DISABLED`; khóa học của giảng viên giữ nguyên trạng thái | UC002, UC034 | `auth/accountStatus.service.ts` |
| BR-29 | AI: gợi ý soạn khóa chỉ điền form (giảng viên tự lưu); kiểm duyệt chỉ tư vấn (admin quyết định); dùng quota AI và cache `AiContent` theo mã băm nội dung; AI lỗi thì vẫn duyệt hoặc soạn tay được | UC026, UC033 | `ai/courseAi.service.ts` |
| BR-30 | Admin: không có đăng ký ADMIN (danh sách vai trò hợp lệ chỉ STUDENT, TEACHER); môi trường dev dùng tài khoản `admin@example.com` do seed tạo; production dùng script `npm run user:set-role` (mặc định chạy thử, thêm `--apply` mới ghi) cho tài khoản đã xác minh email | UC001, UC034, UC035 | `auth/auth.schema.ts`, `user/setUserRole.service.ts` |

**Sai khác đã biết giữa kế hoạch và mã nguồn (ảnh hưởng tới các quy tắc):** (1) BR-13 trong PLAN.md §6.5 còn ghi `isPublished` nhưng đã thay bằng `status = PUBLISHED` từ v2.16; (2) BR-17 chưa nêu nhánh "Open course" dành cho giảng viên là chủ khóa, mã nguồn có nhánh này; (3) `simulateFailure` của BR-07 bị bỏ qua trên production, chỉ dùng được ở dev và test, nên màn "Thanh toán thất bại" không kiểm thử được trên giao diện production (TC-DISC-45).

## 2.10 Ma trận truy vết FR – UC – màn hình – API – test

Ma trận cho phép lần theo từng yêu cầu chức năng tới use case hiện thực, màn hình, endpoint API chính và các test case kiểm chứng. Mã test case lấy từ kết quả kiểm thử có minh chứng ngày 24–26/10/2026 (`docs/04-testing/evidence/<khu vực>/results.md`, tiền tố `TC-AUTH`, `TC-DISC`, `TC-LEARN`, `TC-STU`, `TC-ADM`, `TC-PROD`). Tổng cộng **178 test case**: 166 Đạt, 4 Không đạt, 8 Không kiểm được. Ghi chú trạng thái trong cột test:

- Test case **Không đạt** ban đầu (TC-DISC-26, TC-DISC-28, TC-DISC-41, TC-LEARN-22) đã được sửa và kiểm lại Đạt (trong đợt kiểm lại, cả 21 lỗi đã sửa đều Đạt, xem `docs/04-testing/evidence/retest/results.md`); các test case được đánh dấu **(sửa, kiểm lại Đạt)**.
- Test case **Không kiểm được** (TC-AUTH-31 đến TC-AUTH-34, TC-DISC-45, TC-LEARN-51, TC-LEARN-52, TC-ADM-13) vì cần email thật, CAPTCHA, thiết bị thật, tài khoản của người khác hoặc cờ chỉ có ở bản dev; chúng được đánh dấu **(KĐ)** và có integration test thay thế.
- Các FR không có test case chức năng riêng (FR-24, FR-38) được kiểm bằng kiểm thử đơn vị và ghi rõ ở cột test.

Các yêu cầu phi chức năng được truy vết trong Bảng 2.69; quy tắc nghiệp vụ trong Bảng 2.70 và Bảng 2.71.

**Bảng 2.72 – Ma trận truy vết FR-01 đến FR-24**

| FR | UC | Màn hình | API chính | Test case |
|---|---|---|---|---|
| FR-01 | UC001 | SC-03, Verify email | `POST /auth/register`, `/auth/verify-email` | TC-AUTH-05, 06, 07; TC-AUTH-31 (KĐ) |
| FR-02 | UC002, UC040 | SC-01, SC-02, Two-factor | `POST /auth/login`, `/auth/2fa/verify`, `/auth/refresh`, `GET /auth/me` | TC-AUTH-01, 02, 03, 04, 17, 29 |
| FR-03 | UC003 | SC-20 | `POST /auth/logout` | TC-AUTH-30 |
| FR-04 | UC004 | SC-04 | `GET /home` | TC-DISC-01, 02, 03 |
| FR-05 | UC005 | SC-05, SC-06 | `GET /courses?q=`, `GET /tags/hot` | TC-DISC-04, 05, 06, 08, 09 |
| FR-06 | UC006 | SC-07 | `GET /courses` (bộ lọc, `sort`) | TC-DISC-07, 09 |
| FR-07 | UC007 | SC-08 | `GET /courses?categoryId=`, `?section=`, `GET /categories` | TC-DISC-10, 11, 12; TC-PROD-06 |
| FR-08 | UC008 | SC-09 | `GET /courses/:id`, `/similar` | TC-DISC-13, 17, 18 |
| FR-09 | UC008, UC009 | SC-09, SC-15 | `GET /courses/:id/curriculum`, `GET /lessons/:id` | TC-DISC-14, 15, 17, 19, 20, 21, 22; TC-LEARN-02, 10 |
| FR-10 | UC008 | SC-09, SC-10 | `GET /courses/:id/reviews` | TC-DISC-16, 17; TC-LEARN-14 |
| FR-11 | UC015 | SC-11 | `GET`, `PUT /courses/:id/reviews/me` | TC-LEARN-11, 12, 13, 14, 15 |
| FR-12 | UC010 | Mọi thẻ khóa, SC-09 | `PUT`, `DELETE /courses/:id/bookmark`, `GET /me/bookmarks` | TC-DISC-23, 24, 27 |
| FR-13 | UC011 | SC-09, SC-12 | `GET /cart`, `POST /cart/items`, `DELETE /cart/items/:courseId` | TC-DISC-29, 30, 31, 32, 33, 34, 39 |
| FR-14 | UC012 | SC-13 | `POST /orders/checkout`, `POST /courses/:id/enroll` | TC-DISC-35, 36, 37, 40, 41 (sửa, kiểm lại Đạt), 42; TC-DISC-45 (KĐ) |
| FR-15 | UC013 | SC-14 | `GET /me/courses`, `GET /me/stats` | TC-DISC-38, 43, 44; TC-LEARN-04, 07 |
| FR-16 | UC014 | SC-15 | `GET /lessons/:id`, `PUT /lessons/:id/progress` | TC-LEARN-01 đến TC-LEARN-10 |
| FR-17 | UC021 | SC-09, SC-15 | `PUT`, `DELETE /courses/:id/like`, `POST /courses/:id/share` | TC-DISC-25, 27; TC-DISC-26 và TC-DISC-28 (sửa, kiểm lại Đạt) |
| FR-18 | UC017 | SC-15, SC-17 | `GET /courses/:id/project`, `GET`, `POST /courses/:id/submissions` | TC-LEARN-21, 23, 24, 25, 26, 27; TC-LEARN-22 (sửa, kiểm lại Đạt); TC-LEARN-52 (KĐ) |
| FR-19 | UC016 | SC-15, SC-16 | `/courses/:id/questions`, `/questions/:id/*` | TC-LEARN-16, 17, 18, 19, 20; TC-LEARN-51 (KĐ) |
| FR-20 | UC018 | SC-18, SC-19 | `/teachers/:id`, `/teachers/:id/courses`, `/teachers/:id/reviews`, `PUT`, `DELETE /teachers/:id/follow` | TC-DISC-18; TC-LEARN-28, 29, 30, 31, 32, 33 |
| FR-21 | UC019, UC010 | SC-20 | `GET /auth/me`, `GET /me/stats`, `GET /me/bookmarks` | TC-AUTH-19; TC-DISC-23 |
| FR-22 | UC019 | SC-21 | `PATCH /me`, `POST /me/avatar` | TC-AUTH-20, 21, 22, 23 |
| FR-23 | UC020 | SC-22 | `GET /notifications`, `PATCH /notifications/:id/read`, `/read-all`, `GET /notifications/unread-count` | TC-AUTH-24, 25 |
| FR-24 | Xuyên suốt (UC004, UC013, UC014) | Toàn app | Cache TanStack Query; hàng đợi tiến độ AsyncStorage | Không có test case chức năng riêng (cần tắt mạng thiết bị thật); kiểm thử đơn vị `progressQueue.test.ts`, `persister.test.ts`, `queryClient.test.ts` |

**Bảng 2.73 – Ma trận truy vết FR-25 đến FR-38**

| FR | UC | Màn hình | API chính | Test case |
|---|---|---|---|---|
| FR-25 | UC038 | Verify email | `POST /auth/verify-email`, `/auth/resend-verification` | TC-AUTH-31 (KĐ) |
| FR-26 | UC039 | Forgot password, Reset password | `POST /auth/forgot-password`, `/auth/reset-password` | TC-AUTH-08, 09; TC-AUTH-32 (KĐ) |
| FR-27 | UC039 | Settings → Bảo mật | `POST /me/password` | TC-AUTH-12, 13 |
| FR-28 | UC040 | Two-factor, Settings → Bảo mật | `POST /auth/2fa/verify`, `/me/2fa/setup`, `/enable`, `/disable`, `/recovery-codes` | TC-AUTH-14, 15, 16, 17, 18 |
| FR-29 | UC041 | Settings → Bảo mật | `POST /auth/refresh`, `GET /me/security`, `/me/sessions`, `DELETE /me/sessions/:id`, `DELETE /me/sessions` | TC-AUTH-10, 11, 13, 25; TC-AUTH-34 (KĐ) |
| FR-30 | UC001, UC002, UC039 | SC-02, SC-03, Forgot password | `/auth/*` (CAPTCHA, khóa 423) | TC-AUTH-07, 09; TC-AUTH-33 (KĐ) |
| FR-31 | UC044 | SC-09, SC-15 | `GET /courses/:id/ai/summary`, `GET /lessons/:id/ai/summary` | TC-LEARN-34, 35, 36, 47 |
| FR-32 | UC043 | AI Tutor | `POST`, `GET`, `DELETE /courses/:id/ai/chat` | TC-LEARN-34, 37, 38, 39, 48, 49, 50 |
| FR-33 | UC044 | Quiz | `POST /lessons/:id/ai/quiz` | TC-LEARN-40, 41, 42, 43, 49 |
| FR-34 | UC045 | SC-04 | `GET /me/ai/recommendations` | TC-LEARN-44, 45, 46 |
| FR-35 | UC042 | Toàn app, Settings | `lang`, `Accept-Language` | TC-AUTH-01, 05, 24, 26, 27, 28 |
| FR-36 | UC042 | Toàn app, Settings | — | TC-AUTH-26, 27, 28 |
| FR-37 | Xuyên suốt | Toàn app (web) | API chung | TC-AUTH-27; TC-PROD-09, 10 |
| FR-38 | Xuyên suốt (SC-01) | SC-01 | — | Không có test case chức năng riêng; kiểm thử đơn vị màn khởi động (`useAppBootstrap.test.tsx`) |

**Bảng 2.74 – Ma trận truy vết FR-39 đến FR-54**

| FR | UC | Màn hình | API chính | Test case |
|---|---|---|---|---|
| FR-39 | UC022 | SC-23, SC-24 | `GET`, `POST /teacher/courses`, `GET`, `PATCH`, `DELETE /teacher/courses/:id`, `POST /teacher/uploads/image` | TC-STU-01, 02, 03, 04, 08, 09, 22 |
| FR-40 | UC023 | SC-24, SC-25 | `/teacher/courses/:id/sections`, `/teacher/sections/:id`, `/teacher/lessons/:id`, `/teacher/courses/:id/reorder` | TC-STU-10, 11, 12 |
| FR-41 | UC024 | SC-24, SC-26 | `POST /teacher/courses/:id/submit`, `/withdraw` | TC-STU-13, 14; TC-ADM-07 |
| FR-42 | UC025 | SC-26, SC-24 | `/teacher/courses/:id/revision` (`POST`, `PUT`, `DELETE`), `/revision/submit` | TC-STU-15; TC-ADM-09 |
| FR-43 | UC031 | SC-26, SC-33 | `POST /teacher/courses/:id/archive`, `/restore`; `POST /admin/courses/:id/archive`, `/restore` | TC-STU-20; TC-ADM-10 |
| FR-44 | UC026 | SC-27 | `POST /teacher/ai/course-draft` | TC-STU-05, 06, 07, 11 |
| FR-45 | UC027 | SC-28 | `GET /teacher/courses/:id/stats` | TC-STU-16 |
| FR-46 | UC028 | SC-29, SC-15 | `GET /teacher/courses/:id/submissions`, `PUT /teacher/submissions/:id/grade` | TC-STU-17; TC-LEARN-52 (KĐ) |
| FR-47 | UC029 | SC-16 | `PUT`, `DELETE /teacher/answers/:id/pin`, `POST /questions/:id/answers` | TC-STU-18; TC-LEARN-51 (KĐ) |
| FR-48 | UC030 | SC-09, SC-10 | `PUT`, `DELETE /teacher/reviews/:id/reply` | TC-STU-19 |
| FR-49 | UC037 | SC-30 | `GET`, `PATCH /me/teacher-profile` | TC-STU-21 |
| FR-50 | UC032 | SC-32, SC-33 | `GET /admin/courses`, `GET /admin/courses/:id`, `POST .../approve`, `.../reject` | TC-ADM-02, 03, 05, 06, 07, 08, 09 |
| FR-51 | UC033 | SC-33 | `GET /admin/courses/:id/ai-review` | TC-ADM-04 |
| FR-52 | UC034 | SC-34 | `GET /admin/users`, `POST /admin/users/:id/disable`, `/enable` | TC-ADM-11, 12, 14 |
| FR-53 | UC035 | SC-31 | `GET /admin/stats` | TC-ADM-01 |
| FR-54 | UC036 | SC-22 | (kích hoạt trong `POST /admin/courses/:id/approve`) | TC-ADM-13 (KĐ; có integration test) |

Quy tắc nghiệp vụ BR-23 (giảng viên không mua khóa của chính mình) được kiểm bởi TC-STU-23; BR-28 (admin không khóa admin) bởi TC-ADM-14.


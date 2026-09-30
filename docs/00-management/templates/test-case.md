# Mẫu test case

> **Cách dùng:** các test case được gom vào `docs/04-testing/test-cases.md` (≥ 50 TC, mỗi người viết TC cho feature của mình, C chuẩn hóa và tổng hợp — PLAN §12, §13). File này cung cấp **mẫu chuẩn** để mọi TC có cùng cấu trúc.
> **Nguyên tắc:** mỗi TC kiểm chứng **một hành vi**, có ID `TC-<MODULE>-<số>`, map về ít nhất một yêu cầu `FR-xx` (hoặc `NFR-xx` cho test phi chức năng) — CLAUDE.md §9. Cột "Kết quả thực tế", "Trạng thái", "Người test", "Ngày" chỉ điền khi **chạy test** (W7, hoặc khi xong từng sprint).

---

## 1. Quy tắc đặt ID

Định dạng: **`TC-<MODULE>-<số 2 chữ số>`**, ví dụ `TC-AUTH-01`.

| Mã MODULE | Phạm vi | Yêu cầu liên quan |
|---|---|---|
| `AUTH` | Đăng ký, đăng nhập, duy trì phiên, đăng xuất | FR-01, FR-02, FR-03 |
| `HOME` | Trang chủ | FR-04 |
| `SRCH` | Tìm kiếm, lọc, sắp xếp, danh sách theo danh mục | FR-05, FR-06, FR-07 |
| `CRS` | Chi tiết khóa học, danh sách bài học, review (xem) | FR-08, FR-09, FR-10 |
| `CART` | Giỏ hàng | FR-13 |
| `PAY` | Thanh toán giả lập, ghi danh | FR-14 |
| `LRN` | Học bài, lưu tiến độ, My Courses | FR-15, FR-16 |
| `QA` | Hỏi đáp | FR-19 |
| `PRJ` | Project, tài liệu | FR-18 |
| `OFF` | Offline và cache | FR-24, NFR-04 |
| `SEC` | Bảo mật, phân quyền | NFR-05, NFR-06 |

Các module khác (đánh giá, giảng viên, hồ sơ, thông báo, bookmark…) đặt mã ngắn theo cùng quy tắc, ví dụ `REV`, `TCH`, `PROF`, `NOTI`, `BKM`; khi thêm mã mới phải bổ sung vào bảng trên trong `test-cases.md`.

## 2. Quy ước trạng thái và dữ liệu

| Trường | Giá trị hợp lệ |
|---|---|
| Trạng thái | `Pass` · `Fail` · `Blocked` (không chạy được vì phụ thuộc bug/tính năng khác) · `Not run` (chưa chạy) |
| Ưu tiên TC | Theo ưu tiên của FR: Must / Should / Could. Tiêu chí ra W7: 100 % TC Must đã chạy, tỉ lệ pass ≥ 95 % (PLAN §14.3) |
| Loại TC | `Unit` · `Integration` · `System (thủ công)` · `E2E` · `Non-functional` |
| Fail | Bắt buộc tạo bug `BUG-xxx` (mẫu `bug-report.md`) và ghi ID bug vào cột "Ghi chú" |

## 3. Mẫu một test case (dạng khối)

Dùng dạng khối khi TC có nhiều bước hoặc cần dữ liệu chi tiết.

### TC-_(MODULE)_-_(số)_ — _(Tiêu đề: mô tả hành vi cần kiểm chứng)_

| Trường | Nội dung |
|---|---|
| FR / NFR liên quan | _(điền)_ (ví dụ: FR-16) |
| Use case / Màn hình | _(điền)_ (ví dụ: UC-14 / SC-15) |
| Loại – Ưu tiên | _(điền)_ (ví dụ: System (thủ công) – Must) |
| Tiền điều kiện | _(điền)_ (trạng thái đăng nhập, dữ liệu seed, thiết bị, mạng) |
| Các bước | 1. _(điền)_<br>2. _(điền)_<br>3. _(điền)_ |
| Dữ liệu kiểm thử | _(điền)_ (tài khoản demo, khóa học, giá trị nhập) |
| Kết quả mong đợi | _(điền)_ |
| Kết quả thực tế | _(điền khi chạy test)_ |
| Trạng thái | _(Pass / Fail / Blocked / Not run)_ |
| Người test – Ngày | _(điền)_ – _(dd/mm/yyyy)_ |
| Thiết bị / môi trường | _(điền)_ (model, Android/iOS version, Expo Go SDK, server local hay Render) |
| Ghi chú / Bug liên quan | _(điền)_ |

## 4. Mẫu bảng tổng hợp (dùng trong `test-cases.md`)

Cột theo đúng PLAN §14.5:

`TC-ID | FR | Tiêu đề | Tiền điều kiện | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Người test | Ngày`

| TC-ID | FR | Tiêu đề | Tiền điều kiện | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Người test | Ngày |
|---|---|---|---|---|---|---|---|---|---|---|
| _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |

## 5. Ví dụ đã điền đầy đủ

| TC-ID | FR | Tiêu đề | Tiền điều kiện | Các bước | Dữ liệu | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Người test | Ngày |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-01 | FR-01 | Đăng ký hợp lệ | App mở ở màn Login, chưa có phiên, có mạng | 1. Bấm "Sign up".<br>2. Nhập Full name, Email, Password, Confirm password.<br>3. Bấm "Create account". | Họ tên và email chưa tồn tại; mật khẩu ≥ 8 ký tự có chữ và số; confirm khớp | Tạo tài khoản, tự đăng nhập, vào Home thấy "Hello, {tên}!" | _(điền khi chạy test)_ | Not run | _(điền)_ | _(điền)_ |
| TC-AUTH-02 | FR-01 | Đăng ký email đã tồn tại | App mở ở màn Register, có mạng | 1. Nhập email của tài khoản demo.<br>2. Nhập các trường còn lại hợp lệ.<br>3. Bấm "Create account". | Email của tài khoản demo | Hiện "Email already in use", không tạo tài khoản, vẫn ở màn Register | _(điền khi chạy test)_ | Not run | _(điền)_ | _(điền)_ |
| TC-LRN-01 | FR-16 | Tiếp tục video từ vị trí cũ | Đăng nhập tài khoản demo; đã ghi danh một khóa; có mạng | 1. Mở khóa ở My Courses → màn Learning.<br>2. Phát bài 01 tới khoảng 0:20.<br>3. Thoát ra My Courses.<br>4. Vào lại khóa và bài 01. | Bài học có thời lượng ≥ 30 s | Video bắt đầu phát ở khoảng 0:20 | _(điền khi chạy test)_ | Not run | _(điền)_ | _(điền)_ |

## 6. Danh sách TC mẫu của PLAN §14.5 (điểm khởi đầu cho `test-cases.md`)

| TC | FR | Tiêu đề | Kết quả mong đợi (tóm tắt) |
|---|---|---|---|
| TC-AUTH-01 | FR-01 | Đăng ký hợp lệ | Tạo tài khoản, tự đăng nhập, vào Home thấy "Hello, {tên}!" |
| TC-AUTH-02 | FR-01 | Đăng ký email đã tồn tại | Hiện "Email already in use", không tạo tài khoản |
| TC-AUTH-03 | FR-02 | Đăng nhập sai mật khẩu | Hiện lỗi, vẫn ở màn Login |
| TC-AUTH-04 | FR-02 | Mở lại app khi token còn hạn | Vào thẳng Home, không hiện Login |
| TC-HOME-01 | FR-04 | Home hiển thị đủ section | Đúng thứ tự: banner, categories, popular, recommended, inspires, top teachers |
| TC-SRCH-01 | FR-05 | Tìm "design" | Hiện "{n} Results", mọi kết quả có liên quan "design" |
| TC-SRCH-02 | FR-06 | Lọc rating ≥ 4.5 + sort giá tăng | Kết quả đều ≥ 4.5 và giá tăng dần |
| TC-CRS-01 | FR-09 | Bài bị khóa khi chưa ghi danh | Icon khóa, bấm → toast "Enroll to unlock" |
| TC-CART-01 | FR-13 | Thêm khóa đã có trong giỏ | Nút đổi thành "Go to cart"; API trả 409 nếu gọi lại |
| TC-PAY-01 | FR-14 | Checkout thành công | Giỏ rỗng, khóa xuất hiện ở My Courses (0 %), có thông báo ORDER_PAID |
| TC-LRN-01 | FR-16 | Tiếp tục video | Xem tới 0:20, thoát, vào lại → video bắt đầu ~0:20 |
| TC-LRN-02 | FR-16 | Hoàn thành bài | Xem ≥ 90 % → icon ✓, % khóa tăng đúng công thức BR-04 |
| TC-QA-01 | FR-19 | Đặt câu hỏi kèm emoji | Câu hỏi xuất hiện đầu danh sách với emoji |
| TC-PRJ-01 | FR-18 | Upload file 15 MB | Bị chặn phía client, hiện "File must be ≤ 10 MB" |
| TC-OFF-01 | FR-24 | Tắt mạng rồi mở app | Home & My Courses hiện dữ liệu cũ + banner offline; bookmark bị chặn kèm toast |
| TC-SEC-01 | NFR-06 | Gọi `GET /lessons/:id` (bài không preview) khi chưa ghi danh | 403 `NOT_ENROLLED`, không có `videoUrl` |

## 7. Lưu ý khi viết test case

- Mỗi TC Must phải có ít nhất **một TC đường lỗi** đi kèm (ví dụ đăng ký hợp lệ + đăng ký trùng email).
- TC phân quyền (403 `NOT_ENROLLED`) phải kiểm tra **ở tầng API**, không chỉ kiểm tra UI đã ẩn nút (NFR-06).
- Ghi rõ dữ liệu seed đang dùng (tài khoản demo, khóa học cụ thể) để người khác chạy lại được.
- Khi chạy thủ công, chụp ảnh/quay video các TC Fail và các luồng lõi (PLAN §13, T-06/T-07).

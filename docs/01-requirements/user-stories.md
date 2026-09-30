# User Stories

| Mục | Nội dung |
|---|---|
| Dự án | E-Learning App — Đề tài số 5, môn Lập trình thiết bị di động |
| Task | R-02 (PLAN §13) — giai đoạn 1: Requirement Analysis |
| Người phụ trách | A (theo PLAN §12) — hạn 09/10/2026 |
| Phiên bản | 1.1 — đồng bộ PLAN.md v1.3 (lọc nhiều danh mục, thanh toán thất bại 402, `GET /notifications/unread-count`, GET Q&A/Project yêu cầu ghi danh, rate limit chỉ login/register, ngoại lệ lưu tiến độ offline, ẩn "View more" Student Projects, BR-18) |
| Tài liệu liên quan | [interviews.md](interviews.md) · [SRS.md](SRS.md) · [use-case.puml](diagrams/use-case.puml) · [PLAN.md §2, §6, §7](../../PLAN.md) |

Tài liệu gồm **37 user story** (`US-01` … `US-37`) theo dạng **"Là … tôi muốn … để …"**, mỗi story có ưu tiên MoSCoW, ánh xạ tới FR/UC/SC/BR và **acceptance criteria dạng Given/When/Then** (≥ 2 tiêu chí mỗi story). Các story bám 12 màn hình design và toàn bộ Must + Should của PLAN §2.2; phần Could được ghi riêng, phần Won't được liệt kê ở mục 5.

## Mục lục

1. [Quy ước](#1-quy-ước)
2. [Danh sách tổng hợp](#2-danh-sách-tổng-hợp)
3. [Chi tiết từng user story](#3-chi-tiết-từng-user-story)
4. [Ma trận phủ phạm vi (PLAN §2.2)](#4-ma-trận-phủ-phạm-vi-plan-22)
5. [Ngoài phạm vi (Won't)](#5-ngoài-phạm-vi-wont)

---

## 1. Quy ước

- **Định dạng story:** "Là **[vai trò]**, tôi muốn **[hành động]** để **[lợi ích]**." Vai trò lấy từ các actor trong PLAN §6.1: Guest, Learner (Học viên), Teacher (Giảng viên).
- **Ưu tiên (MoSCoW):** Must · Should · Could — theo PLAN §2.2. Ưu tiên story lấy theo ưu tiên của FR tương ứng.
- **Acceptance criteria:** đánh mã `AC-<số story>.<số thứ tự>`, viết theo **Given** (ngữ cảnh) – **When** (hành động) – **Then** (kết quả quan sát được). Các chuỗi hiển thị trong ngoặc kép (ví dụ "Email already in use") là văn bản UI tiếng Anh theo design/PLAN.
- **Ánh xạ:** mỗi story ghi FR, UC, SC, BR (nếu có). Mã test case tham chiếu (`TC-…`) lấy từ PLAN §14.5.
- **Persona nguồn:** P1 (sinh viên CNTT), P2 (người đi làm chuyển sang Design), P3 (giảng viên) — xem [interviews.md](interviews.md); insight (IN-xx) ghi trong cột tương ứng.
- **Definition of Done cho story:** đáp ứng toàn bộ acceptance criteria và checklist trong CLAUDE.md §13 (UI khớp design, đủ trạng thái loading/empty/error, test liên quan pass).
- **Yêu cầu chung áp dụng cho mọi story** (không lặp lại trong từng story): UI bám design và tokens (NFR-07), touch target ≥ 48 dp/44 pt, mọi màn có dữ liệu xử lý đủ 4 trạng thái loading (skeleton) · error (có nút Retry) · empty · success, lỗi hiển thị bằng lời dễ hiểu.

## 2. Danh sách tổng hợp

| US | Nhóm | Tóm tắt | Ưu tiên | FR | UC | SC | Persona / Insight |
|---|---|---|---|---|---|---|---|
| US-01 | Tài khoản | Đăng ký tài khoản | Must | FR-01 | UC-01 | SC-03 | P1, P2 · IN-17 |
| US-02 | Tài khoản | Đăng nhập | Must | FR-02 | UC-02 | SC-02 | P1, P2 · IN-17 |
| US-03 | Tài khoản | Duy trì phiên đăng nhập | Must | FR-02 | UC-02 | SC-01 | P1, P2 · IN-17 |
| US-04 | Tài khoản | Đăng xuất | Must | FR-03 | UC-03 | SC-20 | P2 · IN-17 |
| US-05 | Khám phá | Xem trang chủ | Must | FR-04 | UC-04 | SC-04 | P1, P2 · IN-04, IN-08, IN-21 |
| US-06 | Khám phá | Tìm kiếm theo từ khóa và hot topics | Must | FR-05 | UC-05 | SC-05, SC-06 | P1, P3 · IN-02 |
| US-07 | Khám phá | Xem kết quả tìm kiếm cuộn vô hạn | Must | FR-05 | UC-05 | SC-06 | P2 · IN-02, IN-21 |
| US-08 | Khám phá | Duyệt khóa học theo danh mục / "View more" | Must | FR-07 | UC-07 | SC-08 | P2 · IN-04 |
| US-09 | Khám phá | Lọc và sắp xếp kết quả | Should | FR-06 | UC-06 | SC-07 | P1, P2 · IN-03 |
| US-10 | Chi tiết khóa | Xem tổng quan khóa học | Must | FR-08 | UC-08 | SC-09 | P1, P2 · IN-08 |
| US-11 | Chi tiết khóa | Xem danh sách bài học theo trạng thái | Must | FR-09 | UC-08 | SC-09 | P1, P2 · IN-12 |
| US-12 | Chi tiết khóa | Xem trước bài học miễn phí | Must | FR-09 | UC-09 | SC-09 | P1, P2 · IN-07 |
| US-13 | Chi tiết khóa | Xem đánh giá khóa học | Must | FR-10 | UC-08 | SC-09 | P1, P2, P3 · IN-05 |
| US-14 | Chi tiết khóa | Xem tất cả đánh giá, lọc theo sao | Should | FR-10 | UC-08 | SC-10 | P2 · IN-05 |
| US-15 | Chi tiết khóa | Viết / sửa đánh giá | Should | FR-11 | UC-15 | SC-11 | P2, P3 · IN-06 |
| US-16 | Chi tiết khóa | Lưu / bỏ lưu khóa học | Must | FR-12 | UC-10 | SC-04, SC-06, SC-09, SC-20 | P1 · IN-11 |
| US-17 | Mua và ghi danh | Quản lý giỏ hàng | Must | FR-13 | UC-11 | SC-09, SC-12 | P2 · IN-09 |
| US-18 | Mua và ghi danh | Thanh toán giả lập và ghi danh | Must | FR-14 | UC-12 | SC-13 | P1, P2 · IN-09, IN-10 |
| US-19 | Mua và ghi danh | Ghi danh khóa miễn phí | Must | FR-14 | UC-12 | SC-09 | P1 · IN-10 |
| US-20 | Học tập | Xem khóa học của tôi (My Courses) | Must | FR-15 | UC-13 | SC-14 | P1, P2 · IN-12 |
| US-21 | Học tập | Học qua video, tiếp tục đúng vị trí | Must | FR-16 | UC-14 | SC-15 | P1, P2, P3 · IN-01 |
| US-22 | Học tập | Tự đánh dấu hoàn thành bài và cập nhật % khóa | Must | FR-16 | UC-14 | SC-15 | P1, P2 · IN-01, IN-12 |
| US-23 | Tương tác | Đặt câu hỏi (Q&A) | Should | FR-19 | UC-16 | SC-15 | P1, P2 · IN-13 |
| US-24 | Tương tác | Trả lời, thích câu hỏi, xem chi tiết câu hỏi | Should | FR-19 | UC-16 | SC-16 | P2 · IN-13 |
| US-25 | Tương tác | Xem mô tả project và tải tài liệu | Should | FR-18 | UC-17 | SC-15 | P1, P2 · IN-14 |
| US-26 | Tương tác | Nộp project | Should | FR-18 | UC-17 | SC-17 | P2, P3 · IN-14 |
| US-27 | Tương tác | Xem project của học viên khác | Should | FR-18 | UC-17 | SC-15 | P2, P3 · IN-14 |
| US-28 | Giảng viên | Xem hồ sơ giảng viên | Should | FR-20 | UC-18 | SC-18 | P2 · IN-18 |
| US-29 | Giảng viên | Follow / Unfollow giảng viên | Should | FR-20 | UC-18 | SC-09, SC-18 | P2 · IN-18 |
| US-30 | Giảng viên | Hồ sơ giảng viên phản ánh đúng chuyên môn và đánh giá | Should | FR-20 | UC-18 | SC-18 | P3 · IN-19 |
| US-31 | Hồ sơ | Xem hồ sơ cá nhân, thống kê và khóa đã lưu | Must | FR-21 | UC-19 | SC-20 | P1 · IN-11, IN-20 |
| US-32 | Hồ sơ | Chỉnh sửa hồ sơ và ảnh đại diện | Should | FR-22 | UC-19 | SC-21 | P2 · IN-20 |
| US-33 | Hồ sơ | Xem thông báo trong app | Should | FR-23 | UC-20 | SC-22, SC-04 | P1, P2 · IN-13, IN-16 |
| US-34 | Hệ thống | Xem lại dữ liệu khi mất mạng | Should | FR-24 | (xuyên suốt) | Toàn app | P1, P2, P3 · IN-15 |
| US-35 | Tương tác | Thích / chia sẻ khóa học | Could | FR-17 | UC-21 | SC-15 | P1 · IN-24 |
| US-36 | Khám phá | Lưu lịch sử tìm kiếm gần đây | Could | (mở rộng FR-05) | UC-05 | SC-05 | P1 · IN-24 |
| US-37 | Giảng viên | Xem danh sách tất cả giảng viên | Could | (mở rộng FR-04, FR-20) | UC-18 | SC-19 | P2 · IN-24 |

**Thống kê:** Must = 20 · Should = 14 · Could = 3 · Tổng = 37 story.

## 3. Chi tiết từng user story

### Nhóm A — Tài khoản

#### US-01 — Đăng ký tài khoản

| Trường | Nội dung |
|---|---|
| **Story** | Là **người dùng mới (Guest)**, tôi muốn **đăng ký tài khoản bằng họ tên, email và mật khẩu** để **có thể mua và học các khóa học trên ứng dụng**. |
| Ưu tiên | Must |
| Liên kết | FR-01 · UC-01 · SC-03 · NFR-05 · Persona P1, P2 (IN-17) |
| Test case mẫu | TC-AUTH-01, TC-AUTH-02 |

**Acceptance criteria**

- **AC-01.1** — **Given** Guest đang ở màn Register (SC-03) và nhập Full name, một email chưa được đăng ký, mật khẩu ≥ 8 ký tự có cả chữ và số, Confirm password khớp; **When** Guest bấm "Create account"; **Then** tài khoản được tạo, Guest tự động đăng nhập và thấy Home với lời chào "Hello, {firstName}!".
- **AC-01.2** — **Given** email nhập vào đã thuộc về một tài khoản khác; **When** Guest bấm "Create account"; **Then** hiển thị "Email already in use" dưới trường email, không tạo tài khoản mới và Guest vẫn ở màn Register.
- **AC-01.3** — **Given** mật khẩu ngắn hơn 8 ký tự hoặc thiếu chữ hoặc thiếu số; **When** Guest bấm "Create account"; **Then** lỗi hiển thị dưới trường mật khẩu và ứng dụng không gửi yêu cầu lên server.
- **AC-01.4** — **Given** Confirm password không khớp với Password hoặc email sai định dạng; **When** Guest bấm "Create account"; **Then** lỗi hiển thị dưới từng trường tương ứng.
- **AC-01.5** — **Given** yêu cầu đăng ký đang được gửi; **When** Guest nhìn vào nút "Create account"; **Then** nút bị vô hiệu hóa và hiển thị trạng thái đang tải để tránh gửi trùng.

#### US-02 — Đăng nhập

| Trường | Nội dung |
|---|---|
| **Story** | Là **người dùng đã có tài khoản (Guest)**, tôi muốn **đăng nhập bằng email và mật khẩu** để **truy cập các khóa học và dữ liệu cá nhân của mình**. |
| Ưu tiên | Must |
| Liên kết | FR-02 · UC-02 · SC-02 · NFR-05 · Persona P1, P2 (IN-17) |
| Test case mẫu | TC-AUTH-03 |

**Acceptance criteria**

- **AC-02.1** — **Given** Guest ở màn Login (SC-02) và nhập email cùng mật khẩu đúng; **When** Guest bấm "Log in"; **Then** Guest vào màn Home và phiên đăng nhập được lưu an toàn trên thiết bị.
- **AC-02.2** — **Given** Guest nhập sai mật khẩu; **When** bấm "Log in"; **Then** hiển thị thông báo lỗi đăng nhập, Guest vẫn ở màn Login và các trường vẫn giữ giá trị email đã nhập.
- **AC-02.3** — **Given** email sai định dạng hoặc để trống mật khẩu; **When** bấm "Log in"; **Then** lỗi hiển thị dưới từng trường và không có yêu cầu nào gửi lên server.
- **AC-02.4** — **Given** Guest đã có mật khẩu đã nhập; **When** Guest bấm biểu tượng hiện/ẩn mật khẩu; **Then** mật khẩu chuyển giữa dạng ẩn và dạng hiển thị.
- **AC-02.5** — **Given** một địa chỉ IP đã gửi `POST /auth/login` (hoặc `POST /auth/register`) quá 10 lần trong một phút; **When** Guest gửi thêm yêu cầu; **Then** server từ chối với mã `RATE_LIMITED` (429) và ứng dụng hiển thị thông báo yêu cầu thử lại sau.

#### US-03 — Duy trì phiên đăng nhập

| Trường | Nội dung |
|---|---|
| **Story** | Là **người dùng đã đăng nhập**, tôi muốn **ứng dụng tự đăng nhập lại khi tôi mở app nếu phiên còn hạn** để **không phải nhập lại mật khẩu mỗi lần học**. |
| Ưu tiên | Must |
| Liên kết | FR-02 · UC-02 · SC-01 · NFR-05 · Persona P1, P2 (IN-17) |
| Test case mẫu | TC-AUTH-04 |

**Acceptance criteria**

- **AC-03.1** — **Given** thiết bị lưu token còn hạn (7 ngày kể từ lúc đăng nhập); **When** người dùng mở lại ứng dụng; **Then** màn khởi động (SC-01) kiểm tra phiên và đưa người dùng thẳng vào Home, không hiện màn Login.
- **AC-03.2** — **Given** token đã hết hạn hoặc không hợp lệ; **When** người dùng mở ứng dụng; **Then** token bị xóa khỏi thiết bị và ứng dụng chuyển đến màn Login.
- **AC-03.3** — **Given** thiết bị không có mạng nhưng vẫn còn token và dữ liệu người dùng đã lưu; **When** người dùng mở ứng dụng; **Then** ứng dụng vào Home ở chế độ offline và hiển thị dữ liệu đã lưu.
- **AC-03.4** — **Given** ứng dụng đang khởi động; **When** font, token và cache chưa sẵn sàng; **Then** màn splash được giữ cho đến khi các bước này xong, không nhấp nháy màn Login.
- **AC-03.5** — **Given** Learner mở lại ứng dụng nhiều lần trong một phút (mỗi lần ứng dụng khôi phục phiên bằng `GET /auth/me`); **When** ứng dụng kiểm tra phiên; **Then** không có yêu cầu nào bị từ chối `RATE_LIMITED`, vì giới hạn tốc độ chỉ áp dụng cho `POST /auth/login` và `POST /auth/register`.

#### US-04 — Đăng xuất

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên (Learner)**, tôi muốn **đăng xuất khỏi tài khoản** để **bảo vệ dữ liệu cá nhân khi dùng chung thiết bị**. |
| Ưu tiên | Must |
| Liên kết | FR-03 · UC-03 · SC-20 · NFR-05 · Persona P2 (IN-17) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-04.1** — **Given** Learner đang ở User profile (SC-20); **When** Learner mở menu ⋮, chọn "Log out" và xác nhận; **Then** token bị xóa, cache đã lưu bị xóa và ứng dụng chuyển về màn Login.
- **AC-04.2** — **Given** Learner chọn "Log out" nhưng hủy ở hộp xác nhận; **When** hộp thoại đóng; **Then** Learner vẫn đăng nhập và ở lại SC-20.
- **AC-04.3** — **Given** Learner A vừa đăng xuất và Learner B đăng nhập trên cùng thiết bị; **When** B vào Home, My Courses, Profile; **Then** không hiển thị bất kỳ dữ liệu nào của A.
- **AC-04.4** — **Given** Learner đã đăng xuất; **When** Learner dùng nút Back hệ thống; **Then** không quay lại được các màn hình yêu cầu đăng nhập.

### Nhóm B — Khám phá

#### US-05 — Xem trang chủ

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **thấy trang chủ với banner, danh mục, khóa học nổi bật và giảng viên hàng đầu** để **nhanh chóng khám phá khóa học phù hợp**. |
| Ưu tiên | Must |
| Liên kết | FR-04 · UC-04 · SC-04 · BR-10, BR-11, BR-12 · NFR-01 · Persona P1, P2 (IN-04, IN-08, IN-21) |
| Test case mẫu | TC-HOME-01 |

**Acceptance criteria**

- **AC-05.1** — **Given** Learner đã đăng nhập; **When** Home (SC-04) tải xong; **Then** hiển thị lần lượt: header "Hello, {firstName}!" kèm "What do you want to learn today?", banner khuyến mãi, 6 danh mục (Business, Design, Code, Writing, Movie, Language), Popular courses, Recommended for you, Course that inspires, Top teachers, đúng thứ tự như design.
- **AC-05.2** — **Given** giỏ hàng có 2 khóa và có 3 thông báo chưa đọc; **When** Learner nhìn vào header; **Then** biểu tượng giỏ hàng hiển thị số 2 và biểu tượng chuông hiển thị số 3 (số chưa đọc lấy từ endpoint đếm riêng `GET /notifications/unread-count`).
- **AC-05.3** — **Given** khóa học có cờ Best-seller hoặc có giá gốc cao hơn giá bán; **When** card khóa học hiển thị; **Then** card có nhãn "Best-seller" (ưu tiên) hoặc "{x}% Off" với x = làm tròn (1 − giá/giá gốc) × 100 (BR-10).
- **AC-05.4** — **Given** Learner đã mở Home ít nhất một lần trong 24 giờ qua; **When** Learner mở lại ứng dụng; **Then** Home hiển thị nội dung từ bộ nhớ đệm trong < 1 giây rồi làm mới nền (NFR-01).
- **AC-05.5** — **Given** Home đang hiển thị; **When** Learner kéo xuống để làm mới; **Then** dữ liệu được tải lại và hiển thị mới nhất; nếu lỗi thì hiển thị trạng thái lỗi có nút Retry.
- **AC-05.6** — **Given** Learner ở một section trên Home; **When** bấm "View more"; **Then** ứng dụng mở danh sách đầy đủ của section đó (xem US-08).

#### US-06 — Tìm kiếm theo từ khóa và hot topics

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **tìm khóa học bằng từ khóa hoặc bấm các chủ đề nóng** để **nhanh chóng tìm được khóa học tôi cần**. |
| Ưu tiên | Must |
| Liên kết | FR-05 · UC-05 · SC-05, SC-06 · BR-13 · Persona P1, P3 (IN-02) |
| Test case mẫu | TC-SRCH-01 |

**Acceptance criteria**

- **AC-06.1** — **Given** Learner ở tab Search (SC-05) với ô tìm kiếm rỗng; **When** màn hình hiển thị; **Then** thấy Hot topics (dạng chip), danh sách Categories và mục Recommended for you.
- **AC-06.2** — **Given** Learner gõ "design" vào ô tìm kiếm; **When** ngừng gõ 400 ms; **Then** ứng dụng hiển thị "{n} Results" và mọi khóa trong kết quả có liên quan đến "design" (khớp tên khóa, phụ đề, tag hoặc tên giảng viên; không phân biệt hoa thường; chỉ khóa đã xuất bản).
- **AC-06.3** — **Given** Learner ở SC-05; **When** bấm chip hot topic "Python"; **Then** ô tìm kiếm được điền "Python" và kết quả tìm kiếm hiển thị ngay.
- **AC-06.4** — **Given** Learner gõ liên tục 10 ký tự "javascript"; **When** ứng dụng xử lý; **Then** số yêu cầu gửi lên server chỉ 1–2 (nhờ debounce), không gửi mỗi ký tự.
- **AC-06.5** — **Given** Learner đang xem kết quả; **When** bấm nút xóa từ khóa và không có bộ lọc nào bật; **Then** ứng dụng quay lại chế độ khám phá.

#### US-07 — Xem kết quả tìm kiếm cuộn vô hạn

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **cuộn danh sách kết quả mượt và tự tải thêm** để **duyệt nhiều khóa học mà không phải bấm chuyển trang**. |
| Ưu tiên | Must |
| Liên kết | FR-05 · UC-05 · SC-06 · NFR-03 · Persona P2 (IN-02, IN-21) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-07.1** — **Given** kết quả tìm kiếm có nhiều hơn 20 khóa; **When** Learner cuộn gần cuối danh sách; **Then** ứng dụng tự tải trang kế tiếp (20 mục/trang) và nối vào danh sách hiện tại.
- **AC-07.2** — **Given** danh sách có ≥ 100 mục; **When** Learner cuộn nhanh; **Then** cuộn mượt (JS FPS ≥ 55 khi đo bằng Perf Monitor trên Android thật — NFR-03).
- **AC-07.3** — **Given** từ khóa không khớp khóa học nào; **When** kết quả trả về rỗng; **Then** hiển thị trạng thái trống "No courses found" kèm gợi ý các hot topics.
- **AC-07.4** — **Given** tải trang kế tiếp bị lỗi mạng; **When** lỗi xảy ra; **Then** phần danh sách đã có vẫn giữ nguyên và có nút thử lại tải trang tiếp.

#### US-08 — Duyệt khóa học theo danh mục hoặc "View more"

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem danh sách khóa học theo danh mục hoặc theo nhóm (Popular, Recommended, Course that inspires)** để **khám phá theo chủ đề tôi quan tâm**. |
| Ưu tiên | Must |
| Liên kết | FR-07 · UC-07 · SC-08 (từ SC-04, SC-05, SC-18) · BR-11, BR-12 · Persona P2 (IN-04) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-08.1** — **Given** Learner ở Home hoặc Search; **When** bấm danh mục "Design"; **Then** ứng dụng mở Course list (SC-08) với tiêu đề "Design" và chỉ chứa khóa thuộc danh mục Design.
- **AC-08.2** — **Given** Learner ở Home; **When** bấm "View more" của Popular courses; **Then** SC-08 mở với tiêu đề "Popular courses" và các khóa xếp theo số học viên đăng ký giảm dần (BR-11).
- **AC-08.3** — **Given** Learner bấm "View more" của Course that inspires; **When** SC-08 mở; **Then** chỉ hiển thị các khóa được đánh dấu nổi bật (BR-11).
- **AC-08.4** — **Given** Learner bấm "View more" của Recommended for you; **When** SC-08 mở; **Then** hiển thị các khóa theo quy tắc gợi ý (BR-12): thuộc danh mục đã ghi danh/lưu, loại khóa đã ghi danh, xếp theo điểm đánh giá.
- **AC-08.5** — **Given** SC-08 hiển thị danh sách dài; **When** Learner cuộn; **Then** danh sách tải thêm theo trang giống kết quả tìm kiếm và bookmark hoạt động trên từng card.

#### US-09 — Lọc và sắp xếp kết quả

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **lọc kết quả theo danh mục, giá, điểm đánh giá và sắp xếp theo nhiều tiêu chí** để **thu hẹp danh sách xuống các khóa phù hợp ngân sách và chất lượng mong muốn**. |
| Ưu tiên | Should |
| Liên kết | FR-06 · UC-06 · SC-07 · Persona P1, P2 (IN-03) |
| Test case mẫu | TC-SRCH-02 |

**Acceptance criteria**

- **AC-09.1** — **Given** Learner đang ở SC-06 và mở Filter (SC-07); **When** chọn Rating "≥ 4.5", Sort by "Price: low → high" rồi bấm "Apply"; **Then** kết quả chỉ gồm khóa có điểm đánh giá ≥ 4.5 và giá tăng dần.
- **AC-09.2** — **Given** Filter đang hiển thị; **When** Learner chọn Price = Free; **Then** kết quả chỉ chứa các khóa miễn phí; chọn Paid thì chỉ chứa khóa có phí; có thể nhập khoảng giá min–max.
- **AC-09.3** — **Given** Learner thay đổi các lựa chọn; **When** nhìn nút cuối màn hình; **Then** nút hiển thị "Apply (n results)" với n là số kết quả tương ứng.
- **AC-09.4** — **Given** đã áp dụng ít nhất một bộ lọc; **When** Learner trở lại SC-06; **Then** nút Filter hiển thị số bộ lọc đang bật.
- **AC-09.5** — **Given** có bộ lọc đang áp dụng; **When** Learner bấm "Reset"; **Then** mọi lựa chọn trở về mặc định và kết quả trở về không lọc.
- **AC-09.6** — **Given** Learner ở Filter (SC-07); **When** chọn đồng thời nhiều danh mục (ví dụ Design và Code) rồi bấm "Apply"; **Then** kết quả gồm các khóa thuộc một trong các danh mục đã chọn (yêu cầu gửi `categoryId` là danh sách id phân cách dấu phẩy).

### Nhóm C — Chi tiết khóa học

#### US-10 — Xem tổng quan khóa học

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem tổng quan khóa học gồm giảng viên, mô tả, quyền lợi và khóa tương tự** để **quyết định có nên mua hoặc học khóa này**. |
| Ưu tiên | Must |
| Liên kết | FR-08 · UC-08 · SC-09 · BR-10, BR-17, BR-18 · Persona P1, P2 (IN-08) |
| Test case mẫu | TC-CART-01 |

**Acceptance criteria**

- **AC-10.1** — **Given** Learner chọn một khóa từ danh sách; **When** Course Details (SC-09) mở ở tab OVERVIEW; **Then** hiển thị ảnh hero có nút ▶, tiêu đề đầy đủ, điểm đánh giá, số bài học, hàng giảng viên (avatar, tên, chức danh; nút Follow thuộc FR-20 — xem US-29), Description (4 dòng và "See more"), Benefits (không có dòng "Certificate" vì chứng chỉ là Won't — BR-18) và Similar courses (tối đa 3 khóa).
- **AC-10.2** — **Given** khóa học có giá gốc; **When** thanh dưới cùng hiển thị; **Then** thấy giá bán lớn (màu primary) cùng "{x}% Disc." và giá gốc gạch ngang; x luôn tính theo công thức BR-10 (không lấy số cố định từ ảnh design — BR-18).
- **AC-10.3** — **Given** Learner **chưa ghi danh**, khóa **có phí** và **chưa có trong giỏ**; **When** xem thanh dưới; **Then** nút là "Add to cart". Nếu khóa đã trong giỏ thì nút là "Go to cart"; nếu khóa giá 0 thì "Enroll for free"; nếu đã ghi danh thì "Continue learning" (BR-17).
- **AC-10.4** — **Given** Learner đang ở tab OVERVIEW; **When** chuyển sang LESSONS rồi quay lại OVERVIEW; **Then** ứng dụng không gọi lại API cho dữ liệu đã có (dùng bộ nhớ đệm).
- **AC-10.5** — **Given** Learner bấm "See more" ở phần Description; **When** nội dung mở rộng; **Then** toàn bộ mô tả hiển thị.

#### US-11 — Xem danh sách bài học theo trạng thái

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem cấu trúc chương và bài học cùng trạng thái từng bài** để **biết mình đã học đến đâu và bài nào cần ghi danh mới mở khóa**. |
| Ưu tiên | Must |
| Liên kết | FR-09 · UC-08 · SC-09 · BR-01, BR-02 · Persona P1, P2 (IN-12) |
| Test case mẫu | TC-CRS-01 |

**Acceptance criteria**

- **AC-11.1** — **Given** Learner mở tab LESSONS; **When** danh sách hiển thị; **Then** các chương hiển thị dạng accordion (mở/đóng) và mỗi bài hiển thị số thứ tự, tiêu đề và thời lượng dạng "01:23 mins".
- **AC-11.2** — **Given** Learner đã ghi danh; **When** xem danh sách bài; **Then** bài đã hoàn thành có dấu ✓, bài đang học (bài xem gần nhất, chưa hoàn thành) có nền primaryLight, viền primary và biểu tượng ▶, bài còn lại hiển thị ▷ (đã mở).
- **AC-11.3** — **Given** Learner **chưa ghi danh**; **When** xem danh sách bài; **Then** bài xem thử hiển thị ▷ (mở), các bài còn lại hiển thị biểu tượng khóa.
- **AC-11.4** — **Given** Learner chưa ghi danh; **When** bấm một bài có biểu tượng khóa; **Then** hiển thị toast "Enroll to unlock this lesson" và không phát video.

#### US-12 — Xem trước bài học miễn phí

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên chưa ghi danh**, tôi muốn **xem thử một số bài học miễn phí** để **đánh giá chất lượng giảng dạy trước khi trả tiền**. |
| Ưu tiên | Must |
| Liên kết | FR-09 · UC-09 · SC-09 · BR-01 · NFR-06 · Persona P1, P2 (IN-07) |
| Test case mẫu | TC-SEC-01 |

**Acceptance criteria**

- **AC-12.1** — **Given** khóa học có bài được đánh dấu xem thử (preview) và Learner chưa ghi danh; **When** Learner bấm nút ▶ trên ảnh hero; **Then** trình phát mở và phát bài xem thử đầu tiên.
- **AC-12.2** — **Given** Learner chưa ghi danh; **When** bấm vào một bài xem thử trong tab LESSONS; **Then** bài phát được mà không cần ghi danh.
- **AC-12.3** — **Given** Learner chưa ghi danh; **When** gọi trực tiếp API lấy bài học không phải bài xem thử; **Then** server trả 403 với mã `NOT_ENROLLED` và phản hồi không chứa `videoUrl`.
- **AC-12.4** — **Given** Learner chưa ghi danh đang xem bài xem thử; **When** thoát trình phát; **Then** tiến độ học không được ghi nhận (vì chưa ghi danh).

#### US-13 — Xem đánh giá khóa học

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem điểm đánh giá trung bình và các review của học viên trước** để **tin tưởng vào chất lượng khóa học**. |
| Ưu tiên | Must (xem) |
| Liên kết | FR-10 · UC-08 · SC-09 · Persona P1, P2, P3 (IN-05) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-13.1** — **Given** Learner mở tab REVIEW của Course Details; **When** dữ liệu tải xong; **Then** hiển thị điểm trung bình dạng "★ 4.5/5", tổng số review, liên kết "View all", hàng chip lọc All/5/4/3/2/1 và 3–5 review đầu tiên.
- **AC-13.2** — **Given** mỗi review hiển thị; **When** Learner quan sát; **Then** thấy avatar, tên người viết, thời gian tương đối (ví dụ "A day ago"), số sao và nội dung tối đa 3 dòng.
- **AC-13.3** — **Given** Learner bấm chip "4"; **When** danh sách cập nhật; **Then** chỉ hiển thị các review 4 sao.
- **AC-13.4** — **Given** khóa chưa có review nào; **When** tab REVIEW hiển thị; **Then** hiển thị trạng thái trống thân thiện thay vì màn trắng.

#### US-14 — Xem tất cả đánh giá, lọc theo sao

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem toàn bộ đánh giá với phân bố số sao và lọc theo sao** để **đọc cả những đánh giá tích cực lẫn tiêu cực trước khi mua**. |
| Ưu tiên | Should |
| Liên kết | FR-10 · UC-08 · SC-10 · Persona P2 (IN-05) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-14.1** — **Given** Learner bấm "View all" ở tab REVIEW; **When** SC-10 mở; **Then** hiển thị tóm tắt (điểm trung bình, tổng số review, phân bố từ 5 xuống 1 sao dạng thanh) và danh sách review.
- **AC-14.2** — **Given** danh sách review dài; **When** Learner cuộn xuống cuối; **Then** ứng dụng tải thêm review theo trang.
- **AC-14.3** — **Given** Learner chọn chip lọc "2"; **When** danh sách cập nhật; **Then** chỉ hiển thị review 2 sao và số lượng phù hợp phân bố hiển thị.
- **AC-14.4** — **Given** không có review nào khớp bộ lọc; **When** danh sách rỗng; **Then** hiển thị trạng thái trống.

#### US-15 — Viết / sửa đánh giá

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên đã ghi danh**, tôi muốn **viết hoặc sửa đánh giá 1–5 sao kèm nội dung cho khóa học** để **chia sẻ trải nghiệm và giúp người khác quyết định**. |
| Ưu tiên | Should |
| Liên kết | FR-11 · UC-15 · SC-09, SC-11 · BR-08 · Persona P2, P3 (IN-06) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-15.1** — **Given** Learner đã ghi danh khóa học và chưa từng đánh giá; **When** Learner bấm "Write a review" ở tab REVIEW, chọn 4 sao, nhập nội dung 10–1000 ký tự và bấm Submit; **Then** review được lưu, hiển thị toast thành công, đóng modal và review mới xuất hiện trong danh sách; điểm trung bình và số review của khóa được cập nhật.
- **AC-15.2** — **Given** Learner đã có review cho khóa này; **When** mở modal Write review; **Then** form được điền sẵn sao và nội dung cũ; sau khi lưu, review được cập nhật và tổng số review của khóa **không tăng** (mỗi người một review cho mỗi khóa).
- **AC-15.3** — **Given** Learner **chưa ghi danh**; **When** xem tab REVIEW; **Then** không có nút "Write a review"; nếu gọi trực tiếp API ghi review, server trả 403 `NOT_ENROLLED`.
- **AC-15.4** — **Given** nội dung ngắn hơn 10 ký tự hoặc dài hơn 1000 ký tự, hoặc chưa chọn số sao; **When** Learner bấm Submit; **Then** lỗi hiển thị dưới trường tương ứng và review không được gửi; bộ đếm ký tự hiển thị số ký tự đã nhập.

#### US-16 — Lưu / bỏ lưu khóa học

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **lưu (bookmark) khóa học ở mọi nơi tôi thấy** để **xem lại và quyết định mua hoặc học sau**. |
| Ưu tiên | Must |
| Liên kết | FR-12 · UC-10 · SC-04, SC-06, SC-08, SC-09, SC-18, SC-20 · BR-15 · Persona P1 (IN-11) |
| Test case mẫu | TC-OFF-01 (khi offline) |

**Acceptance criteria**

- **AC-16.1** — **Given** Learner thấy card khóa học chưa lưu; **When** bấm biểu tượng bookmark; **Then** biểu tượng chuyển sang trạng thái đã lưu ngay lập tức (optimistic) và trạng thái được đồng bộ ở mọi nơi khóa đó xuất hiện.
- **AC-16.2** — **Given** yêu cầu lưu thất bại (lỗi mạng hoặc server); **When** phản hồi lỗi trả về; **Then** biểu tượng trở về trạng thái cũ (rollback) và hiển thị toast báo lỗi.
- **AC-16.3** — **Given** Learner ở User profile (SC-20) xem danh sách Saved courses; **When** bấm bỏ lưu một khóa; **Then** khóa biến mất khỏi danh sách và toast "Removed — Undo" hiển thị; bấm Undo thì khóa được lưu lại.
- **AC-16.4** — **Given** thiết bị đang offline; **When** Learner bấm bookmark; **Then** thao tác bị chặn và hiển thị toast "You're offline".
- **AC-16.5** — **Given** khóa đã được lưu; **When** thao tác lưu được gửi lặp lại; **Then** kết quả không đổi và không sinh lỗi trùng (thao tác idempotent).

### Nhóm D — Mua và ghi danh

#### US-17 — Quản lý giỏ hàng

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **thêm nhiều khóa vào giỏ, xem tổng tiền và xóa bớt** để **mua nhiều khóa trong một lần thanh toán**. |
| Ưu tiên | Must |
| Liên kết | FR-13 · UC-11 · SC-09, SC-12 · BR-06, BR-17 · Persona P2 (IN-09) |
| Test case mẫu | TC-CART-01 |

**Acceptance criteria**

- **AC-17.1** — **Given** Learner ở Course Details của khóa có phí, chưa ghi danh, chưa trong giỏ; **When** bấm "Add to cart"; **Then** khóa được thêm vào giỏ, nút đổi thành "Go to cart" và huy hiệu giỏ hàng tăng thêm 1.
- **AC-17.2** — **Given** khóa đã có trong giỏ; **When** thao tác thêm được gửi lại; **Then** server trả 409 `ALREADY_IN_CART`; **Given** khóa đã ghi danh; **When** thêm vào giỏ; **Then** server trả 409 `ALREADY_ENROLLED`; **Given** khóa miễn phí; **When** thêm vào giỏ; **Then** server trả 422 `FREE_COURSE` (khóa miễn phí dùng ghi danh trực tiếp).
- **AC-17.3** — **Given** Learner mở giỏ hàng (SC-12) có các khóa; **When** màn hình hiển thị; **Then** mỗi mục có ảnh, tiêu đề, giảng viên, giá, nút xóa và có tổng tiền của cả giỏ.
- **AC-17.4** — **Given** Learner bấm xóa một khóa trong giỏ; **When** xác nhận; **Then** khóa bị xóa, tổng tiền cập nhật ngay.
- **AC-17.5** — **Given** giỏ rỗng; **When** SC-12 hiển thị; **Then** hiển thị trạng thái trống "Your cart is empty" cùng nút "Explore courses" và nút Checkout bị vô hiệu hóa.

#### US-18 — Thanh toán giả lập và ghi danh

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **thanh toán giỏ hàng bằng cổng thanh toán giả lập** để **được ghi danh vào các khóa và bắt đầu học ngay**. |
| Ưu tiên | Must |
| Liên kết | FR-14 · UC-12 · SC-12, SC-13 · BR-07 (gồm mô phỏng thất bại) · NFR-10 · Persona P1, P2 (IN-09, IN-10) |
| Test case mẫu | TC-PAY-01 |

**Acceptance criteria**

- **AC-18.1** — **Given** giỏ có ≥ 1 khóa và Learner ở Checkout (SC-13); **When** Learner chọn "Mock Card" hoặc "Mock E-wallet" và bấm "Pay $X"; **Then** nút hiển thị đang xử lý (khoảng 1,5 giây) rồi màn kết quả hiển thị "Payment successful".
- **AC-18.2** — **Given** thanh toán thành công; **When** Learner chọn "Go to My Courses"; **Then** giỏ hàng rỗng, mỗi khóa vừa mua xuất hiện ở My Courses với 0 %, và có một thông báo loại ORDER_PAID (TC-PAY-01).
- **AC-18.3** — **Given** thanh toán thành công; **When** Learner bấm "Start learning"; **Then** ứng dụng mở màn Learning (SC-15) của khóa đầu tiên trong đơn.
- **AC-18.4** — **Given** màn Checkout hiển thị; **When** Learner đọc ghi chú; **Then** thấy rõ dòng "Demo payment — no real card needed" và không có trường nhập số thẻ thật.
- **AC-18.5** — **Given** giỏ rỗng (ví dụ giỏ đã bị xóa từ thiết bị khác); **When** yêu cầu thanh toán được gửi; **Then** server trả 422 `CART_EMPTY` và không tạo đơn hàng.
- **AC-18.6** — **Given** thanh toán gặp lỗi giữa chừng; **When** giao dịch không hoàn tất; **Then** không có khóa nào được ghi danh một phần và giỏ hàng được giữ nguyên (giao dịch nguyên tử).
- **AC-18.7** — **Given** giỏ có ≥ 1 khóa và yêu cầu thanh toán được gửi kèm `simulateFailure: true` (chế độ demo/kiểm thử); **When** thanh toán giả lập được xử lý; **Then** server trả 402 `PAYMENT_FAILED`, đơn hàng được lưu ở trạng thái `FAILED`, giỏ hàng giữ nguyên, không có khóa nào được ghi danh, không có thông báo `ORDER_PAID`; ứng dụng ở lại Checkout, hiển thị thông báo thanh toán thất bại và cho phép thử lại.

#### US-19 — Ghi danh khóa miễn phí

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **ghi danh trực tiếp vào khóa miễn phí** để **học ngay mà không cần đi qua giỏ hàng và thanh toán**. |
| Ưu tiên | Must |
| Liên kết | FR-14 · UC-12 · SC-09 · BR-06, BR-17 · Persona P1 (IN-10) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-19.1** — **Given** khóa có giá 0 và Learner chưa ghi danh; **When** Learner bấm "Enroll for free"; **Then** Learner được ghi danh, nút đổi thành "Continue learning" và khóa xuất hiện trong My Courses với 0 %.
- **AC-19.2** — **Given** khóa có phí; **When** gọi trực tiếp API ghi danh miễn phí; **Then** server từ chối với mã lỗi `PAID_COURSE` (422).
- **AC-19.3** — **Given** Learner đã ghi danh khóa này; **When** gọi lại ghi danh; **Then** server trả 409 `ALREADY_ENROLLED` và không tạo bản ghi trùng.

### Nhóm E — Học tập

#### US-20 — Xem khóa học của tôi (My Courses)

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem các khóa đã ghi danh kèm phần trăm hoàn thành, lọc theo đang học/đã xong** để **tiếp tục học khóa mong muốn**. |
| Ưu tiên | Must |
| Liên kết | FR-15 · UC-13 · SC-14 · BR-04, BR-05 · Persona P1, P2 (IN-12) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-20.1** — **Given** Learner mở tab My Courses (SC-14); **When** màn hình hiển thị; **Then** thấy banner "Courses that boost your career!" cùng ba tab ALL, ON GOING, COMPLETED và mỗi khóa hiển thị ảnh, tiêu đề, tổng thời lượng (ví dụ "2 hrs 25 mins"), "{n}% Complete" và thanh tiến độ.
- **AC-20.2** — **Given** Learner có khóa ở 30 %, 70 %, 100 % và 50 %; **When** chọn tab ON GOING; **Then** chỉ hiển thị các khóa dưới 100 %; **When** chọn COMPLETED; **Then** chỉ hiển thị khóa đạt 100 %; tab ALL hiển thị tất cả, xếp theo lần học gần nhất (BR-05).
- **AC-20.3** — **Given** tab đang chọn không có khóa nào; **When** danh sách rỗng; **Then** hiển thị "You haven't started any course yet" cùng nút "Explore courses".
- **AC-20.4** — **Given** Learner vừa học xong một bài rồi quay lại My Courses; **When** tab này được focus lại; **Then** danh sách và phần trăm được làm mới.
- **AC-20.5** — **Given** Learner bấm một khóa; **When** điều hướng; **Then** ứng dụng mở màn Learning (SC-15) của khóa đó.

#### US-21 — Học qua video và tiếp tục đúng vị trí

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên đã ghi danh**, tôi muốn **phát video bài học và tiếp tục đúng vị trí đã xem dở** để **không phải tua lại khi quay lại học**. |
| Ưu tiên | Must |
| Liên kết | FR-16 · UC-14 · SC-15 · BR-01, BR-02 · NFR-06, NFR-10 · Persona P1, P2, P3 (IN-01) |
| Test case mẫu | TC-LRN-01, TC-SEC-01 |

**Acceptance criteria**

- **AC-21.1** — **Given** Learner đã ghi danh và mở màn Learning (SC-15); **When** màn hình tải xong; **Then** video của bài học gần nhất (hoặc bài đầu nếu chưa học) được nạp và hiển thị bộ điều khiển phát gốc, hỗ trợ toàn màn hình.
- **AC-21.2** — **Given** Learner xem bài 01 đến khoảng 0:20 rồi thoát ra; **When** vào lại bài 01; **Then** video bắt đầu ở khoảng 0:20 (TC-LRN-01).
- **AC-21.3** — **Given** video đang phát; **When** ứng dụng gửi vị trí xem; **Then** vị trí được lưu định kỳ mỗi 10 giây, khi tạm dừng, khi chuyển bài, khi rời màn hình và khi ứng dụng chuyển xuống nền.
- **AC-21.4** — **Given** Learner thoát ứng dụng đột ngột giữa chừng; **When** mở lại và vào bài đó; **Then** vị trí không bị mất quá khoảng chu kỳ lưu (10 giây).
- **AC-21.5** — **Given** Learner chọn bài khác trong tab LESSONS; **When** bấm bài; **Then** video đổi sang bài đó, bài đang phát được làm nổi bật.
- **AC-21.6** — **Given** Learner chưa ghi danh mở màn Learning (bằng liên kết trực tiếp); **When** server trả 403 `NOT_ENROLLED`; **Then** ứng dụng điều hướng về Course Details (SC-09) và hiển thị toast thông báo.
- **AC-21.7** — **Given** thiết bị mất mạng hoặc lưu tiến độ lên server thất bại trong khi Learner đang xem; **When** ứng dụng cần lưu vị trí xem hoặc trạng thái hoàn thành; **Then** thao tác không bị chặn (ngoại lệ của FR-24): dữ liệu được lưu tạm trên máy và tự đồng bộ lên server khi có mạng lại, để lần vào sau vẫn tiếp tục đúng vị trí.

#### US-22 — Tự đánh dấu hoàn thành bài và cập nhật % khóa

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **bài học tự được đánh dấu hoàn thành khi tôi xem gần hết và phần trăm khóa tự cập nhật** để **thấy tiến bộ mà không phải thao tác thủ công**. |
| Ưu tiên | Must |
| Liên kết | FR-16 · UC-14 · SC-15 · BR-03, BR-04 · Persona P1, P2 (IN-01, IN-12) |
| Test case mẫu | TC-LRN-02 |

**Acceptance criteria**

- **AC-22.1** — **Given** Learner đang xem một bài; **When** vị trí xem đạt ≥ 90 % thời lượng hoặc video phát hết; **Then** bài được đánh dấu hoàn thành (icon ✓) và phần trăm của khóa tăng đúng công thức làm tròn(số bài hoàn thành / tổng số bài × 100) (TC-LRN-02).
- **AC-22.2** — **Given** bài đã hoàn thành; **When** Learner xem lại bài từ đầu hoặc tua ngược; **Then** bài vẫn ở trạng thái hoàn thành (không bị bỏ hoàn thành).
- **AC-22.3** — **Given** khóa có 12 bài và Learner hoàn thành thêm bài thứ 4; **When** phần trăm được tính; **Then** hiển thị 33 % (làm tròn).
- **AC-22.4** — **Given** Learner hoàn thành bài cuối cùng của khóa; **When** phần trăm đạt 100 %; **Then** khóa được đánh dấu hoàn thành, xuất hiện ở tab COMPLETED và một thông báo COURSE_COMPLETED được tạo.
- **AC-22.5** — **Given** hoàn thành một bài; **When** Learner quay lại danh sách bài hoặc My Courses; **Then** biểu tượng và phần trăm đã cập nhật mà không cần tải lại thủ công.

### Nhóm F — Tương tác (Q&A và Project)

#### US-23 — Đặt câu hỏi (Q&A)

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên đã ghi danh**, tôi muốn **đặt câu hỏi ngay trong khóa học, có thể chèn emoji nhanh** để **được giải đáp khi gặp phần chưa hiểu**. |
| Ưu tiên | Should |
| Liên kết | FR-19 · UC-16 · SC-15 · BR-09 · NFR-06 · Persona P1, P2 (IN-13) |
| Test case mẫu | TC-QA-01 |

**Acceptance criteria**

- **AC-23.1** — **Given** Learner ở tab Q&A của SC-15; **When** màn hình tải xong; **Then** thấy danh sách câu hỏi mới nhất trước, mỗi câu gồm avatar, tên, thời gian tương đối, nội dung, số lượt thích và số bình luận; đáy màn hình có ô nhập "Write a Q&A..." và hàng emoji nhanh (🙌 😍 💖 👏 😱 😂 🔥).
- **AC-23.2** — **Given** Learner bấm một emoji nhanh và gõ nội dung; **When** bấm gửi; **Then** câu hỏi có kèm emoji xuất hiện đầu danh sách (TC-QA-01) và ô nhập được làm trống.
- **AC-23.3** — **Given** nội dung rỗng hoặc dài hơn 1000 ký tự; **When** Learner cố gửi; **Then** câu hỏi không được gửi và hiển thị thông báo lỗi tương ứng.
- **AC-23.4** — **Given** Learner chưa ghi danh; **When** gọi trực tiếp API xem danh sách câu hỏi hoặc API đăng câu hỏi; **Then** server trả 403 `NOT_ENROLLED` (cả đọc lẫn ghi đều yêu cầu đã ghi danh).
- **AC-23.5** — **Given** gửi câu hỏi thất bại do mạng; **When** lỗi trả về; **Then** nội dung đã gõ vẫn được giữ trong ô nhập và Learner có thể thử lại.

#### US-24 — Trả lời, thích câu hỏi và xem chi tiết câu hỏi

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên đã ghi danh**, tôi muốn **xem các câu trả lời, trả lời câu hỏi của người khác và thích câu hỏi hay** để **cùng học hỏi và giúp đỡ nhau**. |
| Ưu tiên | Should |
| Liên kết | FR-19 · UC-16 · SC-15, SC-16 · BR-09 · Persona P2 (IN-13) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-24.1** — **Given** Learner bấm "{n} Comment" trên một câu hỏi; **When** Question detail (SC-16) mở; **Then** câu hỏi hiển thị ở đầu, tiếp theo là danh sách trả lời (avatar, tên, thời gian, nội dung) và ô "Write a reply..." cố định dưới đáy.
- **AC-24.2** — **Given** Learner nhập trả lời 1–1000 ký tự; **When** bấm gửi; **Then** câu trả lời xuất hiện trong danh sách và số bình luận của câu hỏi tăng thêm 1.
- **AC-24.3** — **Given** người trả lời khác người đặt câu hỏi; **When** trả lời được gửi; **Then** người đặt câu hỏi nhận thông báo loại NEW_ANSWER.
- **AC-24.4** — **Given** Learner bấm biểu tượng tim trên một câu hỏi; **When** thao tác thực hiện; **Then** tim chuyển đỏ và số lượt thích thay đổi ngay (optimistic); bấm lần nữa thì bỏ thích; lỗi thì rollback.
- **AC-24.5** — **Given** câu hỏi không tồn tại; **When** Learner mở đường dẫn tới câu hỏi đó; **Then** hiển thị trạng thái lỗi/không tìm thấy có nút quay lại.
- **AC-24.6** — **Given** Learner chưa ghi danh; **When** gọi trực tiếp API xem chi tiết câu hỏi, danh sách trả lời hoặc thích/bỏ thích câu hỏi; **Then** server trả 403 `NOT_ENROLLED`.

#### US-25 — Xem mô tả project và tải tài liệu

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên đã ghi danh**, tôi muốn **xem mô tả project và tải các tài liệu đi kèm** để **làm bài tập đúng yêu cầu**. |
| Ưu tiên | Should |
| Liên kết | FR-18 · UC-17 · SC-15 · Persona P1, P2 (IN-14) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-25.1** — **Given** Learner mở tab PROJECTS của SC-15; **When** dữ liệu tải xong; **Then** thấy "Project Description" (rút gọn với "See more") và danh sách "Resources (n)" gồm biểu tượng theo loại file (.txt/.pdf), tên và dung lượng.
- **AC-25.2** — **Given** Learner bấm nút tải ⬇ của một tài liệu; **When** đang tải; **Then** hiển thị tiến trình/đang tải; **When** tải xong; **Then** tài liệu được mở bằng ứng dụng phù hợp trên thiết bị.
- **AC-25.3** — **Given** tải tài liệu thất bại (mất mạng hoặc lỗi lưu file); **When** lỗi xảy ra; **Then** hiển thị thông báo lỗi và cho phép thử lại.
- **AC-25.4** — **Given** khóa không có tài liệu hoặc mô tả project; **When** tab PROJECTS hiển thị; **Then** phần tương ứng hiển thị trạng thái trống thay vì màn trắng.
- **AC-25.5** — **Given** Learner chưa ghi danh; **When** gọi trực tiếp API xem mô tả project và tài liệu (`GET /courses/:id/project`); **Then** server trả 403 `NOT_ENROLLED`.

#### US-26 — Nộp project

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên đã ghi danh**, tôi muốn **nộp project của mình dưới dạng ảnh, pdf hoặc zip** để **hoàn thành bài tập và chia sẻ sản phẩm với cộng đồng**. |
| Ưu tiên | Should |
| Liên kết | FR-18 · UC-17 · SC-15, SC-17 · BR-09 · NFR-05, NFR-06 · Persona P2, P3 (IN-14) |
| Test case mẫu | TC-PRJ-01 |

**Acceptance criteria**

- **AC-26.1** — **Given** Learner ở tab PROJECTS; **When** bấm ô nét đứt "Upload your project here"; **Then** modal Submit project (SC-17) mở với trường Title (bắt buộc), Description (tùy chọn), chọn file và ảnh bìa tùy chọn.
- **AC-26.2** — **Given** Learner nhập Title, chọn một file png/jpg/pdf/zip ≤ 10 MB; **When** bấm Submit; **Then** ứng dụng hiển thị đang tải lên, sau đó đóng modal và project mới xuất hiện trong danh sách "Student Projects".
- **AC-26.3** — **Given** Learner chọn file 15 MB; **When** file được chọn; **Then** ứng dụng chặn ngay ở phía client và hiển thị "File must be ≤ 10 MB" (TC-PRJ-01).
- **AC-26.4** — **Given** file có định dạng không thuộc danh sách cho phép; **When** Learner gửi hoặc gọi trực tiếp API; **Then** server từ chối với mã `UNSUPPORTED_FILE_TYPE` (415).
- **AC-26.5** — **Given** thiếu Title hoặc chưa chọn file; **When** bấm Submit; **Then** lỗi hiển thị và project không được gửi.
- **AC-26.6** — **Given** Learner chưa ghi danh; **When** gọi trực tiếp API nộp project; **Then** server trả 403 `NOT_ENROLLED`.
- **AC-26.7** — **Given** một file lớn hơn 10 MB được gửi thẳng tới server (bỏ qua kiểm tra ở client); **When** server xử lý; **Then** server từ chối với mã `FILE_TOO_LARGE` (413) và không lưu file.

#### US-27 — Xem project của học viên khác

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên đã ghi danh**, tôi muốn **xem project mà các học viên khác đã nộp** để **học hỏi và so sánh với bài của mình**. |
| Ưu tiên | Should |
| Liên kết | FR-18 · UC-17 · SC-15 · Persona P2, P3 (IN-14) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-27.1** — **Given** khóa có 12 project đã nộp; **When** Learner mở tab PROJECTS; **Then** thấy tiêu đề "12 Student Projects" và danh sách ngang các card (ảnh, tiêu đề, tên tác giả).
- **AC-27.2** — **Given** khóa có nhiều hơn 10 project; **When** tab PROJECTS hiển thị; **Then** danh sách chỉ gồm tối đa 10 project mới nhất và **không có** nút "View more" (danh sách đầy đủ là Could).
- **AC-27.3** — **Given** khóa chưa có project nào; **When** tab PROJECTS hiển thị; **Then** phần Student Projects hiển thị trạng thái trống khích lệ nộp bài đầu tiên.
- **AC-27.4** — **Given** Learner vừa nộp project thành công; **When** quay lại danh sách; **Then** số lượng và danh sách project đã cập nhật.
- **AC-27.5** — **Given** Learner chưa ghi danh; **When** gọi trực tiếp API xem danh sách project của học viên (`GET /courses/:id/submissions`); **Then** server trả 403 `NOT_ENROLLED`.

### Nhóm G — Giảng viên

#### US-28 — Xem hồ sơ giảng viên

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem hồ sơ giảng viên gồm giới thiệu, các khóa học theo nhóm và đánh giá** để **biết người dạy có đủ uy tín và chuyên môn**. |
| Ưu tiên | Should |
| Liên kết | FR-20 · UC-18 · SC-18 · BR-16 · Persona P2 (IN-18) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-28.1** — **Given** Learner bấm vào giảng viên từ Home, Course Details hoặc danh sách; **When** Teacher profile (SC-18) mở; **Then** thấy ảnh bìa, avatar tròn, tên cùng nhãn "Teacher", chức danh và dòng địa điểm kèm giờ địa phương của giảng viên (ví dụ "New York - 09:30 AM").
- **AC-28.2** — **Given** Learner ở tab COURSES; **When** danh sách hiển thị; **Then** các khóa được nhóm theo danh mục (ví dụ "UI/UX Design"), nhóm có điểm trung bình ≥ 4.5 hiển thị nhãn "Top-rated" và có liên kết "View all".
- **AC-28.3** — **Given** Learner ở tab OVERVIEW; **When** dữ liệu tải xong; **Then** thấy phần giới thiệu (bio) và thống kê (số khóa, số học viên, điểm trung bình, số người theo dõi).
- **AC-28.4** — **Given** Learner ở tab REVIEW; **When** danh sách hiển thị; **Then** thấy các review tổng hợp từ các khóa của giảng viên, mỗi review có tên khóa.
- **AC-28.5** — **Given** giảng viên không tồn tại; **When** Learner mở hồ sơ; **Then** hiển thị trạng thái không tìm thấy có nút quay lại.

#### US-29 — Follow / Unfollow giảng viên

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **theo dõi (Follow) giảng viên tôi quan tâm** để **đánh dấu những giảng viên yêu thích**. |
| Ưu tiên | Should |
| Liên kết | FR-20 (nút Follow ở cả SC-09 và SC-18 thuộc FR-20) · UC-18 · SC-09, SC-18 · BR-14 · Persona P2 (IN-18) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-29.1** — **Given** Learner chưa theo dõi giảng viên; **When** bấm nút "Follow"; **Then** nút đổi thành "Following" ngay lập tức (optimistic) và số người theo dõi tăng thêm 1.
- **AC-29.2** — **Given** Learner đang theo dõi; **When** bấm "Following"; **Then** nút quay về "Follow" và số người theo dõi giảm 1.
- **AC-29.3** — **Given** Learner theo dõi ở Course Details; **When** mở hồ sơ giảng viên đó; **Then** trạng thái Following nhất quán ở cả hai màn hình.
- **AC-29.4** — **Given** Learner cố theo dõi chính mình (khi tài khoản là giảng viên); **When** thao tác được gửi; **Then** server từ chối với mã `CANNOT_FOLLOW_SELF` (422).
- **AC-29.5** — **Given** yêu cầu theo dõi thất bại; **When** lỗi trả về; **Then** nút trở về trạng thái cũ và hiển thị toast báo lỗi.

#### US-30 — Hồ sơ giảng viên phản ánh đúng chuyên môn và đánh giá

| Trường | Nội dung |
|---|---|
| **Story** | Là **giảng viên (Teacher)**, tôi muốn **hồ sơ của tôi hiển thị đúng chức danh, giới thiệu, thống kê, khóa học và đánh giá của học viên** để **học viên tin tưởng và quan tâm đến các khóa học của tôi**. |
| Ưu tiên | Should |
| Liên kết | FR-20 · UC-18 · SC-18 · BR-11, BR-14, BR-16 · Persona P3 (IN-19) |
| Test case mẫu | — |

> **Ghi chú phạm vi:** Teacher là actor phụ, dữ liệu do seed và không có giao diện riêng (PLAN §6.1, G6); story này được kiểm chứng qua nội dung hiển thị cho học viên.

**Acceptance criteria**

- **AC-30.1** — **Given** dữ liệu giảng viên đã có trong seed (chức danh, tổ chức, địa điểm, múi giờ, bio); **When** học viên mở hồ sơ; **Then** mọi thông tin hiển thị đúng với dữ liệu nguồn.
- **AC-30.2** — **Given** một học viên theo dõi giảng viên; **When** một học viên khác mở hồ sơ; **Then** số người theo dõi đã phản ánh lượt theo dõi mới.
- **AC-30.3** — **Given** giảng viên có các khóa với điểm đánh giá khác nhau; **When** hồ sơ hiển thị; **Then** điểm đánh giá trung bình của giảng viên là trung bình điểm của các khóa (dùng cho xếp hạng Top teachers — BR-11) và số liệu khớp với danh sách khóa.
- **AC-30.4** — **Given** giảng viên có khóa được nhiều học viên ghi danh; **When** hồ sơ hiển thị thống kê; **Then** số học viên khớp với dữ liệu ghi danh của các khóa thuộc giảng viên.

### Nhóm H — Hồ sơ cá nhân và thông báo

#### US-31 — Xem hồ sơ cá nhân, thống kê và khóa đã lưu

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem hồ sơ cá nhân với thống kê Save / On going / Completed và danh sách khóa đã lưu** để **theo dõi việc học và nhanh chóng quay lại các khóa quan tâm**. |
| Ưu tiên | Must |
| Liên kết | FR-21 · UC-19 · SC-20 · BR-05, BR-15 · Persona P1 (IN-11, IN-20) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-31.1** — **Given** Learner mở tab Profile (SC-20); **When** màn hình tải xong; **Then** thấy ảnh bìa, avatar, tên, headline và ba thống kê **Save**, **On Going**, **Completed** ngăn cách bởi đường kẻ dọc.
- **AC-31.2** — **Given** Learner có 4 khóa đã lưu, 2 khóa đang học và 1 khóa hoàn thành; **When** thống kê hiển thị; **Then** Save = 4, On Going = 2, Completed = 1 (BR-15).
- **AC-31.3** — **Given** Learner bấm thống kê On Going hoặc Completed; **When** điều hướng; **Then** ứng dụng mở My Courses ở tab tương ứng.
- **AC-31.4** — **Given** Learner ở danh sách "Saved courses"; **When** bấm một khóa; **Then** mở Course Details của khóa đó.
- **AC-31.5** — **Given** Learner chưa lưu khóa nào; **When** danh sách hiển thị; **Then** hiển thị trạng thái trống gợi ý khám phá khóa học.

#### US-32 — Chỉnh sửa hồ sơ và ảnh đại diện

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **sửa họ tên, headline và đổi ảnh đại diện** để **hồ sơ thể hiện đúng con người và mục tiêu học tập của tôi**. |
| Ưu tiên | Should |
| Liên kết | FR-22 · UC-19 · SC-21 · Persona P2 (IN-20) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-32.1** — **Given** Learner mở Edit profile (SC-21) từ menu ⋮ của SC-20; **When** màn hình hiển thị; **Then** thấy avatar, Full name, Headline điền sẵn và Email ở chế độ chỉ đọc.
- **AC-32.2** — **Given** Learner sửa Full name và Headline hợp lệ; **When** bấm Save; **Then** hiển thị toast thành công và thông tin mới xuất hiện ở SC-20 và lời chào ở Home.
- **AC-32.3** — **Given** Learner bấm avatar; **When** chọn ảnh png/jpg ≤ 5 MB từ thư viện và cắt vuông; **Then** ảnh được tải lên và avatar mới hiển thị.
- **AC-32.4** — **Given** ảnh vượt giới hạn dung lượng hoặc không đúng định dạng; **When** Learner chọn ảnh; **Then** hiển thị thông báo lỗi và avatar cũ được giữ nguyên.
- **AC-32.5** — **Given** Full name để trống; **When** bấm Save; **Then** lỗi hiển thị dưới trường và thay đổi không được gửi.

#### US-33 — Xem thông báo trong app

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem thông báo về thanh toán, câu trả lời và hoàn thành khóa ngay trong ứng dụng** để **không bỏ lỡ các sự kiện quan trọng**. |
| Ưu tiên | Should |
| Liên kết | FR-23 · UC-20 · SC-22, SC-04 · BR-04, BR-07, BR-09 · Persona P1, P2 (IN-13, IN-16) |
| Test case mẫu | TC-PAY-01 |

**Acceptance criteria**

- **AC-33.1** — **Given** Learner bấm biểu tượng chuông ở Home; **When** Notifications (SC-22) mở; **Then** thấy danh sách thông báo mới nhất trước, mỗi mục có biểu tượng theo loại (ORDER_PAID, NEW_ANSWER, COURSE_COMPLETED), tiêu đề, nội dung, thời gian tương đối và chấm nhận biết nếu chưa đọc.
- **AC-33.2** — **Given** Learner bấm một thông báo chưa đọc; **When** mở thông báo; **Then** thông báo được đánh dấu đã đọc, huy hiệu chuông giảm 1 và ứng dụng điều hướng đúng đích (khóa học hoặc câu hỏi tương ứng).
- **AC-33.3** — **Given** có nhiều thông báo chưa đọc; **When** Learner bấm "Mark all as read"; **Then** mọi thông báo chuyển đã đọc và huy hiệu chuông biến mất.
- **AC-33.4** — **Given** một trong các sự kiện xảy ra: thanh toán thành công, có người khác trả lời câu hỏi của Learner, Learner hoàn thành khóa; **When** Learner mở Notifications; **Then** có thông báo tương ứng (ORDER_PAID, NEW_ANSWER, COURSE_COMPLETED).
- **AC-33.5** — **Given** chưa có thông báo nào; **When** SC-22 hiển thị; **Then** hiển thị trạng thái trống.
- **AC-33.6** — **Given** Learner đang ở Home; **When** ứng dụng hiển thị biểu tượng chuông; **Then** huy hiệu lấy số thông báo chưa đọc từ `GET /notifications/unread-count` và được cập nhật sau khi Learner đọc thông báo hoặc có câu trả lời mới.

### Nhóm I — Hệ thống

#### US-34 — Xem lại dữ liệu khi mất mạng

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **vẫn xem được các dữ liệu đã tải khi mất mạng và được báo rõ tình trạng offline** để **tiếp tục sử dụng ứng dụng khi mạng chập chờn**. |
| Ưu tiên | Should |
| Liên kết | FR-24 · NFR-04 · Toàn app · Persona P1, P2, P3 (IN-15) |
| Test case mẫu | TC-OFF-01 |

**Acceptance criteria**

- **AC-34.1** — **Given** Learner đã dùng ứng dụng có mạng ít nhất một lần trong vòng 24 giờ; **When** tắt mạng rồi mở lại ứng dụng; **Then** Home và My Courses hiển thị dữ liệu đã lưu và có banner báo offline (TC-OFF-01).
- **AC-34.2** — **Given** thiết bị offline; **When** Learner mở chi tiết một khóa đã xem trước đó; **Then** chi tiết khóa hiển thị từ bộ nhớ đệm.
- **AC-34.3** — **Given** thiết bị offline; **When** Learner thực hiện thao tác ghi (bookmark, follow, thêm vào giỏ hàng, thanh toán, gửi review, đặt câu hỏi, trả lời, thích câu hỏi, nộp project); **Then** thao tác bị chặn và hiển thị toast "You're offline" (trừ lưu tiến độ xem video — xem AC-34.6).
- **AC-34.4** — **Given** thiết bị có mạng trở lại; **When** ứng dụng phát hiện kết nối; **Then** banner offline biến mất và dữ liệu được làm mới tự động.
- **AC-34.5** — **Given** thiết bị offline và chưa có dữ liệu lưu cho màn hình đang mở; **When** màn hình cố tải; **Then** hiển thị trạng thái lỗi có nút Retry thay vì màn trắng.
- **AC-34.6** — **Given** thiết bị offline và Learner đang xem một bài học đã tải được; **When** ứng dụng lưu vị trí xem hoặc trạng thái hoàn thành; **Then** dữ liệu được lưu tạm trên máy (không bị chặn bởi cơ chế chặn thao tác ghi) và tự đồng bộ lên server khi có mạng lại.

### Nhóm J — Could (chỉ làm nếu dư thời gian, PLAN §2.2)

#### US-35 — Thích / chia sẻ khóa học

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **thích và chia sẻ khóa học qua share sheet của hệ điều hành** để **bày tỏ sự yêu thích và giới thiệu khóa học cho bạn bè**. |
| Ưu tiên | Could |
| Liên kết | FR-17 · UC-21 · SC-15 · Persona P1 (IN-24) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-35.1** — **Given** Learner ở SC-15 chưa thích khóa học; **When** bấm biểu tượng tim; **Then** tim chuyển đỏ, số "{n} Like" tăng 1 ngay lập tức; bấm lại thì bỏ thích và giảm 1.
- **AC-35.2** — **Given** Learner bấm "Share"; **When** share sheet mở và Learner hoàn tất chia sẻ; **Then** số "{n} Share" tăng thêm 1.
- **AC-35.3** — **Given** thao tác thích thất bại; **When** lỗi trả về; **Then** trạng thái tim được rollback và hiển thị toast.

#### US-36 — Lưu lịch sử tìm kiếm gần đây

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **thấy các từ khóa tôi đã tìm gần đây** để **tìm lại nhanh mà không cần gõ lại**. |
| Ưu tiên | Could |
| Liên kết | Mở rộng FR-05 (chưa có FR riêng) · UC-05 · SC-05 · Persona P1 (IN-24) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-36.1** — **Given** Learner đã tìm các từ khóa trước đó; **When** mở SC-05 với ô tìm kiếm rỗng; **Then** thấy mục "Recent searches" liệt kê tối đa 10 từ khóa gần nhất, mới nhất trước.
- **AC-36.2** — **Given** danh sách Recent searches hiển thị; **When** Learner bấm một từ khóa; **Then** từ khóa được điền vào ô tìm kiếm và kết quả hiển thị.
- **AC-36.3** — **Given** lịch sử tìm kiếm được lưu cục bộ trên thiết bị; **When** Learner mở SC-05 khi thiết bị đang offline; **Then** mục "Recent searches" vẫn hiển thị vì không phụ thuộc server.

#### US-37 — Xem danh sách tất cả giảng viên

| Trường | Nội dung |
|---|---|
| **Story** | Là **học viên**, tôi muốn **xem danh sách tất cả giảng viên hàng đầu** để **khám phá giảng viên mới ngoài những người xuất hiện trên trang chủ**. |
| Ưu tiên | Could |
| Liên kết | Mở rộng FR-04, FR-20 (chưa có FR riêng) · UC-18 · SC-19 · BR-11 · Persona P2 (IN-24) |
| Test case mẫu | — |

**Acceptance criteria**

- **AC-37.1** — **Given** Learner ở Home; **When** bấm "View more" của Top teachers; **Then** Top teachers (SC-19) mở dạng lưới 2 cột các thẻ giảng viên (ảnh, tên, tổ chức, ★ điểm (số review)).
- **AC-37.2** — **Given** danh sách dài; **When** Learner cuộn xuống; **Then** ứng dụng tải thêm giảng viên theo trang.
- **AC-37.3** — **Given** Learner bấm một thẻ giảng viên; **When** điều hướng; **Then** mở Teacher profile (SC-18) của giảng viên đó.

## 4. Ma trận phủ phạm vi (PLAN §2.2)

### 4.1 Must (MVP)

| Hạng mục Must trong PLAN §2.2 | User story |
|---|---|
| Đăng ký, đăng nhập, duy trì phiên, đăng xuất | US-01, US-02, US-03, US-04 |
| Home: banner, categories, Popular, Recommended, Course that inspires, Top teachers | US-05 |
| Tìm kiếm theo từ khóa + hot topics, danh sách kết quả (phân trang cuộn vô hạn) | US-06, US-07 |
| Xem khóa học theo danh mục / "View more" | US-08 |
| Chi tiết khóa học: Overview, Lessons (trạng thái khóa/mở/hoàn thành), Review (xem) | US-10, US-11, US-12, US-13 |
| Bookmark (lưu) khóa học | US-16 |
| Giỏ hàng + thanh toán giả lập → ghi danh; ghi danh khóa miễn phí | US-17, US-18, US-19 |
| My Courses (All / On going / Completed) với % hoàn thành | US-20 |
| Học bài: phát video, chuyển bài, lưu và tiếp tục vị trí xem, tự đánh dấu hoàn thành, cập nhật % khóa học | US-21, US-22 |
| User profile: thống kê (Save / On going / Completed) + danh sách đã lưu | US-31 |

### 4.2 Should

| Hạng mục Should trong PLAN §2.2 | User story |
|---|---|
| Bộ lọc và sắp xếp kết quả tìm kiếm | US-09 |
| Viết/sửa đánh giá, xem tất cả đánh giá có lọc theo sao | US-15, US-14 |
| Q&A: đặt câu hỏi, trả lời, like; màn hình chi tiết câu hỏi | US-23, US-24 |
| Projects: mô tả project, tải tài liệu (resources), nộp project (upload), xem project học viên khác | US-25, US-26, US-27 |
| Teacher profile (Overview/Courses/Review) + Follow | US-28, US-29, US-30 |
| Chỉnh sửa hồ sơ + đổi avatar | US-32 |
| Thông báo trong app (danh sách, đã đọc, badge) | US-33 |
| Cache offline + banner "mất kết nối" | US-34 |

### 4.3 Could

| Hạng mục Could trong PLAN §2.2 | User story |
|---|---|
| Like/Share khóa học (native share sheet) | US-35 |
| Recent searches (lưu local) | US-36 |
| Danh sách tất cả giảng viên (Top teachers → View more) | US-37 |
| Tự động phát bài tiếp theo, tốc độ phát video | (chưa có story — mặc định không làm với nhóm 3 người) |
| E2E test bằng Maestro · Swagger UI cho API · Dark mode | (không phải yêu cầu người dùng cuối; xử lý ở kế hoạch kiểm thử/triển khai/cải tiến) |

### 4.4 Phủ FR

| FR | User story |
|---|---|
| FR-01 | US-01 |
| FR-02 | US-02, US-03 |
| FR-03 | US-04 |
| FR-04 | US-05 |
| FR-05 | US-06, US-07 |
| FR-06 | US-09 |
| FR-07 | US-08 |
| FR-08 | US-10 |
| FR-09 | US-11, US-12 |
| FR-10 | US-13, US-14 |
| FR-11 | US-15 |
| FR-12 | US-16 |
| FR-13 | US-17 |
| FR-14 | US-18, US-19 |
| FR-15 | US-20 |
| FR-16 | US-21, US-22 |
| FR-17 | US-35 |
| FR-18 | US-25, US-26, US-27 |
| FR-19 | US-23, US-24 |
| FR-20 | US-28, US-29, US-30 |
| FR-21 | US-31 |
| FR-22 | US-32 |
| FR-23 | US-33 |
| FR-24 | US-34 |

Cả 24 FR đều có ít nhất một user story.

## 5. Ngoài phạm vi (Won't)

Theo PLAN §2.2, các mong muốn sau **không** được viết thành story để hiện thực; chúng được ghi nhận làm đề xuất cải tiến (PLAN §16.3):

| Hạng mục Won't | Ghi chú |
|---|---|
| Thanh toán thật, hoàn tiền, coupon | Thanh toán giả lập (G5, ADR-10) |
| Web admin; giảng viên tạo khóa học trong app | Dữ liệu do seed (G6); không có giao diện cho Teacher |
| Tải video xem offline, livestream, chứng chỉ PDF | — |
| Push notification thật (expo-notifications), chat realtime | Chỉ có thông báo trong app (US-33) |
| Đa ngôn ngữ (i18n) | UI tiếng Anh (G8) |

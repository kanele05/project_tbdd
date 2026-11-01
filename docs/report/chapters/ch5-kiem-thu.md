# CHƯƠNG 5. KIỂM THỬ (TESTING)

Chương này trình bày giai đoạn **Kiểm thử** của SDLC: kế hoạch và chiến lược kiểm thử, tài nguyên sử dụng, bộ test case có minh chứng, kết quả kiểm thử đơn vị (unit), kiểm thử tích hợp (integration), kiểm thử giao diện – trợ năng – hiệu năng và tổng hợp kết quả, lỗi phát hiện. Số liệu trong chương lấy từ kết quả chạy thật ngày 24–26/10/2026 (`docs/04-testing/evidence/*/results.md`, `bugs.md`, `retest/results.md`) và từ lần chạy bộ test tự động ngày 26/10/2026; nhóm không đưa vào số liệu nào chưa đo.

## 5.1 Kế hoạch kiểm thử

### 5.1.1 Mục tiêu và phạm vi

- **Mục tiêu:** xác nhận sản phẩm đáp ứng các yêu cầu chức năng (FR-01…FR-54) và phi chức năng (NFR) đã nêu trong chương 2; tìm và sửa lỗi trước khi nộp; thu thập **minh chứng** (ảnh chụp, số liệu) cho báo cáo và slide.
- **Phạm vi kiểm thử:** ứng dụng Expo (điện thoại và web máy tính), máy chủ REST API Node.js/Express/Prisma, cơ sở dữ liệu PostgreSQL, tích hợp AI (Google Gemini), triển khai thật trên `eliuh.site`.
- **Ngoài phạm vi (ghi rõ để trung thực):** thiết bị Android/iOS thật (TalkBack, VoiceOver, chia sẻ hệ thống, tải tệp bằng `expo-file-system`), email thật và CAPTCHA thật (không được phép giải CAPTCHA tự động và không gửi email thật), kiểm thử tải (load test), kiểm thử bảo mật chuyên sâu (penetration test).

### 5.1.2 Chiến lược theo cấp độ

Kế hoạch ban đầu nằm ở PLAN.md §14.1. Bảng 5.1 so sánh **chỉ tiêu đề ra** với **thực tế đạt được**.

**Bảng 5.1 – Các cấp độ kiểm thử, công cụ và kết quả đạt được**

| Cấp độ | Phạm vi | Công cụ | Chỉ tiêu trong kế hoạch | Thực tế (26/10/2026) |
|---|---|---|---|---|
| Unit (server) | service, tiện ích (`lib`), provider AI, middleware | Jest | coverage service ≥ 70 % | 80 file test trong `server/src`; 28 file test service; coverage chỉ-unit của mọi service 100 % lines (đo 03/10) |
| Integration (server) | endpoint HTTP + PostgreSQL thật | Jest + Supertest | mỗi endpoint chính có happy path và ≥ 1 ca lỗi; ≥ 30 test | 40 file trong `server/tests/integration`; tổng server **120 suite / 1729 test** |
| Unit/Component (mobile) | utils, hooks, UI kit, form, màn hình | jest-expo + React Native Testing Library (mock tầng `api.ts`) | utils/hooks ≥ 60 %; ≥ 15 test | **287 suite / 2241 test**; coverage logic ≥ 97 % lines (đo 03/10) |
| System / thủ công có minh chứng | toàn bộ FR chính trên giao diện thật | Playwright + Microsoft Edge điều khiển bản web build | ≥ 50 test case; 100 % TC mức Must được chạy | **178 test case**, 405 ảnh minh chứng |
| Phi chức năng | hiệu năng, bảo mật cơ bản, trợ năng | `server/scripts/perf.ts`, test đo số request, kiểm tra header/TLS trên production | NFR-01…NFR-06 | Có số đo (mục 5.6) |
| UI audit | trợ năng, touch target, safe area, theming | rà soát theo skill `impeccable` (từ mã nguồn) | ≥ 8 màn chính, 0 lỗi P0 | 13 màn, **0 P0** (mục 5.6.1) |
| E2E Maestro | 3 luồng chính | Maestro | mức Could | **Không thực hiện** – nhóm quyết định bỏ (PLAN v2.27), thay bằng kiểm thử giao diện có minh chứng |
| UAT giả định | 2–3 người ngoài nhóm | khảo sát ngắn | ghi nhận góp ý | `[[CẦN NHÓM BỔ SUNG: kết quả UAT (nếu nhóm đã cho bạn bè dùng thử): số người, kịch bản, góp ý]]` |

### 5.1.3 Quy trình và thứ tự thực hiện

Nhóm làm theo thứ tự **code → kiểm thử → triển khai → tài liệu** (quyết định 02/10/2026). Ngày **24/10/2026** nhóm **đóng băng mã nguồn** (chỉ sửa lỗi) và bắt đầu đợt kiểm thử có minh chứng:

1. Dựng bản web build từ đúng commit đang chạy production (`4271a3c`) trên máy local, kết nối API và PostgreSQL local đã seed, để được thao tác ghi dữ liệu mà không ảnh hưởng production.
2. Viết kịch bản Playwright cho từng khu vực (xác thực, khám phá – mua hàng, học tập – AI, giảng viên – quản trị), chạy ở hai khung hình (điện thoại 390×844, máy tính 1440×900), hai ngôn ngữ (vi/en), hai giao diện (sáng/tối), tự chụp ảnh vào `docs/04-testing/evidence/<khu vực>/`.
3. Kiểm riêng phần công khai của production (HTTPS, header bảo mật, health, PWA, thời gian tải màn đăng nhập) – **không đăng nhập production** để tránh làm bẩn dữ liệu thật.
4. Ghi lỗi vào `bugs.md` theo mức độ; sửa lỗi theo lô; kiểm lại (retest) hai lần (25/10 và 26/10) và ghi `retest/results.md`.

### 5.1.4 Tiêu chí vào/ra

- **Tiêu chí vào:** mã nguồn đóng băng; mọi tính năng mức Must đã merge; bộ test tự động xanh trên CI; dữ liệu seed sẵn sàng.
- **Tiêu chí ra (PLAN §14.3):** 100 % test case Must đã chạy; tỉ lệ đạt ≥ 95 %; **không còn lỗi Critical/Major đang mở**; `typecheck`, `lint`, `prettier` sạch ở cả hai project. Mức đạt các tiêu chí này được đánh giá ở mục 5.7.4.

### 5.1.5 Phân loại mức độ lỗi

**Bảng 5.2 – Mức độ lỗi (PLAN §14.4, áp dụng nguyên văn)**

| Mức | Định nghĩa |
|---|---|
| Critical | Sập ứng dụng, mất dữ liệu, không đăng nhập/thanh toán/học được |
| Major | Chức năng chính sai và không có cách vòng |
| Minor | Sai lệch giao diện hoặc chức năng phụ, có cách vòng |
| Cosmetic (Trivial) | Chính tả, căn lề, chi tiết hiển thị nhỏ |

Vòng đời lỗi: Open → In progress → Fixed → Verified → Closed. Mẫu một bản ghi lỗi gồm: mã `BUG-<khu vực>-<số>`, mức độ, màn hình, các bước tái hiện, mong đợi, thực tế, ảnh minh chứng, test case liên quan.

### 5.1.6 Phân công

Phần kiểm thử tự động do các thành viên viết cùng với mã nguồn (mỗi module có test của mình). Đợt kiểm thử có minh chứng ngày 24–26/10 do trợ lý AI (Claude) thực hiện theo yêu cầu của trưởng nhóm sau khi đóng băng mã nguồn; các thành viên rà soát kết quả. `[[CẦN NHÓM BỔ SUNG: người chạy/duyệt từng khu vực nếu cần ghi rõ tên trong bản nộp]]`

## 5.2 Tài nguyên kiểm thử

### 5.2.1 Môi trường

**Bảng 5.3 – Các môi trường kiểm thử**

| Môi trường | Thành phần | Dùng cho |
|---|---|---|
| Test tự động (local) | PostgreSQL nhúng (embedded-postgres) cổng 5433, các database riêng có chữ `test` trong tên; `globalSetup` chạy `prisma migrate deploy` rồi TRUNCATE bảng dữ liệu, từ chối chạy nếu tên database không chứa `test`; `jest --runInBand` | Unit + integration server, test mobile |
| Test tự động (CI) | GitHub Actions, PostgreSQL 17 chạy bằng service container, Node 24, AI ở chế độ `mock` | Chạy lại toàn bộ test trước mỗi lần deploy |
| Kiểm thử có minh chứng (local) | Bản `expo export --platform web` trỏ tới API local (cổng 4000) và PostgreSQL local đã seed; Microsoft Edge điều khiển bằng Playwright; AI dùng Gemini thật (ít lượt gọi) | 166/178 test case |
| Production (chỉ phần công khai) | `https://eliuh.site`, `https://api.eliuh.site` trên AWS EC2 Sydney | 10 test case TC-PROD |

### 5.2.2 Công cụ

**Bảng 5.4 – Công cụ kiểm thử**

| Công cụ | Vai trò |
|---|---|
| Jest (server 30, ts-jest; mobile 29, jest-expo) | Chạy unit/integration cho server và mobile |
| Supertest | Gọi endpoint HTTP của Express trong test tích hợp |
| React Native Testing Library 14 | Render component, mô phỏng thao tác (hàm `render`, `fireEvent` bất đồng bộ) |
| Playwright + Microsoft Edge | Điều khiển trình duyệt, chụp ảnh minh chứng, đo thời gian tải |
| `server/scripts/perf.ts` | Đo p50/p95 của các endpoint và kích thước payload |
| ESLint 9, Prettier, `tsc --noEmit` | Kiểm tra tĩnh (typecheck, lint, định dạng) – chạy trong CI |
| Script kiểm tra tương phản màu (`check contrast` trong CI mobile) | Bảo đảm chữ đạt WCAG AA ≥ 4,5:1 ở cả giao diện sáng và tối |
| Prometheus/Grafana | Theo dõi độ trễ, tỷ lệ lỗi trên production (chương 6) |

### 5.2.3 Dữ liệu và tài khoản kiểm thử

- **Dữ liệu seed** (idempotent, `server/prisma/seed.ts`): 29 người dùng, 30 khóa học, 290 bài học, 257 đánh giá, 358 lượt ghi danh, 139 câu hỏi (đo ngày 03/10/2026). Production có thêm giảng viên và một tài khoản quản trị viên (nâng quyền bằng script `user:set-role`, mục 6.8).
- **Tài khoản:** học viên mẫu (chỉ xem), học viên được phép đổi mật khẩu/2FA/hồ sơ, giảng viên và quản trị viên cho khu vực Studio/Admin. Mật khẩu nằm trong tệp seed của dự án, không ghi trong báo cáo.
- **Quy tắc an toàn dữ liệu:** không tạo tài khoản mới qua giao diện (cần CAPTCHA và email thật); chỉ đăng nhập sai mật khẩu đúng một lần trong cả đợt (TC-AUTH-03) để không kích hoạt khóa tài khoản; mọi thay đổi (đổi mật khẩu, bật 2FA, sửa hồ sơ…) được khôi phục về giá trị gốc ngay sau khi kiểm (trừ ảnh đại diện thử nghiệm của một tài khoản, ghi chú trong `auth/results.md`).

### 5.2.4 Thiết bị và kích thước màn hình

| Khung hình | Kích thước | Ghi chú |
|---|---|---|
| Điện thoại | 390×844 | bố cục di động (< 768 px) |
| Máy tính | 1440×900 | bố cục desktop kiểu Netflix (≥ 1024 px) |

Mỗi kịch bản cố gắng phủ ma trận **ngôn ngữ {vi, en} × giao diện {sáng, tối} × khung hình {điện thoại, máy tính}**. Chưa có thiết bị Android/iOS thật trong đợt này (ghi ở mục 5.7.5).

## 5.3 Thiết kế và thực thi test case

### 5.3.1 Quy ước đặt mã và nguồn

- Mã test case: `TC-<KHU VỰC>-<số>`; khu vực gồm `AUTH` (xác thực & hồ sơ), `DISC` (khám phá – giỏ hàng – thanh toán), `LEARN` (học tập, Q&A, project, giảng viên, AI), `STU` (Studio của giảng viên), `ADM` (quản trị), `PROD` (kiểm tra công khai trên production).
- Mỗi test case ghi: chức năng (FR/UC), các bước, kết quả mong đợi, kết quả thực tế, trạng thái (**Đạt / Không đạt / Không kiểm được**) và tên ảnh minh chứng. Bản đầy đủ nằm ở `docs/04-testing/evidence/<khu vực>/results.md`.
- Mã test case trong kế hoạch ban đầu (PLAN §14.5, ví dụ `TC-AUTH-03` đăng nhập sai mật khẩu) được giữ lại khi trùng chức năng; các test case phát sinh do tính năng giai đoạn 2 (2FA, thiết bị, AI, Studio, Admin) được đánh số tiếp.
- Ảnh minh chứng đặt trong `docs/04-testing/evidence/<khu vực>/`, tên theo mẫu `<TC>-<mô tả>-<phone|desktop>-<vi|en>-<light|dark>.png`.

### 5.3.2 Tổng hợp theo khu vực

**Bảng 5.5 – Số test case theo khu vực và trạng thái**

| Khu vực | Phạm vi (UC) | Tổng | Đạt | Không đạt | Không kiểm được |
|---|---|---:|---:|---:|---:|
| `AUTH` Xác thực & hồ sơ | UC001–UC003, UC019–UC020, cài đặt, bảo mật | 34 | 30 | 0 | 4 |
| `DISC` Khám phá, giỏ hàng, thanh toán | UC004–UC013, UC021 | 45 | 41 | 3 | 1 |
| `LEARN` Học tập, Q&A, project, giảng viên, AI | UC014–UC018, FR-31…34 | 52 | 49 | 1 | 2 |
| `STU` + `ADM` Giảng viên & Quản trị | UC022–UC037 | 37 | 36 | 0 | 1 |
| `PROD` Production (phần công khai) | NFR bảo mật, sẵn sàng, PWA | 10 | 10 | 0 | 0 |
| **Cộng** | | **178** | **166** | **4** | **8** |

Tỉ lệ đạt: 166/178 = **93,3 %** trên tổng số; **97,6 %** (166/170) nếu chỉ tính các test case thực thi được. Cả 4 test case *Không đạt* đều gắn với lỗi đã sửa và kiểm lại *Đạt* (mục 5.7.3). Tám test case *Không kiểm được* không phải do sản phẩm sai mà do giới hạn môi trường (cần email thật, CAPTCHA, tài khoản khác, bản dev); từng trường hợp có integration test thay thế (mục 5.5.3).

### 5.3.3 Danh sách test case tiêu biểu

Bảng 5.6 trích **79 test case** đại diện cho mọi nhóm chức năng chính của hệ thống. Cột "Minh chứng" là tên tệp ảnh, nằm trong thư mục khu vực tương ứng (`auth/`, `discover/`, `learn/`, `studio/`, `production/`). Trạng thái: *Đ* = Đạt, *KĐ* = Không đạt, *KKT* = Không kiểm được.

**Bảng 5.6 – Danh sách test case tiêu biểu**

| ID | FR / UC | Nội dung kiểm | Kết quả mong đợi (tóm tắt) | KQ | Minh chứng |
|---|---|---|---|:-:|---|
| TC-AUTH-01 | FR-02, FR-35 / UC002 | Mở màn đăng nhập: phone vi/en, desktop | Form email + mật khẩu, liên kết quên mật khẩu/đăng ký, chữ đúng ngôn ngữ, không vỡ bố cục | Đ | TC-AUTH-01-login-phone-vi-light.png |
| TC-AUTH-02 | FR-02 / UC002 | Kiểm tra dữ liệu vào: để trống, email sai định dạng | Báo lỗi từng ô đúng ngôn ngữ, không gọi API | Đ | TC-AUTH-02-login-empty-validation-phone-vi-light.png |
| TC-AUTH-03 | FR-02 / UC002 | Đăng nhập sai mật khẩu 1 lần | Lỗi chung "Email hoặc mật khẩu không đúng.", vẫn ở màn Login, không lộ email có tồn tại | Đ | TC-AUTH-03-login-wrong-password-phone-vi-light.png |
| TC-AUTH-04 | FR-02 / UC002 | Đăng nhập đúng | Vào Home, lời chào theo tên, hiện tab bar | Đ | TC-AUTH-04-login-success-home-phone-vi-light.png |
| TC-AUTH-06 | FR-01 / UC001 | Đăng ký: kiểm tra dữ liệu | Lỗi riêng từng ô theo quy tắc (8–72 ký tự, có chữ và số, xác nhận khớp) | Đ | TC-AUTH-06-register-format-validation-phone-vi-light.png |
| TC-AUTH-07 | FR-01, FR-30 / UC001 | Đăng ký hợp lệ nhưng chưa tick CAPTCHA | Chặn gửi, báo cần xác minh, không có request tạo tài khoản | Đ | TC-AUTH-07-register-captcha-required-phone-vi-light.png |
| TC-AUTH-10 | FR-29 | Danh sách thiết bị đăng nhập | Thiết bị hiện tại có nhãn riêng; thiết bị khác có nút đăng xuất; desktop dạng bảng | Đ | TC-AUTH-10-security-sessions-phone-vi-light.png |
| TC-AUTH-11 | FR-29 | Đăng xuất thiết bị từ xa | Có hộp thoại xác nhận; token của phiên bị thu hồi trả 401 | Đ | TC-AUTH-11-session-revoked-phone-vi-light.png |
| TC-AUTH-13 | FR-27, FR-29 | Đổi mật khẩu thành công | Toast; các thiết bị khác bị đăng xuất; đăng nhập được bằng mật khẩu mới | Đ | TC-AUTH-13-change-password-success-phone-vi-light.png |
| TC-AUTH-14 | FR-28 | Thiết lập xác minh hai bước (TOTP) | Hiện mã QR, khóa nhập tay có nút sao chép, ô nhập 6 chữ số | Đ | TC-AUTH-14-two-factor-setup-phone-vi-light.png |
| TC-AUTH-16 | FR-28 | Bật 2FA bằng mã TOTP đúng | Hiện đúng một lần 10 mã khôi phục; trạng thái "Đang bật" | Đ | TC-AUTH-16-two-factor-recovery-codes-phone-vi-light.png |
| TC-AUTH-17 | FR-02, FR-28 | Đăng nhập khi đã bật 2FA | Sau mật khẩu chuyển màn xác minh; mã sai báo số lần còn lại; mã đúng vào Home | Đ | TC-AUTH-17-login-2fa-challenge-phone-vi-light.png |
| TC-AUTH-19 | FR-21 / UC019 | Xem hồ sơ cá nhân | Ảnh, tên, headline, thống kê Đã lưu/Đang học/Hoàn thành | Đ | TC-AUTH-19-profile-view-phone-vi-light.png |
| TC-AUTH-23 | FR-22 / UC019 | Sửa hồ sơ và tải ảnh đại diện | Toast, tên/headline/avatar mới hiện ở hồ sơ và thanh trên; server lưu đúng | Đ | TC-AUTH-23-profile-saved-phone-vi-light.png |
| TC-AUTH-24 | FR-23 / UC020 | Xem danh sách thông báo | Mới nhất trước, chưa đọc có chấm, dịch theo ngôn ngữ | Đ | TC-AUTH-24-notifications-list-phone-vi-light.png |
| TC-AUTH-26 | FR-35, FR-36 | Ma trận ngôn ngữ × giao diện (Home, Chi tiết, Cài đặt) | Chuỗi và số theo ngôn ngữ, màu theo theme, đọc rõ, không vỡ | Đ | TC-AUTH-26-matrix-home-phone-en-dark.png |
| TC-AUTH-28 | FR-35, FR-36 | Đổi ngôn ngữ/theme và ghi nhớ sau tải lại | Đổi ngay, lưu lại, áp dụng toàn app | Đ | TC-AUTH-28-settings-switch-3-after-reload-phone-en-dark.png |
| TC-AUTH-30 | FR-03 / UC003 | Đăng xuất | Hủy giữ phiên; xác nhận xóa token, thu hồi phiên, trang riêng tư về Login | Đ | TC-AUTH-30-logout-done-login-phone-vi-light.png |
| TC-AUTH-31 | FR-01, FR-25 | Đăng ký đầy đủ + OTP email | Tài khoản chưa xác minh, OTP đúng cấp token | KKT | (xem mục 5.5.3: `auth.test.ts`) |
| TC-AUTH-33 | FR-30 | CAPTCHA sau 3 lần sai, khóa 15 phút sau 5 lần sai | Lần 3 yêu cầu CAPTCHA, lần 5 khóa (423) | KKT | (xem mục 5.5.3: `authSecurity.test.ts`) |
| TC-DISC-01 | FR-04 / UC004 | Xem trang chủ (phone) | Đủ khối: banner, tiếp tục học, danh mục, phổ biến, gợi ý, giảng viên | Đ | TC-DISC-01-home-top-phone-vi-light.png |
| TC-DISC-04 | FR-05 / UC005 | Tìm kiếm theo tên khóa, giảng viên, tag | Số kết quả và danh sách khớp API `GET /courses?q=` | Đ | TC-DISC-04-search-results-python-phone-vi-light.png |
| TC-DISC-05 | FR-05 / UC005 | Tìm kiếm không có kết quả | Trạng thái rỗng kèm gợi ý chủ đề nổi bật, không lỗi | Đ | TC-DISC-05-search-empty-phone-vi-light.png |
| TC-DISC-07 | FR-06 / UC006 | Lọc và sắp xếp | Nút Áp dụng hiện số kết quả; danh sách đúng danh mục, rating, giá tăng dần | Đ | TC-DISC-07-filter-results-phone-vi-light.png |
| TC-DISC-08 | FR-05 / UC005 | Cuộn vô hạn | Trang đầu 20 khóa, cuộn tiếp tải thêm đến hết | Đ | TC-DISC-08-infinite-scroll-end-phone-vi-light.png |
| TC-DISC-10 | FR-07 / UC007 | Duyệt khóa theo danh mục | Danh sách đúng danh mục đã chọn | Đ | TC-DISC-10-category-code-phone-vi-light.png |
| TC-DISC-13 | FR-08 / UC008 | Chi tiết khóa học – tab Tổng quan | Hero, giảng viên, mô tả, ý học được, khóa tương tự | Đ | TC-DISC-13-detail-overview-hero-phone-vi-light.png |
| TC-DISC-14 | FR-09 / UC008 | Tab Nội dung: accordion chương, trạng thái bài | Bài xem thử ghi rõ, bài còn lại khóa khi chưa mua | Đ | TC-DISC-14-lessons-unowned-phone-vi-light.png |
| TC-DISC-16 | FR-10 / UC008 | Tab Đánh giá: điểm, lọc theo sao | Điểm trung bình, tổng số, lọc theo sao | Đ | TC-DISC-16-reviews-filter-4-star-phone-vi-light.png |
| TC-DISC-19 | FR-09 / UC009 | Xem trước bài miễn phí khi chưa mua | Trình phát preview mở được, đóng được, API bài preview trả 200 | Đ | TC-DISC-19-preview-player-after-play-phone-vi-light.png |
| TC-DISC-23 | FR-12 / UC010 | Lưu / bỏ lưu khóa học | Đổi ngay (optimistic) và bền vững sau reload; hiện trong Hồ sơ | Đ | TC-DISC-23-bookmark-in-profile-saved-phone-vi-light.png |
| TC-DISC-25 | FR-17 / UC021 | Thích / bỏ thích khóa học | Nút đổi, `likeCount` ±1, bền vững sau reload | Đ | TC-DISC-25-like-liked-phone-vi-light.png |
| TC-DISC-26 | FR-17 / UC021 | Chia sẻ khóa học (đếm lượt) | Sau chia sẻ thành công, `shareCount` tăng 1 | KĐ | TC-DISC-26-share-phone-vi-light.png |
| TC-DISC-30 | FR-13 / UC011 | Thêm 2 khóa vào giỏ | Thêm được, badge số lượng giỏ ở Trang chủ | Đ | TC-DISC-30-add-to-cart-second-phone-vi-light.png |
| TC-DISC-33 | FR-13 / UC011 | Thêm khóa đã trong giỏ/đã sở hữu | API 409 `ALREADY_IN_CART`/`ALREADY_ENROLLED`; nút đổi thành "Đến giỏ hàng"/"Tiếp tục học" | Đ | TC-DISC-33-duplicate-detail-button-phone-vi-light.png |
| TC-DISC-36 | FR-14 / UC012 | Thanh toán giả lập thất bại | 402 `PAYMENT_FAILED`, giỏ giữ nguyên, không ghi danh | Đ | TC-DISC-36-cart-kept-after-failed-payment-phone-vi-light.png |
| TC-DISC-37 | FR-14 / UC012 | Thanh toán giả lập thành công | Order PAID, ghi danh, xóa giỏ, màn thành công | Đ | TC-DISC-37-payment-success-phone-vi-light.png |
| TC-DISC-38 | FR-15 / UC013 | Khóa vừa mua hiện trong "Khóa của tôi" | Có khóa mới với 0 % | Đ | TC-DISC-38-my-courses-after-purchase-phone-vi-light.png |
| TC-DISC-41 | FR-14 / UC012 | Thẻ "Thanh toán thành công" trên desktop | Thẻ nằm dưới thanh điều hướng, đủ biểu tượng và nút | KĐ | TC-DISC-41-success-card-layout-desktop-vi-dark.png |
| TC-DISC-42 | FR-14 / UC012 | Ghi danh trực tiếp khóa miễn phí | Ghi danh ngay, không qua giỏ | Đ | TC-DISC-42-free-course-after-enroll-phone-vi-light.png |
| TC-DISC-43 | FR-15 / UC013 | Khóa của tôi: tab Tất cả/Đang học/Hoàn thành | Lọc đúng, hiện % hoàn thành | Đ | TC-DISC-43-my-courses-ongoing-phone-vi-light.png |
| TC-DISC-45 | FR-14 / UC012 | Màn "Thanh toán thất bại" trên giao diện | Hiện màn thất bại với nút thử lại | KKT | (công tắc mô phỏng chỉ có ở bản dev; nghiệp vụ đã kiểm ở TC-DISC-36) |
| TC-LEARN-01 | FR-16 / UC014 | Mở màn Học, phát video | Video bài hiện tại, 3 tab Bài học/Dự án/Hỏi đáp | Đ | TC-LEARN-01-lesson-video-phone-vi-light.png |
| TC-LEARN-04 | FR-16, FR-15 | Hoàn thành bài ≥ 90 % | `PUT progress isCompleted=true`, dấu ✓, tự sang bài kế, % khóa tăng | Đ | TC-LEARN-04-completed-advance-phone-vi-light.png |
| TC-LEARN-05 | FR-16 | Lưu vị trí xem và tiếp tục | Mở lại vào đúng bài và đúng vị trí | Đ | (xem learn/results.md) |
| TC-LEARN-09 | BR-01, FR-16 | Người chưa ghi danh vào bài khóa phí | API 403 `NOT_ENROLLED`, app quay về trang khóa | Đ | TC-LEARN-09-not-enrolled-guard-phone-vi-light.png |
| TC-LEARN-12 | FR-11, BR-08 | Kiểm tra dữ liệu đánh giá | Lỗi dưới từng trường, không gửi server | Đ | (xem learn/results.md) |
| TC-LEARN-13 | FR-11 / UC015 | Gửi đánh giá thành công | Lưu, toast, đóng form | Đ | TC-LEARN-13-review-saved-toast-phone-vi-light.png |
| TC-LEARN-17 | FR-19 / UC016 | Đặt câu hỏi, chèn emoji nhanh | Câu hỏi hiện đầu danh sách | Đ | (xem learn/results.md) |
| TC-LEARN-25 | FR-18, BR-20 | Kiểm tra loại và dung lượng tệp | Từ chối tệp sai loại và > 10 MB | Đ | (xem learn/results.md) |
| TC-LEARN-26 | FR-18 / UC017 | Nộp project PDF (phone), ZIP (desktop) | Tải lên thành công, quay về tab Dự án | Đ | TC-LEARN-26-submit-filled-phone-vi-light.png |
| TC-LEARN-22 | FR-18 | Tải tài liệu dự án | Tệp được tải về | KĐ | TC-LEARN-22b-resource-download-phone-vi-light.png |
| TC-LEARN-29 | FR-20 / UC018 | Theo dõi giảng viên | Nút đổi "Đang theo dõi", số người theo dõi tăng | Đ | TC-LEARN-29-teacher-followed-phone-vi-light.png |
| TC-LEARN-36 | FR-31 | Tóm tắt bài học bằng AI | Tóm tắt + ý chính theo ngôn ngữ đang chọn, nhãn "Tạo bởi AI" | Đ | TC-LEARN-36-ai-summary-result-phone-vi-light.png |
| TC-LEARN-38 | FR-32 | AI Tutor trả lời dạng SSE | Chỉ báo "đang viết", câu trả lời hiện dần | Đ | TC-LEARN-38-ai-tutor-q1-streaming-phone-vi-light.png |
| TC-LEARN-41 | FR-33 | AI Quiz 5 câu × 4 đáp án | 5 câu, mỗi câu 4 đáp án A–D, thanh tiến độ | Đ | TC-LEARN-41-ai-quiz-question-phone-vi-light.png |
| TC-LEARN-49 | FR-32, FR-33 | AI chỉ cho người đã ghi danh | API 403 `NOT_ENROLLED` | Đ | (xem learn/results.md) |
| TC-LEARN-52 | FR-18 | Hiển thị điểm và nhận xét của giảng viên | Thẻ bài nộp hiện "Đã chấm", điểm, nhận xét | KKT | (thiếu dữ liệu seed; phần chấm điểm đã kiểm bằng TC-STU-17) |
| TC-STU-02 | FR-39 / UC022 | Wizard soạn khóa, bước Ý tưởng | Hiện wizard 5 bước | Đ | TC-STU-02-wizard-idea-step-phone-vi-light.png |
| TC-STU-05 | FR-44 / UC026 | AI soạn khóa: gợi ý nội dung và danh mục | Gợi ý danh mục, phụ đề, mô tả, dàn ý; chưa áp dụng thì chưa lưu | Đ | TC-STU-05-ai-draft-result-phone-vi-light.png |
| TC-STU-11 | UC026, UC023 | Áp dụng dàn ý AI vào chương trình | Tạo 4 chương thật; bài đề xuất kèm nút Thêm | Đ | TC-STU-11-ai-draft-outline-phone-vi-light.png |
| TC-STU-14 | FR-41, BR-19 / UC024 | Gửi duyệt khóa học | Trạng thái "Chờ duyệt", ghi lịch sử, có nút rút lại | Đ | TC-STU-14-after-submit-status-page-desktop-vi-dark.png |
| TC-STU-15 | FR-42, BR-21 / UC025 | Bản sửa đổi khóa đã xuất bản | Học viên vẫn thấy bản cũ; bản sửa chờ duyệt có chip riêng | Đ | TC-STU-15-revision-submitted-pending-desktop-vi-dark.png |
| TC-STU-17 | FR-46, BR-26 / UC028 | Chấm điểm project | Điểm ngoài 0–100 bị chặn; chấm lại ghi đè | Đ | TC-STU-17-grade-sheet-phone-vi-light.png |
| TC-STU-18 | FR-47, BR-24 / UC029 | Trả lời Q&A với huy hiệu Giảng viên và ghim | Huy hiệu hiển thị; ghim 1 câu/câu hỏi | Đ | (xem studio/results.md) |
| TC-STU-23 | BR-23 | Giảng viên không mua khóa của chính mình | 422 `OWN_COURSE` | Đ | (xem studio/results.md) |
| TC-ADM-01 | FR-53 / UC035 | Dashboard quản trị | Số liệu tổng quan | Đ | TC-ADM-01-admin-dashboard-desktop-vi-dark.png |
| TC-ADM-02 | FR-50 / UC032 | Hàng chờ duyệt | Bảng khóa chờ, tab Bản sửa đổi, chip lọc | Đ | TC-ADM-02-review-queue-desktop-vi-dark.png |
| TC-ADM-04 | FR-51, BR-29 / UC033 | AI kiểm duyệt sơ bộ | Hiện nhận định, vấn đề, model; chỉ tham khảo, không chặn duyệt | Đ | TC-ADM-04-ai-moderation-panel-desktop-vi-dark.png |
| TC-ADM-05 | FR-50 / UC032 | Từ chối khóa kèm lý do | Lý do < 5 ký tự bị chặn; từ chối chuyển REJECTED | Đ | TC-ADM-05-reject-reason-modal-desktop-vi-dark.png |
| TC-ADM-08 | BR-19 / UC032 | Duyệt khóa và xuất bản | PUBLISHED, giảng viên nhận thông báo, khóa hiện trong tìm kiếm | Đ | TC-ADM-08-approved-course-in-public-search-desktop-vi-dark.png |
| TC-ADM-09 | FR-42 / UC032 | Duyệt bản sửa đổi (so sánh cũ/mới) | So sánh Trước/Sau; duyệt xong áp dụng nội dung mới | Đ | TC-ADM-09-revision-diff-top-desktop-vi-dark.png |
| TC-ADM-12 | FR-52, BR-28 / UC034 | Khóa và mở khóa tài khoản | Hiện "Bị khóa" kèm lý do; mở khóa trở lại bình thường | Đ | TC-ADM-12-admin-user-locked-status-desktop-vi-dark.png |
| TC-ADM-14 | BR-28 | Admin không khóa được admin | 422 `CANNOT_DISABLE_ADMIN` | Đ | (xem studio/results.md) |
| TC-PROD-02 | NFR bảo mật | Chứng chỉ HTTPS `eliuh.site` | Chứng chỉ Let's Encrypt hợp lệ | Đ | (số liệu trong production/results.md) |
| TC-PROD-04 | NFR bảo mật | Header bảo mật của API | Có HSTS, `nosniff`, CSP, Referrer-Policy | Đ | (số liệu trong production/results.md) |
| TC-PROD-05 | NFR bảo mật | HTTP chuyển sang HTTPS | 308 sang `https://eliuh.site/` | Đ | (số liệu trong production/results.md) |
| TC-PROD-07 | NFR bảo mật | `GET /auth/me` không token | 401, JSON `{error:{code,message}}`, không lộ stack | Đ | (số liệu trong production/results.md) |
| TC-PROD-10 | FR-02 | Mở production chưa đăng nhập | Chuyển tới `/login`, hiển thị form | Đ | TC-PROD-10-login-phone.png |

*Ghi chú:* các test case ở kế hoạch ban đầu (PLAN §14.5) về offline (TC-OFF-01), tải tệp lớn (TC-PRJ-01) và truy cập trái phép (TC-SEC-01) được phủ bởi test tự động (mục 5.4–5.5) cùng TC-LEARN-25 và TC-LEARN-09. Riêng kiểm thử offline trên thiết bị thật: `[[CẦN NHÓM BỔ SUNG: nếu nhóm đã thử tắt mạng trên điện thoại thật, ghi kết quả, thiết bị và ngày]]`.

### 5.3.4 Hình minh họa kết quả

![Hình 5.1 – Màn đăng nhập trên điện thoại, tiếng Việt, giao diện sáng (TC-AUTH-01)](../../04-testing/evidence/auth/TC-AUTH-01-login-phone-vi-light.png)

![Hình 5.2 – Thiết lập xác minh hai bước với mã QR và khóa nhập tay (TC-AUTH-14)](../../04-testing/evidence/auth/TC-AUTH-14-two-factor-setup-phone-vi-light.png)

![Hình 5.3 – Tìm kiếm có lọc và sắp xếp trên máy tính, giao diện tối (TC-DISC-09)](../../04-testing/evidence/discover/TC-DISC-09-search-filtered-sorted-desktop-vi-dark.png)

![Hình 5.4 – Thanh toán giả lập thành công trên điện thoại (TC-DISC-37)](../../04-testing/evidence/discover/TC-DISC-37-payment-success-phone-vi-light.png)

![Hình 5.5 – Tóm tắt bài học bằng AI trên máy tính (TC-LEARN-36)](../../04-testing/evidence/learn/TC-LEARN-36-ai-summary-result-desktop-vi-dark.png)

![Hình 5.6 – Hàng chờ duyệt khóa học của quản trị viên (TC-ADM-02)](../../04-testing/evidence/studio/TC-ADM-02-review-queue-desktop-vi-dark.png)

## 5.4 Kiểm thử đơn vị (Unit test)

### 5.4.1 Phạm vi và cách viết

- **Server (`server/src/**`):** 80 file test đặt cạnh mã nguồn, gồm 28 file test cho các `*.service.ts` (mỗi service nghiệp vụ có test riêng, đúng quy ước CLAUDE.md §9), 29 file cho `lib/` (JWT, mã hóa TOTP, YouTube URL, phân trang, cache…), 10 file cho module AI, 7 file cho xác thực, còn lại cho `middlewares`, `notification`, `course`, `teaching`, `studio`… (phần `lib/` có cả test của provider Gemini/mock). Bộ unit chạy riêng được bằng `npm run test:unit` và **không cần database**.
- **Mobile (`mobile/src/**`):** 287 file test: UI kit (`components/ui`, 31 file), layout (9 file), và từng feature (xác thực 26, Studio 21, AI 16, khóa học 15, học tập 14, giảng viên 10, quản trị 10, tìm kiếm 9, đánh giá 9, thông báo 9…). Tầng `api.ts` được mock; component được render bằng React Native Testing Library, kiểm cả bốn trạng thái loading – lỗi (có nút thử lại) – rỗng – thành công.
- **Tên test mô tả hành vi**, ví dụ (trích từ mã nguồn): `rejects the course teacher with 422 OWN_COURSE (BR-23)`, `maps a unique-key race (P2002) to 409 ALREADY_IN_CART`, `sums the current price of every item`, `returns an empty cart with total 0`.

### 5.4.2 Kết quả chạy ngày 26/10/2026

**Bảng 5.7 – Kết quả bộ test tự động**

| Dự án | Số suite | Số test | Kết quả | Kiểm tra tĩnh |
|---|---:|---:|---|---|
| Server (Jest, PostgreSQL thật) | 120 | 1729 | Đạt toàn bộ | `tsc --noEmit`, ESLint, Prettier sạch |
| Mobile (Jest + RNTL) | 287 | 2241 | Đạt toàn bộ | `tsc --noEmit`, ESLint, Prettier, kiểm tra tương phản màu sạch |
| **Cộng** | **407** | **3970** | | |

Bộ test này chạy lại trên **GitHub Actions** (`ci.yml`) ở mọi pull request vào `develop`/`main` và là điều kiện bắt buộc trước khi `deploy.yml` build và đẩy image (chương 6): test đỏ thì không triển khai.

### 5.4.3 Độ phủ (coverage)

Lần đo coverage cuối cùng của nhóm là ngày 03/10/2026 (khi code Sprint 1–3 hoàn tất); số test về sau tăng thêm nên độ phủ thực tế không thấp hơn nhiều, nhưng nhóm **không đo lại** sau ngày này.

**Bảng 5.8 – Độ phủ đo ngày 03/10/2026**

| Chỉ số | Kết quả | Chỉ tiêu | Đánh giá |
|---|---|---|---|
| Server – tổng (unit + integration), lines | 98,55 % (branches 90,30 %) | – | Đạt |
| Server – chỉ unit, mọi `*.service.ts`, lines | 100 % (cả 28 service) | ≥ 70 % | Đạt, vượt |
| Mobile – utils, lib, stores, hooks, `api/hooks/cache` của feature, lines | 98,24 % | ≥ 60 % (mục tiêu 70 %) | Đạt, vượt |
| Mobile – toàn bộ `src/` (gồm màn hình), lines | 94,38 % (branches 82,89 %) | – | Đạt |

Phần còn thiếu của server tập trung ở cấu hình khởi động (`lib/logger.ts`, `lib/prisma.ts`, `config/env.ts`), không phải logic nghiệp vụ.

## 5.5 Kiểm thử tích hợp (Integration test)

### 5.5.1 Cách thực hiện

- Mỗi file trong `server/tests/integration/` khởi tạo ứng dụng Express thật (`app.ts`, không `listen`) và gọi endpoint bằng **Supertest** trên **PostgreSQL thật** (không mock database).
- `tests/globalSetup.ts` chạy `prisma migrate deploy` và TRUNCATE mọi bảng dữ liệu (giữ `_prisma_migrations`), **từ chối chạy nếu tên database không chứa "test"**; mỗi file test tự dựng dữ liệu bằng factory, chạy tuần tự (`--runInBand`) để không hai suite dùng chung database cùng lúc.
- Mỗi endpoint chính có ít nhất một ca đúng (happy path) và một ca lỗi (401/403/404/409/422…), kiểm cả mã lỗi trong thân phản hồi `{ error: { code, message } }`.

### 5.5.2 Các nhóm test tích hợp

**Bảng 5.9 – Nhóm test tích hợp theo module (40 file)**

| Nhóm | File | Nội dung chính |
|---|---|---|
| Xác thực & bảo mật | `auth`, `authPassword`, `authSecurity`, `authSession`, `authTwoFactor` | Đăng ký + OTP email, quên/đặt lại mật khẩu, CAPTCHA và khóa tài khoản, refresh token xoay vòng và phát hiện dùng lại, phiên/thiết bị, TOTP và mã khôi phục |
| Người dùng & thông báo | `me`, `notification`, `notificationBackfill` | Hồ sơ, đổi mật khẩu, thông báo và đếm chưa đọc, backfill khóa dịch |
| Danh mục & khóa học | `catalog`, `course`, `home`, `bookmark`, `like`, `lesson`, `lessonVideoReplace` | Danh sách/lọc/tìm kiếm, chi tiết, trang chủ gộp một request, lưu/thích, quyền xem bài học (403 `NOT_ENROLLED`), script thay video |
| Mua hàng | `cart`, `order`, `enrollment` | Giỏ hàng (409 trùng, 422 khóa của chính mình), thanh toán giả lập thành công/thất bại 402, ghi danh |
| Tương tác học tập | `review`, `question`, `project`, `teacher` | Đánh giá, hỏi đáp, nộp project (giới hạn loại/dung lượng tệp), theo dõi giảng viên |
| Giảng viên & Quản trị | `studio`, `studioWorkflow`, `studioLegacyContent`, `teaching`, `teachingNewCourse`, `teacherAdminFoundation`, `adminCourses`, `adminRevision`, `adminUsers` | Vòng đời khóa (`CourseStatus`), gửi duyệt/từ chối/duyệt, bản sửa đổi, chấm điểm, ghim Q&A, khóa tài khoản, thông báo `NEW_COURSE` |
| AI | `ai`, `courseAi` | Tóm tắt, quiz, tutor (SSE), gợi ý, soạn khóa, kiểm duyệt sơ bộ; giới hạn lượt dùng; cache `AiContent` |
| Hạ tầng | `health`, `metrics`, `seed`, `denormalize`, `helpers`, `coursePreviewUpdate`, `externalCoursePreviews` | `/health`, `/metrics` Prometheus, seed idempotent, cập nhật các cột phi chuẩn hóa, xem thử YouTube |

### 5.5.3 Phủ các test case không kiểm được trên giao diện

Tám test case *Không kiểm được* ở Bảng 5.5 đều có bằng chứng kiểm thử thay thế:

**Bảng 5.10 – Test case không kiểm được trên giao diện và phần kiểm thay thế**

| Test case | Lý do không kiểm trên giao diện | Kiểm thay thế |
|---|---|---|
| TC-AUTH-31 Đăng ký đầy đủ + OTP email | Cần giải CAPTCHA và gửi email thật (không được phép) | `auth.test.ts`: tạo tài khoản chưa xác minh, OTP đúng cấp token, sai mã, hết hạn, quá 5 lần sai, gửi lại sau 60 s, email trùng 409 |
| TC-AUTH-32 Quên mật khẩu + đặt lại bằng OTP | Cần CAPTCHA và email thật | `authPassword.test.ts` (không lộ email tồn tại, đặt lại thu hồi mọi phiên, OTP sai/hết hạn/dùng lại bị từ chối) |
| TC-AUTH-33 CAPTCHA sau 3 lần sai, khóa sau 5 lần | Tránh khóa tài khoản dùng chung | `authSecurity.test.ts` (nhóm "CAPTCHA at login after 3 wrong attempts" và "account lock after 5 failures") |
| TC-AUTH-34 Refresh token xoay vòng | Cơ chế ở tầng API, không có giao diện riêng | `authSession.test.ts` (nhóm `POST /auth/refresh`); trên giao diện đã kiểm gián tiếp ở TC-AUTH-30 |
| TC-DISC-45 Màn "Thanh toán thất bại" | Công tắc mô phỏng chỉ render ở bản dev (`__DEV__`) | `order.test.ts`: `simulateFailure` trả 402 `PAYMENT_FAILED`, order FAILED, giữ giỏ, không ghi danh; TC-DISC-36 kiểm qua API |
| TC-LEARN-51 Huy hiệu "Giảng viên" và câu trả lời ghim | Seed không có dữ liệu; cần tài khoản giảng viên | `question.test.ts`, `teaching.test.ts`; sau đó TC-STU-18 kiểm trên giao diện bằng tài khoản giảng viên |
| TC-LEARN-52 Điểm và nhận xét project | Seed không có bài nộp đã chấm của tài khoản được giao | `teaching.test.ts`; TC-STU-17 kiểm chấm điểm trên giao diện |
| TC-ADM-13 Follower nhận thông báo `NEW_COURSE` | Không đăng nhập tài khoản học viên khác | `adminCourses.test.ts`, `teachingNewCourse.test.ts`, `teacherAdminFoundation.test.ts`; `adminRevision.test.ts` (bản sửa đổi không phát lại) |

## 5.6 Kiểm thử giao diện, trợ năng và hiệu năng

### 5.6.1 Giao diện và trợ năng (accessibility)

- **UI audit (03/10/2026, từ mã nguồn):** 13 màn chính được chấm theo năm hạng mục (trợ năng, hiệu năng, theming, phù hợp nền tảng, thích ứng). Kết quả **15/20 (Tốt)**, **0 lỗi P0**, 4 P1, 6 P2, 15 P3. Các P1 gồm: tương phản chữ của màu chủ đạo `#00BDD6` chỉ 2,27:1; màu chữ phụ `#9095A0` chỉ 3,00:1; thiếu xử lý bàn phím trên Android; màn Stack không cộng vùng an toàn phía dưới. Nhóm sửa bằng token chữ đậm hơn (`primaryText`, `textMuted` đậm, `dangerText`) và chữ tối trên nền chủ đạo để **chữ đạt WCAG AA ≥ 4,5:1 ở cả giao diện sáng và tối**, cùng các sửa về trợ năng và bàn phím (commit `8e112e3`); CI có bước tự động kiểm tra tương phản màu.
- **Rà soát sau thiết kế lại giao diện (07/10/2026):** đọc diff 36 file, bổ sung nhãn đọc màn hình (`accessibilityLabel`/thông báo cho câu trả lời AI đang stream), kích thước vùng chạm, cho nhãn dài xuống dòng, đệm theo vùng an toàn; 21 suite liên quan đạt.
- **Ma trận ngôn ngữ × giao diện:** TC-AUTH-26/27/28 chụp Home, Chi tiết khóa học, Cài đặt ở {vi + sáng} và {en + tối}, cả điện thoại và máy tính; mọi chuỗi giao diện, số (4,2 ↔ 4.2) và đơn vị ("5 phút" ↔ "5 mins") đổi theo ngôn ngữ, màu đổi theo giao diện, không vỡ bố cục; lựa chọn được lưu sau khi tải lại.
- **Giới hạn:** chưa kiểm bằng TalkBack/VoiceOver và cỡ chữ hệ thống lớn trên thiết bị thật; kết quả trợ năng chỉ dựa trên rà soát mã nguồn và test tự động.

### 5.6.2 Hiệu năng

**Bảng 5.11 – Hiệu năng phía server (đo 03/10/2026, `server/scripts/perf.ts`, 20 mẫu mỗi phép đo, PostgreSQL cùng máy)**

| Phép đo | Kết quả | Kỳ vọng | Đánh giá |
|---|---|---|---|
| `GET /home` khách: chưa cache → đã cache (p50) | 13,6 → 3,8 ms (giảm 72 %) | giảm rõ rệt | Đạt |
| `GET /home` đã đăng nhập (p50) | 18,4 → 10,6 ms (giảm 42 %) | giảm rõ rệt | Đạt |
| p95 của 11 endpoint chính | lớn nhất 18,4 ms | < 500 ms (NFR-02) | Đạt (nhanh hơn ngưỡng hơn 25 lần) |
| Payload `GET /courses?limit=20`: gzip so với không nén | 8 130 B → 1 506 B (giảm 81,5 %) | giảm ≥ 60 % | Đạt |

**Bảng 5.12 – Hiệu năng phía mobile (đo 03/10/2026, bằng test Jest với fake timers và `expo export`)**

| Phép đo | Trước | Sau | Giảm |
|---|---:|---:|---:|
| Số request khi gõ "javascript" (debounce 400 ms) | 10 | 1 | 90 % |
| Số lần lưu tiến độ trong 5 phút xem video (throttle 10 s) | 300 | 30 | 90 % |
| Bundle Android (`expo export`) | – | 8,5 MiB (JS Hermes 5,5 MiB + assets 3,0 MiB) | – |

**Bảng 5.13 – Đo trên production (24/10/2026, từ Việt Nam tới máy chủ Sydney, không đăng nhập)**

| Phép đo | Kết quả |
|---|---|
| `GET /api/v1/health` × 6 lần | 200, độ trễ 339–1705 ms |
| `GET /api/v1/categories` | 200, 411 ms |
| Thời gian mở `https://eliuh.site` đến khi hiện màn đăng nhập (lần tải đầu, chưa có cache trình duyệt) | điện thoại 8,3 s; máy tính 10,0 s |

*Nhận xét:* số đo trên máy local cho thấy thời gian xử lý của server rất thấp (p95 ≤ 18,4 ms), nên độ trễ 0,3–1,7 s trên production chủ yếu đến từ **đường truyền Việt Nam – Sydney** (bắt tay TLS, khoảng cách địa lý) chứ không phải do server xử lý chậm. Thời gian mở lần đầu 8–10 s là của lần tải **nguội** (tải bản web Expo, font và dữ liệu đầu tiên); các lần sau nhanh hơn nhờ cache trình duyệt (tệp tĩnh có `Cache-Control: immutable`) và cache TanStack Query. Nhóm ghi nhận đây là điểm cần cải thiện (mục 7.5). `[[CẦN NHÓM BỔ SUNG: nếu có số đo hiệu năng trên điện thoại thật (Home mở lại có cache so với lần đầu; FPS cuộn danh sách dài), điền vào đây — kế hoạch PLAN §17.2 còn hai dòng này để trống]]`

### 5.6.3 Bảo mật cơ bản

Các kiểm tra công khai trên production (TC-PROD-02…08): chứng chỉ Let's Encrypt hợp lệ cho `eliuh.site` và `api.eliuh.site`; HTTP chuyển 308 sang HTTPS; API trả đủ HSTS, `X-Content-Type-Options`, CSP, Referrer-Policy; gọi `/auth/me` không token trả 401 dạng JSON chuẩn, không lộ stack; đường dẫn không tồn tại trả 404 đúng định dạng lỗi. Phần xác thực (khóa tài khoản, CAPTCHA, 2FA, thu hồi phiên) và phân quyền (403 `NOT_ENROLLED`, 422 `OWN_COURSE`, `CANNOT_DISABLE_ADMIN`) được kiểm ở mục 5.3 và 5.5.

## 5.7 Kết quả kiểm thử và lỗi phát hiện

### 5.7.1 Tổng hợp kết quả

| Hạng mục | Kết quả |
|---|---|
| Test tự động | 407 suite, 3970 test (server 1729, mobile 2241) – đạt toàn bộ ngày 26/10/2026 |
| Test case có minh chứng | 178 test case: 166 Đạt, 4 Không đạt, 8 Không kiểm được; 405 ảnh minh chứng |
| Lỗi phát hiện | 22 lỗi: 0 Critical, 2 Major, 10 Minor, 10 Cosmetic |
| Kiểm lại sau sửa | 21/21 lỗi cần sửa đã Đạt (lần 1: 19; lần 2: 2); 1 mục (BUG-AUTH-02) giữ nguyên theo quy ước dữ liệu mẫu |
| Kiểm tra tĩnh | `typecheck`, `lint`, `prettier` sạch ở cả server và mobile |

### 5.7.2 Lỗi phát hiện theo mức độ

**Bảng 5.14 – Danh sách lỗi (chi tiết bước tái hiện, ảnh: `docs/04-testing/evidence/*/bugs.md`)**

| Mã lỗi | Mức độ | Màn hình / chức năng | Mô tả ngắn | Test case |
|---|---|---|---|---|
| BUG-LEARN-01 | **Major** | Học → Dự án → Tải tài liệu (web) | Nút tải tài liệu báo lỗi vì dùng `expo-file-system` không chạy trên web | TC-LEARN-22 |
| BUG-LEARN-02 | **Major** | Học → video bài 04, 09 (dữ liệu seed) | Video seed tại `download.blender.org` trả HTTP 403; bài "đang học" mặc định của một tài khoản lỗi ngay | TC-LEARN-07, 08 |
| BUG-AUTH-01 | Minor | Thiết lập 2FA, bước lưu mã khôi phục (mở trực tiếp URL) | Nút "Tôi đã lưu các mã này" không điều hướng vì không có lịch sử quay lại | TC-AUTH-16 |
| BUG-DISC-02 | Minor | Chi tiết khóa học – Chia sẻ (web) | Không đếm lượt chia sẻ vì Web Share API trả `undefined` | TC-DISC-26 |
| BUG-DISC-03 | Minor | Thanh toán thành công (desktop) | Thẻ kết quả bị thanh điều hướng che mất biểu tượng | TC-DISC-41 |
| BUG-DISC-04 | Minor | Chia sẻ khi trình duyệt không có Web Share API | Bấm Chia sẻ không có phản hồi nào | TC-DISC-28 |
| BUG-LEARN-03 | Minor | Khung video ở trạng thái lỗi | Thông báo chồng lên điều khiển gốc; nút "Thử lại" lệch | TC-LEARN-08 |
| BUG-LEARN-04 | Minor | AI Tutor – trạng thái lỗi | Ghi chú lỗi và "Gửi lại" nằm ngoài màn hình khi lịch sử chat dài | TC-LEARN-48 |
| BUG-LEARN-09 | Minor | Viết đánh giá (mở URL trực tiếp) | Gửi xong form không đóng | TC-LEARN-13 |
| BUG-STU-01 | Minor | Wizard bước Bài học – link YouTube | Từ chối `t=30s`/`t=1m30s` của link chia sẻ | – |
| BUG-STU-03 | Minor | Wizard soạn khóa (web) | Không cảnh báo khi F5 lúc còn thay đổi chưa lưu | – |
| BUG-STU-04 | Minor | Wizard bước Bài học sau khi áp dụng dàn ý AI | Bài "AI đề xuất" mất sau F5 | BUG-AUTH-02 | Cosmetic | Home, Chi tiết khóa (tiếng Việt) | Nhãn và CTA từ dữ liệu mẫu vẫn tiếng Anh (theo quy ước dữ liệu mẫu giữ tiếng Anh) | TC-AUTH-26 |
| BUG-DISC-01 | Cosmetic | Lưới poster desktop | Lưới 4 cột lệch trái, bỏ trống bên phải | TC-DISC-09, 12, 44 |
| BUG-DISC-05 | Cosmetic | Tab Đánh giá | Hiển thị "6+ đánh giá" khi tổng đúng bằng 6 | TC-DISC-16 |
| BUG-DISC-06 | Cosmetic | Chi tiết khóa (desktop) | Mục "Khóa học này bao gồm" lặp hai lần | TC-DISC-17 |
| BUG-LEARN-05 | Cosmetic | Học (desktop) | Video 360p không lấp đầy cột chính | TC-LEARN-16, 06 |
| BUG-LEARN-06 | Cosmetic | Ô nhập câu hỏi Q&A (web) | Viền focus chữ nhật mặc định bên trong ô bo tròn | TC-LEARN-17 |
| BUG-LEARN-07 | Cosmetic | Nộp project | Lỗi thiếu tệp chỉ hiện ở lần bấm thứ hai | TC-LEARN-24 |
| BUG-LEARN-08 | Cosmetic | Sửa đánh giá | Tiêu đề vẫn là "Viết đánh giá" | TC-LEARN-15 |
| BUG-STU-02 | Cosmetic | Q&A: ghim câu trả lời | Câu vừa ghim lên đầu nhưng nằm ngoài khung nhìn | – |
| BUG-ADM-01 | Cosmetic | Hàng chờ duyệt (tiếng Việt) | "Gửi Một phút trước" viết hoa giữa câu | TC-ADM-02 |

Không có lỗi Critical. Hai lỗi Major đều là lỗi **tương thích nền tảng/dữ liệu** chứ không phải lỗi nghiệp vụ: một lỗi do thư viện chỉ chạy native, một lỗi do nguồn video bên thứ ba ngừng phục vụ.

![Hình 5.7 – Khung video báo "Không tải được video này" (TC-LEARN-08, trước khi sửa BUG-LEARN-02/03)](../../04-testing/evidence/learn/TC-LEARN-08-video-error-retry-phone-vi-light.png)

### 5.7.3 Kết quả sửa lỗi và kiểm lại

Lỗi được sửa theo lô sau khi đóng băng mã nguồn; kiểm lại hai lần bằng cùng công cụ Playwright (`retest/results.md`).

- **Lần 1 (25/10/2026):** 19 lỗi *Đã sửa*, 2 lỗi *Chưa sửa* (BUG-LEARN-04: ghi chú lỗi AI Tutor vẫn bị thanh nhập che ~90 px; BUG-STU-02: câu ghim vẫn ngoài khung nhìn).
- **Lần 2 (26/10/2026):** hai lỗi còn lại được sửa tiếp (cuộn lại sau khi các hàng mới đo xong; chỉ cuộn lên đầu khi câu vừa ghim thật sự đứng đầu danh sách) và đo lại: lỗi AI Tutor đạt ở 4 độ dài lịch sử chat, câu ghim hiện ngay trong khung nhìn.
- **Kết luận:** **21/21 lỗi cần sửa đã Đạt**; BUG-AUTH-02 giữ nguyên theo CLAUDE.md §2 (dữ liệu mẫu tiếng Anh). Các test case *Không đạt* (TC-DISC-26, 28, 41; TC-LEARN-22) tương ứng BUG-DISC-02, 04, 03 và BUG-LEARN-01 đều đã *Đã sửa*.

![Hình 5.8 – Thẻ "Thanh toán thành công" trên desktop sau khi sửa (BUG-DISC-03)](../../04-testing/evidence/retest/RT-BUG-DISC-03-payment-success-desktop.png)

### 5.7.4 Đối chiếu tiêu chí ra

| Tiêu chí (PLAN §14.3) | Kết quả | Đạt? |
|---|---|---|
| 100 % test case Must đã chạy | 170/178 thực thi; 8 test case còn lại có integration test thay thế | Đạt (có ghi chú) |
| Tỉ lệ đạt ≥ 95 % | 97,6 % trên test case thực thi được (trước khi sửa lỗi); sau sửa lỗi cả 4 test case *Không đạt* được xác nhận lại | Đạt |
| 0 lỗi Critical/Major đang mở | Không Critical; 2 Major đã sửa và kiểm lại | Đạt |
| Coverage đạt chỉ tiêu | Server service 100 %, mobile logic 98 % (đo 03/10) | Đạt |
| `typecheck` + `lint` sạch | Sạch ở cả hai project | Đạt |
| UI audit ≥ 8 màn, 0 P0 | 13 màn, 0 P0 | Đạt |

### 5.7.5 Các hạng mục chưa kiểm thử được

Nhóm ghi rõ để báo cáo trung thực:

1. **Thiết bị Android/iOS thật:** chưa kiểm TalkBack/VoiceOver, chia sẻ qua share sheet hệ thống, tải tệp bằng `expo-file-system` trên Android, cử chỉ Back hệ thống, bàn phím native, cỡ chữ hệ thống lớn, FPS cuộn. Các hành vi này mới được kiểm gián tiếp bằng test tự động và bản web build. `[[CẦN NHÓM BỔ SUNG: kết quả chạy thử APK/Expo Go trên điện thoại thật (model, phiên bản Android) nếu có]]`
2. **Email thật và CAPTCHA thật:** đăng ký/quên mật khẩu đầy đủ bằng OTP email chỉ kiểm bằng integration test (Bảng 5.10).
3. **Production có đăng nhập:** để không làm bẩn dữ liệu thật, chỉ kiểm phần công khai (TC-PROD-01…10); các chức năng sau đăng nhập kiểm trên môi trường local cùng commit.
4. **Gemini thật ở trạng thái lỗi:** trong đợt kiểm thử Gemini không trả lỗi nên các trạng thái lỗi AI (503, 429) được mô phỏng bằng cách chặn mạng trình duyệt; chúng chứng minh cách app hiển thị lỗi, không chứng minh hành vi server khi Gemini lỗi thật (hành vi này được test bằng unit test của provider và đã gặp thật ngoài sản xuất, xem mục 7.3).
5. **Kiểm thử tải, kiểm thử xâm nhập:** chưa thực hiện.
6. **Kiểm thử offline trên thiết bị thật** và **UAT với người ngoài nhóm:** xem các mục `[[CẦN NHÓM BỔ SUNG]]` ở trên.


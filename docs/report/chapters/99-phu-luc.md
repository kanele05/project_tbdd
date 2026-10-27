# PHỤ LỤC

## Phụ lục A. Tài liệu tham khảo

### A.1 Tài liệu kỹ thuật và chuẩn bên ngoài

Danh sách các tài liệu chính thức mà nhóm sử dụng khi xây dựng và triển khai sản phẩm (truy cập lần cuối trong tháng 10/2026).

| # | Tài liệu | Địa chỉ |
|---|---|---|
| [1] | Expo Documentation (Expo SDK, Expo Router, EAS Build, EAS Update) | https://docs.expo.dev |
| [2] | React Native Documentation | https://reactnative.dev/docs/getting-started |
| [3] | TanStack Query v5 Documentation | https://tanstack.com/query/latest |
| [4] | React Hook Form và Zod | https://react-hook-form.com ; https://zod.dev |
| [5] | i18next và react-i18next | https://www.i18next.com ; https://react.i18next.com |
| [6] | Express (Node.js web framework) | https://expressjs.com |
| [7] | Prisma ORM Documentation | https://www.prisma.io/docs |
| [8] | PostgreSQL Documentation | https://www.postgresql.org/docs |
| [9] | Jest, Supertest, React Native Testing Library | https://jestjs.io ; https://github.com/ladjs/supertest ; https://callstack.github.io/react-native-testing-library |
| [10] | Docker và Docker Compose Documentation | https://docs.docker.com |
| [11] | Caddy Web Server Documentation (reverse proxy, HTTPS tự động) | https://caddyserver.com/docs |
| [12] | Let's Encrypt Documentation | https://letsencrypt.org/docs |
| [13] | GitHub Actions và GitHub Container Registry | https://docs.github.com/actions ; https://docs.github.com/packages |
| [14] | Prometheus, Grafana, Grafana Loki | https://prometheus.io/docs ; https://grafana.com/docs |
| [15] | Amazon EC2 User Guide | https://docs.aws.amazon.com/ec2 |
| [16] | Google Gemini API và SDK `@google/genai` | https://ai.google.dev/gemini-api/docs |
| [17] | Google reCAPTCHA v2 | https://developers.google.com/recaptcha/docs/display |
| [18] | RFC 6238 – TOTP: Time-Based One-Time Password Algorithm | https://www.rfc-editor.org/rfc/rfc6238 |
| [19] | RFC 7519 – JSON Web Token (JWT) | https://www.rfc-editor.org/rfc/rfc7519 |
| [20] | Web Content Accessibility Guidelines (WCAG) 2.1 | https://www.w3.org/TR/WCAG21 |
| [21] | OWASP Cheat Sheet Series (Authentication, Session Management) | https://cheatsheetseries.owasp.org |
| [22] | Conventional Commits 1.0.0 | https://www.conventionalcommits.org |
| [23] | Semantic Versioning 2.0.0 | https://semver.org |
| [24] | Brevo SMTP Relay (gửi email OTP) | https://developers.brevo.com |

### A.2 Tài liệu nội bộ của dự án

| Tài liệu | Nội dung |
|---|---|
| `PLAN.md` | Kế hoạch, đặc tả màn hình, hợp đồng API, nhật ký thay đổi kế hoạch (§22) |
| `CLAUDE.md` | Quy ước bắt buộc về công nghệ, mã nguồn, kiểm thử, git |
| `README.md`, `server/README.md`, `mobile/README.md` | Hướng dẫn chạy, biến môi trường, scripts |
| `deploy/README.md` | Hướng dẫn triển khai production từng bước (16 mục) |
| `docs/04-testing/evidence/<khu vực>/results.md`, `bugs.md`, `retest/results.md` | Test case có minh chứng, lỗi, kiểm lại |
| `MotaDetai_SDLC.txt`, `yeucau.txt` | Yêu cầu của giảng viên (quy trình SDLC, slide, video) |

## Phụ lục B. Hướng dẫn sử dụng

Ảnh minh họa trong phụ lục này là ảnh chụp thật từ bản build của ứng dụng (nguồn: các ảnh minh chứng kiểm thử). Ứng dụng có hai bố cục: **điện thoại** (dưới 768 px, thanh tab dưới) và **máy tính** (thanh điều hướng trên cùng kiểu Netflix); chức năng giống nhau. Có thể đổi ngôn ngữ (Tiếng Việt/English) và giao diện (sáng/tối/theo hệ thống) trong **Cài đặt**.

### B.1 Dành cho học viên

**B.1.1 Đăng ký và đăng nhập**

1. Mở ứng dụng ở màn đăng nhập. Nếu chưa có tài khoản, chọn **Đăng ký**, nhập họ tên, email, mật khẩu (8–72 ký tự, có chữ và số), xác nhận mật khẩu, chọn vai trò **Học viên** hoặc **Giảng viên** (không có lựa chọn quản trị viên), tick **reCAPTCHA** rồi bấm **Tạo tài khoản**.
2. Hệ thống gửi mã **OTP 6 số** qua email; nhập mã để kích hoạt tài khoản (mã hết hạn sau ít phút, gửi lại được sau 60 giây).
3. Đăng nhập bằng email và mật khẩu. Nếu đã bật xác minh hai bước, nhập thêm mã 6 số từ ứng dụng xác thực. Quên mật khẩu: chọn **Quên mật khẩu?**, nhập email, nhận mã OTP rồi đặt mật khẩu mới.

![Hình PL.1 – Màn đăng ký](../../04-testing/evidence/auth/TC-AUTH-05-register-form-phone-vi-light.png)

**B.1.2 Tìm khóa học**

- Trang chủ có banner, mục **Tiếp tục học**, danh mục, khóa phổ biến, gợi ý bằng AI và giảng viên nổi bật.
- Bấm ô tìm kiếm, gõ từ khóa (tên khóa, giảng viên hoặc thẻ). Dùng **Bộ lọc** để chọn danh mục, mức đánh giá, khoảng giá, miễn phí/có phí và sắp xếp. Kéo xuống để tải thêm kết quả.

![Hình PL.2 – Kết quả tìm kiếm](../../04-testing/evidence/discover/TC-DISC-04-search-results-python-phone-vi-light.png)

**B.1.3 Xem chi tiết khóa học, lưu và thích**

- Trang chi tiết có ba tab **Tổng quan**, **Nội dung**, **Đánh giá**. Bài có nhãn *xem thử* học thử được ngay; bài còn lại bị khóa cho đến khi ghi danh.
- Bấm biểu tượng dấu trang để **lưu** khóa học (xem lại trong Hồ sơ), trái tim để **thích**, biểu tượng chia sẻ để chia sẻ liên kết.

![Hình PL.3 – Chi tiết khóa học](../../04-testing/evidence/discover/TC-DISC-13-detail-overview-hero-phone-vi-light.png)

**B.1.4 Mua khóa học**

1. Bấm **Thêm vào giỏ hàng** (khóa miễn phí: **Ghi danh** ngay, không qua giỏ).
2. Mở **Giỏ hàng**, kiểm tra danh sách và tổng tiền, bấm **Thanh toán**.
3. Chọn phương thức thanh toán giả lập (thẻ hoặc ví điện tử) và xác nhận. Thành công: khóa học xuất hiện trong **Khóa học của tôi** và có thông báo.

![Hình PL.4 – Giỏ hàng](../../04-testing/evidence/discover/TC-DISC-31-cart-two-items-phone-vi-light.png)

![Hình PL.5 – Màn thanh toán](../../04-testing/evidence/discover/TC-DISC-35-checkout-form-phone-vi-light.png)

**B.1.5 Học bài**

- Vào tab **Khóa học của tôi**, chọn khóa rồi bấm **Tiếp tục học**; ứng dụng mở đúng bài và đúng vị trí đã dừng.
- Màn Học có ba tab: **Bài học** (danh sách, bấm để chuyển bài), **Dự án**, **Hỏi đáp**. Xem ≥ 90 % thời lượng bài thì bài được đánh dấu hoàn thành và phần trăm khóa tăng. Khi mất mạng, tiến độ được lưu tạm và tự đồng bộ khi có mạng.

![Hình PL.6 – Khóa học của tôi](../../04-testing/evidence/discover/TC-DISC-43-my-courses-all-phone-vi-light.png)

![Hình PL.7 – Màn học video](../../04-testing/evidence/learn/TC-LEARN-01-lesson-video-phone-vi-light.png)

**B.1.6 Hỏi đáp, nộp project, đánh giá**

- **Hỏi đáp:** tab *Hỏi đáp* → ô nhập câu hỏi (có chèn emoji nhanh) → gửi; bấm câu hỏi để xem và gửi trả lời, thích câu hỏi. Câu trả lời của giảng viên có huy hiệu và có thể được ghim.
- **Nộp project:** tab *Dự án* → **Nộp bài** → nhập tiêu đề, mô tả, chọn tệp (PDF, ZIP, PNG, JPG, TXT, tối đa 10 MB) → gửi. Điểm và nhận xét của giảng viên hiện trong *Bài nộp của bạn*. Có thể tải tài liệu của khóa ở cùng tab.
- **Đánh giá:** trong tab *Đánh giá* của khóa đã ghi danh, bấm **Viết đánh giá**, chọn số sao và nhập nội dung (có thể sửa sau).

![Hình PL.8 – Hỏi đáp trong khóa học](../../04-testing/evidence/learn/TC-LEARN-16-qa-list-phone-vi-light.png)

![Hình PL.9 – Nộp project](../../04-testing/evidence/learn/TC-LEARN-26-submit-filled-phone-vi-light.png)

**B.1.7 Trợ lý AI**

Trong màn Học, thẻ AI cho phép: **Tóm tắt bài** (đoạn tóm tắt và ý chính), **AI Tutor** (hỏi đáp về bài học, câu trả lời hiện dần, lưu lịch sử, xóa được), **Quiz** (5 câu trắc nghiệm, có giải thích và điểm). Tính năng chỉ dành cho người đã ghi danh, trả lời theo ngôn ngữ đang chọn và có nhãn "Tạo bởi AI". Trang chủ có gợi ý lộ trình học bằng AI.

![Hình PL.10 – AI Tutor trả lời dạng streaming](../../04-testing/evidence/learn/TC-LEARN-38-ai-tutor-q1-streaming-phone-vi-light.png)

**B.1.8 Hồ sơ, thông báo và bảo mật**

- **Hồ sơ:** xem thống kê Đã lưu/Đang học/Hoàn thành; **Chỉnh sửa hồ sơ** đổi tên, giới thiệu và ảnh đại diện (email không đổi được).
- **Thông báo:** biểu tượng chuông; bấm *Đánh dấu tất cả đã đọc*. Có cảnh báo khi tài khoản đăng nhập từ thiết bị mới.
- **Cài đặt → Bảo mật:** đổi mật khẩu (các thiết bị khác bị đăng xuất), xem danh sách thiết bị và đăng xuất từ xa, bật/tắt **xác minh hai bước** (quét mã QR bằng ứng dụng xác thực, lưu 10 mã khôi phục dùng một lần).
- **Cài đặt → Giao diện/Ngôn ngữ:** chọn sáng/tối, Tiếng Việt/English; lựa chọn được ghi nhớ.

![Hình PL.11 – Thiết bị đăng nhập](../../04-testing/evidence/auth/TC-AUTH-10-security-sessions-list-phone-vi-light.png)

![Hình PL.12 – Giao diện tối, tiếng Anh](../../04-testing/evidence/auth/TC-AUTH-28-settings-switch-2-after-phone-en-dark.png)

### B.2 Dành cho giảng viên

**B.2.1 Studio và soạn khóa học**

1. Tài khoản giảng viên có thêm tab **Giảng dạy** (Studio) liệt kê khóa theo trạng thái: Nháp, Chờ duyệt, Đã xuất bản, Bị từ chối, Đã ẩn.
2. Bấm **Tạo khóa học mới** để mở **wizard 5 bước**: *Ý tưởng* → *Giới thiệu* (ảnh bìa, ý học được, project) → *Giá & thẻ* (miễn phí/có phí, giá gốc, thẻ) → *Bài học* (chương và bài; dán link YouTube, có thể thêm mốc `t=` để bắt đầu từ giây nhất định; đặt bài xem thử; đổi thứ tự) → *Xem lại*. Dữ liệu được giữ khi tải lại trang (bước nằm trên URL), và có cảnh báo khi rời lúc còn thay đổi chưa lưu.
3. **AI hỗ trợ soạn khóa:** ở bước Ý tưởng bấm gợi ý bằng AI để nhận danh mục, phụ đề, mô tả, ý học được và dàn ý; sửa rồi **Áp dụng** từng phần; có nút *Tiếp tục sang bước sau*. Ở bước Bài học có thể gợi ý dàn ý chương/bài.
4. Ở bước **Xem lại**, danh sách mục còn thiếu hiện rõ (bấm để mở đúng bước); đủ điều kiện thì bấm **Gửi duyệt**. Có thể rút lại yêu cầu khi đang chờ duyệt.

![Hình PL.13 – Studio của giảng viên](../../04-testing/evidence/studio/TC-STU-01-studio-home-phone-vi-light.png)

![Hình PL.14 – Wizard soạn khóa, gợi ý của AI](../../04-testing/evidence/studio/TC-STU-05-ai-draft-result-phone-vi-light.png)

![Hình PL.15 – Bước Xem lại và gửi duyệt](../../04-testing/evidence/studio/TC-STU-13-wizard-review-step-phone-vi-light.png)

**B.2.2 Sau khi xuất bản**

- Sửa khóa **đã xuất bản** tạo một **bản sửa đổi** gửi duyệt; học viên vẫn thấy bản cũ cho đến khi quản trị viên duyệt.
- **Thống kê khóa học** (học viên, doanh thu ước tính, tiến độ…), **chấm điểm project** (0–100 kèm nhận xét, chấm lại ghi đè), **trả lời hỏi đáp** với huy hiệu Giảng viên và ghim một câu trả lời, **phản hồi đánh giá**, **ẩn/khôi phục khóa** (khóa đã xuất bản chỉ được ẩn, không xóa), **cập nhật hồ sơ giảng viên**.
- Giảng viên không thể mua khóa học của chính mình. Người theo dõi giảng viên nhận thông báo khi khóa mới được xuất bản lần đầu.

![Hình PL.16 – Chấm điểm project](../../04-testing/evidence/studio/TC-STU-17-grade-sheet-phone-vi-light.png)

![Hình PL.17 – Thống kê khóa học](../../04-testing/evidence/studio/TC-STU-16-course-stats-phone-vi-light.png)

### B.3 Dành cho quản trị viên

Tài khoản quản trị viên **không đăng ký được qua giao diện**; chỉ được nâng quyền bằng script (mục 6.11). Tab **Quản trị** gồm:

- **Dashboard:** số liệu tổng quan (người dùng, khóa học, khóa chờ duyệt, tài khoản bị khóa…).
- **Hàng chờ duyệt:** bảng khóa chờ duyệt và bản sửa đổi; mở chi tiết để xem ảnh bìa, mô tả, chương trình, lịch sử duyệt; với bản sửa đổi có màn **so sánh Trước/Sau**.
- **AI kiểm duyệt sơ bộ:** bấm để Gemini nhận định nội dung và liệt kê vấn đề; kết quả chỉ để tham khảo, **không chặn** quyết định của quản trị viên.
- **Duyệt** để xuất bản (giảng viên nhận thông báo) hoặc **Từ chối** kèm lý do tối thiểu 5 ký tự (giảng viên thấy lý do và có thể sửa rồi gửi lại).
- **Người dùng:** tìm, lọc; **khóa/mở khóa** tài khoản kèm lý do (không khóa được quản trị viên khác); **ẩn/khôi phục** khóa học vi phạm.

![Hình PL.18 – Dashboard quản trị](../../04-testing/evidence/studio/TC-ADM-01-admin-dashboard-desktop-vi-dark.png)

![Hình PL.19 – Hàng chờ duyệt](../../04-testing/evidence/studio/TC-ADM-02-review-queue-desktop-vi-dark.png)

![Hình PL.20 – AI kiểm duyệt sơ bộ](../../04-testing/evidence/studio/TC-ADM-04-ai-moderation-panel-desktop-vi-dark.png)

![Hình PL.21 – Từ chối khóa học kèm lý do](../../04-testing/evidence/studio/TC-ADM-05-reject-reason-modal-desktop-vi-dark.png)

### B.4 Giao diện máy tính (web)

Từ độ rộng ≥ 768 px, ứng dụng chuyển sang bố cục kiểu Netflix: thanh điều hướng trên cùng (logo trái, liên kết căn giữa, biểu tượng bên phải), banner kèm các hàng thẻ khóa học, trang chi tiết hai cột, màn Học có video bên trái và bảng bài học/hỏi đáp bên phải, Studio và Quản trị dạng bảng. Cài thành ứng dụng: trên Chrome/Edge chọn *Cài đặt ứng dụng*, trên iPhone dùng Safari → *Thêm vào MH chính*.

![Hình PL.22 – Trang chủ trên máy tính](../../../notes/tools/evidence/figma/shots/D02-home.png)

![Hình PL.23 – Màn học trên máy tính](../../../notes/tools/evidence/figma/shots/D04-learning.png)

![Hình PL.24 – Trang chủ giao diện sáng trên máy tính](../../../notes/tools/evidence/figma/shots/D09-home-light.png)

## Phụ lục C. Tài khoản và dữ liệu mẫu

- Dữ liệu mẫu (`npm run prisma:seed`): 6 danh mục, 16 thẻ, 9 giảng viên, 30 khóa học (3 miễn phí), 93 chương / 290 bài (hai bài đầu mỗi khóa xem thử bằng đoạn YouTube), khoảng 20 học viên, đánh giá, câu hỏi, bài nộp, thông báo.
- Tài khoản demo cho từng vai trò (học viên, giảng viên, quản trị viên) và mật khẩu thử dùng chung được ghi trong `server/README.md` mục 4; nhóm không chép mật khẩu vào báo cáo. Trên production, mật khẩu tài khoản seed nên được đổi trước khi công khai mã nguồn. `[[CẦN NHÓM BỔ SUNG: danh sách tài khoản demo giao cho giảng viên chấm (email), cách cấp mật khẩu an toàn]]`
- Thanh toán là **mô phỏng**: không trừ tiền thật, công tắc "mô phỏng thất bại" chỉ có ở bản phát triển.

## Phụ lục D. Ma trận truy vết use case – test case

**Bảng PL.1 – Use case và test case có minh chứng**

| Use case | Test case |
|---|---|
| UC001 Đăng ký | TC-AUTH-05, 06, 07, 31 |
| UC002 Đăng nhập (kèm 2FA) | TC-AUTH-01…04, 17, 29, 33, 34 |
| UC003 Đăng xuất | TC-AUTH-30 |
| UC004 Xem trang chủ | TC-DISC-01…03 |
| UC005 Tìm kiếm khóa học | TC-DISC-04, 05, 06, 08, 09 |
| UC006 Lọc và sắp xếp | TC-DISC-07, 09 |
| UC007 Duyệt theo danh mục | TC-DISC-10…12 |
| UC008 Xem chi tiết khóa học | TC-DISC-13…18 |
| UC009 Xem trước bài miễn phí | TC-DISC-19…22 |
| UC010 Lưu khóa học | TC-DISC-23, 24, 27 |
| UC011 Quản lý giỏ hàng | TC-DISC-29…34, 39 |
| UC012 Thanh toán và ghi danh | TC-DISC-35…37, 40…42, 45 |
| UC013 Khóa học của tôi | TC-DISC-38, 43, 44 |
| UC014 Học bài qua video | TC-LEARN-01…10 |
| UC015 Đánh giá khóa học | TC-LEARN-11…15 |
| UC016 Hỏi đáp | TC-LEARN-16…20, 51 |
| UC017 Nộp project | TC-LEARN-21…27, 52 |
| UC018 Hồ sơ giảng viên | TC-LEARN-28…33 |
| UC019 Hồ sơ cá nhân | TC-AUTH-19…23 |
| UC020 Thông báo | TC-AUTH-24, 25 |
| UC021 Thích / chia sẻ khóa học | TC-DISC-25…28 |
| UC022 Quản lý khóa học (Studio) | TC-STU-01…04, 08, 09, 22 |
| UC023 Soạn bài học | TC-STU-10…12 |
| UC024 Gửi duyệt | TC-STU-13, 14 |
| UC025 Bản sửa đổi khóa đã xuất bản | TC-STU-15, TC-ADM-09 |
| UC026 AI hỗ trợ soạn khóa | TC-STU-05…07, 11 |
| UC027 Thống kê khóa học | TC-STU-16 |
| UC028 Chấm điểm project | TC-STU-17 |
| UC029 Trả lời Q&A (giảng viên) | TC-STU-18 |
| UC030 Phản hồi đánh giá | TC-STU-19 |
| UC031 Ẩn/khôi phục khóa | TC-STU-20, TC-ADM-10 |
| UC032 Duyệt / từ chối khóa | TC-ADM-02, 03, 05…09 |
| UC033 AI kiểm duyệt sơ bộ | TC-ADM-04 |
| UC034 Quản lý người dùng | TC-ADM-11, 12, 14 |
| UC035 Dashboard quản trị | TC-ADM-01 |
| UC036 Thông báo khóa mới cho người theo dõi | TC-ADM-13 |
| UC037 Hồ sơ giảng viên (chỉnh sửa) | TC-STU-21 |
| UC038 Xác minh email bằng OTP | TC-AUTH-31 |
| UC039 Quên và đặt lại mật khẩu | TC-AUTH-08, 09, 32 |
| UC040 Bật/tắt 2FA và đăng nhập hai bước | TC-AUTH-14…18 |
| UC041 Quản lý phiên và thiết bị | TC-AUTH-10, 11, 25, 34 |
| UC042 Cài đặt ngôn ngữ và giao diện | TC-AUTH-26…28 |
| UC043 Hỏi AI Tutor | TC-LEARN-37…39, 48…50 |
| UC044 Tóm tắt và làm quiz AI | TC-LEARN-34…36, 40…43, 47 |
| UC045 Xem gợi ý lộ trình AI | TC-LEARN-44…46 |
| NFR bảo mật, sẵn sàng, PWA | TC-PROD-01…10 |

*Ghi chú:* mã và tên use case theo Bảng 2.7–2.8 ở chương 2 (tên có thể được rút gọn); ánh xạ lập từ cột FR/UC trong các tệp `results.md`.

## Phụ lục E. Bảng thuật ngữ và viết tắt

| Thuật ngữ | Giải thích |
|---|---|
| SDLC | Software Development Life Cycle – vòng đời phát triển phần mềm |
| SRS / SDS | Software Requirement Specification / Software Design Specification |
| FR / NFR / BR | Yêu cầu chức năng / phi chức năng / quy tắc nghiệp vụ |
| UC | Use case |
| MVP | Minimum Viable Product – bản sản phẩm khả dụng tối thiểu |
| API / REST | Giao diện lập trình ứng dụng / kiểu kiến trúc API dùng HTTP |
| ORM | Object-Relational Mapping – ánh xạ đối tượng – quan hệ (Prisma) |
| JWT | JSON Web Token – mã truy cập đăng nhập |
| OTP | One-Time Password – mật khẩu dùng một lần (gửi qua email) |
| TOTP / 2FA | Mật khẩu một lần theo thời gian / xác thực hai lớp |
| CAPTCHA | Phép thử phân biệt người và máy (Google reCAPTCHA v2) |
| SSE | Server-Sent Events – luồng dữ liệu từ server (AI Tutor trả lời dần) |
| PWA | Progressive Web App – web cài như ứng dụng |
| OTA / EAS Update | Cập nhật không dây mã JavaScript cho ứng dụng đã cài |
| APK / AAB | Gói cài đặt Android / gói đưa lên Google Play |
| CI/CD | Tích hợp liên tục / triển khai liên tục |
| GHCR | GitHub Container Registry – kho image Docker |
| EC2 / EBS | Máy chủ ảo / ổ đĩa của AWS |
| Reverse proxy | Máy chủ trung gian nhận request từ Internet rồi chuyển vào dịch vụ nội bộ (Caddy) |
| p50 / p95 | Phân vị 50 / 95 của độ trễ |
| WCAG AA | Mức tương phản và trợ năng AA của chuẩn WCAG (chữ ≥ 4,5:1) |
| Optimistic update | Cập nhật giao diện ngay trước khi server trả lời, lỗi thì hoàn tác |
| Dry-run | Chạy thử không ghi dữ liệu |

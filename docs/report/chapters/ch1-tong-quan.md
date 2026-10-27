# CHƯƠNG 1. TỔNG QUAN ĐỀ TÀI VÀ QUY TRÌNH PHÁT TRIỂN

## 1.1 Giới thiệu đề tài

Đề tài số 5 của môn **Lập trình thiết bị di động** là xây dựng **ứng dụng E-Learning**: một nền tảng học trực tuyến trên điện thoại, nơi người học duyệt và tìm khóa học, xem thông tin chi tiết, mua và ghi danh, học qua video, đặt câu hỏi, nộp project, đánh giá khóa học và xem hồ sơ giảng viên. Nhóm đặt tên sản phẩm theo tên môn học là **E-Learning App** và công bố tại tên miền riêng **eliuh.site**.

Sản phẩm gồm ba thành phần chính:

- **Ứng dụng khách (mobile và web):** viết bằng React Native với Expo (SDK 57) và TypeScript. Một mã nguồn chạy được trên Android (tệp APK), trên trình duyệt (web, cài được như PWA trên iPhone) và trong Expo Go khi phát triển.
- **Máy chủ REST API:** Node.js, Express, Prisma ORM, kiểm tra dữ liệu bằng zod, xác thực bằng JWT.
- **Cơ sở dữ liệu PostgreSQL:** 33 model và 12 enum trong `server/prisma/schema.prisma`.

Ngoài ra sản phẩm tích hợp các dịch vụ bên ngoài: Google Gemini (trợ lý AI), Google reCAPTCHA v2 (chống bot), Brevo SMTP (gửi email OTP và thông báo), YouTube (nguồn video bài học) và AWS EC2 (máy chủ triển khai).

Từ tháng 10/2026, hệ thống có ba nhóm người dùng chính: **Học viên** (học và tương tác), **Giảng viên** (soạn khóa, gửi duyệt, chấm project, trả lời Q&A) và **Quản trị viên** (duyệt khóa học, quản lý người dùng). Hệ thống hỗ trợ hai ngôn ngữ (Tiếng Việt, English), giao diện sáng và tối.

## 1.2 Mục tiêu

Theo PLAN.md §2.1, nhóm đặt ba mục tiêu và bổ sung mục tiêu thứ tư khi chuyển sang giai đoạn 2:

1. **Mục tiêu sản phẩm.** Xây dựng ứng dụng E-Learning chạy được trên thiết bị thật, có đủ luồng hoàn chỉnh: đăng ký và đăng nhập, khám phá khóa học, giỏ hàng, thanh toán giả lập, học video có lưu tiến độ, hỏi đáp, nộp project, đánh giá, hồ sơ giảng viên và học viên, thông báo.
2. **Mục tiêu quy trình.** Thực hiện đủ **sáu giai đoạn SDLC** theo `MotaDetai_SDLC.txt` (Requirement Analysis, System Design, Implementation, Testing, Deployment, Maintenance & Improvement). Mỗi giai đoạn có tài liệu đầu ra và minh chứng (mã nguồn, lịch sử Git, kết quả chạy test, ảnh chụp màn hình).
3. **Mục tiêu kỹ thuật.** Thể hiện các kỹ thuật phù hợp với môn học di động: cache nhiều tầng, xem lại dữ liệu khi mất mạng, tối ưu danh sách và ảnh, cập nhật giao diện lạc quan (optimistic UI), tiếp tục video từ vị trí cũ.
4. **Mục tiêu "sản phẩm chạy thật" (giai đoạn 2, từ 03/10/2026).** Triển khai lên máy chủ thật có tên miền và HTTPS, có giám sát vận hành, có quy trình CI/CD, có trợ lý AI, có xác thực chuẩn một ứng dụng thật (xác minh email, 2FA, quản lý thiết bị).

Tiêu chí kiểm tra mục tiêu ở cuối đồ án: toàn bộ yêu cầu mức Must và Should được hiện thực, bộ kiểm thử tự động chạy xanh, bản triển khai trực tuyến hoạt động ổn định (xem Chương 5 và Chương 6).

## 1.3 Phạm vi

### 1.3.1 Phạm vi theo MoSCoW ở giai đoạn 1 (MVP)

Nhóm phân loại yêu cầu theo phương pháp MoSCoW (Must – Should – Could – Won't) ngay từ kế hoạch ban đầu (PLAN.md §2.2). Bảng 1.1 tóm tắt phạm vi ban đầu và kết quả thực tế tại thời điểm viết báo cáo.

**Bảng 1.1 – Phạm vi MoSCoW giai đoạn 1 và kết quả thực tế**

| Mức | Nội dung theo kế hoạch ban đầu | Kết quả thực tế |
|---|---|---|
| **Must** | Đăng ký, đăng nhập, duy trì phiên, đăng xuất; trang chủ (banner, danh mục, Popular, Recommended, Course that inspires, Top teachers); tìm kiếm theo từ khóa và chủ đề nóng; xem khóa theo danh mục; chi tiết khóa (Overview, Lessons, Review); lưu khóa học; giỏ hàng và thanh toán giả lập; ghi danh khóa miễn phí; Khóa học của tôi (All, On going, Completed); phát video và lưu, tiếp tục tiến độ; hồ sơ cá nhân với thống kê | Hoàn thành |
| **Should** | Bộ lọc và sắp xếp; viết, sửa đánh giá và xem mọi đánh giá; Q&A (đặt câu hỏi, trả lời, like); Project (mô tả, tài liệu, nộp bài, xem bài người khác); hồ sơ giảng viên và Follow; sửa hồ sơ và đổi avatar; thông báo trong app; cache offline và banner mất kết nối | Hoàn thành |
| **Could** | Like và chia sẻ khóa học; từ khóa tìm kiếm gần đây; danh sách tất cả giảng viên; tự phát bài tiếp theo và tốc độ phát; E2E Maestro; Swagger UI; dark mode | Like/chia sẻ, từ khóa gần đây, danh sách giảng viên: đã làm. Dark mode: nâng lên Must ở giai đoạn 2. E2E Maestro và Swagger UI: **không làm** (nhóm chốt ngày 27/10/2026, đưa vào hướng phát triển) |
| **Won't** | Thanh toán thật, hoàn tiền, coupon; web admin riêng; tải video xem offline, livestream, chứng chỉ PDF; push notification thật, chat thời gian thực | Không làm. Riêng "giảng viên tạo khóa học trong app" và "đa ngôn ngữ" được chuyển thành yêu cầu ở giai đoạn 2 (mục 1.3.2) |

Các giả định nền tảng được nhóm xác nhận trong PLAN.md §1: nhóm 3 thành viên; thời gian từ 30/09/2026 đến 06/12/2026 (khoảng 10 tuần; ngày 26/10/2026 hạn nộp được rút xuống **05/11/2026**, xem mục 1.7); thiết bị thử chính là Android thật; thanh toán chỉ **giả lập**; có backend riêng để thể hiện đầy đủ phần Backend, CSDL, API.

### 1.3.2 Từ giai đoạn 1 sang giai đoạn 2

Chức năng lõi (Sprint 1–3 theo kế hoạch) được nhóm hoàn thành rất sớm, đến ngày 03/10/2026 (server 456 test, mobile 585 test theo nhật ký PLAN v1.7). Nhóm quyết định nâng sản phẩm thành "sản phẩm chạy thật" (PLAN.md §2.3, nhật ký v2.0 ngày 03/10/2026). Bảng 1.2 liệt kê các hạng mục bổ sung.

**Bảng 1.2 – Hạng mục bổ sung ở giai đoạn 2**

| Nhóm | Hạng mục | Ngày chốt / hoàn thành |
|---|---|---|
| Giao diện | Thiết kế lại toàn bộ theo concept **B · Noir** (chọn trong 3 concept); theme sáng/tối theo hệ thống hoặc chọn tay; chữ đạt WCAG AA (≥ 4,5:1) | Chọn concept 04/10/2026 |
| Ngôn ngữ | Tiếng Việt và English (i18next), mặc định theo máy, đổi trong Cài đặt | 04/10/2026 |
| AI | Google Gemini: tóm tắt khóa và bài, AI Tutor hỏi đáp (SSE), quiz trắc nghiệm, gợi ý lộ trình; cache trong DB, hạn mức theo user và theo ngày | 04–05/10/2026 |
| Xác thực | Access token 15 phút và refresh token 30 ngày xoay vòng; xác minh email bằng OTP; quên mật khẩu; 2FA TOTP và mã khôi phục; CAPTCHA (reCAPTCHA v2); khóa tạm khi sai nhiều lần; quản lý thiết bị | 04/10/2026 (server), 08–10/10/2026 (reCAPTCHA v2, chọn vai trò khi đăng ký) |
| Hạ tầng | AWS EC2 (Sydney), Docker Compose, Caddy HTTPS, domain `eliuh.site`; Prometheus, Grafana, Loki; CI/CD GitHub Actions; backup | 07/10/2026 chạy HTTPS; CI/CD tự triển khai 11/10/2026 |
| Đa nền tảng | Web (PWA) và APK Android (EAS Build, EAS Update) | 13/10/2026 (EAS Update) |
| Giảng viên và Quản trị | Giảng viên soạn khóa (wizard 5 bước), gửi duyệt, bản sửa đổi cho khóa đã xuất bản, thống kê, chấm project, ghim và trả lời Q&A; Quản trị viên duyệt khóa, AI kiểm duyệt sơ bộ, quản lý người dùng, dashboard (UC022–UC037) | Đặc tả 10/10/2026, code xong 11/10/2026 |
| Web PC | Giao diện web cho máy tính, kiểu Netflix (thanh điều hướng trên, banner, hàng thẻ, chi tiết khóa 2 cột) | 11/10/2026 |

Phạm vi sau cùng được thể hiện qua số lượng yêu cầu trong PLAN.md: **37 use case, 54 yêu cầu chức năng (FR-01…FR-54), 14 yêu cầu phi chức năng (NFR-01…NFR-14), 30 quy tắc nghiệp vụ (BR-01…BR-30)** và 34 màn hình được đánh số SC-01…SC-34 (không tính các màn bổ sung như xác minh email, 2FA, cài đặt bảo mật).

### 1.3.3 Ngoài phạm vi

Các nội dung sau được nhóm loại khỏi phạm vi (xem thêm Chương 7, đề xuất cải tiến): thanh toán thật và hoàn tiền; tải video xem offline; livestream; chứng chỉ hoàn thành; push notification thật; đăng nhập bằng Google; mở khóa ứng dụng bằng sinh trắc học (AUTH-10, bỏ ngày 27/10/2026); app iOS gốc (cần tài khoản Apple Developer), iPhone dùng bản web cài như PWA; upload video bài học (giảng viên chỉ gắn link YouTube).

## 1.4 Lý do chọn đề tài và tính ứng dụng

**Lý do chọn đề tài.** Học trực tuyến là bài toán quen thuộc nhưng đủ phong phú để thể hiện nhiều kỹ năng mà môn học yêu cầu: điều hướng nhiều màn hình, danh sách dài, xử lý media, lưu trữ cục bộ, gọi API và xác thực, xử lý mạng yếu. Đề tài số 5 còn có sẵn bộ 12 màn hình thiết kế làm tham chiếu chức năng ban đầu, giúp nhóm bắt đầu nhanh và tập trung vào chất lượng kỹ thuật.

**Tính ứng dụng.**

- Người học có nhu cầu học linh hoạt, ngắn mỗi lần, ngay trên điện thoại: ứng dụng tiếp tục đúng vị trí đã xem, báo tiến độ phần trăm, xem lại dữ liệu đã tải khi mất mạng.
- Người dạy có thể soạn và bán khóa học mà không cần công cụ ngoài: wizard soạn khóa, AI gợi ý nội dung, thống kê, chấm bài.
- Đơn vị vận hành có công cụ kiểm duyệt nội dung (kèm AI tư vấn sơ bộ) và dashboard.
- Với đồ án môn học, sản phẩm đã được **triển khai thật** (tên miền riêng, HTTPS, giám sát), nên có thể chạy thử và đánh giá như một sản phẩm đang vận hành, không chỉ là bản demo trên máy cục bộ.

Tính mới so với yêu cầu tối thiểu: tích hợp AI có kiểm soát chi phí (cache, hạn mức, model dự phòng), xác thực nhiều lớp, quy trình kiểm duyệt khóa học, và triển khai tự động bằng CI/CD.

## 1.5 Mô hình SDLC áp dụng

### 1.5.1 Mô hình thực tế

Nhóm áp dụng mô hình **lặp theo sprint (Scrum rút gọn)** kết hợp đủ **sáu giai đoạn SDLC** của đề bài. Sprint kéo dài một tuần, họp tổng kết vào tối Chủ nhật gồm demo sprint, retrospective và lập kế hoạch tuần sau (PLAN.md §20). Điểm khác biệt so với mô hình thác nước thuần túy là **thứ tự làm việc do nhóm quyết định ngày 02/10/2026**:

> **Lập trình → Kiểm thử → Triển khai → Viết tài liệu SDLC → Slide và video.**

Trong thời gian lập trình, nhóm không viết tài liệu trong thư mục `docs/`. **PLAN.md là đặc tả duy nhất**: yêu cầu (§6), màn hình (§7), cơ sở dữ liệu (§8), API (§9), chiến lược cache (§10). Mọi thay đổi phạm vi, thư viện, API hoặc timeline đều được ghi vào nhật ký thay đổi (§22) với ngày và lý do. Nhật ký này (27 phiên bản, từ v1.0 ngày 30/09/2026 đến v2.27 ngày 27/10/2026) là nguồn gốc để viết báo cáo từ sản phẩm thật. Lý do chọn thứ tự này: nhóm muốn dồn thời gian đầu để sản phẩm chạy được, tránh viết tài liệu rồi phải sửa nhiều lần khi yêu cầu thay đổi.

Một bản nháp tài liệu yêu cầu và thiết kế đã được viết ngày 30/09/2026 nhưng được gỡ khỏi nhánh làm việc ngày 02/10/2026 khi nhóm đổi sang thứ tự "code trước"; báo cáo này được viết lại từ mã nguồn thật.

### 1.5.2 Ánh xạ sáu giai đoạn SDLC

**Bảng 1.3 – Ánh xạ giai đoạn SDLC, thời điểm thực hiện và chương báo cáo**

| Giai đoạn SDLC | Hoạt động thực tế | Thời điểm | Chương báo cáo |
|---|---|---|---|
| 1. Requirement Analysis | Persona và phỏng vấn giả định; actor, use case, FR, NFR, BR trong PLAN.md §6; mở rộng Giảng viên và Quản trị (§2.4) | 30/09 – 10/10/2026, bổ sung liên tục | Chương 2 |
| 2. System Design | Kiến trúc client – server – DB (§5), ERD và schema Prisma (§8), đặc tả API (§9), chiến lược cache (§10), design system Noir | 30/09 – 04/10/2026, bổ sung theo từng sprint | Chương 3 |
| 3. Implementation | Mã nguồn mobile và server theo module; coding standard; Conventional Commits | 30/09 – 13/10/2026, sửa lỗi sau đó | Chương 4 |
| 4. Testing | Unit test, integration test, kiểm thử chức năng có minh chứng, UI audit, đo hiệu năng | Viết kèm từng task; kiểm thử minh chứng 24–26/10/2026 | Chương 5 |
| 5. Deployment | AWS EC2, Docker Compose, Caddy, CI/CD, giám sát, sao lưu, APK và web | 07/10 – 13/10/2026 | Chương 6 |
| 6. Maintenance & Improvement | Bug log, sửa lỗi sau kiểm thử, quy trình hotfix và phát hành, đề xuất cải tiến | 26/10/2026 trở đi | Chương 7 |

Nhóm tổ chức báo cáo theo đúng sáu giai đoạn này (mỗi giai đoạn một chương) như mô tả đề tài.

![Hình 1.1 – Mô hình SDLC của nhóm: sáu giai đoạn, lặp theo sprint, thứ tự code trước tài liệu sau](../../uml/png/SDLC-model.png)

*Hình 1.1 – Mô hình SDLC của nhóm: sáu giai đoạn, lặp theo sprint, thứ tự code trước tài liệu sau*

### 1.5.3 Nguyên tắc phối hợp trong sprint

- **Definition of Done** (CLAUDE.md §13): đúng chức năng và tiêu chí chấp nhận; giao diện đủ trạng thái loading, lỗi, rỗng, thành công; typecheck và lint sạch; test liên quan viết mới và qua; nếu đổi DB hoặc API thì cập nhật PLAN §8, §9.
- **Owner theo thư mục** (PLAN.md §3.2) để tránh xung đột mã: mỗi thành viên phụ trách một số module server và một số feature mobile; muốn sửa schema phải báo trưởng nhóm, mỗi lần chỉ một migration.
- **Review chéo** (PLAN.md §3.1): PR server do A review (PR của A do C review); PR mobile do B review (PR của B do C review); PR tài liệu do một trong hai thành viên còn lại.
- **Công cụ AI hỗ trợ lập trình:** nhóm dùng Claude Code để hỗ trợ viết mã, kiểm thử và tài liệu; người phụ trách module chịu trách nhiệm hiểu, review và kiểm chứng kết quả (PLAN.md §19, rủi ro R11). Việc dùng công cụ này được nêu rõ để báo cáo trung thực về quá trình làm việc.

## 1.6 Nhóm thực hiện, vai trò và phân công

### 1.6.1 Thành viên và vai trò

**Bảng 1.4 – Thành viên và vai trò (PLAN.md §3.1)**

| Mã | Họ tên | MSSV | Vai trò chính | Phụ trách chính |
|---|---|---|---|---|
| A | Lê Hoàng Khang | 23701881 | Trưởng nhóm, Backend Lead, DevOps | Nền tảng server, Auth, Catalog và tìm kiếm, Home, Giỏ hàng, Order và ghi danh, Teacher, Projects, Thông báo, hồ sơ cá nhân; hạ tầng, Docker, CI/CD, giám sát; trên mobile: TeacherCard, hồ sơ giảng viên, sửa hồ sơ, thông báo |
| B | Nguyễn Văn Sỹ | 23724681 | Mobile Lead, UI/UX, Presenter | Nền tảng mobile (theme, UI kit, điều hướng, API client, cache), đăng nhập và đăng ký, Home, Search và Filter, Course list, Course details, Cart và Checkout, hồ sơ người dùng, tab Projects và nộp project, icon, splash, EAS build; slide và video |
| C | Hoàng Ngọc Hải | 23730741 | Mobile Dev, QA Lead, Performance | Server: bài học, tiến độ, Khóa học của tôi, Q&A, Reviews, Bookmark; mobile: danh sách bài học, màn Học (video và tiến độ), Khóa học của tôi, Q&A, Reviews, offline và cache, đo hiệu năng; kế hoạch, test case và báo cáo kiểm thử |

Mỗi thành viên đều có phần mã mobile lẫn phần tài liệu, để phù hợp môn Lập trình thiết bị di động.

### 1.6.2 Phân công mở rộng ở giai đoạn 2

Các hạng mục giai đoạn 2 được phân theo cùng nguyên tắc owner (PLAN.md §13, §2.4.7). Bảng 1.5 tóm tắt.

**Bảng 1.5 – Phân công các hạng mục giai đoạn 2**

| Hạng mục | Người phụ trách | Ghi chú |
|---|---|---|
| Theme Noir, UI kit, Web/PWA, APK (UI-01/02/04a, PLT-01/02) | B | Concept B được nhóm chọn ngày 04/10/2026 |
| i18n vi/en (UI-03), Settings (UI-05) | A | |
| Thiết kế lại toàn bộ màn hình (UI-04) | A, B, C | Mỗi người theo feature của mình |
| AI backend (AI-01/02) | A | Provider `gemini` và `mock` |
| AI mobile (AI-03/04) | C | AI Tutor, tóm tắt, quiz, gợi ý |
| Xác thực backend (AUTH-01…07, 12, 14) | A | |
| Xác thực mobile (AUTH-08/09) | B | Màn Đăng ký, OTP, 2FA, Bảo mật |
| Docker, Caddy, giám sát, CI/CD, triển khai (OPS-01…04) | A | Một số bước cần người dùng tự thao tác trên tài khoản AWS |
| Studio giảng viên (SC-23…27) | B | Wizard soạn khóa |
| Thống kê khóa, sửa hồ sơ giảng viên, quản lý người dùng (SC-28, 30, 34) | A | |
| Chấm bài, dashboard và duyệt khóa của Admin (SC-29, 31…33) | C | |
| Web PC kiểu Netflix (WEB-01…05) | A, B, C | |

Việc chia nhỏ theo owner là kế hoạch; trên kho mã, mọi commit hiện đứng tên một tài khoản GitHub (`kanele05`). Vì vậy phần minh chứng đóng góp cá nhân (danh sách PR, GitHub Insights) cần nhóm bổ sung. [[CẦN NHÓM BỔ SUNG: ảnh GitHub Insights/danh sách PR theo từng thành viên và mô tả đóng góp thực tế của mỗi người nếu khác phân công trên]]

## 1.7 Timeline và các milestone

### 1.7.1 Kế hoạch

Kế hoạch ban đầu (PLAN.md §4, cập nhật 04/10/2026) chia thành 10 tuần, từ 30/09/2026 đến 06/12/2026:

**Bảng 1.6 – Kế hoạch tuần và milestone**

| Tuần | Thời gian | Giai đoạn | Milestone |
|---|---|---|---|
| W0 | 30/09 – 04/10 | Khởi động, nền code | M0 (04/10): app gọi được API thật |
| W1 | 05/10 – 11/10 | Giai đoạn 2, Sprint 4 | M1 (11/10): VPS online qua HTTPS và Grafana |
| W2 | 12/10 – 18/10 | Giai đoạn 2, Sprint 5 | M2 (18/10): app mới chạy trên web và APK thử |
| W3 | 19/10 – 25/10 | Giai đoạn 2, Sprint 6 | M3 (25/10): đóng băng tính năng |
| W4 | 26/10 – 01/11 | Kiểm thử | M4 (01/11): không còn lỗi Critical/Major mở |
| W5 | 02/11 – 08/11 | Triển khai | M5 (08/11): phát hành v1.0.0 |
| W6 | 09/11 – 15/11 | Báo cáo (1): Chương 1–3 và hình UML | |
| W7 | 16/11 – 22/11 | Báo cáo (2): Chương 4–7, kết luận, xuất bản | M6 (22/11): báo cáo hoàn chỉnh |
| W8 | 23/11 – 29/11 | Slide và video | M7 (29/11): slide và video xong |
| W9 | 30/11 – 06/12 | Dự phòng, nộp bài, thuyết trình | M8 |

### 1.7.2 Diễn biến thực tế

Do nhóm làm code sớm hơn kế hoạch, nhiều mốc đến sớm. Các mốc có ngày thật (lấy từ nhật ký PLAN §22, lịch sử Git và ghi chú vận hành) được liệt kê ở Bảng 1.7. Lịch sử Git của kho mã có **64 commit** từ 30/09/2026 đến 26/10/2026 (đã được làm sạch ngày 03/10/2026 theo PLAN §22 và CLAUDE.md §10).

**Bảng 1.7 – Các mốc thực tế**

| Ngày | Sự kiện |
|---|---|
| 30/09/2026 | Khởi tạo kho mã; khung mobile (Expo SDK 57, theme, UI kit, lớp dữ liệu); nhóm xác nhận 3 thành viên |
| 02/10/2026 | Nhóm quyết định thứ tự **code trước, tài liệu sau** (PLAN v1.4); khung server Express và Prisma, seed |
| 03/10/2026 | Hoàn tất chức năng Sprint 1–3 (server 456 test, mobile 585 test); thử tích hợp end-to-end; chuyển sang **giai đoạn 2** (PLAN v2.0), thêm nhóm task xác thực (v2.1); chữ đạt WCAG AA (v1.9) |
| 04/10/2026 | Chọn concept **B · Noir**; theme sáng/tối và i18n vi/en; Gemini AI; xác thực AUTH-01…07; Docker, giám sát, CI/CD; chốt báo cáo chia theo 6 giai đoạn SDLC và tên miền eliuh.site |
| 05/10/2026 | Màn hình khởi động kiểu intro; AI chạy thật trên điện thoại với khóa Gemini |
| 07/10/2026 | Chọn **AWS EC2** (Free Plan, Sydney) sau khi Google Cloud và Oracle Cloud không dùng được (PLAN v2.6–2.9); stack production chạy HTTPS tại eliuh.site |
| 08–10/10/2026 | reCAPTCHA v2 thay cổng xác minh tự làm; chọn vai trò Học viên/Giảng viên khi đăng ký; video bài học dùng YouTube nhúng chính thức; CI harden |
| 10/10/2026 | Đặc tả **mở rộng Giảng viên và Quản trị** (PLAN v2.16, UC022–UC037) |
| 11/10/2026 | Code xong mở rộng Giảng viên và Quản trị (v2.17); web PC kiểu Netflix và wizard soạn khóa (v2.18–2.20); CI/CD tự triển khai khi push nhánh `main` |
| 13/10/2026 | EAS Update cho APK; model Gemini dự phòng; sửa upload trên web (v2.21–2.23) |
| 19/10/2026 | Căn giữa thanh điều hướng web PC (v2.24) |
| 24/10/2026 | **Đóng băng code** (chỉ sửa lỗi); bắt đầu kiểm thử có minh chứng (v2.25) |
| 26/10/2026 | Kết thúc kiểm thử chức năng: 178 test case, 22 lỗi, sửa 21 và kiểm lại đạt 21/21 (v2.26); server 120 suite/1729 test, mobile 287 suite/2241 test |
| 27/10/2026 | Chốt phạm vi giai đoạn tài liệu: bỏ AUTH-10, T-06 (Maestro), S-22 (Swagger); UML chi tiết cho 14 use case lõi; Figma cho thiết kế UI/UX (v2.27) |

So với kế hoạch: giai đoạn 2 (dự kiến W1–W3, đến 25/10) thực tế xong tính năng chính ngày 13/10 và đóng băng ngày 24/10; kiểm thử (dự kiến W4) bắt đầu từ 24/10; triển khai (dự kiến W5) thực tế đã chạy từ 07/10 và cập nhật liên tục qua CI/CD. Các hạng mục còn lại theo kế hoạch: gắn tag `v1.0.0` và phát hành, hoàn thành báo cáo (W6–W7), slide và video (W8), tập thuyết trình và nộp bài (W9). Tại thời điểm viết, kho mã chưa có tag phiên bản. Ngày 26/10/2026, hạn nộp được rút xuống **05/11/2026** (trước đó dự kiến thuyết trình trong tuần 30/11 – 06/12/2026), nên các tuần W5–W9 được gộp thành lịch rút gọn: 26–30/10 viết nháp báo cáo, dựng thiết kế Figma và hình UML; 31/10–01/11 dựng file Word (.docx), nhóm rà soát và phát hành `v1.0.0`; 02–03/11 làm slide và video; 04/11 rà soát lần cuối; 05/11 nộp bài; 06–07/11 diễn tập; 08/11 thuyết trình. [[CẦN NHÓM BỔ SUNG: ngày thực tế gắn tag v1.0.0]]

![Hình 1.2 – Timeline thực tế của dự án (30/09/2026 – 05/11/2026) và các milestone](../../uml/png/TIMELINE.png)

*Hình 1.2 – Timeline thực tế của dự án (30/09/2026 – 05/11/2026) và các milestone*

## 1.8 Công cụ và môi trường làm việc

**Bảng 1.8 – Công cụ sử dụng theo nhóm mục đích**

| Nhóm | Công cụ | Mục đích |
|---|---|---|
| Quản lý mã nguồn | Git, GitHub (kho `kanele05/project_tbdd`) | Nhánh `main` (ổn định), `develop` (tích hợp), nhánh `feature/<task-id>-...`; commit theo Conventional Commits (`feat(mobile): ...`, `fix(server): ...`) |
| Quy trình review | Pull Request, branch protection | Mỗi PR một task, ghi task ID, ít nhất một thành viên review (PLAN §3.1, §20); GitHub Projects dự kiến làm bảng công việc nhưng chưa dùng (P-04 chưa tick) |
| Tích hợp liên tục | GitHub Actions (`ci.yml`, `deploy.yml`) | Typecheck, lint, format, test (PostgreSQL thật), build Docker; sau khi qua mới build image GHCR và triển khai SSH |
| Phát triển | VS Code, Node.js 24, npm, Expo Go, Android thật | Viết và chạy thử; ESLint 9 (flat config), Prettier |
| Kiểm thử | Jest (jest-expo cho mobile), Supertest, React Native Testing Library, Playwright (chụp minh chứng trên web) | Unit, integration, minh chứng chức năng |
| Thiết kế | Figma (gói Education), 3 concept giao diện trong `notes/concepts/` | Design system B · Noir, màn hình sáng/tối |
| Sơ đồ UML | SVG/HTML dựng thủ công, xuất PNG bằng Microsoft Edge headless | Biểu đồ trong báo cáo (không dùng Visual Paradigm) |
| Triển khai | Docker Compose, Caddy, AWS EC2, GHCR, EAS Build và EAS Update | Hạ tầng và phát hành APK |
| Giám sát | Prometheus, Grafana, Loki và Alloy, node-exporter, cAdvisor, postgres-exporter | Chỉ số API, hạ tầng, log |
| Dịch vụ ngoài | Google Gemini, Google reCAPTCHA v2, Brevo SMTP, YouTube | AI, chống bot, email, video |
| Hỗ trợ bằng AI | Claude Code | Hỗ trợ viết mã, kiểm thử, tài liệu; có người phụ trách review |
| Liên lạc | Nhóm chat; họp tổng kết tối Chủ nhật (45 phút); daily async trước 22:00 | PLAN §20 |

Môi trường máy phát triển (CLAUDE.md §3): Windows 11, Node v24, npm 11, Git 2.53. Máy phát triển không cài Docker, Java hay Android SDK nên dùng PostgreSQL nhúng (embedded-postgres, cổng 5433) và chạy ứng dụng bằng Expo Go; Docker chỉ chạy trên máy chủ triển khai và trong CI.

## 1.9 Tóm tắt chương

Chương này giới thiệu đề tài E-Learning App, mục tiêu, phạm vi theo MoSCoW và quá trình mở rộng từ MVP thành sản phẩm chạy thật, mô hình SDLC lặp theo sprint với thứ tự code trước, tài liệu sau, thành viên và phân công, timeline với các mốc ngày thật và công cụ sử dụng. Chương 2 trình bày giai đoạn thứ nhất của SDLC: phân tích yêu cầu.

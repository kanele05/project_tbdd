# KẾT LUẬN

## 1. Kết quả đạt được

Đề tài số 5 – **E-Learning App** của môn Lập trình thiết bị di động được nhóm thực hiện đầy đủ theo sáu giai đoạn của vòng đời phát triển phần mềm và đưa lên chạy thật. Các kết quả chính:

**Bảng K.1 – Đối chiếu yêu cầu đề bài (`MotaDetai_SDLC.txt`) với kết quả**

| Yêu cầu | Kết quả của nhóm | Nơi trình bày |
|---|---|---|
| Phân tích yêu cầu: thu thập yêu cầu, use case, actor, chức năng chính, SRS | Phân tích với các tác nhân học viên, giảng viên, quản trị viên và các hệ thống ngoài (Gemini, reCAPTCHA, email, YouTube); 45 use case (UC001…UC045), yêu cầu chức năng FR-01…FR-54, yêu cầu phi chức năng và quy tắc nghiệp vụ | Chương 2 |
| Thiết kế hệ thống: kiến trúc frontend/backend/DB/API, UML (Use Case, Class, Sequence, ERD), SDS | Kiến trúc ba lớp (Expo app – REST API Express/Prisma – PostgreSQL), hợp đồng API, sơ đồ UML chi tiết cho các use case lõi, thiết kế giao diện Noir sáng/tối vi/en | Chương 3 |
| Hiện thực: code theo thiết kế, module rõ ràng, coding standard, hướng dẫn chạy | Hai dự án TypeScript `strict`: mobile (tổ chức theo feature) và server (tổ chức theo module Express/Prisma), quy ước lập trình nhất quán, README hướng dẫn chạy | Chương 4, Phụ lục |
| Kiểm thử: test case, unit test, integration test, kết quả | **407 suite / 3970 test tự động** (server 120/1729, mobile 287/2241) đạt toàn bộ; **178 test case có minh chứng** (166 Đạt); **22 lỗi** được ghi nhận, sửa 21 và kiểm lại 21/21 Đạt | Chương 5 |
| Triển khai: môi trường giả lập/test, hướng dẫn cài đặt | Triển khai **thật** lên AWS EC2 Sydney bằng Docker Compose, HTTPS tại `eliuh.site`, CI/CD GitHub Actions, giám sát Prometheus/Grafana/Loki, sao lưu; APK Android (EAS), web và PWA cho iPhone | Chương 6 |
| Bảo trì & cải tiến: ghi nhận lỗi, đề xuất cải tiến | Nhật ký lỗi kèm commit sửa, quy trình hotfix và EAS Update, ba sự cố thật đã xử lý, bảng 19 đề xuất cải tiến có ưu tiên | Chương 7 |
| Sản phẩm chạy được (MVP) | Ứng dụng chạy thật và đầy đủ luồng: duyệt/tìm khóa học → mua giả lập → học video lưu tiến độ → hỏi đáp → nộp project → đánh giá; giảng viên soạn khóa (có AI hỗ trợ) → quản trị duyệt (có AI kiểm duyệt sơ bộ) | Chương 6, 5 |
| Slide 5–7 trang, video 1–3 phút | Làm ngày 02–03/11/2026; rà soát cuối 04/11; nộp 05/11; diễn tập 06–07/11; trình bày 08/11/2026 | Tài liệu trình bày riêng |

Nhìn từ góc độ sản phẩm, nhóm không dừng ở MVP mà làm tiếp "giai đoạn sản phẩm chạy thật": thiết kế lại giao diện theo concept Noir với hai chế độ sáng/tối và hai ngôn ngữ Việt/Anh; xác thực đầy đủ (xác minh email bằng OTP, xác thực hai lớp TOTP, CAPTCHA, quản lý thiết bị, khóa tài khoản khi sai nhiều lần, refresh token xoay vòng); trợ lý AI dùng Google Gemini (tóm tắt bài, AI Tutor dạng streaming, quiz, gợi ý lộ trình, hỗ trợ soạn và kiểm duyệt khóa) đặt sau lớp provider có cache, giới hạn lượt dùng và model dự phòng; giao diện web máy tính kiểu Netflix; vai trò giảng viên và quản trị viên với vòng đời khóa học (nháp → chờ duyệt → xuất bản/từ chối → bản sửa đổi).

Các nội dung đặc biệt có hiện thực và đo được: cache nhiều tầng (TanStack Query lưu xuống ổ đĩa, ảnh `memory-disk`, cache server cho trang chủ giảm 72 % thời gian xử lý với khách), hoạt động khi mất mạng (đọc dữ liệu cache, hàng đợi lưu tiến độ học), tự tiếp tục video và lưu tiến độ tiết kiệm (300 → 30 lần gọi API trong 5 phút xem), debounce tìm kiếm (10 → 1 request), nén gzip (giảm 81,5 % dung lượng danh sách khóa học), p95 các endpoint chính không quá 18,4 ms trên máy phát triển.

## 2. Về quy trình và làm việc nhóm

- Nhóm 3 thành viên áp dụng quy trình lặp theo sprint với nhánh `develop`/`main`, Conventional Commits, review chéo và CI bắt buộc xanh trước khi merge. Thứ tự **code → kiểm thử → triển khai → tài liệu** được nhóm chủ động chọn (02/10/2026) để có sản phẩm chạy sớm rồi mới tổng hợp tài liệu từ mã nguồn và kết quả thật.
- Phân vai theo kế hoạch: Lê Hoàng Khang (trưởng nhóm, backend, DevOps), Nguyễn Văn Sỹ (trưởng mobile, UI/UX, trình bày), Hoàng Ngọc Hải (mobile, QA, hiệu năng). Công cụ AI (Claude) được dùng hỗ trợ viết mã mẫu, test, kiểm thử có minh chứng và nháp tài liệu; người phụ trách phải hiểu và rà soát nội dung do công cụ tạo ra. `[[CẦN NHÓM BỔ SUNG: tự đánh giá đóng góp thực tế của từng thành viên (phần việc đã làm, tỷ lệ), vì kế hoạch phân công và thực tế có thể khác nhau]]`
- Quá trình có nhiều quyết định phải điều chỉnh (đổi nhà cung cấp máy chủ ba lần trong một ngày, đổi phạm vi, đóng băng mã nguồn); toàn bộ được ghi lại trong nhật ký thay đổi kế hoạch với lý do.

## 3. Hạn chế

1. **Thanh toán chỉ giả lập** (không kết nối cổng thanh toán thật); thiếu chứng chỉ hoàn thành, mã giảm giá.
2. **Chưa kiểm thử trên thiết bị Android/iOS thật** đầy đủ (TalkBack/VoiceOver, cỡ chữ hệ thống, offline, FPS); kết quả giao diện chủ yếu dựa trên bản web build và test tự động. Chưa kiểm thử tải và kiểm thử xâm nhập.
3. **Tám test case không kiểm được trên giao diện** do cần email/CAPTCHA thật hoặc tài khoản khác; đã có integration test thay thế nhưng không có ảnh minh chứng.
4. **Hiệu năng tải lần đầu của web còn chậm** (khoảng 8–10 s khi mở lần đầu từ Việt Nam tới máy chủ Sydney), độ trễ API 0,3–1,7 s do khoảng cách địa lý.
5. **Vận hành còn thủ công ở vài điểm:** chưa có cảnh báo tự động trong Grafana, chỉ một môi trường production, bản sao lưu ngoài máy chủ mới dừng ở snapshot EBS; máy chủ chỉ bật khi demo vì giới hạn credit.
6. **Phụ thuộc dịch vụ ngoài** (Gemini gói miễn phí, YouTube, nhà cung cấp SMTP) có thể quá tải hoặc thay đổi; đã giảm thiểu bằng model dự phòng và script thay dữ liệu nhưng không loại bỏ hoàn toàn.
7. **iPhone** dùng PWA, chưa có ứng dụng iOS đóng gói (cần tài khoản Apple Developer).
8. **Đo độ phủ test** lần cuối vào 03/10/2026, chưa đo lại sau các thay đổi của giai đoạn 2.

## 4. Hướng phát triển

Các hướng ưu tiên (chi tiết, kèm mức ưu tiên và ước lượng ở **Bảng 7.5**):

- **Độ tin cậy vận hành:** cảnh báo tự động, giám sát bên ngoài, sao lưu ra ngoài máy chủ, môi trường staging, theo dõi lỗi ứng dụng.
- **Chất lượng:** kiểm thử trên thiết bị thật và với người dùng ngoài nhóm, kiểm thử tải, E2E tự động, tài liệu API OpenAPI.
- **Tính năng:** thanh toán thật, push notification, video HLS/tải offline, tìm kiếm full-text, gợi ý theo hành vi, chứng chỉ hoàn thành, đăng nhập Google/Apple và sinh trắc học, bản iOS/Google Play.
- **Hiệu năng:** giảm dung lượng và thời gian tải bản web, CDN, đặt máy chủ gần người dùng hơn, cache dùng chung (Redis) khi mở rộng nhiều bản API.

## 5. Lời kết

Qua đề tài, nhóm đã vận dụng kiến thức môn học vào một sản phẩm hoàn chỉnh từ yêu cầu đến vận hành: xây dựng ứng dụng React Native/Expo đa nền tảng, thiết kế API REST và cơ sở dữ liệu quan hệ, tích hợp AI, viết kiểm thử tự động và có minh chứng, và đưa lên máy chủ thật với CI/CD và giám sát. Quan trọng hơn, nhóm học được cách xử lý những vấn đề chỉ xuất hiện khi chạy thật – dịch vụ bên ngoài quá tải, dữ liệu mẫu phụ thuộc bên thứ ba, sự cố tên miền – và ghi lại chúng một cách trung thực để làm cơ sở cải tiến. Nhóm xin cảm ơn giảng viên hướng dẫn đã đưa ra yêu cầu rõ ràng và góp ý trong quá trình thực hiện. `[[CẦN NHÓM BỔ SUNG: tên giảng viên hướng dẫn và lời cảm ơn cá nhân (nếu muốn)]]`

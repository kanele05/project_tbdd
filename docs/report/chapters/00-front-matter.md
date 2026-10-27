# LỜI MỞ ĐẦU

Trong những năm gần đây, học trực tuyến đã trở thành một cách học quen thuộc đối với sinh viên và người đi làm: người học có thể chọn khóa học theo nhu cầu, học vào thời gian rảnh và ngay trên điện thoại. Đối với người dạy, các nền tảng khóa học trực tuyến mở ra cách chia sẻ kiến thức đến nhiều người học mà không bị giới hạn bởi lớp học vật lý. Từ thực tế đó, đề tài số 5 của môn **Lập trình thiết bị di động** yêu cầu xây dựng một ứng dụng **E-Learning** cho phép duyệt và tìm khóa học, mua và ghi danh, học qua video, hỏi đáp, nộp project, đánh giá khóa học và xem hồ sơ giảng viên, học viên.

Báo cáo này trình bày toàn bộ quá trình nhóm thực hiện đề tài theo **vòng đời phát triển phần mềm (SDLC)** gồm sáu giai đoạn: Phân tích yêu cầu, Thiết kế hệ thống, Hiện thực, Kiểm thử, Triển khai, Bảo trì và cải tiến. Mỗi giai đoạn có đầu ra cụ thể đúng như mô tả đề tài: tài liệu đặc tả yêu cầu (SRS), tài liệu thiết kế (SDS) cùng các sơ đồ UML (Use Case, Hoạt động, Lớp, Tuần tự, ERD), mã nguồn theo quy ước lập trình, bộ test case cùng kết quả kiểm thử, hướng dẫn cài đặt và danh sách lỗi, đề xuất cải tiến.

Sản phẩm của nhóm gồm ứng dụng di động và web viết bằng React Native (Expo) với TypeScript, máy chủ REST API viết bằng Node.js (Express, Prisma) và cơ sở dữ liệu PostgreSQL. Ngoài phạm vi một sản phẩm thử nghiệm (MVP) ban đầu, nhóm tiếp tục phát triển lên giai đoạn "sản phẩm chạy thật": thiết kế lại giao diện theo concept **Noir**, hai ngôn ngữ Tiếng Việt và English, giao diện sáng và tối, trợ lý AI dùng Google Gemini, xác thực đầy đủ (xác minh email bằng OTP, xác thực hai lớp, CAPTCHA, quản lý thiết bị), vai trò **Giảng viên** soạn và gửi duyệt khóa học, vai trò **Quản trị viên** duyệt khóa học, giao diện web trên máy tính, triển khai lên máy chủ AWS EC2 với tên miền riêng, giám sát bằng Prometheus và Grafana, cùng quy trình CI/CD bằng GitHub Actions.

Một đặc điểm của đồ án là nhóm đã chọn thứ tự làm việc **lập trình, kiểm thử, triển khai rồi mới viết tài liệu**, trong đó đặc tả yêu cầu và các quyết định thay đổi được ghi liên tục trong một tài liệu kế hoạch dùng chung. Báo cáo vì vậy được viết từ sản phẩm thật: mã nguồn, cơ sở dữ liệu, kết quả chạy kiểm thử và hệ thống đang vận hành. Những con số được nêu trong báo cáo (số test, số test case, số lỗi) đều lấy từ kết quả chạy thực tế; những nội dung mang tính giả định, như persona và nội dung phỏng vấn người dùng, được ghi rõ là giả định.

Báo cáo gồm bảy chương và phần kết luận, như sau:

| Chương | Nội dung |
|---|---|
| Chương 1 | Tổng quan đề tài, mục tiêu, phạm vi, mô hình SDLC, nhóm, timeline và công cụ |
| Chương 2 | Giai đoạn 1 – Phân tích yêu cầu (SRS): thu thập yêu cầu, tác nhân, use case, đặc tả use case, yêu cầu chức năng, phi chức năng, quy tắc nghiệp vụ |
| Chương 3 | Giai đoạn 2 – Thiết kế hệ thống (SDS): kiến trúc, thiết kế giao diện, backend, API, lớp, tuần tự, cơ sở dữ liệu, bảo mật, AI |
| Chương 4 | Giai đoạn 3 – Hiện thực: công nghệ, tổ chức mã nguồn, coding standard, các chức năng chính, hướng dẫn chạy |
| Chương 5 | Giai đoạn 4 – Kiểm thử: kế hoạch, test case, unit test, integration test, kết quả |
| Chương 6 | Giai đoạn 5 – Triển khai: môi trường, CI/CD, giám sát, sao lưu, hướng dẫn cài đặt |
| Chương 7 | Giai đoạn 6 – Bảo trì và cải tiến: ghi nhận lỗi, quy trình phát hành, đề xuất cải tiến |
| Kết luận | Kết quả đạt được, hạn chế, hướng phát triển |

Nhóm hy vọng báo cáo phản ánh đúng quá trình làm việc và có ích cho việc đánh giá đồ án. Do thời gian thực hiện có hạn, báo cáo khó tránh khỏi thiếu sót; nhóm rất mong nhận được góp ý của giảng viên.

*TP. Hồ Chí Minh, tháng 11 năm 2026* [[CẦN NHÓM BỔ SUNG: xác nhận địa điểm và ngày hoàn thành báo cáo]]

**Nhóm thực hiện**

---

# LỜI CẢM ƠN

[[CẦN NHÓM BỔ SUNG: Lời cảm ơn giảng viên hướng dẫn (họ tên, học vị), khoa/trường, bạn bè và những người đã tham gia dùng thử, góp ý sản phẩm. Gợi ý cấu trúc: (1) cảm ơn giảng viên môn Lập trình thiết bị di động; (2) cảm ơn những người đã dùng thử ứng dụng và phản hồi; (3) cảm ơn các thành viên trong nhóm. Lời cảm ơn do nhóm tự viết để thể hiện đúng cảm xúc và tên người cụ thể.]]

---

# DANH MỤC TỪ VIẾT TẮT

| Từ viết tắt | Nghĩa đầy đủ | Giải thích ngắn |
|---|---|---|
| 2FA | Two-Factor Authentication | Xác thực hai lớp: ngoài mật khẩu còn cần mã TOTP từ ứng dụng xác thực |
| ADR | Architecture Decision Record | Bản ghi tóm tắt một quyết định kiến trúc và lý do |
| AI | Artificial Intelligence | Trí tuệ nhân tạo; trong đề tài là mô hình Google Gemini |
| API | Application Programming Interface | Giao diện lập trình ứng dụng; ở đây là REST API của máy chủ |
| APK | Android Package | Tệp cài đặt ứng dụng Android |
| BR | Business Rule | Quy tắc nghiệp vụ (mã BR-01…BR-30) |
| CAPTCHA | Completely Automated Public Turing test to tell Computers and Humans Apart | Bước kiểm tra phân biệt người và máy; đề tài dùng Google reCAPTCHA v2 |
| CD | Continuous Delivery/Deployment | Tự động phát hành/triển khai |
| CI | Continuous Integration | Tự động kiểm tra (typecheck, lint, test, build) mỗi khi có thay đổi mã |
| CI/CD | Continuous Integration / Continuous Deployment | Quy trình tích hợp và triển khai liên tục, chạy bằng GitHub Actions |
| CRUD | Create, Read, Update, Delete | Bốn thao tác dữ liệu cơ bản |
| DB | Database | Cơ sở dữ liệu (PostgreSQL) |
| DTO | Data Transfer Object | Cấu trúc dữ liệu trao đổi giữa máy chủ và ứng dụng |
| E2E | End-to-End | Kiểm thử từ đầu đến cuối qua giao diện |
| EAS | Expo Application Services | Dịch vụ build và cập nhật ứng dụng của Expo |
| EC2 | Elastic Compute Cloud | Dịch vụ máy chủ ảo của Amazon Web Services |
| ERD | Entity Relationship Diagram | Sơ đồ thực thể – quan hệ |
| FR | Functional Requirement | Yêu cầu chức năng (FR-01…FR-54) |
| GHCR | GitHub Container Registry | Kho lưu image Docker trên GitHub |
| HTTPS | HyperText Transfer Protocol Secure | Giao thức web được mã hóa |
| i18n | Internationalization | Đa ngôn ngữ (đề tài hỗ trợ Tiếng Việt và English) |
| JWT | JSON Web Token | Chuỗi token dùng để xác thực yêu cầu gửi lên máy chủ |
| MoSCoW | Must, Should, Could, Won't | Phương pháp xếp ưu tiên yêu cầu |
| MVP | Minimum Viable Product | Sản phẩm khả dụng tối thiểu |
| NFR | Non-Functional Requirement | Yêu cầu phi chức năng (NFR-01…NFR-14) |
| ORM | Object-Relational Mapping | Ánh xạ đối tượng – quan hệ; đề tài dùng Prisma |
| OTA | Over-The-Air (update) | Cập nhật ứng dụng qua mạng mà không cần cài lại (EAS Update) |
| OTP | One-Time Password | Mã dùng một lần (6 chữ số gửi qua email) |
| PR | Pull Request | Yêu cầu hợp nhất mã, dùng để review trước khi merge |
| PWA | Progressive Web App | Ứng dụng web có thể cài lên màn hình chính |
| QA | Quality Assurance | Đảm bảo chất lượng, kiểm thử |
| REST | Representational State Transfer | Kiểu thiết kế API dựa trên tài nguyên và HTTP |
| SDK | Software Development Kit | Bộ công cụ phát triển (ví dụ Expo SDK 57) |
| SDLC | Software Development Life Cycle | Vòng đời phát triển phần mềm |
| SDS | Software Design Specification | Tài liệu đặc tả thiết kế phần mềm |
| SMTP | Simple Mail Transfer Protocol | Giao thức gửi email; đề tài dùng Brevo SMTP |
| SRS | Software Requirement Specification | Tài liệu đặc tả yêu cầu phần mềm |
| SSE | Server-Sent Events | Luồng sự kiện từ máy chủ, dùng để trả lời của AI Tutor về dần từng đoạn |
| SSH | Secure Shell | Kết nối an toàn tới máy chủ, dùng khi triển khai |
| TC | Test Case | Ca kiểm thử (mã TC-<MODULE>-<số>) |
| TOTP | Time-based One-Time Password | Mã dùng một lần theo thời gian (Google Authenticator, Authy) |
| UC | Use Case | Ca sử dụng (mã UC001…UC045) |
| UI / UX | User Interface / User Experience | Giao diện / trải nghiệm người dùng |
| UML | Unified Modeling Language | Ngôn ngữ mô hình hóa thống nhất |
| VPS | Virtual Private Server | Máy chủ ảo riêng |
| WCAG | Web Content Accessibility Guidelines | Chuẩn khả năng tiếp cận; đề tài đạt mức AA về độ tương phản chữ (≥ 4,5:1) |

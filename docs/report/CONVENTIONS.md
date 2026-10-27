# Quy ước viết báo cáo `BaoCao_ELearning.docx`

Bố cục chương theo **PLAN.md §12.2** (7 chương theo 6 giai đoạn SDLC + kết luận + phụ lục). Nháp viết bằng Markdown ở `docs/report/chapters/`, sau đó dựng sang Word theo style của file mẫu (`notes/report-style.md`, do agent RPT-01 soạn).

## Ngôn ngữ & giọng văn
- Tiếng Việt, văn phong báo cáo đồ án (khách quan, ngôi "nhóm"), thuật ngữ kỹ thuật giữ tiếng Anh khi thông dụng (component, endpoint, cache…), lần đầu có giải thích.
- **Chỉ viết điều có thật** trong code / PLAN / notes / kết quả test. Không bịa số liệu, không bịa tính năng. Chỗ nào cần nhóm bổ sung (họ tên, MSSV, ý kiến cá nhân) ghi `[[CẦN NHÓM BỔ SUNG: …]]`.
- Nhóm: Lê Hoàng Khang (A, trưởng nhóm), Nguyễn Văn Sỹ (B), Hoàng Ngọc Hải (C). Môn Lập trình thiết bị di động, đề tài số 5 — E-Learning App.

## Đánh số
- Use case trong báo cáo: **UC001…UC045** — UC001…UC037 tương ứng UC-01…UC-37 trong PLAN; **UC038…UC045** là UC bổ sung giai đoạn 2 của Học viên theo PLAN §12.4 (UC038 Xác minh email OTP · UC039 Quên/đặt lại mật khẩu · UC040 Bật/tắt 2FA & đăng nhập 2 bước · UC041 Quản lý phiên & thiết bị · UC042 Cài đặt ngôn ngữ & giao diện · UC043 Hỏi AI Tutor · UC044 Tóm tắt & quiz AI · UC045 Gợi ý lộ trình AI) — chỉ có bảng đặc tả, không AC/SQ; nguồn: `chapters/ch2a-yeu-cau.md` Bảng 2.8. FR, NFR, BR giữ mã PLAN (FR-01, NFR-05, BR-03…).
- **Hạn nộp: 05/11/2026** (đổi ngày 26/10 từ 30/11 — PLAN §22 v2.28). Lịch rút gọn: 26–30/10 nháp báo cáo · 31/10–01/11 docx (không PDF) + release v1.0.0 · 02–03/11 slide + video · 04/11 rà soát · 05/11 nộp · 06–07/11 diễn tập · **08/11 thuyết trình**. Figma chỉ có màn phone (màn desktop chỉ có ảnh chụp ở trang Reference). Không ghi mốc 30/11–06/12 như kế hoạch hiện hành.
- Hình: `Hình <chương>.<số>` — tên file ảnh trong `docs/uml/png/`. Bảng: `Bảng <chương>.<số>`.
- Chèn hình bằng Markdown: `![Hình 2.3 – Biểu đồ use case tổng quát](../../uml/png/UC-overview.png)`. Nếu hình chưa có, vẫn chèn với tên file dự kiến và thêm dòng vào `docs/report/FIGURES.md` (bảng: Hình · tên file · loại · nguồn dữ liệu · trạng thái `cần vẽ`).
- Ảnh màn hình app: thư mục `notes/tools/evidence/figma/shots/` (P* điện thoại, D* desktop) và `docs/04-testing/evidence/<khu vực>/` — tham chiếu theo đường dẫn tương đối.

## Phạm vi UML (chốt 27/10/2026)
- **UC lõi có biểu đồ hoạt động (AC-UCxxx, chương 2) + tuần tự (SQ-UCxxx, chương 3)**: UC002 Đăng nhập · UC005 Tìm kiếm khóa học · UC008 Xem chi tiết khóa học · UC011 Quản lý giỏ hàng · UC012 Thanh toán & ghi danh · UC014 Học bài qua video & lưu tiến độ · UC016 Hỏi đáp · UC017 Nộp project · UC022 Quản lý khóa học (soạn khóa) · UC024 Gửi duyệt · UC026 AI hỗ trợ soạn khóa · UC028 Chấm điểm project · UC032 Duyệt/từ chối khóa · UC033 AI kiểm duyệt sơ bộ.
- UC còn lại: chỉ bảng đặc tả.
- Tên file hình: `AC-UC002.png`, `SQ-UC002.png`, `UC-overview.png`, `FUNC-tree.png`, `CLASS-1/-2.png`, `ERD-1/-2.png`, `DBDIAGRAM-1/-2.png` (Database Diagram ngay sau ERD, đúng vị trí Hình 3.4.1.2 của file mẫu nhưng **theo PostgreSQL — kiểu pgAdmin 4 ERD Tool, không dùng kiểu SQL Server (SSMS)**; kiểu dữ liệu trong ERD/DBDIAGRAM là kiểu PostgreSQL thật lấy từ migration; nếu tách theo miền thì `ERD-1/-2`, `DBDIAGRAM-1/-2`), `ARCH.png`, `DEPLOY.png`, `CICD.png`, `SCREEN-flow.png`.
- **Mọi hình (kể cả CLASS, ERD, DBDIAGRAM, FUNC-tree, SCREEN-flow) phải theo đúng ngữ pháp hình của file mẫu** (image1, image45–image48); hình không có trong mẫu (ARCH, DEPLOY, CICD, SDLC-model, TIMELINE, BIZ-flow) dùng cùng ngôn ngữ hình: nền trắng, nét đen, Arial, màu nhấn #00E5EE/#7DCEF5 — người dùng yêu cầu 27/10.

## Số liệu thật (dùng đúng, có nguồn)
- Kiểm thử tự động (26/10/2026): server **120 suite / 1729 test** (Jest + Supertest, PostgreSQL thật), mobile **287 suite / 2241 test** (Jest + React Native Testing Library); typecheck, lint, Prettier sạch; CI GitHub Actions chạy trước mỗi deploy.
- Kiểm thử chức năng có minh chứng (24–26/10): **178 test case** (166 Đạt, 4 Không đạt, 8 Không kiểm được — cần email/CAPTCHA/thiết bị thật, có integration test thay thế); **22 lỗi** (2 Major) → sửa 21, kiểm lại 21/21 Đạt. Nguồn: `docs/04-testing/evidence/*/results.md`, `bugs.md`, `retest/results.md`.
- Triển khai thật: **AWS EC2** (Free Plan, region **Sydney**, `c7i-flex.large` 2 vCPU/4 GB, Ubuntu 24.04, Elastic IP), **Docker Compose** 12 container, **Caddy** HTTPS (Let's Encrypt), domain **eliuh.site** (`api.eliuh.site`, `app.eliuh.site`), image trên **GHCR**, **CI/CD GitHub Actions** (test → build → SSH deploy, ~6–7 phút), giám sát **Prometheus + Grafana + Loki**, backup DB hằng ngày + EBS snapshot. (PLAN §12.2 mục 6.1 còn ghi Google Cloud — **sai, dùng AWS EC2**.)
- APK Android: EAS Build profile `preview`, **EAS Update** (OTA) channel `preview`. iPhone: dùng PWA (Safari → Thêm vào MH chính).
- AI: Google Gemini qua lớp provider (`gemini` / `mock`), model chính + model dự phòng (`GEMINI_FALLBACK_MODEL`), cache `AiContent`, rate limit theo user/ngày/toàn hệ thống.

## Tài liệu nguồn chính
`PLAN.md` (§1–§22), `CLAUDE.md`, `README.md`, `server/README.md`, `mobile/README.md`, `deploy/README.md`, `server/prisma/schema.prisma`, `server/src/**`, `mobile/src/**`, `notes/teacher-admin-contract.md`, `notes/design-system-b.md`, `notes/concepts/`, `docs/04-testing/evidence/**`, git log (`git log --oneline`).

# Nhóm và phân công vai trò

| Mục | Nội dung |
|---|---|
| Dự án | E-Learning App — Đề tài số 5, môn **Lập trình thiết bị di động** (React Native + Expo + TypeScript; backend Express + PostgreSQL) |
| Nguồn | [PLAN.md §3](../../PLAN.md#3-nhóm--phân-công), §12, §20 — mọi thay đổi phân công phải cập nhật PLAN.md trước rồi đồng bộ về tài liệu này |
| Người phụ trách tài liệu | A (hạn 04/10/2026 theo PLAN §12) |
| Phiên bản | 1.0 — dựa trên PLAN.md v1.2 (nhóm 3 người, giả định G1) |

---

## 1. Thành viên và vai trò chính

Nhóm gồm **3 thành viên** (G1, đã xác nhận ngày 30/09/2026). Các ô họ tên/MSSV được lấy từ PLAN §3.1; nếu có sai lệch, sửa ở PLAN.md trước.

| Mã | Họ tên | MSSV | Vai trò chính | Tính năng phụ trách | Tài liệu SDLC phụ trách |
|---|---|---|---|---|---|
| **A** | Lê Hoàng Khang | 23701881 | **Team Lead · Backend Lead · DevOps** | **Server:** nền tảng, Auth, Catalog/Search, Home, Cart/Order/Enroll, Teacher, Projects, Notifications, Me (hồ sơ/thống kê/avatar). **Mobile:** TeacherCard, Teacher profile (SC-18), Edit profile (SC-21), Notifications (SC-22) | User stories, SRS (tổng hợp), SDS (kiến trúc, ADR, ERD, API spec), Setup guide (server), Module structure, Deployment guide, Changelog, Sprint reports |
| **B** | Nguyễn Văn Sỹ | 23724681 | **Mobile Lead · UI/UX · Presenter** | **Mobile:** nền tảng (theme, UI kit, navigation, API client, cache), Login/Register, Home, Search/Filter, Course list, Course details (khung + Overview), Cart/Checkout, User profile (SC-20), tab Projects + Submit project (SC-17), app icon/splash, EAS build | Persona và phỏng vấn, UI design doc, Coding standard, Install guide, **Slide và Video (lead)** |
| **C** | Hoàng Ngọc Hải | 23730741 | **Mobile Dev · QA Lead · Performance** | **Server:** curriculum/tiến độ/My Courses (lesson, enrollment), Q&A, Reviews, Bookmark. **Mobile:** CurriculumList, Learning (video + tiến độ), My Courses, Q&A + Question detail, Reviews (tab, All reviews, Write review), Bookmark hook, Offline/Cache, đo Performance | Use case diagram, Class và Sequence diagrams, **Test plan/cases/report, Bug log**, phần "Nội dung đặc biệt" trên slide |

**Nguyên tắc:** ai cũng có **cả code mobile lẫn tài liệu** (môn Lập trình thiết bị di động nên A cũng phải có màn hình React Native của mình), làm minh chứng vai trò khi thuyết trình phần SDLC.

## 2. Phân công theo module (tránh xung đột code)

| Khu vực | Owner | Ghi chú |
|---|---|---|
| `server/src/{app,server}.ts`, `config/`, `lib/`, `middlewares/`, `prisma/schema.prisma` | A | Người khác sửa schema phải báo A, **1 migration/PR** |
| `server/src/modules/{auth,category,tag,course,home,cart,order,teacher,project,notification,user}` | A | S-16 like/share (Could) do C viết trong module `course` |
| `server/src/modules/{lesson,enrollment,question,review,bookmark}` | C | |
| `mobile/src/{theme,lib,components/ui,stores}`, `mobile/app/_layout.tsx`, `(tabs)/_layout.tsx` | B | Thêm component UI dùng chung phải qua B review |
| `mobile/src/features/{auth,home,search,category,course,cart,profile,project}` | B | Tab Lessons và Review trong Course details dùng component của C; màn Edit profile (thuộc `profile`) do A làm |
| `mobile/src/features/{learning,my-courses,qa,review}` + bookmark hook | C | Tab Projects trong Learning dùng component của B |
| `mobile/src/features/{teacher,notification}` | A | |
| `docs/` | Theo bảng mục 3 | |

## 3. Phân công tài liệu SDLC theo người phụ trách (tổng hợp từ PLAN §12)

| Giai đoạn | Tài liệu | Người phụ trách | Hạn |
|---|---|---|---|
| Quản lý | `docs/00-management/team-roles.md` | A | 04/10 |
| | `docs/00-management/meetings/YYYY-MM-DD.md` (biên bản họp) | Luân phiên A → B → C | Hằng tuần |
| | `docs/00-management/sprint-reports/sprint-N.md` | A | Cuối mỗi sprint |
| | `docs/00-management/templates/*` (khung tài liệu — task P-06) | C (khởi tạo) | 04/10 |
| 1. Requirement | `interviews.md` | B | 07/10 |
| | `user-stories.md` | A | 09/10 |
| | `SRS.md` (A tổng hợp; A/B/C viết đặc tả UC thuộc feature mình) | A | 11/10 |
| | `diagrams/use-case.puml` (+ .png) | C | 09/10 |
| 2. Design | `SDS.md`, `database.md`, `api-spec.md` | A | 18/10, 16/10, 16/10 |
| | `class-diagram.md`, `sequence-diagrams.md` | C | 16/10, 18/10 |
| | `ui-design.md`, `PRODUCT.md`, `DESIGN.md` | B | 18/10, 25/10 |
| 3. Implementation | `coding-standard.md` | B | 18/10 |
| | `setup-guide.md` | A + B | 25/10 (cập nhật liên tục) |
| | `module-structure.md` | A | 15/11 |
| 4. Testing | `test-plan.md`, `test-cases.md`, `ui-audit.md`, `test-report.md` | C (mỗi người viết TC cho feature của mình) | 25/10, 15/11, 22/11, 22/11 |
| 5. Deployment | `deployment-guide.md` | A | 27/11 |
| | `install-guide.md` | B | 27/11 |
| 6. Maintenance | `bug-log.md` | C | 29/11 |
| | `improvements.md` | Cả nhóm | 29/11 |
| | `CHANGELOG.md` (root) | A | 29/11 |
| Thuyết trình | `slides.pdf`, `video-script.md`, link video | B (lead) + cả nhóm | 29/11 |

## 4. Quy tắc review chéo

| Loại PR | Người review |
|---|---|
| PR **server** | A review |
| PR server **của A** | C review |
| PR **mobile** | B review |
| PR mobile **của B** | C review |
| PR **tài liệu** | Một trong hai người còn lại |

- Mọi PR: 1 task (hoặc nhóm task nhỏ liên quan), ghi Task ID từ PLAN.md, có ảnh chụp màn hình nếu có UI, **≥ 1 thành viên review** trước khi merge vào `develop`.
- Review trong vòng **24 giờ**; người review chạy thử nếu là UI; nhận xét lịch sự, cụ thể (PLAN §20).
- Không merge khi test đỏ; không commit secret (CLAUDE.md §10).

## 5. Quy tắc backup (thay thế khi vắng mặt)

| Cặp backup | Phạm vi |
|---|---|
| A ↔ C | Backend |
| B ↔ C | Mobile |
| B điều phối nhóm thay A | Khi A vắng (chủ trì họp, cập nhật board) |

Để backup khả thi: `setup-guide.md` phải đủ để người khác chạy được dự án, PR nhỏ, biên bản họp đầy đủ (rủi ro R5, PLAN §19).

## 6. Khối lượng ước tính

Đơn vị ≈ nửa ngày làm việc (PLAN §3.1):

| Thành viên | Khối lượng | Ghi chú |
|---|---|---|
| A | ~48 | |
| B | ~50 | B nhiều hơn vì làm slide/video ở W8 khi code đã xong |
| C | ~45 | C dồn việc ở W7 (testing) |

## 7. Quy trình làm việc chung (tóm tắt PLAN §20)

- **Mô hình:** Scrum rút gọn — sprint 1 tuần (Sprint 1–4).
- **Họp tuần:** tối Chủ nhật, 45 phút: demo sprint (15') → retrospective (10') → planning (20'); biên bản lưu `docs/00-management/meetings/` (mẫu: [meeting-notes.md](templates/meeting-notes.md)).
- **Daily async** (nhóm chat, trước 22h): Hôm qua làm gì · Hôm nay làm gì · Vướng gì.
- **Board:** mỗi task = 1 issue (ID theo PLAN.md); PR liên kết issue (`Closes #n`).
- **Báo cáo tiến độ:** cuối mỗi sprint A cập nhật `sprint-reports/` (mẫu: [sprint-report.md](templates/sprint-report.md)) và tick PLAN.md.
- **Lỗi:** ghi theo mẫu [bug-report.md](templates/bug-report.md); test case theo mẫu [test-case.md](templates/test-case.md).
- **Minh chứng vai trò:** GitHub Insights (contributors), danh sách PR của từng người, biên bản họp — dùng cho slide 5.

## 8. Nếu nhóm có thêm thành viên (PLAN §3.3)

**Thêm 1 người (D — BA · QA · Presenter):** D nhận từ C: Test plan/cases/report, Bug log, Reviews (API + UI); từ B: User profile, Slide và Video; từ A: Teacher profile, User stories. Mở lại các mục `Could`. Mọi thay đổi ghi vào PLAN §22.

## 9. Thứ tự cắt giảm nếu trễ tiến độ (PLAN §3.4)

Theo dõi ở buổi họp Chủ nhật. Nếu một sprint trễ **> 2 ngày công** → cắt lần lượt theo thứ tự dưới đây (ghi PLAN §22), **không cắt Must**:

| Thứ tự | Nội dung cắt |
|---|---|
| 1 | Toàn bộ `Could` (với nhóm 3 người mặc định đã không làm) |
| 2 | Màn SC-22 Notifications (giữ API + badge chuông) |
| 3 | SC-10 All reviews (giữ tab Review trong Course details) |
| 4 | Đổi avatar ở SC-21 (giữ sửa tên/headline) |
| 5 | Danh sách "Student Projects" (giữ upload + resources) |
| 6 | Lọc khoảng giá trong Filter (giữ Category/Rating/Sort) |

## 10. Lịch mốc liên quan tới phân công (PLAN §4)

| Mốc | Ngày | Nội dung |
|---|---|---|
| M0 | 04/10 | Repo + môi trường sẵn sàng |
| SRS v1.0 | 11/10 | Chốt tài liệu yêu cầu (review chéo R-06) |
| M1 | 18/10 | SDS v1.0 + app gọi được `/health` |
| M2 | 25/10 | Đăng nhập và thấy Home thật |
| M3 | 08/11 | Luồng lõi hoàn chỉnh (MVP) |
| M4 | 15/11 | Feature freeze |
| M5 | 22/11 | 0 bug Critical/Major mở |
| M6 | 29/11 | Release v1.0.0 + slide + video |
| M7 | 30/11 – 06/12 | Nộp bài / thuyết trình |

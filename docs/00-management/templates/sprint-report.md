# Mẫu báo cáo sprint

> **Cách dùng:** sao chép file này thành `docs/00-management/sprint-reports/sprint-N.md` (N = 1…4), điền các ô `_(điền)_`, xóa các khối hướng dẫn `>`.
> **Người lập:** A (Team Lead) vào **cuối mỗi sprint**, sau buổi họp tuần tối Chủ nhật (PLAN §12, §20). Sau khi lập báo cáo, A tick `[x]` các task đã xong trong PLAN.md.
> **Quy ước tick task:** chỉ tick khi PR đã được review và merge vào `develop` (PLAN §0).

---

## Bảng tham chiếu các sprint (theo PLAN §4, §13)

| Sprint | Tuần | Thời gian | Mục tiêu demo | Milestone |
|---|---|---|---|---|
| Sprint 1 | W3 | 19/10 – 25/10/2026 | Đăng ký/đăng nhập, tự đăng nhập lại, thấy Home với dữ liệu thật, bookmark được | M2 (25/10) |
| Sprint 2 | W4 | 26/10 – 01/11/2026 | Tìm kiếm có lọc, chi tiết khóa đủ 3 tab (Overview, Lessons, Review), thêm vào giỏ (API) | Demo sprint 2 |
| Sprint 3 | W5 | 02/11 – 08/11/2026 | Luồng lõi: Login → Search → Details → Add to cart → Checkout → My Courses → Học video (tiếp tục đúng vị trí) → Profile | M3 — MVP (08/11) |
| Sprint 4 | W6 | 09/11 – 15/11/2026 | Đủ toàn bộ Must + Should; từ 16/11 không thêm tính năng | M4 — Feature freeze (15/11) |

---

# Báo cáo Sprint _(N)_

## 1. Thông tin sprint

| Mục | Nội dung |
|---|---|
| Sprint | _(điền)_ (Sprint 1 / 2 / 3 / 4) |
| Thời gian | _(điền)_ (dd/mm – dd/mm/yyyy) |
| Người lập báo cáo | A — _(điền họ tên)_ |
| Ngày lập | _(điền)_ |
| Milestone liên quan | _(điền)_ |
| Phiên bản/Tag đạt được | _(điền)_ (ví dụ `v0.1.0`, `v0.3.0`, `v0.4.0` theo PLAN §16.2; để trống nếu chưa gắn tag) |

## 2. Mục tiêu sprint

- **Mục tiêu demo:** _(điền)_ (chép từ bảng tham chiếu phía trên)
- **Phạm vi cam kết (Task ID):** _(điền)_ (ví dụ: S-05, S-06, S-09, S-10, M-05 … M-09, M-14, M-16)
- **Tiêu chí hoàn thành sprint:** _(điền)_ (đủ chức năng + đạt Definition of Done — CLAUDE.md §13)

## 3. Kết quả công việc

### 3.1 Task đã hoàn thành

| Task ID | Mô tả | Owner | Ưu tiên | PR / commit | Ghi chú |
|---|---|---|---|---|---|
| _(điền)_ | _(điền)_ | _(A / B / C)_ | _(Must / Should / Could)_ | _(#số PR)_ | _(điền)_ |

### 3.2 Task chưa hoàn thành

| Task ID | Mô tả | Owner | Ưu tiên | Lý do chưa xong | Xử lý (chuyển sprint sau / cắt theo §3.4) |
|---|---|---|---|---|---|
| _(điền)_ | _(điền)_ | _(A / B / C)_ | _(Must / Should / Could)_ | _(điền)_ | _(điền)_ |

### 3.3 Thống kê

| Chỉ số | Kế hoạch | Thực tế |
|---|---|---|
| Số task cam kết / hoàn thành | _(điền)_ | _(điền)_ |
| Khối lượng (đơn vị ≈ nửa ngày công) | _(điền)_ | _(điền)_ |
| Số PR đã merge (A / B / C) | — | _(điền)_ / _(điền)_ / _(điền)_ |
| Số test tự động thêm mới (server / mobile) | _(điền)_ | _(điền)_ / _(điền)_ |
| `typecheck` + `lint` (server / mobile) | Sạch | _(Sạch / Còn lỗi)_ |
| Bug mở cuối sprint (Critical / Major / Minor / Trivial) | 0 Critical/Major | _(điền)_ / _(điền)_ / _(điền)_ / _(điền)_ |

## 4. Demo

| Mục | Nội dung |
|---|---|
| Ngày – thiết bị demo | _(điền)_ (model điện thoại, Android/iOS version, Expo Go SDK) |
| Kịch bản demo | _(điền)_ (liệt kê các bước theo mục tiêu demo) |
| Kết quả | _(điền)_ (đạt / chưa đạt từng bước) |
| Minh chứng | _(điền)_ (ảnh chụp màn hình / video ngắn / link PR) |
| Phản hồi của nhóm | _(điền)_ |

## 5. Burndown đơn giản

> Cách điền: mỗi ngày làm việc ghi **số đơn vị công việc còn lại** của sprint (đơn vị ≈ nửa ngày công). Dòng "Kế hoạch" là đường lý tưởng giảm đều từ tổng cam kết về 0.

| Ngày | Ngày 1 | Ngày 2 | Ngày 3 | Ngày 4 | Ngày 5 | Ngày 6 | Ngày 7 |
|---|---|---|---|---|---|---|---|
| Ngày (dd/mm) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |
| Kế hoạch (còn lại) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | 0 |
| Thực tế (còn lại) | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ | _(điền)_ |

Nhận xét đường burndown: _(điền)_ (đi đúng kế hoạch / trễ / vượt tiến độ và nguyên nhân).

## 6. Vấn đề, rủi ro và bài học kỹ thuật

| # | Vấn đề / rủi ro | Mức ảnh hưởng | Đã xử lý thế nào | Liên quan rủi ro (PLAN §19) |
|---|---|---|---|---|
| 1 | _(điền)_ | _(Cao / Trung bình / Thấp)_ | _(điền)_ | _(R1 … R11 hoặc "mới")_ |

## 7. Retrospective

| Nhóm | Nội dung |
|---|---|
| Làm tốt (Keep) | _(điền)_ |
| Chưa tốt (Problem) | _(điền)_ |
| Cải tiến áp dụng cho sprint sau (Try) | _(điền)_ |

## 8. Điều chỉnh kế hoạch

| Nội dung điều chỉnh | Lý do | Đã ghi PLAN §22? |
|---|---|---|
| _(điền)_ (ví dụ: cắt SC-22 theo thứ tự §3.4) | _(điền)_ | _(Có / Không cần)_ |

> Nếu sprint trễ > 2 ngày công, áp dụng thứ tự cắt giảm PLAN §3.4 (không cắt Must) và ghi lại tại đây.

## 9. Kế hoạch sprint kế tiếp

| Task ID | Mô tả | Owner | Ưu tiên |
|---|---|---|---|
| _(điền)_ | _(điền)_ | _(A / B / C)_ | _(Must / Should / Could)_ |

## 10. Cập nhật tài liệu trong sprint

| Tài liệu | Đã cập nhật? | Ghi chú |
|---|---|---|
| `docs/02-design/api-spec.md` | _(Có / Không / Không cần)_ | _(điền)_ |
| `docs/02-design/database.md` | _(Có / Không / Không cần)_ | _(điền)_ |
| `docs/04-testing/test-cases.md` | _(Có / Không / Không cần)_ | _(điền)_ |
| `PLAN.md` (tick task) | _(Có / Không)_ | _(điền)_ |

# Lỗi phát hiện - khu vực discover (UC-04..UC-13, UC-21)

Môi trường: bản web build (cùng mã với production) tại http://localhost:8090, API cục bộ. Mã nguồn đã đóng băng nên các lỗi dưới đây chỉ được ghi nhận, không sửa. Ảnh minh chứng nằm cùng thư mục.

| ID | Mức độ | Màn hình | Liên quan |
|---|---|---|---|
| BUG-DISC-01 | Cosmetic | Lưới poster desktop (Tìm kiếm, Danh sách khóa, Khóa của tôi) | TC-DISC-09, 12, 44 |
| BUG-DISC-02 | Minor | Chi tiết khóa học - nút Chia sẻ (web) | TC-DISC-26 (FR-17) |
| BUG-DISC-03 | Minor | Thanh toán thành công (desktop) | TC-DISC-41, 40 (FR-14) |
| BUG-DISC-04 | Minor | Chi tiết khóa học - nút Chia sẻ trên trình duyệt không có Web Share API | TC-DISC-28 (FR-17) |
| BUG-DISC-05 | Cosmetic | Chi tiết khóa học - tab Đánh giá | TC-DISC-16 (FR-10) |
| BUG-DISC-06 | Cosmetic | Chi tiết khóa học (desktop) - tab Tổng quan | TC-DISC-17 (FR-08) |

Không có lỗi Critical hoặc Major trong phạm vi UC-04..UC-13, UC-21: luồng chính (xem trang chủ, tìm kiếm, lọc, duyệt danh mục, chi tiết, preview, lưu, thích, giỏ hàng, thanh toán, ghi danh, Khóa của tôi) hoạt động đúng.

---

## BUG-DISC-01 - Lưới poster desktop chỉ rộng 4 cột, lệch trái, bỏ trống bên phải

- Mức độ: Cosmetic
- Màn hình: Tìm kiếm có kết quả (`/search?q=design`), Danh sách khóa theo danh mục (`/course-list?categoryId=cat_design`), Khóa của tôi (`/my-courses`) ở desktop 1440×900, dark.
- Bước tái hiện: đăng nhập, mở một trong các màn hình trên ở cửa sổ rộng 1440 px.
- Mong đợi: lưới thẻ khóa học dàn đều hết chiều rộng nội dung (hoặc căn giữa), lề trái và phải đối xứng giống các hàng cuộn ngang ở Trang chủ.
- Thực tế: lưới dừng ở 4 cột (khoảng 1056 px), lề trái 58 px nhưng bên phải còn trống khoảng 270-330 px; phần tiêu đề, thanh lọc và ô tìm kiếm thì trải hết chiều rộng nên bố cục nhìn lệch.
- Ảnh: `TC-DISC-09-search-results-desktop-vi-dark.png`, `TC-DISC-12-category-design-desktop-vi-dark.png`, `TC-DISC-44-my-courses-grid-desktop-vi-dark.png`

## BUG-DISC-02 - Chia sẻ khóa học trên web không đếm lượt chia sẻ

- Mức độ: Minor (FR-17 có ưu tiên Could; ảnh hưởng chỉ ở nền tảng web)
- Màn hình: Chi tiết khóa học, nút Chia sẻ.
- Bước tái hiện: mở chi tiết một khóa trong trình duyệt hỗ trợ Web Share API (giả lập `navigator.share` thành công), bấm biểu tượng Chia sẻ, so sánh `shareCount` của `GET /courses/:id` trước và sau.
- Mong đợi: sau khi chia sẻ thành công, ứng dụng gọi `POST /courses/:id/share` và `shareCount` tăng 1 (FR-17).
- Thực tế: `navigator.share` được gọi đúng một lần với nội dung chia sẻ, nhưng `shareCount` giữ nguyên (13 → 13). Nguyên nhân khi đọc `mobile/src/features/course/useShareCourse.ts`: Web Share API resolve `undefined` nên biểu thức `result.action === Share.sharedAction` ném lỗi, lỗi bị khối `catch` nuốt im lặng và request đếm không bao giờ được gửi. Trên Android/iOS (Share.share trả về `{ action }`) hành vi này chưa được kiểm tra trong đợt này.
- Ảnh: `TC-DISC-26-share-phone-vi-light.png`

## BUG-DISC-03 - Thẻ "Thanh toán thành công" trên desktop bị cắt, biểu tượng nằm dưới thanh điều hướng

- Mức độ: Minor (chức năng đúng, lỗi hiển thị ở màn hình then chốt của luồng mua)
- Màn hình: kết quả thanh toán `/checkout` sau khi thanh toán thành công, desktop 1440×900, dark.
- Bước tái hiện: thêm một khóa có phí vào giỏ, mở Thanh toán, bấm "Thanh toán" và chờ vài giây.
- Mong đợi: thẻ kết quả hiển thị đủ biểu tượng dấu tick, tiêu đề "Thanh toán thành công", mô tả và hai nút, nằm dưới thanh điều hướng.
- Thực tế: biểu tượng dấu tick bị che sau thanh điều hướng cao 68 px (đo được vị trí đỉnh khoảng -4 px), tiêu đề đè lên viền trên của thẻ, phần dưới thẻ để trống khoảng 200 px. Lỗi tái hiện ổn định ở cả hai lần thử (khóa Palettes + Creative Writing và khóa Creative Art Design). Bản phone hiển thị đúng.
- Ảnh: `TC-DISC-41-success-card-layout-desktop-vi-dark.png`, `TC-DISC-40-payment-success-desktop-vi-dark.png`

## BUG-DISC-04 - Bấm Chia sẻ khi trình duyệt không có Web Share API không có phản hồi nào

- Mức độ: Minor
- Màn hình: Chi tiết khóa học (desktop), nút Chia sẻ.
- Bước tái hiện: mở chi tiết khóa trong trình duyệt không hỗ trợ `navigator.share` (ví dụ nhiều bản desktop Firefox/Chrome không phải Windows; trong kiểm thử đã vô hiệu hóa `navigator.share`), bấm biểu tượng Chia sẻ.
- Mong đợi: có phương án thay thế (sao chép liên kết khóa học) hoặc thông báo rõ ràng.
- Thực tế: không có toast hay thay đổi giao diện nào, người dùng không biết chia sẻ không khả dụng; `Share.share` bị reject và ngoại lệ bị nuốt trong `useShareCourse.ts`.
- Ảnh: `TC-DISC-28-share-without-web-share-api-desktop-vi-dark.png`

## BUG-DISC-05 - Dòng tóm tắt đánh giá hiển thị "6+ đánh giá" dù tổng đúng bằng 6

- Mức độ: Cosmetic
- Màn hình: Chi tiết khóa học, tab Đánh giá (phone và desktop).
- Bước tái hiện: mở khóa Copywriting That Sells, chọn tab "Đánh giá".
- Mong đợi: số đánh giá chính xác, khớp `meta.summary.count` = 6 và tiêu đề hero "4,8 (6)".
- Thực tế: hiển thị "4,8/5 (6+ đánh giá)". Chuỗi i18n `review.count_other = "{{count}}+ đánh giá"` luôn thêm dấu "+" nên gây hiểu nhầm là còn nhiều hơn 6 đánh giá.
- Ảnh: `TC-DISC-16-reviews-phone-vi-light.png`, `TC-DISC-17-detail-reviews-desktop-vi-dark.png`

## BUG-DISC-06 - Mục "Khóa học này bao gồm" lặp hai lần trên desktop

- Mức độ: Cosmetic
- Màn hình: Chi tiết khóa học (desktop), tab Tổng quan.
- Bước tái hiện: mở chi tiết khóa ở 1440×900, cuộn tab Tổng quan.
- Mong đợi: danh sách lợi ích của khóa chỉ xuất hiện một lần.
- Thực tế: cùng danh sách 6 mục xuất hiện ở thẻ giá bên phải và lặp lại ở cột nội dung bên trái (trước khối "Tóm tắt bằng AI").
- Ảnh: `TC-DISC-17-detail-overview-similar-desktop-vi-dark.png`, `TC-DISC-17-detail-lessons-desktop-vi-dark.png`

# Lỗi và ghi nhận khu vực Xác thực & Hồ sơ (auth)

Phạm vi: kiểm thử trên bản web cục bộ (xem results.md). Mã nguồn đang đóng băng nên không sửa; các mục dưới đây chỉ ghi nhận. Không phát hiện lỗi mức Critical hoặc Major.

## BUG-AUTH-01

- Mức độ: Minor
- Màn hình: Thiết lập xác minh hai bước, bước "Lưu mã khôi phục" (bản phone/hẹp, web), đường dẫn /settings/two-factor
- Các bước tái hiện:
  1. Đăng nhập tài khoản chưa bật 2FA.
  2. Mở thẳng URL /settings/two-factor (gõ vào thanh địa chỉ, hoặc tải lại trang bằng F5 khi đang ở màn này), tức là không có lịch sử trình duyệt phía trước.
  3. Nhập mã TOTP đúng để bật 2FA; màn "Lưu mã khôi phục" hiện ra.
  4. Bấm nút "Tôi đã lưu các mã này".
- Mong đợi: rời màn mã khôi phục và quay lại trang Bảo mật.
- Thực tế: nút gọi router.back() nhưng không có trang trước nên URL vẫn là /settings/two-factor sau khi bấm; tiêu đề màn này ẩn nút Back (showBack=false) nên người dùng không có cách thoát ngoài thanh địa chỉ/menu. Khi đi theo luồng bình thường (Bảo mật → nút Bật → nhập mã → Tôi đã lưu các mã này) thì quay về Bảo mật đúng (đã kiểm). Gợi ý khắc phục: dùng router.canGoBack() hoặc router.replace('/settings/security') như goBack() trong useEditProfile.
- Ảnh: TC-AUTH-16-two-factor-recovery-codes-phone-vi-light.png (màn bị kẹt, không có nút Back); luồng đúng: TC-AUTH-16-two-factor-enabled-via-app-flow-phone-vi-light.png

## BUG-AUTH-02

- Mức độ: Cosmetic
- Màn hình: Home (banner đầu trang) và Chi tiết khóa học, khi đang ở ngôn ngữ Tiếng Việt
- Các bước tái hiện: đặt ngôn ngữ Tiếng Việt, mở Home và Chi tiết khóa học "UX Foundation".
- Mong đợi: toàn bộ chữ trên giao diện là tiếng Việt.
- Thực tế: các chuỗi đến từ dữ liệu server vẫn là tiếng Anh: nút CTA của banner ("Join now", "Start now", "Explore"), nhãn "20% OFF", tên danh mục ("Design", "Business"…), mô tả khóa học. Theo CLAUDE.md §2 dữ liệu mẫu giữ tiếng Anh nên có thể chấp nhận; ghi nhận để nhóm quyết định có dịch CTA/nhãn banner hay không. Các chuỗi giao diện thuần (nhãn, nút, thông báo) đều đã được dịch đầy đủ.
- Ảnh: TC-AUTH-26-matrix-home-phone-vi-light.png, TC-AUTH-26-matrix-course-detail-phone-vi-light.png

## Quan sát không phải lỗi

- Màn Login/Register/Forgot trên desktop luôn có nền poster tối kể cả theme sáng (TC-AUTH-01, TC-AUTH-05, TC-AUTH-08): phù hợp ý đồ thiết kế, chữ trong thẻ đọc rõ.
- Phiên tạo bằng API không có User-Agent trình duyệt được gọi là "Unknown device" trong danh sách thiết bị (TC-AUTH-10); đúng với cách server đoán tên thiết bị.
- Headline trong Chỉnh sửa hồ sơ bị giới hạn 80 ký tự ngay lúc nhập (maxlength), không có thông báo lỗi vì không thể vượt giới hạn (TC-AUTH-21).

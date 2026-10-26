# Kiểm tra công khai trên production (2026-10-24 08:35 UTC)

Môi trường: https://eliuh.site · https://api.eliuh.site (AWS EC2 Sydney). Không đăng nhập tài khoản nào trên production; chức năng sau đăng nhập được kiểm trên môi trường local cùng commit.

| ID | Chức năng (FR/UC/NFR) | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Minh chứng |
|---|---|---|---|---|---|---|
| TC-PROD-01 | NFR sẵn sàng / health | GET /api/v1/health ×6 | 200, status ok, db ok | 200 {"data":{"status":"ok","db":"ok"}} · độ trễ 339–1705 ms (VN → Sydney) | Đạt |  |
| TC-PROD-02 | NFR bảo mật / HTTPS | TLS handshake eliuh.site | Chứng chỉ hợp lệ (Let's Encrypt qua Caddy) | Issuer Let's Encrypt, CN eliuh.site, hết hạn Jan  5 10:18:00 2027 GMT | Đạt |  |
| TC-PROD-03 | NFR bảo mật / HTTPS | TLS handshake api.eliuh.site | Chứng chỉ hợp lệ (Let's Encrypt qua Caddy) | Issuer Let's Encrypt, CN api.eliuh.site, hết hạn Jan  5 10:17:42 2027 GMT | Đạt |  |
| TC-PROD-04 | NFR bảo mật / header | Đọc header phản hồi API | Có HSTS, nosniff, CSP, Referrer-Policy (helmet) | Có: strict-transport-security, x-content-type-options, content-security-policy, referrer-policy | Đạt |  |
| TC-PROD-05 | NFR bảo mật / chuyển HTTPS | GET http://eliuh.site/ | 301/308 sang https | 308 → https://eliuh.site/ | Đạt |  |
| TC-PROD-06 | FR-07 danh mục (API công khai) | GET /categories | 200 + danh sách danh mục | 200, 6 danh mục, 411 ms | Đạt |  |
| TC-PROD-07 | NFR bảo mật / xác thực | GET /auth/me không token | 401 + mã lỗi JSON, không lộ stack | 401 {"error":{"code":"UNAUTHORIZED","message":"Invalid or missing access token"}} | Đạt |  |
| TC-PROD-08 | Quy ước lỗi API | GET route không tồn tại | 404 dạng { error: { code, message } } | 404 {"error":{"code":"NOT_FOUND","message":"Route GET /api/v1/khong-ton-tai not found"}} | Đạt |  |
| TC-PROD-09 | PLT-01 PWA (Android/iPhone) | GET manifest.json + apple-touch-icon | manifest standalone + icon 200 | 200, display=standalone; icon 200 | Đạt |  |
| TC-PROD-10 | FR-02 màn đăng nhập trên production | Mở https://eliuh.site (chưa đăng nhập) | Chuyển tới /login, hiển thị form | phone 8327 ms → https://eliuh.site/login; desktop 10020 ms → https://eliuh.site/login | Đạt | TC-PROD-10-login-phone.png, TC-PROD-10-login-desktop.png |

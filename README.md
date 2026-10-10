# E-Learning App — Đề tài số 5

Ứng dụng học trực tuyến (React Native + Expo + TypeScript, backend Node.js/Express + Prisma + PostgreSQL) — đồ án môn **Lập trình thiết bị di động**.

Chức năng chính: duyệt & tìm kiếm khóa học, xem chi tiết (tổng quan, bài học, đánh giá), giỏ hàng & thanh toán giả lập, học qua video với lưu tiến độ, hỏi đáp (Q&A), nộp project, hồ sơ giảng viên/học viên, thông báo, xem lại dữ liệu khi mất mạng. Ngoài ra có đăng ký bằng email (OTP) kèm CAPTCHA, xác thực hai lớp (2FA), trợ lý AI (Google Gemini), giao diện sáng/tối và hai ngôn ngữ (Tiếng Việt / English).

## Thành viên

| Họ tên         | MSSV     | Vai trò                      |
| -------------- | -------- | ---------------------------- |
| Lê Hoàng Khang | 23701881 | Team Lead · Backend · DevOps |
| Nguyễn Văn Sỹ  | 23724681 | Mobile Lead · UI/UX          |
| Hoàng Ngọc Hải | 23730741 | Mobile · QA · Performance    |

## Cấu trúc

```
mobile/   App Expo SDK 57 (React Native, Expo Router, TanStack Query, Zustand), chạy Android/iOS và web
server/   REST API /api/v1 (Express 5, Prisma 7, PostgreSQL)
deploy/   Docker Compose, Caddy (HTTPS), Prometheus + Grafana + Loki, script cài máy và deploy
```

## Chạy dự án

- Server: [server/README.md](server/README.md) — khởi động PostgreSQL local, migrate, seed, `npm run dev`.
- Mobile: [mobile/README.md](mobile/README.md) — tạo `mobile/.env` với `EXPO_PUBLIC_API_URL=http://<IP-LAN>:4000/api/v1`, chạy `npx expo start` và quét QR bằng Expo Go (SDK 57).
- Triển khai lên VPS (Ubuntu + Docker Compose, HTTPS tự động, giám sát, CI/CD): [deploy/README.md](deploy/README.md).

Tài khoản demo được tạo bởi seed (xem `server/prisma/seed-data/users.ts`).

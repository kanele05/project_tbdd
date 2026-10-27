# Danh mục hình – Chương 5, 6, 7 và Phụ lục

Tên file sơ đồ lưu ở `docs/uml/png/` (nguồn SVG/HTML ở `docs/uml/src/`). Ảnh chụp màn hình đã có sẵn trong `docs/04-testing/evidence/` (không cần vẽ).

## A. Hình cần vẽ / chụp thêm

| Hình | Tên file | Loại | Nguồn dữ liệu | Mô tả cần vẽ | Trạng thái |
|---|---|---|---|---|---|
| Hình 6.1 | `DEPLOY.png` | Sơ đồ triển khai (deployment) | Mục 6.2–6.4 trong `ch6-trien-khai.md`; `deploy/docker-compose.yml`; `deploy/caddy/Caddyfile`; `deploy/README.md` mục 0.1 | Khối "Người dùng" (trình duyệt web, APK Android, PWA iPhone) → Internet → DNS Tenten (4 bản ghi A: @, app, api, grafana) → **AWS EC2 Sydney** (Ubuntu 24.04, c7i-flex.large, Elastic IP, Security Group 22/80/443) chứa mạng Docker `elearning` với 12 container: `caddy` (80/443, Let's Encrypt) → `api` (4000, metrics 9464), `web` (8080), `grafana` (3000); `postgres` (+ volume), `backup`, `prometheus`, `loki`, `alloy`, `node-exporter`, `cadvisor`, `postgres-exporter`. Mũi tên scrape metrics, thu log, `pg_dump`. Bên ngoài: GHCR (image), GitHub Actions (SSH deploy), Google Gemini, Brevo SMTP, Google reCAPTCHA, YouTube, EAS (build/OTA), EBS snapshot. Chỉ `caddy` có cổng mở ra Internet | cần vẽ |
| Hình 6.2 | `CICD.png` | Sơ đồ quy trình (pipeline) | Mục 6.6 trong `ch6-trien-khai.md`; `.github/workflows/ci.yml`, `deploy.yml`; `deploy/scripts/deploy.sh` | Luồng: push/PR → `ci.yml` (3 job song song: server [PostgreSQL service, typecheck, lint, prettier, test], mobile [typecheck, lint, prettier, check contrast, jest], docker [build thử]) → (push `main`/tag `v*`) `deploy.yml`: preflight secret → ci → build matrix api/web → push GHCR (tag `latest`, `sha-xxxxxxx`, semver) → SSH rsync `deploy/` → `deploy.sh` (pull, up -d, reload Caddy, chờ healthy, prune) → health check HTTPS 12 lần. Ghi thời gian ~6–7 phút, nhánh thất bại dừng không deploy, rollback bằng `IMAGE_TAG=sha-…` | cần vẽ |
| Hình 6.3 | `GRAFANA-api.png` | Ảnh chụp màn hình | `https://grafana.eliuh.site` – dashboard "E-Learning · API" | Chụp khi máy chủ đang chạy, đã có lưu lượng (có thể chạy vòng lặp `curl` vào `/health` trước), khung thời gian 1–6 giờ. Chèn vào mục 6.8.2 thay chỗ `[[ẢNH DASHBOARD GRAFANA — CẦN CHỤP]]` | **cần chụp** (nhóm làm) |
| Hình 6.4 | `GRAFANA-infra.png` | Ảnh chụp màn hình | Dashboard "E-Learning · Hạ tầng" | Như Hình 6.3: CPU/RAM/swap/ổ đĩa của máy chủ và từng container | **cần chụp** (nhóm làm) |

## B. Hình dùng ảnh chụp có sẵn (đã chèn trong Markdown, không cần vẽ)

| Hình | Tệp ảnh (đường dẫn từ `docs/04-testing/evidence/`) | Vị trí |
|---|---|---|
| Hình 5.1 | `auth/TC-AUTH-01-login-phone-vi-light.png` | 5.3.4 |
| Hình 5.2 | `auth/TC-AUTH-14-two-factor-setup-phone-vi-light.png` | 5.3.4 |
| Hình 5.3 | `discover/TC-DISC-09-search-filtered-sorted-desktop-vi-dark.png` | 5.3.4 |
| Hình 5.4 | `discover/TC-DISC-37-payment-success-phone-vi-light.png` | 5.3.4 |
| Hình 5.5 | `learn/TC-LEARN-36-ai-summary-result-desktop-vi-dark.png` | 5.3.4 |
| Hình 5.6 | `studio/TC-ADM-02-review-queue-desktop-vi-dark.png` | 5.3.4 |
| Hình 5.7 | `learn/TC-LEARN-08-video-error-retry-phone-vi-light.png` | 5.7.2 |
| Hình 5.8 | `retest/RT-BUG-DISC-03-payment-success-desktop.png` | 5.7.3 |
| Hình PL.1–PL.21 | Ảnh `auth/`, `discover/`, `learn/`, `studio/` (xem `99-phu-luc.md` mục B.1–B.3) | Phụ lục B |
| Hình PL.22–PL.24 | `notes/tools/evidence/figma/shots/D02-home.png`, `D04-learning.png`, `D09-home-light.png` | Phụ lục B.4 |

Ghi chú: ảnh minh chứng nặng (~120 MB) chỉ nằm trên máy, không commit; khi dựng Word cần nén/đổi kích thước (đề xuất rộng ≤ 600 px cho ảnh điện thoại, ≤ 1000 px cho ảnh máy tính).

## C. Bảng đã có trong chương (không cần vẽ)

Bảng 5.1–5.14, 6.1–6.9, 7.1–7.5, K.1, PL.1 – toàn bộ viết sẵn dạng Markdown.

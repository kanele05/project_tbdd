# CHƯƠNG 6. TRIỂN KHAI (DEPLOYMENT)

Chương này mô tả giai đoạn **Triển khai**: đưa hệ thống từ máy phát triển lên một môi trường chạy thật, gồm hạ tầng đám mây, cách đóng gói và chạy các dịch vụ, tên miền và HTTPS, quy trình CI/CD, giám sát, sao lưu – khôi phục, cách phát hành ứng dụng di động, hướng dẫn cài đặt và các quy trình vận hành (runbook). Mọi thông tin dựa trên cấu hình thật trong thư mục `deploy/`, `.github/workflows/` và nhật ký triển khai; chương **không** nêu địa chỉ IP, khóa, mật khẩu hay nội dung tệp `.env`.

## 6.1 Tổng quan môi trường triển khai

**Bảng 6.1 – Các môi trường**

| Môi trường | Máy chủ | Cơ sở dữ liệu | Ứng dụng khách | Mục đích |
|---|---|---|---|---|
| Dev | Máy lập trình viên, `npm run dev` (cổng 4000) | PostgreSQL nhúng (embedded-postgres, cổng 5433) | Expo Go quét QR; web `expo start --web` | Viết code, thử nhanh |
| Test | Máy local hoặc GitHub Actions | Database riêng có chữ `test` (local) / PostgreSQL 17 service (CI) | Jest, Supertest, RNTL | Chạy test tự động |
| Production (demo) | AWS EC2 Sydney, Docker Compose + Caddy | PostgreSQL 17 trong Docker, volume riêng | Web `eliuh.site` / `app.eliuh.site`, APK Android (EAS), PWA cho iPhone | Sản phẩm chạy thật, demo bảo vệ |

Quyết định quan trọng: nhóm triển khai **một môi trường production duy nhất** (không có staging riêng) vì quy mô đồ án; sự an toàn dựa vào CI chạy test trước khi deploy, sao lưu trước mỗi lần cập nhật dữ liệu, và khả năng quay về image cũ (mục 6.9).

## 6.2 Hạ tầng đám mây: AWS EC2 Sydney

### 6.2.1 Quá trình chọn nhà cung cấp

Kế hoạch ban đầu dùng một VPS DigitalOcean nhờ credit sinh viên, nhưng nhóm không có credit này (Azure for Students cũng xác minh thất bại). Trong ngày 07/10/2026 nhóm lần lượt thử ba hướng khác (PLAN §22, các phiên bản 2.6–2.8):

1. **Google Cloud Compute Engine** (Free Trial): bị dừng vì khoản tạm giữ thẻ 600.000 đồng khi đăng ký mà nhóm không đáp ứng được.
2. **Oracle Cloud Always Free:** không tạo được tài khoản.
3. **AWS EC2 Free Plan:** đăng ký và tạo máy thành công. Vùng Singapore bị chặn đối với tài khoản mới nên chọn vùng **Sydney (ap-southeast-2)**.

### 6.2.2 Cấu hình máy chủ

**Bảng 6.2 – Cấu hình máy chủ production**

| Hạng mục | Giá trị |
|---|---|
| Nhà cung cấp / vùng | AWS EC2 Free Plan, Sydney |
| Loại máy | `c7i-flex.large` – 2 vCPU, 4 GB RAM, kiến trúc x86_64 |
| Hệ điều hành | Ubuntu Server 24.04 LTS |
| Ổ đĩa | EBS gp3, 40 GiB |
| Địa chỉ | Elastic IP (IP cố định, không đổi khi tắt/bật máy) |
| Chi phí tham khảo | khoảng 0,11 USD/giờ khi máy chạy; credit 100 USD của gói Free Plan; EBS và Elastic IP vẫn tính phí khi máy dừng |
| Cách vận hành | Chỉ **bật khi test/demo**, dừng (Stop) khi không dùng để tiết kiệm credit |

**Bảng 6.3 – Security Group (tường lửa của AWS, chiều vào)**

| Cổng | Giao thức | Nguồn | Mục đích |
|---|---|---|---|
| 22 | TCP | Cho phép runner của GitHub và quản trị viên (bảo vệ bằng khóa SSH + fail2ban) | SSH, CI/CD deploy |
| 80 | TCP | Mọi nơi | HTTP, xin chứng chỉ |
| 443 | TCP | Mọi nơi | HTTPS |
| 443 | UDP | Mọi nơi | HTTP/3 |

Không mở cổng nào khác: PostgreSQL, Prometheus, Grafana… chỉ truy cập trong mạng Docker hoặc qua Caddy.

### 6.2.3 Chuẩn bị hệ điều hành

Script `deploy/scripts/provision-ubuntu.sh` (chạy một lần bằng `sudo`) thực hiện:

- Cài Docker Engine và Compose plugin từ kho apt chính thức; thêm user quản trị vào nhóm `docker`.
- Tạo **swap 2 GB** (`vm.swappiness=10`) – cần thiết vì tổng giới hạn RAM của các container khoảng 3,1 GB trên máy 4 GB; đặt múi giờ `Asia/Ho_Chi_Minh`.
- **Chỉ cho phép đăng nhập SSH bằng khóa** (tắt mật khẩu và đăng nhập root).
- Bật tường lửa `ufw` chỉ cho 22, 80, 443/tcp, 443/udp (kèm một luật cho Prometheus đọc node-exporter).
- Cài **fail2ban** (chặn dò mật khẩu SSH) và `unattended-upgrades` (tự cài bản vá bảo mật).

Lưu ý bảo mật đã được nhóm áp dụng: Docker tự thêm luật iptables bỏ qua `ufw` cho cổng được `ports:` publish, nên trong `docker-compose.yml` **chỉ Caddy publish cổng 80/443**.

## 6.3 Kiến trúc triển khai với Docker Compose

Toàn bộ hệ thống chạy bằng **một tệp Compose** (`deploy/docker-compose.yml`) gồm **12 service thường trực** trong cùng một mạng Docker, mỗi service đặt `restart: unless-stopped` và giới hạn RAM (`mem_limit`) để không một dịch vụ nào làm cạn bộ nhớ máy.

![Hình 6.1 – Sơ đồ triển khai hệ thống trên AWS EC2](../../uml/png/DEPLOY.png)

**Bảng 6.4 – Các service trong Docker Compose**

| Service | Image | Giới hạn RAM | Vai trò | Truy cập |
|---|---|---:|---|---|
| `caddy` | `caddy:2-alpine` | 128 MB | Reverse proxy, HTTPS tự động (Let's Encrypt), nén, header bảo mật | Internet (cổng 80/443, duy nhất) |
| `api` | `ghcr.io/<chủ repo>/elearning-api` | 512 MB | REST API Node.js/Express/Prisma; tự chạy `prisma migrate deploy` khi khởi động; `/metrics` ở cổng nội bộ 9464 | Qua Caddy (`api.eliuh.site`) |
| `web` | `ghcr.io/<chủ repo>/elearning-web` | 64 MB | Bản web tĩnh của app Expo (SPA) phục vụ bằng Caddy nhỏ | Qua Caddy (`eliuh.site`, `app.eliuh.site`) |
| `postgres` | `postgres:17-alpine` | 512 MB | Cơ sở dữ liệu, volume riêng, có healthcheck | Chỉ trong mạng Docker |
| `backup` | `postgres:17-alpine` | 128 MB | `pg_dump` hằng ngày vào thư mục `backups/` | Không có cổng |
| `prometheus` | `prom/prometheus:v3.15.0` | 384 MB | Thu thập metrics (giữ 15 ngày hoặc 2 GB) | Chỉ trong mạng Docker |
| `loki` | `grafana/loki:3.7` | 384 MB | Lưu log (giữ 7 ngày) | Chỉ trong mạng Docker |
| `alloy` | `grafana/alloy:v1.20.1` | 256 MB | Thu log mọi container đẩy vào Loki | Chỉ trong mạng Docker |
| `grafana` | `grafana/grafana:13.0` | 384 MB | Bảng điều khiển (dashboard) | Qua Caddy (`grafana.eliuh.site`, có đăng nhập) |
| `node-exporter` | `prom/node-exporter:v1.12.1` | 64 MB | Đo CPU/RAM/ổ đĩa của máy chủ | Chỉ Prometheus |
| `cadvisor` | `ghcr.io/google/cadvisor:v0.60.6` | 256 MB | Đo tài nguyên từng container | Chỉ Prometheus |
| `postgres-exporter` | `prometheuscommunity/postgres-exporter:v0.20.1` | 64 MB | Đo PostgreSQL | Chỉ Prometheus |

Hai service tùy chọn bật bằng profile (không bật ở production): `mailpit` (hộp thư giả để thử email) và `uptime-kuma` (trang theo dõi uptime). Tổng giới hạn RAM của 12 service khoảng **3,1 GB**.

**Volume dữ liệu:** `postgres_data` (cơ sở dữ liệu), `uploads` (tệp người dùng tải lên: ảnh đại diện, bài nộp project), `caddy_data`/`caddy_config` (chứng chỉ TLS), `prometheus_data`, `grafana_data`, `loki_data`, `alloy_data`. Dữ liệu nằm trên ổ đĩa nên được giữ qua mỗi lần Stop/Start máy.

### 6.3.1 Định tuyến và bảo mật tại Caddy

Tệp `deploy/caddy/Caddyfile` định tuyến theo tên miền:

| Tên miền | Đích | Ghi chú |
|---|---|---|
| `api.<domain>` | `api:4000` | Chặn `/metrics` từ bên ngoài (trả 404); giới hạn thân request 12 MB; `flush_interval -1` để luồng SSE của AI Tutor không bị giữ bộ đệm |
| `<domain>`, `app.<domain>` | `web:8080` | Thêm header bảo mật (HSTS, `nosniff`, `X-Frame-Options`, Referrer-Policy, Permissions-Policy); tệp băm tên (`/_expo/static/*`, `/assets/*`) cache `immutable` một năm |
| `grafana.<domain>` | `grafana:3000` | Có HSTS, đăng nhập bằng tài khoản quản trị Grafana |

### 6.3.2 Đóng gói ứng dụng (Dockerfile)

- **API** (`server/Dockerfile`): build nhiều tầng – tầng `build` cài đủ dependency và biên dịch TypeScript, tầng `prod-deps` chỉ giữ dependency production kèm Prisma CLI, tầng chạy dùng `node:24-bookworm-slim`; khi container khởi động, entrypoint chạy `prisma migrate deploy` rồi `node dist/server.js`.
- **Web** (`mobile/Dockerfile.web`): tầng build chạy `expo export --platform web` (SPA), URL API và site key CAPTCHA công khai được **nhúng vào bundle lúc build** (không đổi được lúc chạy); tầng chạy là một Caddy nhỏ phục vụ tệp tĩnh.

## 6.4 Tên miền, DNS và HTTPS

- **Tên miền** `eliuh.site` mua tại nhà đăng ký Tenten, hạn đến 03/10/2027. Quản lý DNS ngay tại Tenten.
- **Bốn bản ghi `A`** trỏ về Elastic IP của máy chủ (TTL 300 s lúc cấu hình): `@` (tên miền gốc), `app`, `api`, `grafana`. Không tạo bản ghi `AAAA` vì máy chủ chưa cấu hình IPv6 (Let's Encrypt thử IPv6 trước và sẽ thất bại).
- **HTTPS tự động:** Caddy tự xin và gia hạn chứng chỉ Let's Encrypt cho cả bốn tên khi DNS đã đúng; kiểm tra ngày 24/10/2026: chứng chỉ của `eliuh.site` và `api.eliuh.site` hợp lệ, hết hạn tháng 01/2027 (sẽ tự gia hạn). HTTP chuyển 308 sang HTTPS.
- **Email:** tên miền được xác minh với nhà cung cấp SMTP (Brevo) bằng các bản ghi SPF, DKIM, DMARC để thư OTP không vào spam.
- **Sự cố tên miền** (clientHold do chưa xác minh email chủ thể) và cách xử lý được ghi ở mục 7.3.4.

## 6.5 Kho image và quy ước phiên bản (GHCR)

Image của `api` và `web` được build trong CI và đẩy lên **GitHub Container Registry** (`ghcr.io`) bằng `GITHUB_TOKEN` có sẵn của workflow (không cần tạo thêm secret). Quy ước tag:

| Tag | Khi nào |
|---|---|
| `latest` | Mỗi lần push vào `main` |
| `sha-<7 ký tự đầu của commit>` | Mỗi lần build; dùng để quay về bản cũ (rollback) |
| `1.0.0`, `1.0` | Khi đẩy tag git dạng `v1.0.0` |

Trên máy chủ, `IMAGE_TAG` trong `.env` đặt là `latest`; muốn quay về bản cũ chỉ cần đổi sang `sha-xxxxxxx` (mục 6.9.3). Trước một số lần cập nhật dữ liệu quan trọng, nhóm còn gắn thêm tag `pre-<tên>-<ngày>` cho image đang chạy để làm điểm quay về.

## 6.6 CI/CD với GitHub Actions

Quy trình gồm hai workflow trong `.github/workflows/`:

![Hình 6.2 – Quy trình CI/CD: từ push code đến cập nhật production](../../uml/png/CICD.png)

### 6.6.1 `ci.yml` – kiểm thử

Chạy khi mở pull request vào `develop`/`main`, khi push vào `develop` và khi được `deploy.yml` gọi lại (`workflow_call`). Ba job độc lập:

| Job | Các bước |
|---|---|
| `server` | Dựng PostgreSQL 17 (service container) → `npm ci` → áp migration lên database test → `typecheck` → `lint` → kiểm tra định dạng Prettier → chạy toàn bộ test (unit + integration), AI ở chế độ `mock` |
| `mobile` | `npm ci` → `typecheck` → `lint` → Prettier → **kiểm tra tương phản màu** → `jest` |
| `docker` | Build thử hai image `api` và `web` (không đẩy) để phát hiện lỗi Dockerfile sớm |

### 6.6.2 `deploy.yml` – triển khai

Chạy khi push vào `main`, khi đẩy tag `v*` hoặc bấm *Run workflow* thủ công (chỉ có tác dụng trên `main`/tag). Mỗi lúc chỉ một lượt deploy chạy (`concurrency`), lượt mới đợi lượt cũ, không hủy giữa chừng để tránh deploy dở.

| Bước | Nội dung |
|---|---|
| 1. `preflight` | Kiểm tra đủ GitHub Secrets/Variables ngay từ đầu để báo lỗi sớm thay vì thất bại sau 15 phút build |
| 2. `ci` | Gọi lại `ci.yml`; test đỏ thì dừng, không build |
| 3. `build` (matrix `api`, `web`) | Build bằng Docker Buildx có cache GitHub Actions, đẩy lên GHCR kèm các tag ở mục 6.5; bản web nhúng URL API và site key CAPTCHA công khai |
| 4. `deploy` | Cài khóa SSH riêng của CI và `known_hosts` → `rsync` thư mục `deploy/` lên máy chủ (không đụng `.env`, `backups/`, chứng chỉ) → đăng nhập GHCR qua stdin → chạy `scripts/deploy.sh` trên máy chủ |
| 5. Kiểm tra sau deploy | Gọi `https://api.<domain>/api/v1/health` tối đa 12 lần, mỗi lần cách 10 s; thất bại thì workflow đỏ |

`scripts/deploy.sh` (chạy trên máy chủ) làm: kéo image mới → `docker compose up -d --remove-orphans` → khởi động lại Prometheus/Loki/Alloy/Grafana **chỉ khi tệp cấu hình của chúng đổi** (so sánh checksum) → nạp lại Caddy không rớt kết nối → chờ container `api` chuyển `healthy` (tối đa 3 phút, quá hạn thì in 60 dòng log và báo lỗi) → xóa image cũ quá 7 ngày.

Thời gian thực tế của một lượt deploy hoàn chỉnh (test → build → cập nhật) khoảng **6–7 phút**.

### 6.6.3 Bí mật và cấu hình

- **GitHub Secrets:** `SSH_HOST`, `SSH_USER`, `SSH_KEY` (khóa riêng **chỉ dành cho CI**, không dùng chung khóa quản trị), `SSH_KNOWN_HOSTS` (chống giả mạo máy chủ), `DOMAIN`, site key CAPTCHA công khai; tùy chọn `SSH_PORT`, `DEPLOY_PATH`. **GitHub Variable:** `CAPTCHA_PROVIDER`.
- **Không bao giờ** đặt ở GitHub: mật khẩu cơ sở dữ liệu, JWT secret, khóa Gemini, thông tin SMTP, secret key CAPTCHA. Các bí mật này chỉ nằm trong tệp `deploy/.env` (quyền 600) trên máy chủ, tệp được `.gitignore` và không bị `rsync` ghi đè.
- Bản sao lưu `.env` được cất ngoài repo ở nơi riêng tư của trưởng nhóm.

## 6.7 Phát hành ứng dụng di động và web

**Bảng 6.5 – Các kênh phân phối ứng dụng**

| Nền tảng | Cách phát hành | Ghi chú |
|---|---|---|
| Web máy tính / điện thoại | Image `web` triển khai cùng API, truy cập `https://eliuh.site` hoặc `https://app.eliuh.site` | Cập nhật tự động theo CI/CD |
| Android | **APK** build bằng **EAS Build**, profile `preview` (cài trực tiếp được); profile `production` xuất AAB cho Google Play (chưa dùng) | Cấu hình trong `mobile/eas.json`; API trỏ `https://api.eliuh.site/api/v1`; CAPTCHA reCAPTCHA v2 với site key công khai đặt ở EAS environment |
| Cập nhật không cần cài lại APK | **EAS Update** (OTA), channel `preview` / `production`; chạy `npm run update:preview -- "mô tả"` | Chỉ áp dụng khi đổi JavaScript/ảnh; đổi thư viện native hoặc nâng SDK thì phải build APK mới và tăng `version` trong `app.json` (runtime version theo `appVersion`) |
| iPhone | **PWA**: mở `https://app.eliuh.site` bằng Safari → Chia sẻ → *Thêm vào MH chính* | Chưa build IPA vì cần tài khoản Apple Developer (ngoài phạm vi) |
| Phát triển | Expo Go (SDK 57) quét QR | API trỏ IP LAN của máy chạy server |

Lý do có EAS Update: triển khai server/web **không** làm APK đã cài nhận mã mới; nhóm muốn APK tự nhận bản JavaScript mới mà không phải cài lại (PLAN §22, v2.22). Script `mobile/scripts/eas-update.mjs` lấy biến môi trường đúng profile, tắt đọc `.env` cục bộ và xóa cache Metro để bản cập nhật luôn gọi đúng API production.

## 6.8 Giám sát và ghi log

### 6.8.1 Kiến trúc giám sát

```
api:9464/metrics · node-exporter · cAdvisor · postgres-exporter · loki · alloy · grafana
              │  (Prometheus scrape mỗi 15 giây; cAdvisor 30 giây)
              ▼
         Prometheus ───────────────► Grafana (4 dashboard)
                                        ▲
 log của mọi container ──► Alloy ──► Loki (giữ 7 ngày)
```

**Bảng 6.6 – Nguồn dữ liệu của Prometheus (`deploy/prometheus/prometheus.yml`)**

| Job | Nguồn | Đo gì |
|---|---|---|
| `api` | `api:9464/metrics` (thư viện `prom-client`) | Số request, độ trễ theo route, tỷ lệ lỗi 4xx/5xx, CPU/RAM/event loop của Node.js, **số lần gọi AI** (`ai_requests_total`, `ai_request_duration_seconds`: theo tính năng, nhà cung cấp, trạng thái) |
| `node` | node-exporter | CPU, RAM, swap, ổ đĩa, mạng, load của máy chủ |
| `cadvisor` | cAdvisor | CPU/RAM/mạng/thời gian chạy của từng container, OOM kill |
| `postgres` | postgres-exporter | Kết nối, giao dịch/giây, cache hit, dung lượng, deadlock, khóa |
| `prometheus`, `loki`, `alloy`, `grafana` | chính các dịch vụ giám sát | Trạng thái (`up`) |

Prometheus giữ dữ liệu **15 ngày hoặc 2 GB**; Loki giữ log **7 ngày**. Endpoint `/metrics` chỉ truy cập được trong mạng Docker; Caddy trả 404 nếu gọi từ bên ngoài.

### 6.8.2 Bốn dashboard trong Grafana

Dashboard được nạp tự động từ các tệp JSON trong `deploy/grafana/dashboards/` (thư mục *E-Learning*), nên được quản lý bằng git và không bị lệch cấu hình.

**Bảng 6.7 – Các dashboard**

| Dashboard | Nội dung |
|---|---|
| **E-Learning · API** (trang chủ mặc định) | Request/giây; tỷ lệ lỗi 4xx/5xx; độ trễ p50/p95/p99 (tổng và theo route); request đang xử lý; CPU/RAM/event loop của Node.js; số lần gọi AI, độ trễ và tỷ lệ lỗi AI |
| **E-Learning · Hạ tầng** | CPU, RAM, swap, ổ đĩa, mạng, load của máy chủ; tài nguyên và uptime từng container; OOM kill; trạng thái scrape |
| **E-Learning · PostgreSQL** | Số kết nối, giao dịch/giây, cache hit, dung lượng database, deadlock, khóa, bảng lớn nhất |
| **E-Learning · Logs** | Số dòng log API theo mức độ, lỗi gần đây, request chậm hơn 1 giây, truy vấn Postgres chậm, lỗi Caddy/5xx, ô tìm kiếm log tự do |

`[[ẢNH DASHBOARD GRAFANA — CẦN CHỤP]]` – chụp màn hình `https://grafana.eliuh.site` ở dashboard *E-Learning · API* và *E-Learning · Hạ tầng* khi máy chủ đang chạy (ảnh bắt buộc cho báo cáo và slide; đặt vào `docs/report/figures/` và chèn dưới đây dưới dạng Hình 6.3, Hình 6.4).

*Hình 6.3 – Dashboard E-Learning · API trên Grafana* `[[ẢNH DASHBOARD GRAFANA — CẦN CHỤP]]`

*Hình 6.4 – Dashboard E-Learning · Hạ tầng trên Grafana* `[[ẢNH DASHBOARD GRAFANA — CẦN CHỤP]]`

### 6.8.3 Ghi log

API dùng **pino** (JSON, không ghi mật khẩu/token, không ghi nội dung người dùng gửi cho AI), Caddy ghi log JSON. Alloy đọc log mọi container qua Docker socket, Loki lưu để truy vấn trong Grafana (ví dụ lọc request chậm, lỗi 5xx, dòng log có lý do lỗi AI). Docker cũng giới hạn kích thước log của từng container để không đầy ổ đĩa.

### 6.8.4 Hạn chế hiện tại

Chưa cấu hình **alert rule** (cảnh báo tự động qua email/chat) trong Grafana; việc theo dõi hiện là chủ động mở dashboard. Điều này được ghi vào danh sách cải tiến (mục 7.5).

## 6.9 Sao lưu, khôi phục và quay về bản cũ

### 6.9.1 Sao lưu

**Bảng 6.8 – Các lớp sao lưu**

| Lớp | Cách làm | Tần suất / lưu giữ |
|---|---|---|
| Dump database tự động | Container `backup` chạy `pg_dump` định dạng nén (`-Fc`) vào `deploy/backups/`; ghi vào tệp `.partial` rồi đổi tên khi thành công; thử lại tối đa 6 lần cách nhau 5 phút nếu lỗi; chờ database sẵn sàng trước khi dump | Mỗi ngày lúc 20:00 UTC (03:00 giờ Việt Nam), giữ 7 bản mới nhất |
| Sao lưu thủ công | Lệnh `pg_dump` chạy tạm từ container `backup` ra tệp `manual-*.dump` (không bị xóa tự động) | Trước mỗi lần cập nhật dữ liệu quan trọng |
| Sao lưu trước mỗi lần deploy lớn | Dump database, bản `.env` và gắn tag image `pre-<tên>-<ngày>` vào thư mục riêng `deployment-backups/<ngày>-<tên>` trên máy chủ | Mỗi đợt thay đổi lớn |
| Tệp người dùng tải lên | Nén volume `elearning_uploads` ra `.tgz` (không nằm trong dump) | Thủ công khi cần |
| Snapshot ổ đĩa EBS | Chính sách vòng đời (Data Lifecycle Manager) của AWS đặt cho volume có tag `Backup=daily`, giữ 7 bản; nằm **ngoài** máy chủ | Hằng ngày. `[[CẦN NHÓM BỔ SUNG: xác nhận snapshot đầu tiên đã được tạo (EC2 → Snapshots) và ngày kiểm tra]]` |

Nguyên tắc: bản sao lưu nằm trên chính máy chủ sẽ mất nếu máy hỏng, vì vậy cần chép định kỳ về máy của trưởng nhóm bằng `scp` và dựa vào snapshot EBS. Việc khôi phục sang một cơ sở dữ liệu mới (scratch restore) đã được nhóm kiểm chứng khi hoàn thiện triển khai.

### 6.9.2 Khôi phục database

```bash
cd ~/elearning/deploy
docker compose stop api                      # ngắt kết nối vào database
docker compose exec -T postgres pg_restore -U elearning -d elearning \
  --clean --if-exists --no-owner < backups/<tệp>.dump
docker compose start api
```

Khôi phục lên **máy chủ mới**: dựng lại theo mục 6.10.4, dùng lại **đúng** `TOTP_ENC_KEY` và `JWT_SECRET` cũ (mất `TOTP_ENC_KEY` thì không ai đăng nhập 2FA được), chạy `docker compose up -d postgres`, chờ `healthy`, `pg_restore`, rồi khởi động `api`. Kiểm tra bằng `\dt` trong `psql`, `GET /api/v1/health` và đăng nhập thử.

### 6.9.3 Quay về bản cũ (rollback)

1. Mở `deploy/.env` trên máy chủ, đổi `IMAGE_TAG=sha-xxxxxxx` (mã commit của bản tốt gần nhất) hoặc tag `pre-<tên>-<ngày>`.
2. Chạy `bash scripts/deploy.sh` (kéo đúng image đó, `up -d`, chờ `api` healthy).
3. Sau khi sửa xong lỗi, đặt lại `IMAGE_TAG=latest`.

Lưu ý: tag `pre-*` cũ hơn 7 ngày bị `deploy.sh` dọn cùng image không dùng; nếu migration đã đổi dữ liệu thì quay lại image cũ cần đi kèm khôi phục database từ bản sao lưu cùng thời điểm.

## 6.10 Hướng dẫn cài đặt

### 6.10.1 Dành cho người dùng cuối

**Cách 1 – Web (mọi thiết bị):** mở `https://eliuh.site` (hoặc `https://app.eliuh.site`) trong trình duyệt, đăng ký/đăng nhập.

**Cách 2 – Android (APK):**

1. Mở liên kết tải APK do nhóm cung cấp trên điện thoại Android (từ Android 10 trở lên). `[[CẦN NHÓM BỔ SUNG: liên kết/QR tải APK (EAS build) và ngày build gần nhất]]`
2. Cho phép cài đặt từ nguồn không xác định khi hệ thống hỏi, rồi cài.
3. Mở ứng dụng, đăng nhập bằng tài khoản demo (xem `server/README.md` mục 4 – tài khoản học viên, giảng viên và quản trị viên mẫu).
4. Các bản sửa lỗi JavaScript sau này được tự nhận qua EAS Update, không cần cài lại.

**Cách 3 – iPhone (PWA):** mở `https://app.eliuh.site` bằng Safari → nút Chia sẻ → *Thêm vào MH chính*; ứng dụng chạy toàn màn hình như app.

### 6.10.2 Dành cho người phát triển (chạy local)

Yêu cầu: Node.js 24, npm, Git; điện thoại cài Expo Go tương thích **SDK 57**, cùng mạng Wi-Fi với máy chạy server.

```bash
# 1) Server (thư mục server/)
cd server
npm install                          # tự chạy prisma generate
cp .env.example .env                 # đặt JWT_SECRET (>= 32 ký tự ngẫu nhiên)
cp .env.test.example .env.test
npm run db:start                     # PostgreSQL nhúng, cổng 5433
npm run db:migrate && npm run db:migrate:test
npm run prisma:seed                  # dữ liệu mẫu (xóa rồi tạo lại)
npm run dev                          # http://localhost:4000/api/v1/health

# 2) Mobile (thư mục mobile/)
cd ../mobile
npm install
cp .env.example .env                 # EXPO_PUBLIC_API_URL=http://<IP-LAN>:4000/api/v1
npx expo start                       # quét QR bằng Expo Go (npx expo start -c để xóa cache)
```

Lưu ý: dùng **IP LAN** của máy chạy server, không dùng `localhost` trên điện thoại thật (Android Emulator dùng `10.0.2.2`); không cùng mạng thì dùng `npx expo start --tunnel`. Chạy kiểm tra: `npm run typecheck`, `npm run lint`, `npm test` trong từng thư mục.

### 6.10.3 Câu hỏi thường gặp khi cài đặt

| Triệu chứng | Cách xử lý |
|---|---|
| App không kết nối được API | Kiểm tra `EXPO_PUBLIC_API_URL` (IP LAN, không dùng `localhost`), tường lửa Windows mở cổng 4000, cùng Wi-Fi; hoặc dùng `--tunnel` |
| Expo Go báo sai phiên bản | Cài Expo Go tương thích SDK 57; chạy `npx expo install --check` |
| Màn hình lỗi lạ sau khi sửa `.env` | Khởi động lại Metro bằng `npx expo start -c` |
| Server báo `Invalid environment variables` | Xem biến được nêu trong log (ví dụ `JWT_SECRET` ngắn hơn 32 ký tự, `TOTP_ENC_KEY` không đủ 32 byte base64) |
| Không nhận được email OTP | Nếu `SMTP_HOST` để trống, API chỉ ghi nội dung thư ra log; kiểm tra cấu hình SMTP, tên miền gửi đã *Verified*, thư mục Spam |
| Mã 2FA luôn báo sai | Đồng bộ giờ tự động trên điện thoại và máy chủ (`timedatectl`) |

### 6.10.4 Dựng hệ thống production từ đầu (tóm tắt)

Hướng dẫn đầy đủ từng bước, có lệnh kiểm tra, nằm ở `deploy/README.md` (16 mục). Trình tự:

1. Tạo máy Ubuntu 24.04 x86_64 (≥ 2 vCPU/4 GB RAM/40 GB), gắn IP cố định, mở cổng 22, 80, 443 (TCP) và 443 (UDP).
2. Clone repo, chạy `sudo bash deploy/scripts/provision-ubuntu.sh`, đăng xuất rồi SSH lại.
3. Trỏ bốn bản ghi DNS `A` (`@`, `app`, `api`, `grafana`) về IP máy chủ, kiểm tra bằng `nslookup`.
4. Chép `deploy/` vào `~/elearning/deploy`, tạo `.env` từ `.env.example` (`chmod 600`), sinh ngẫu nhiên `POSTGRES_PASSWORD`, `JWT_SECRET`, `TOTP_ENC_KEY`, `GRAFANA_ADMIN_PASSWORD`; điền `DOMAIN`, `ACME_EMAIL`, SMTP, CAPTCHA, Gemini.
5. Khởi động hạ tầng `docker compose up -d caddy postgres backup prometheus loki alloy grafana node-exporter cadvisor postgres-exporter`, kiểm tra HTTPS.
6. Tạo khóa SSH riêng cho CI và các GitHub Secrets/Variables; chạy workflow **Deploy** để build và đưa `api`, `web` lên.
7. Nạp dữ liệu mẫu **một lần duy nhất** trên database mới bằng `SEED_FORCE=1` (xóa toàn bộ dữ liệu rồi tạo lại – tuyệt đối không chạy khi đã có người dùng thật).
8. Kiểm tra `https://api.<domain>/api/v1/health`, đăng nhập Grafana và **đổi mật khẩu quản trị ngay**.

## 6.11 Quy trình vận hành (runbook)

**Bảng 6.9 – Các tình huống vận hành thường gặp**

| Tình huống | Các bước |
|---|---|
| Bật máy trước buổi demo | AWS Console → EC2 → chọn instance → *Instance state → Start*; chờ *status checks* đạt; mọi container tự chạy lại sau 1–2 phút (`restart: unless-stopped`); kiểm tra `https://api.eliuh.site/api/v1/health`. Nếu thiếu service: `cd ~/elearning/deploy && docker compose up -d` |
| Tắt máy khi không dùng | *Instance state → Stop* (**không** chọn Terminate – xóa máy; **không** dùng `docker compose down -v` – xóa volume dữ liệu). Lưu ý EBS và Elastic IP vẫn tính phí khi máy dừng |
| Phát hành bản mới | Merge vào `main` (hoặc đẩy tag `v1.0.0`) → `deploy.yml` tự chạy; theo dõi tab Actions; nếu cần deploy tay: `cd ~/elearning/deploy && bash scripts/deploy.sh` |
| Quay về bản cũ | Mục 6.9.3 |
| Sửa cấu hình (`.env`) | Sửa tệp rồi `docker compose up -d` (chỉ tạo lại container có thay đổi); đổi tên miền hoặc site key CAPTCHA thì phải build lại web và APK |
| Xem log / trạng thái | `docker compose ps`; `docker compose logs -f --tail 100 api`; `docker stats --no-stream`; hoặc dashboard Logs trên Grafana |
| Thử nghiệm cập nhật video xem thử YouTube | Sao lưu database trước, chạy script `updateCoursePreviews.ts` ở chế độ dry-run, đọc kết quả rồi mới thêm `--apply`; chạy lại dry-run phải báo 0 thay đổi |
| Nâng quyền admin/giảng viên | `setUserRole.ts --email <e> --role ADMIN` (dry-run mặc định, thêm `--apply` để ghi); không có API đăng ký ADMIN (BR-30) |
| Gắn khóa dịch cho thông báo cũ | `backfillNotificationKeys.ts` (dry-run, rồi `--apply`) |
| Thay video seed đã chết | `replaceLessonVideo.ts` (dry-run, rồi `--apply`); xem mục 7.3.3 |
| Gia hạn chứng chỉ | Tự động bởi Caddy; chỉ cần DNS đúng và cổng 80/443 mở |
| Hết dung lượng ổ đĩa | `df -h`, `docker system df`, `docker image prune -af`; xóa bớt bản sao lưu cũ đã chép về máy |
| Máy hết RAM / container bị `Killed` | `free -h`, dashboard Hạ tầng (OOM kill); kiểm tra swap còn bật; tắt service không cần |
| Dọn khi kết thúc dự án | Sao lưu database và uploads ra ngoài, rồi tự quyết định xóa instance, ổ đĩa, snapshot, **giải phóng Elastic IP**, dọn DNS |

Các script production của server đều chạy trong container `api` bằng lệnh có dạng `docker compose exec api /opt/tools/node_modules/.bin/tsx scripts/<tên>.ts [tham số] [--apply]` (image production không cài `tsx` trong `PATH`). Quy tắc chung: **luôn sao lưu database và dry-run trước**; không chạy `db:seed` hoặc `SEED_FORCE=1` trên production có người dùng.

## 6.12 Kết quả triển khai

- **Hệ thống chạy thật** tại `https://eliuh.site` (web), `https://api.eliuh.site` (API) và `https://grafana.eliuh.site` (giám sát); 12 container chạy, `GET /api/v1/health` trả `{"status":"ok","db":"ok"}`.
- **CI/CD hoạt động:** push vào `main` tự động kiểm thử, build, đẩy image lên GHCR và cập nhật máy chủ trong khoảng 6–7 phút; GitHub Secrets và Variables đã cấu hình.
- **Bảo mật triển khai:** SSH chỉ bằng khóa, fail2ban, ufw, chỉ Caddy mở cổng ra Internet, chứng chỉ Let's Encrypt, header bảo mật (kiểm ở TC-PROD-02…08, chương 5).
- **Sao lưu:** dump database hằng ngày, sao lưu trước mỗi đợt thay đổi lớn, snapshot EBS hằng ngày; đã kiểm chứng khôi phục sang database mới.
- **Android:** APK `preview` đã build bằng EAS và nhận cập nhật qua EAS Update; **iPhone** dùng PWA.
- **Việc chưa làm:** alert rule trong Grafana, đẩy bản sao lưu ra kho ngoài máy chủ ngoài snapshot EBS, tag phát hành `v1.0.0` và GitHub Release kèm APK (dự kiến 31/10–01/11/2026 theo lịch rút gọn, hạn nộp 05/11/2026) `[[CẦN NHÓM BỔ SUNG: ngày phát hành v1.0.0 thực tế]]`.


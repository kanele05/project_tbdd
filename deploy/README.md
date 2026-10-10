# Triển khai E-Learning lên VPS (Docker Compose)

Hướng dẫn **từng bước, cho người làm lần đầu**: đưa toàn bộ hệ thống (API, bản web của app, PostgreSQL, HTTPS tự động, giám sát Grafana) lên **một máy chủ Ubuntu** bằng Docker Compose. Ví dụ dùng **AWS EC2**; nhà cung cấp VPS khác (DigitalOcean, Google Cloud, Oracle Cloud, Vultr...) làm tương tự, chỉ khác phần tạo máy và tường lửa ở mục 1–2.

Làm tuần tự từ mục 1 đến mục 13; mỗi mục có lệnh cụ thể và cách **kiểm tra đã thành công**. Mọi lệnh ở khối `bash` chạy trên VPS, trừ khi ghi rõ "trên máy bạn".

> Quy ước: `<domain>` là tên miền gốc của bạn (dự án mẫu dùng `eliuh.site`), `<VPS_IP>` là địa chỉ IPv4 công khai của máy chủ, `<key>.pem` là file khóa SSH của bạn.

## Mục lục

0. [Tổng quan](#0-tổng-quan)
1. [Tạo máy chủ](#1-tạo-máy-chủ)
2. [Kết nối SSH và mở cổng tường lửa](#2-kết-nối-ssh-và-mở-cổng-tường-lửa)
3. [Chuẩn bị hệ điều hành (`provision-ubuntu.sh`)](#3-chuẩn-bị-hệ-điều-hành-provision-ubuntush)
4. [Kiểm tra Docker](#4-kiểm-tra-docker)
5. [Trỏ DNS](#5-trỏ-dns)
6. [Triển khai lần đầu](#6-triển-khai-lần-đầu)
7. [Grafana (giám sát)](#7-grafana-giám-sát)
8. [GitHub Actions: CI/CD tự động](#8-github-actions-cicd-tự-động)
9. [Build APK Android bằng EAS](#9-build-apk-android-bằng-eas)
10. [Sao lưu và khôi phục database](#10-sao-lưu-và-khôi-phục-database)
11. [CAPTCHA: reCAPTCHA v2 hoặc Turnstile](#11-captcha-recaptcha-v2-hoặc-turnstile)
12. [Gửi email: Brevo hoặc Resend (SMTP)](#12-gửi-email-brevo-hoặc-resend-smtp)
13. [Google Gemini (AI)](#13-google-gemini-ai)
14. [Tắt/bật máy để tiết kiệm chi phí](#14-tắtbật-máy-để-tiết-kiệm-chi-phí)
15. [Xử lý sự cố thường gặp](#15-xử-lý-sự-cố-thường-gặp)
16. [Phụ lục: Mailpit và Uptime Kuma (tùy chọn)](#16-phụ-lục-mailpit-và-uptime-kuma-tùy-chọn)

---

## 0. Tổng quan

### 0.1 Hệ thống gồm những gì

```
Internet ──► Caddy (cổng 80/443, HTTPS tự động Let's Encrypt)
               ├─ api.<domain>      ──► api   (Node/Express/Prisma, image GHCR, cổng nội bộ 4000)
               ├─ <domain>, app.<domain> ──► web (bản web của app Expo, file tĩnh, image GHCR)
               └─ grafana.<domain>  ──► grafana (cổng nội bộ 3000)

   Prometheus ──scrape──► api:9464/metrics · node-exporter · cAdvisor · postgres-exporter · loki · alloy · grafana
   Alloy ──thu log mọi container──► Loki ──► Grafana
   postgres (volume riêng) ◄── api · backup (pg_dump mỗi ngày) · postgres-exporter
```

12 service chạy thường trực (định nghĩa trong [docker-compose.yml](docker-compose.yml)):

| Service             | Vai trò                                   | Ai truy cập được                                             |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `caddy`             | Reverse proxy + HTTPS                     | **Internet** (cổng 80, 443 — cổng duy nhất mở ra ngoài)      |
| `api`               | REST API; `/metrics` ở cổng nội bộ 9464   | Qua Caddy (`api.<domain>`); `/metrics` chỉ trong mạng Docker |
| `web`               | Bản web của app                           | Qua Caddy (`<domain>`, `app.<domain>`)                       |
| `postgres`          | Cơ sở dữ liệu PostgreSQL 17               | Chỉ trong mạng Docker                                        |
| `backup`            | `pg_dump` hằng ngày vào `deploy/backups/` | Không có cổng                                                |
| `prometheus`        | Thu thập metrics                          | Chỉ trong mạng Docker                                        |
| `loki`, `alloy`     | Lưu log / thu log từ các container        | Chỉ trong mạng Docker                                        |
| `grafana`           | Dashboard                                 | Qua Caddy (`grafana.<domain>`, có đăng nhập)                 |
| `node-exporter`     | Đo CPU/RAM/ổ đĩa của máy chủ              | Chỉ Prometheus                                               |
| `cadvisor`          | Đo từng container                         | Chỉ Prometheus                                               |
| `postgres-exporter` | Đo PostgreSQL                             | Chỉ Prometheus                                               |

Hai service **tùy chọn** (bật bằng profile, xem [mục 16](#16-phụ-lục-mailpit-và-uptime-kuma-tùy-chọn)): `mailpit` (hộp thư giả để thử email) và `uptime-kuma` (trang theo dõi uptime).

Tổng giới hạn RAM đặt trong compose (`mem_limit`) khoảng 3,1 GB, vừa với máy 4 GB kèm swap 2 GB do script ở mục 3 tạo.

### 0.2 Những thứ bạn cần tự chuẩn bị

| Việc                                                         | Mục | Ghi chú                                                            |
| ------------------------------------------------------------ | --- | ------------------------------------------------------------------ |
| Tài khoản nhà cung cấp VPS (vd. AWS)                         | 1   | Máy Ubuntu 24.04 **x86_64**, tối thiểu 2 vCPU / 4 GB RAM / 40 GB ổ |
| Tên miền và quyền sửa DNS (vd. mua tại Tenten)               | 5   | Cần 4 bản ghi `A`                                                  |
| Tài khoản GitHub chứa repo (để build image và chạy CI/CD)    | 8   |                                                                    |
| Khóa CAPTCHA (Google reCAPTCHA v2 hoặc Cloudflare Turnstile) | 11  | Chỉ cần nếu bật CAPTCHA ở đăng ký/đăng nhập                        |
| Tài khoản email SMTP (Brevo hoặc Resend) + xác minh tên miền | 12  | Không có thì API không gửi được OTP                                |
| Khóa Gemini (Google AI Studio)                               | 13  | Không có thì AI chạy chế độ `mock` (câu trả lời giả)               |
| Tài khoản Expo (miễn phí)                                    | 9   | Chỉ cần nếu build APK Android                                      |

> **Tuyệt đối không** dán mật khẩu, API key, private key vào chat, issue, commit hay ảnh chụp màn hình gửi người khác. Bí mật production chỉ nằm trong `deploy/.env` trên VPS và GitHub Secrets.

### 0.3 Cấu trúc thư mục `deploy/`

```
deploy/
├── docker-compose.yml        # toàn bộ hệ thống
├── .env.example              # mẫu cấu hình → sao chép thành .env (không commit)
├── caddy/Caddyfile           # HTTPS + định tuyến; caddy/sites/*.example = site tùy chọn
├── prometheus/prometheus.yml # danh sách nơi lấy metrics
├── loki/loki.yaml            # lưu log 7 ngày
├── alloy/config.alloy        # thu log container → Loki
├── grafana/
│   ├── provisioning/         # nguồn dữ liệu + nạp dashboard tự động
│   └── dashboards/           # api.json · infrastructure.json · postgres.json · logs.json
├── backup/backup.sh          # sao lưu PostgreSQL hằng ngày
└── scripts/
    ├── provision-ubuntu.sh   # chuẩn bị máy Ubuntu mới (Docker, tường lửa, swap...)
    └── deploy.sh             # cập nhật hệ thống (GitHub Actions gọi script này)
```

---

## 1. Tạo máy chủ

### 1.1 Tạo khóa SSH

Khóa SSH thay cho mật khẩu để đăng nhập máy chủ. Với **AWS EC2**: vào **EC2 → Key pairs → Create key pair**, chọn kiểu `ED25519`, định dạng `.pem`, tải file về và cất ở nơi an toàn (AWS chỉ cho tải một lần). Trên Linux/macOS/Git Bash: `chmod 400 <key>.pem`.

Với nhà cung cấp khác, tạo khóa trên máy bạn rồi dán khóa công khai vào bước tạo máy:

```bash
ssh-keygen -t ed25519 -C "elearning-admin" -f ~/.ssh/elearning_admin
cat ~/.ssh/elearning_admin.pub        # khóa công khai - dán vào trang tạo máy
```

> File khóa riêng (`.pem` hoặc không có đuôi `.pub`) là **bí mật**: không đưa lên máy chủ, repo hay GitHub.

### 1.2 Tạo máy ảo

Với AWS: **EC2 → Launch instance**:

| Mục           | Chọn                                                               |
| ------------- | ------------------------------------------------------------------ |
| Region        | Gần người dùng nhất (vd. Singapore hoặc Sydney)                    |
| Image (AMI)   | **Ubuntu Server 24.04 LTS**, kiến trúc **64-bit (x86)**            |
| Instance type | **2 vCPU / 4 GiB RAM** trở lên (vd. `t3.medium`, `c7i-flex.large`) |
| Key pair      | Khóa tạo ở 1.1                                                     |
| Network       | Cho phép IPv4 công khai; Security Group xem mục 2.2                |
| Storage       | **gp3, 40 GiB** trở lên                                            |

> Dự án chạy trên **x86_64**. Máy ARM (vd. Graviton, Ampere) cần image Docker `arm64`, workflow hiện tại chỉ build `amd64`.

### 1.3 Gắn IP cố định

IP công khai mặc định của EC2 **đổi mỗi lần tắt/bật máy**, làm DNS sai. Hãy cấp **Elastic IP** (EC2 → Elastic IPs → Allocate → Associate với instance). Địa chỉ này là `<VPS_IP>` ở các mục sau. Lưu ý chi phí ở [mục 14](#14-tắtbật-máy-để-tiết-kiệm-chi-phí).

---

## 2. Kết nối SSH và mở cổng tường lửa

### 2.1 Đăng nhập lần đầu

Trên máy bạn (user mặc định của Ubuntu trên AWS là `ubuntu`):

```bash
ssh -i <key>.pem ubuntu@<VPS_IP>
```

Lần đầu SSH hỏi dấu vân tay (fingerprint) của máy chủ. Nên đối chiếu với fingerprint hiển thị trong **system log** của máy (AWS: **Actions → Monitor and troubleshoot → Get system log**) trước khi gõ `yes`; nếu sau này thấy cảnh báo khóa máy chủ thay đổi bất ngờ thì dừng lại, đừng tắt kiểm tra.

**Kiểm tra:** thấy dòng chào `Welcome to Ubuntu 24.04...` và dấu nhắc `ubuntu@...:~$`.

### 2.2 Mở cổng ở tường lửa của nhà cung cấp (Security Group)

Chỉ mở đúng các cổng sau (inbound):

| Cổng | Giao thức | Nguồn                                 | Để làm gì            |
| ---- | --------- | ------------------------------------- | -------------------- |
| 22   | TCP       | **IP của bạn** (không để `0.0.0.0/0`) | SSH                  |
| 80   | TCP       | `0.0.0.0/0`                           | HTTP + xin chứng chỉ |
| 443  | TCP       | `0.0.0.0/0`                           | HTTPS                |
| 443  | UDP       | `0.0.0.0/0`                           | HTTP/3               |

> Nếu bạn dùng GitHub Actions để deploy (mục 8), runner của GitHub kết nối SSH từ dải IP thay đổi, nên cổng 22 phải mở cho nguồn đó (bảo vệ bằng khóa SSH + fail2ban do script mục 3 cài), hoặc dùng cách deploy tay ở mục 8.5.

Không mở cổng nào khác (PostgreSQL, Grafana, Prometheus... chỉ truy cập qua Docker network hoặc Caddy).

---

## 3. Chuẩn bị hệ điều hành (`provision-ubuntu.sh`)

Script [scripts/provision-ubuntu.sh](scripts/provision-ubuntu.sh) dành riêng cho **Ubuntu 24.04**, chạy bằng `sudo`, và làm các việc sau:

- cài Docker Engine + Compose plugin từ kho apt chính thức, thêm user quản trị vào nhóm `docker`;
- tạo **swap 2 GB** (`vm.swappiness=10`), đặt múi giờ `Asia/Ho_Chi_Minh`;
- tắt đăng nhập SSH bằng mật khẩu và đăng nhập root (chỉ dùng khóa SSH);
- bật tường lửa `ufw` chỉ cho phép 22, 80, 443/tcp, 443/udp, cộng một luật cho Prometheus đọc node-exporter (`172.30.0.0/24 → 172.17.0.1:9100`);
- cài **fail2ban** (chặn dò mật khẩu SSH) và tự động cập nhật bản vá bảo mật.

Script yêu cầu user quản trị (mặc định `ubuntu`, đổi bằng biến `DEPLOY_USER`) **đã có** `~/.ssh/authorized_keys`, nếu không script dừng để tránh khóa bạn ngoài máy chủ. Repo là công khai nên có thể clone thẳng trên VPS:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone --depth 1 https://github.com/kanele05/project_tbdd.git ~/project_tbdd
cd ~/project_tbdd
bash -n deploy/scripts/provision-ubuntu.sh        # kiểm tra cú pháp, không in gì là tốt
sudo bash deploy/scripts/provision-ubuntu.sh      # mất vài phút
```

Nếu bạn fork repo, thay URL bằng repo của bạn. Khi script in `Provisioning complete`, **đăng xuất rồi SSH lại** để nhóm `docker` có hiệu lực.

> Thích tự cài từng bước thay vì chạy script? Mở file script và làm theo từng khối lệnh. Đừng bỏ bước nào liên quan đến swap và `ufw`.

**Kiểm tra** (sau khi SSH lại):

```bash
free -h                                           # dòng Swap: 2.0Gi
sudo ufw status verbose                           # Status: active, có 22, 80, 443 và luật 9100 từ 172.30.0.0/24
sudo sshd -T | grep -E "^(passwordauthentication|permitrootlogin)"   # đều là "no"
sudo fail2ban-client status sshd                  # Status for the jail: sshd
timedatectl                                       # System clock synchronized: yes (quan trọng cho mã 2FA)
```

> Docker tự thêm luật iptables **bỏ qua `ufw`** cho cổng được `ports:` publish. Vì vậy trong `docker-compose.yml` **chỉ Caddy** publish 80/443 (Mailpit nếu bật chỉ bind `127.0.0.1`). Đừng thêm `ports:` cho Postgres/Grafana/Prometheus — chúng sẽ lộ ra Internet.

---

## 4. Kiểm tra Docker

Script ở mục 3 đã cài Docker. Kiểm tra:

```bash
docker run --rm hello-world         # in "Hello from Docker!" (không cần sudo)
docker compose version              # Docker Compose version v2.x hoặc mới hơn
```

Nếu báo `permission denied`, bạn chưa đăng nhập SSH lại sau mục 3.

---

## 5. Trỏ DNS

Bạn cần **4 tên** trỏ về `<VPS_IP>`:

| Loại | Tên (Host)         | Giá trị    | TTL |
| ---- | ------------------ | ---------- | --- |
| A    | `@` (tên miền gốc) | `<VPS_IP>` | 300 |
| A    | `app`              | `<VPS_IP>` | 300 |
| A    | `api`              | `<VPS_IP>` | 300 |
| A    | `grafana`          | `<VPS_IP>` | 300 |

- Vào trang quản lý DNS của nơi bạn mua tên miền và tạo các bản ghi `A` ở trên. Tùy giao diện, ô "Tên" có thể là `@`, để trống, hoặc tên đầy đủ.
- **TTL = 300 giây** trong lúc cấu hình để sửa sai có hiệu lực nhanh; ổn định rồi tăng lên 3600.
- Nếu dùng Cloudflare làm DNS: đặt các bản ghi này ở chế độ **DNS only** (đám mây xám), không bật proxy (đám mây cam), để Caddy tự lấy được chứng chỉ.
- **Không** tạo bản ghi `AAAA` (IPv6) nếu máy chủ chưa cấu hình IPv6 — Let's Encrypt thử IPv6 trước và sẽ thất bại.

### Ví dụ: tên miền mua tại Tenten

1. Đăng nhập trang quản lý của Tenten → **Tên miền** → chọn tên miền → **Cài đặt DNS** (bản ghi DNS).
2. Nếu tên miền đã có sẵn bản ghi mặc định trỏ về trang đỗ tên miền, **sửa** bản ghi `@` thay vì tạo trùng.
3. Thêm lần lượt bốn bản ghi `A` ở bảng trên (`@`, `app`, `api`, `grafana`) rồi **Lưu**.
4. **Không** dùng chức năng "cấu hình theo IP" nếu tên miền đã có bản ghi khác: chức năng này có thể xóa toàn bộ bản ghi cũ (kể cả bản ghi email ở mục 12).

**Kiểm tra** (trên máy bạn; DNS có thể cần 5–30 phút để lan truyền):

```bash
nslookup <domain>
nslookup app.<domain>
nslookup api.<domain>
nslookup grafana.<domain>
```

Cả bốn phải trả về đúng `<VPS_IP>` trước khi sang mục 6 (Caddy chỉ xin được chứng chỉ HTTPS khi DNS đã đúng).

---

## 6. Triển khai lần đầu

### 6.1 Chép thư mục `deploy/` vào đúng vị trí

Thư mục làm việc trên VPS là `~/elearning/deploy` (đây cũng là mặc định mà GitHub Actions ở mục 8 đồng bộ vào). Từ bản clone ở mục 3:

```bash
mkdir -p ~/elearning
cp -r ~/project_tbdd/deploy ~/elearning/deploy
cd ~/elearning/deploy && ls -a
```

**Kiểm tra:** thấy `docker-compose.yml`, `.env.example`, `caddy`, `grafana`, `scripts`...

### 6.2 Tạo `.env`

File `.env` chứa mọi cấu hình và bí mật của production (đã được `.gitignore`, không bao giờ commit). Biến nào để trống và có chữ "BẮT BUỘC" trong [.env.example](.env.example) thì `docker compose` sẽ dừng và báo thiếu.

```bash
cd ~/elearning/deploy
cp .env.example .env
chmod 600 .env
# Sinh các bí mật ngẫu nhiên:
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|"           .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|"                         .env
sed -i "s|^TOTP_ENC_KEY=.*|TOTP_ENC_KEY=$(openssl rand -base64 32)|"                  .env
sed -i "s|^GRAFANA_ADMIN_PASSWORD=.*|GRAFANA_ADMIN_PASSWORD=$(openssl rand -hex 16)|" .env
# Tên miền và email liên hệ cho tài khoản Let's Encrypt:
sed -i "s|^DOMAIN=.*|DOMAIN=<domain>|"                .env
sed -i "s|^ACME_EMAIL=.*|ACME_EMAIL=you@example.com|" .env
nano .env        # xem lại; điền SMTP, CAPTCHA, Gemini theo các mục 11-13
```

Các biến quan trọng:

| Biến                                                                          | Ý nghĩa                                                                                               |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DOMAIN`, `ACME_EMAIL`                                                        | Tên miền gốc (không có `https://`) và email liên hệ Let's Encrypt. **Bắt buộc**                       |
| `POSTGRES_PASSWORD`                                                           | Mật khẩu PostgreSQL. **Bắt buộc**                                                                     |
| `JWT_SECRET`                                                                  | Khóa ký đăng nhập (≥ 32 ký tự). Đổi = mọi người dùng bị đăng xuất. **Bắt buộc**                       |
| `TOTP_ENC_KEY`                                                                | Khóa AES mã hóa bí mật 2FA (32 byte base64). **Bắt buộc**, đừng đổi sau khi đã có người bật 2FA       |
| `GRAFANA_ADMIN_PASSWORD`                                                      | Mật khẩu quản trị Grafana. **Bắt buộc**                                                               |
| `GHCR_OWNER`, `IMAGE_TAG`                                                     | Chủ repo (viết thường) và phiên bản image. Fork repo thì **đổi `GHCR_OWNER`** thành tài khoản của bạn |
| `PUBLIC_BASE_URL`                                                             | Mặc định `https://api.<DOMAIN>`; chỉ đặt khi API ở địa chỉ khác                                       |
| `SMTP_*`, `MAIL_FROM`                                                         | Gửi email OTP — mục 12                                                                                |
| `CAPTCHA_PROVIDER`, `RECAPTCHA_*`, `TURNSTILE_*`, `CAPTCHA_ALLOWED_HOSTNAMES` | CAPTCHA — mục 11                                                                                      |
| `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`                               | AI — mục 13                                                                                           |
| `COMPOSE_PROFILES`                                                            | Để **trống** ở production (profile `mail`, `status` chỉ để thử/tùy chọn)                              |

> **Cất `TOTP_ENC_KEY`, `JWT_SECRET`, `POSTGRES_PASSWORD` vào trình quản lý mật khẩu.** Mất `TOTP_ENC_KEY` = không ai đăng nhập 2FA được. Mật khẩu Postgres chỉ được áp dụng **lần đầu** volume dữ liệu được tạo; đổi trong `.env` sau đó không đổi mật khẩu trong database (xem mục 15). Không dùng ký tự `$` trong giá trị.

**Kiểm tra:**

```bash
grep -E "^(DOMAIN|ACME_EMAIL|POSTGRES_PASSWORD|JWT_SECRET|TOTP_ENC_KEY|GRAFANA_ADMIN_PASSWORD)=" .env   # cả 6 dòng đều có giá trị
docker compose config --quiet && echo "compose hop le"
```

### 6.3 Khởi động hạ tầng (chưa cần image ứng dụng)

Hai image `api` và `web` chỉ có sau khi CI build lần đầu (mục 8). Trong lúc chờ, bật phần còn lại để kiểm tra DNS, HTTPS và Grafana:

```bash
docker compose up -d caddy postgres backup prometheus loki alloy grafana node-exporter cadvisor postgres-exporter
docker compose ps
```

_(Muốn thử Let's Encrypt mà không lo bị giới hạn số lần xin chứng chỉ: tạm đặt `ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory` trong `.env`, kiểm tra xong đổi lại bản thật rồi `docker compose up -d --force-recreate caddy` và xóa volume chứng chỉ staging `docker volume rm elearning_caddy_data` khi caddy đã dừng.)_

**Kiểm tra:** cột STATUS của mọi service là `Up` (postgres/prometheus/grafana có thêm `(healthy)` sau khoảng 30 giây).

### 6.4 Kiểm tra HTTPS

Chờ khoảng 1 phút để Caddy xin chứng chỉ, rồi:

```bash
curl -sI https://grafana.<domain> | head -3          # HTTP/2 302 (chuyển tới /login), HTTPS hợp lệ
curl -sI http://grafana.<domain> | head -3           # 308 chuyển sang https
docker compose logs caddy 2>&1 | grep -iE "certificate obtained|error" | tail
```

Mở trình duyệt: `https://grafana.<domain>` thấy trang đăng nhập Grafana **có ổ khóa**. Lúc này `https://api.<domain>/api/v1/health` trả `502` (API chưa chạy) — bình thường.

### 6.5 Chạy API và web lần đầu

Có hai cách; chọn **cách A** nếu bạn đã làm mục 8, hoặc **cách B** khi muốn chạy ngay.

**Cách A (khuyên dùng): để GitHub Actions build và deploy.** Làm mục 8 (tạo khóa SSH, GitHub Secrets, chạy workflow **Deploy**). Workflow build 2 image, đẩy lên GHCR, đồng bộ `deploy/` lên VPS và chạy `scripts/deploy.sh`.

**Cách B: build ngay trên VPS.** Chậm hơn (bản web mất khoảng 10 phút và nhiều RAM, nhờ có swap mới đủ) nhưng không cần CI:

```bash
cd ~/elearning/deploy
docker compose build api web
docker compose up -d
```

Đến khi API `healthy` (migration `prisma migrate deploy` chạy tự động lúc container khởi động):

```bash
docker compose ps api
curl -s https://api.<domain>/api/v1/health     # {"data":{"status":"ok","db":"ok"}}
```

Mở `https://app.<domain>` thấy app web.

### 6.6 Dữ liệu mẫu (chạy đúng **một lần**, sau khi `api` đã chạy)

```bash
docker compose exec -e SEED_FORCE=1 api /opt/tools/node_modules/.bin/tsx prisma/seed.ts
```

> ⚠ Seed **xóa toàn bộ dữ liệu** rồi tạo lại dữ liệu mẫu (tài khoản demo, khóa học...). Chỉ chạy trên database mới, **không bao giờ** chạy khi đã có người dùng thật. Biến `SEED_FORCE=1` là lớp bảo vệ: không có nó, seed từ chối chạy ở `NODE_ENV=production`. Tài khoản demo nằm ở [server/prisma/seed-data/users.ts](../server/prisma/seed-data/users.ts).

Nếu không muốn dữ liệu mẫu, bỏ qua bước này; API vẫn chạy với database trống (đăng ký tài khoản mới như bình thường).

---

## 7. Grafana (giám sát)

1. Mở `https://grafana.<domain>`. Đăng nhập: user `GRAFANA_ADMIN_USER` (mặc định `admin`), mật khẩu `GRAFANA_ADMIN_PASSWORD` trong `.env`:
   ```bash
   grep GRAFANA_ADMIN ~/elearning/deploy/.env
   ```
2. **Đổi mật khẩu ngay:** biểu tượng người dùng (góc dưới trái) → **Profile → Change password**. Quên mật khẩu:
   ```bash
   docker compose exec grafana grafana cli admin reset-admin-password "<mat-khau-moi>"
   ```
3. Vào **Dashboards → E-Learning** (thư mục tự nạp từ `grafana/dashboards/`). Có 4 dashboard:

| Dashboard                                   | Xem gì                                                                                                                                                                | Dữ liệu từ              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **E-Learning · API** _(trang chủ mặc định)_ | Request/s, tỷ lệ lỗi 4xx/5xx, latency p50/p95/p99 (tổng và theo route), request đang xử lý, CPU/RAM/event loop của Node.js, lệnh gọi AI (số lượng, độ trễ, tỷ lệ lỗi) | `/metrics` của API      |
| **E-Learning · Hạ tầng**                    | CPU, RAM, swap, disk, mạng, load của máy chủ; CPU/RAM/mạng/uptime từng container; OOM kill; trạng thái scrape (`up`)                                                  | node-exporter, cAdvisor |
| **E-Learning · PostgreSQL**                 | Kết nối, giao dịch/s, cache hit, dung lượng DB, deadlock, khóa, bảng lớn nhất                                                                                         | postgres-exporter       |
| **E-Learning · Logs**                       | Số dòng log API theo mức độ, lỗi gần đây, request chậm > 1 giây, truy vấn Postgres chậm, lỗi Caddy/5xx, ô tìm kiếm tự do                                              | Loki (qua Alloy)        |

Dashboard được nạp từ file nên **không sửa và lưu trong giao diện** được (tránh lệch với git). Muốn đổi: sửa file JSON trong `grafana/dashboards/`, deploy lại; Grafana tự nạp trong ≤ 60 giây.

**Kiểm tra:**

- **Connections → Data sources**: có `Prometheus` và `Loki`; bấm **Save & test** ra "Successfully queried".
- **Explore** → chọn Prometheus → chạy `up` → mọi job (`api`, `node`, `cadvisor`, `postgres`, `prometheus`, `loki`, `alloy`, `grafana`) bằng **1** (`api` = 0 cho tới khi API chạy).
- Tạo thử lưu lượng rồi xem dashboard API sau khoảng 30 giây:
  ```bash
  for i in $(seq 1 60); do curl -s -o /dev/null https://api.<domain>/api/v1/health; done
  ```
- Job `node` = 0 → thiếu luật `ufw` cho node-exporter (xem mục 15).

---

## 8. GitHub Actions: CI/CD tự động

Quy trình trong [.github/workflows/](../.github/workflows/):

```
Pull Request / push develop ──► ci.yml:     server (typecheck, lint, format, test với PostgreSQL) · mobile · build thử Docker
push main hoặc tag v*       ──► deploy.yml: kiểm tra secret → ci (kiểm thử) → build image api + web → đẩy lên GHCR → SSH vào VPS cập nhật
```

File: [ci.yml](../.github/workflows/ci.yml), [deploy.yml](../.github/workflows/deploy.yml).

### 8.1 Tạo khóa SSH riêng cho GitHub Actions

Trên **máy bạn** (khóa riêng cho CI, không dùng chung khóa quản trị):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -N "" -f ~/.ssh/elearning_deploy
cat ~/.ssh/elearning_deploy.pub | ssh -i <key>.pem ubuntu@<VPS_IP> 'cat >> ~/.ssh/authorized_keys'
ssh -i ~/.ssh/elearning_deploy ubuntu@<VPS_IP> 'echo ok && docker ps >/dev/null && echo docker-ok'
ssh-keyscan -t ed25519 <VPS_IP>        # in 1 dòng "<VPS_IP> ssh-ed25519 AAAA..." - dùng cho SSH_KNOWN_HOSTS
```

**Kiểm tra:** lệnh thứ 3 in `ok` và `docker-ok`.

### 8.2 Tạo GitHub Secrets và Variables

Repo trên GitHub → **Settings → Secrets and variables → Actions**:

| Tên                  | Loại     | Giá trị                                                                        | Bắt buộc           |
| -------------------- | -------- | ------------------------------------------------------------------------------ | ------------------ |
| `SSH_HOST`           | Secret   | `<VPS_IP>`                                                                     | ✔                  |
| `SSH_USER`           | Secret   | `ubuntu` (user quản trị trên VPS)                                              | ✔                  |
| `SSH_KEY`            | Secret   | **toàn bộ** nội dung file `~/.ssh/elearning_deploy` (cả dòng `BEGIN` và `END`) | ✔                  |
| `DOMAIN`             | Secret   | tên miền gốc `<domain>` (nhúng vào bản web: `https://api.<domain>/api/v1`)     | ✔                  |
| `SSH_KNOWN_HOSTS`    | Secret   | dòng in ra bởi `ssh-keyscan` ở 8.1 (chống giả mạo máy chủ)                     | khuyến nghị        |
| `CAPTCHA_PROVIDER`   | Variable | `recaptcha_v2` hoặc `turnstile` (mặc định `turnstile`)                         | khi bật CAPTCHA    |
| `RECAPTCHA_SITE_KEY` | Secret   | site key reCAPTCHA (công khai, được nhúng vào bản web lúc build)               | khi dùng reCAPTCHA |
| `TURNSTILE_SITE_KEY` | Secret   | site key Turnstile (công khai, được nhúng vào bản web lúc build)               | khi dùng Turnstile |
| `SSH_PORT`           | Secret   | cổng SSH nếu khác 22                                                           | tùy chọn           |
| `DEPLOY_PATH`        | Secret   | thư mục deploy trên VPS nếu khác `elearning/deploy` (tính từ thư mục home)     | tùy chọn           |

Không cần secret để đăng nhập GHCR: workflow dùng `GITHUB_TOKEN` có sẵn. **Không** đưa secret key của CAPTCHA, mật khẩu, API key Gemini hay SMTP vào GitHub: chúng chỉ nằm trong `deploy/.env` trên VPS.

Kiểm tra thêm **Settings → Actions → General → Workflow permissions**: để **Read and write permissions** (hoặc ít nhất đừng chặn `packages: write`).

### 8.3 Chạy lần đầu

1. Đảm bảo nhánh `main` có `.github/workflows/`, `deploy/`, `server/Dockerfile` và `mobile/Dockerfile.web` (merge `develop` vào `main`).
2. Đã tạo `~/elearning/deploy/.env` trên VPS (mục 6.2) — workflow **không** ghi đè file này.
3. Push/merge vào `main`, hoặc **Actions → Deploy → Run workflow** (chọn nhánh `main`).
4. Theo dõi tab **Actions**: `Kiểm tra secret` → `Kiểm thử` → `Build & push image api/web` (web mất khoảng 5–10 phút lần đầu) → `Deploy lên VPS` → `Kiểm tra API qua HTTPS`.

**Kiểm tra:** mọi job xanh; rồi:

```bash
curl -s https://api.<domain>/api/v1/health      # {"data":{"status":"ok","db":"ok"}}
```

Mở `https://app.<domain>` thấy app web. Sau đó chạy seed ở mục 6.6 nếu cần dữ liệu mẫu.

### 8.4 Gói (package) GHCR

Image nằm ở `ghcr.io/<chu-repo>/elearning-api` và `elearning-web` (tab **Packages** của trang cá nhân/repo). Mặc định gói **riêng tư**; deploy qua workflow vẫn chạy vì dùng `GITHUB_TOKEN`. Nếu muốn `docker compose pull` thủ công trên VPS:

- cách đơn giản: gói → **Package settings → Change visibility → Public**; hoặc
- giữ riêng tư và đăng nhập bằng token (GitHub → **Settings → Developer settings → Personal access tokens (classic)**, quyền `read:packages`):
  ```bash
  echo "<token>" | docker login ghcr.io -u <ten-github> --password-stdin
  ```

Nếu gói báo không cho repo truy cập: **Package settings → Manage Actions access → Add repository** (role _Write_).

### 8.5 Dùng hằng ngày

| Việc                      | Cách làm                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Kiểm thử                  | mở PR vào `develop`/`main` → `ci.yml` tự chạy                                                                    |
| Triển khai                | merge vào `main` → `deploy.yml` tự build + cập nhật VPS (tag image: `latest`, `sha-xxxxxxx`)                     |
| Phát hành                 | `git tag v1.0.0 && git push origin v1.0.0` → như trên, thêm tag `1.0.0`, `1.0`                                   |
| Deploy tay trên VPS       | `cd ~/elearning/deploy && bash scripts/deploy.sh`                                                                |
| Quay về bản cũ (rollback) | sửa `.env`: `IMAGE_TAG=sha-xxxxxxx` (mã commit cũ) rồi `bash scripts/deploy.sh`; xong đặt lại `IMAGE_TAG=latest` |
| Đổi `.env`                | sửa file rồi `docker compose up -d` (tự tạo lại container có thay đổi)                                           |

Mỗi lần deploy, [scripts/deploy.sh](scripts/deploy.sh) kéo image mới, chạy `docker compose up -d`, nạp lại Caddy, restart Prometheus/Loki/Alloy/Grafana nếu file cấu hình của chúng đổi, chờ API `healthy` (đã chạy xong `prisma migrate deploy`) và dọn image cũ.

---

## 9. Build APK Android bằng EAS

Trên **máy bạn** (cần Node.js; tài khoản Expo miễn phí tại <https://expo.dev>):

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init                  # lần đầu: liên kết dự án với tài khoản Expo của bạn
```

Không cần cài `eas-cli` toàn cục. Cấu hình build nằm ở [mobile/eas.json](../mobile/eas.json) với ba profile:

| Profile       | Kết quả                             | Dùng khi               |
| ------------- | ----------------------------------- | ---------------------- |
| `development` | APK development client, trỏ API LAN | phát triển trên máy    |
| `preview`     | **APK** cài trực tiếp được          | thử/demo (khuyên dùng) |
| `production`  | **AAB** (App Bundle)                | đưa lên Google Play    |

Hai profile `preview` và `production` có sẵn `EXPO_PUBLIC_API_URL` (và `EXPO_PUBLIC_TURNSTILE_BASE_URL`). **Đổi các URL trong `eas.json` thành tên miền của bạn** nếu không dùng `eliuh.site`.

### 9.1 Biến môi trường CAPTCHA cho bản APK

Các giá trị public này được nhúng vào app lúc build, nên đặt chúng ở **EAS environment variables** (Expo dashboard → Project settings → Environment variables, hoặc lệnh `npx eas-cli@latest env:create`), cho cả hai environment `preview` và `production`, visibility `Plain text`:

| Biến                             | reCAPTCHA v2           | Turnstile              |
| -------------------------------- | ---------------------- | ---------------------- |
| `EXPO_PUBLIC_CAPTCHA_PROVIDER`   | `recaptcha_v2`         | `turnstile`            |
| `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` | site key reCAPTCHA     | —                      |
| `EXPO_PUBLIC_RECAPTCHA_BASE_URL` | `https://app.<domain>` | —                      |
| `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | —                      | site key Turnstile     |
| `EXPO_PUBLIC_TURNSTILE_BASE_URL` | —                      | `https://app.<domain>` |

Chú ý: giá trị đặt trong trường `env` của profile trong `eas.json` có **độ ưu tiên cao hơn** biến EAS, nên đừng để placeholder cùng tên trong `eas.json` che mất giá trị thật. Kiểm tra bằng `npx eas-cli@latest env:list --environment preview` (và `production`). **Không bao giờ** đưa secret key của CAPTCHA vào EAS hay `eas.json`.

### 9.2 Build

Chỉ build khi API trên VPS đã chạy (mục 6–8):

```bash
npx eas-cli@latest build -p android --profile preview       # ra file APK cài trực tiếp được
# npx eas-cli@latest build -p android --profile production  # ra AAB để đưa lên Google Play
```

Trả lời `Yes` khi EAS hỏi tạo Android keystore. Build chạy trên máy chủ của Expo (gói miễn phí có thể phải xếp hàng 10–30 phút). Xong, EAS in **liên kết tải APK + mã QR**.

**Kiểm tra:** mở liên kết trên điện thoại Android → tải APK → cho phép cài từ nguồn không xác định → cài → mở app, đăng nhập được và danh sách khóa học hiện ra (app gọi `https://api.<domain>`).

> Đổi tên miền hoặc site key CAPTCHA = phải build lại APK (các giá trị này được nhúng vào app lúc build). Chưa có bản iOS native — iPhone dùng bản web `https://app.<domain>` (có thể "Thêm vào Màn hình chính").

---

## 10. Sao lưu và khôi phục database

### 10.1 Sao lưu tự động

Container `backup` ([backup/backup.sh](backup/backup.sh)) chạy `pg_dump` (định dạng nén `-Fc`) mỗi ngày lúc `BACKUP_HOUR_UTC` (mặc định 20:00 UTC = 03:00 sáng giờ Việt Nam), giữ `BACKUP_KEEP` bản mới nhất (mặc định 7) trong `deploy/backups/`. Khi khởi động, nếu 12 giờ qua chưa có bản nào thì nó sao lưu ngay.

```bash
cd ~/elearning/deploy
docker compose logs backup | tail -5      # [backup] ... ok (xx KB)
ls -lh backups/                           # elearning-YYYYMMDD-HHMMSS.dump ...
```

### 10.2 Sao lưu thủ công (trước khi nâng cấp lớn)

```bash
docker compose run --rm --entrypoint sh backup -c 'pg_dump --format=custom --no-owner -f /backups/manual-$(date -u +%Y%m%d-%H%M%S).dump'
ls -lh backups/manual-*
```

Bản `manual-*` không bị xóa tự động.

### 10.3 Chép bản sao lưu về máy bạn

Làm định kỳ: nếu máy chủ hỏng thì bản sao lưu nằm trên đó cũng mất. Trên **máy bạn**:

```bash
scp -i <key>.pem "ubuntu@<VPS_IP>:~/elearning/deploy/backups/*.dump" ./backups-elearning/
```

Kiểm tra một file đọc được (trên VPS): `docker compose exec -T postgres pg_restore --list < backups/<file>.dump | head` in danh sách bảng.

File người dùng tải lên (ảnh đại diện, bài nộp) nằm ở volume `elearning_uploads`, **không** nằm trong dump:

```bash
docker run --rm -v elearning_uploads:/data -v "$PWD/backups":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

### 10.4 Khôi phục

> ⚠ Ghi đè dữ liệu hiện tại bằng nội dung bản sao lưu. Làm sao lưu thủ công (10.2) trước.

```bash
cd ~/elearning/deploy
docker compose stop api                                   # ngắt kết nối vào DB
docker compose exec -T postgres pg_restore -U elearning -d elearning \
  --clean --if-exists --no-owner < backups/elearning-YYYYMMDD-HHMMSS.dump
docker compose start api
```

(`elearning` là `POSTGRES_USER`/`POSTGRES_DB` trong `.env`; sửa nếu bạn đổi. Cảnh báo kiểu "role ... does not exist" có thể bỏ qua.)

Khôi phục trên **máy chủ mới**: làm mục 1–6 để có `.env` (dùng lại **đúng** `TOTP_ENC_KEY` và `JWT_SECRET` cũ), `docker compose up -d postgres`, chờ `healthy`, chạy lệnh `pg_restore` ở trên, rồi `docker compose up -d`.

**Kiểm tra:** `docker compose exec postgres psql -U elearning -d elearning -c '\dt'` liệt kê bảng; `curl https://api.<domain>/api/v1/health` ra `ok`; đăng nhập app bằng tài khoản cũ.

---

## 11. CAPTCHA: reCAPTCHA v2 hoặc Turnstile

API hỗ trợ hai nhà cung cấp, chọn bằng biến `CAPTCHA_PROVIDER` trong `deploy/.env`: `recaptcha_v2` (Google reCAPTCHA v2 Checkbox) hoặc `turnstile` (Cloudflare, mặc định). CAPTCHA được dùng ở đăng ký, quên mật khẩu và đăng nhập sau nhiều lần sai.

Quy tắc chung cho cả hai:

- **Site key là công khai** (được nhúng vào bản web/APK lúc build); **secret key là bí mật** (chỉ nằm trong `deploy/.env` trên VPS, không đưa vào GitHub, EAS hay mã nguồn).
- Đổi nhà cung cấp hoặc site key = phải build lại **cả** bản web (chạy lại workflow Deploy) **và** APK (mục 9).
- Key thử (test key) của Google/Cloudflare chỉ để phát triển; ở production API từ chối key test của reCAPTCHA.
- Widget phải khai báo đúng các hostname dùng: `<domain>`, `app.<domain>`, `api.<domain>`.

### 11.1 Google reCAPTCHA v2 Checkbox

1. Mở <https://www.google.com/recaptcha/admin/create>, chọn **Challenge (v2) → "I'm not a robot" Checkbox** (không chọn Invisible/v3). Khai báo các hostname `<domain>`, `app.<domain>`, `api.<domain>`.
2. Trong `deploy/.env` trên VPS:
   ```ini
   CAPTCHA_PROVIDER=recaptcha_v2
   RECAPTCHA_SITE_KEY=<site key>
   RECAPTCHA_SECRET_KEY=<secret key>
   CAPTCHA_ALLOWED_HOSTNAMES=<domain>,app.<domain>,api.<domain>
   ```
3. GitHub Actions (mục 8.2): tạo Variable `CAPTCHA_PROVIDER=recaptcha_v2` và Secret `RECAPTCHA_SITE_KEY` (site key), rồi chạy lại workflow **Deploy** để bản web được build kèm key.
4. EAS: đặt các biến `EXPO_PUBLIC_CAPTCHA_PROVIDER`, `EXPO_PUBLIC_RECAPTCHA_SITE_KEY`, `EXPO_PUBLIC_RECAPTCHA_BASE_URL` (mục 9.1).
5. Áp dụng cấu hình API: `docker compose up -d api`.

API kiểm tra token với Google, kiểm hostname có nằm trong `CAPTCHA_ALLOWED_HOSTNAMES`, và từ chối token quá cũ; token đã dùng thì phải lấy lại. Tài liệu chính thức: [hiển thị checkbox v2](https://developers.google.com/recaptcha/docs/display), [xác minh token ở server](https://developers.google.com/recaptcha/docs/verify).

### 11.2 Cloudflare Turnstile

1. Tạo tài khoản miễn phí tại <https://dash.cloudflare.com/sign-up> (không cần chuyển DNS sang Cloudflare). Dashboard → **Turnstile → Add widget**: tên `E-Learning`, **Hostname Management** thêm `<domain>` và `app.<domain>`, Widget Mode _Managed_.
2. Trong `deploy/.env` trên VPS: `CAPTCHA_PROVIDER=turnstile`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
3. GitHub: Secret `TURNSTILE_SITE_KEY`; EAS: `EXPO_PUBLIC_TURNSTILE_SITE_KEY`, `EXPO_PUBLIC_TURNSTILE_BASE_URL=https://app.<domain>` (mục 9.1).
4. Áp dụng: `docker compose up -d api`, rồi chạy lại workflow Deploy để build lại bản web.

Key thử của Cloudflare (chỉ để phát triển, **không dùng production**): site `1x00000000000000000000AA` / secret `1x0000000000000000000000000000000AA` (luôn qua).

**Kiểm tra:** mở `https://app.<domain>` → màn Đăng ký → thấy widget CAPTCHA, tự tay hoàn thành và đăng ký được. Lỗi hostname (Turnstile `110200`, reCAPTCHA "invalid domain") = hostname đang mở chưa nằm trong danh sách ở widget hoặc ở `CAPTCHA_ALLOWED_HOSTNAMES`.

---

## 12. Gửi email: Brevo hoặc Resend (SMTP)

API gửi mã OTP xác minh email và mã quên mật khẩu qua SMTP. Hãy dùng dịch vụ chuyên dụng (**không** gửi trực tiếp từ VPS — sẽ vào spam, và cổng 25 thường bị nhà cung cấp chặn) và phải xác minh tên miền để thư không bị từ chối.

### 12.1 Chọn nhà cung cấp

|                           | Brevo                                                                 | Resend                                      |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| Gói miễn phí              | khoảng 300 thư/ngày                                                   | khoảng 3.000 thư/tháng (100/ngày), 1 domain |
| Đăng ký                   | <https://www.brevo.com>                                               | <https://resend.com>                        |
| `SMTP_HOST` / `SMTP_PORT` | `smtp-relay.brevo.com` / `587`                                        | `smtp.resend.com` / `587`                   |
| `SMTP_USER`               | "Login" hiển thị ở trang _SMTP & API_                                 | `resend`                                    |
| `SMTP_PASS`               | **SMTP key** tạo ở trang _SMTP & API_ (không phải mật khẩu tài khoản) | **API key** (`re_...`) tạo ở _API Keys_     |

_(Hạn mức và giao diện có thể thay đổi — xem trang của nhà cung cấp.)_ Chọn một trong hai.

### 12.2 Xác minh tên miền (SPF · DKIM · DMARC)

Thêm tên miền ở nhà cung cấp (Brevo: _Senders, Domains & Dedicated IPs → Domains → Add a domain_; Resend: _Domains → Add Domain_). Họ hiển thị **chính xác** các bản ghi DNS cần tạo — sao chép nguyên văn vào trang DNS của tên miền (cùng nơi tạo bản ghi `A` ở mục 5), chờ rồi bấm **Verify**.

| Bản ghi   | Kiểu · Tên                          | Để làm gì                                        | Ví dụ giá trị _(minh họa — dùng đúng giá trị nhà cung cấp đưa)_ |
| --------- | ----------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| **SPF**   | TXT · `@` hoặc subdomain gửi thư    | Liệt kê máy chủ được phép gửi thư cho domain     | `v=spf1 include:spf.brevo.com ~all`                             |
| **DKIM**  | TXT/CNAME · `<selector>._domainkey` | Chữ ký số chứng minh thư không bị sửa/giả        | `v=DKIM1; k=rsa; p=MIGfMA0...`                                  |
| **DMARC** | TXT · `_dmarc`                      | Quy định xử lý thư SPF/DKIM không khớp + báo cáo | `v=DMARC1; p=none; rua=mailto:you@example.com`                  |

Lưu ý:

- Mỗi domain chỉ được có **một** bản ghi SPF. Nếu đã có sẵn, **gộp** `include:` mới vào cùng một dòng, không tạo dòng thứ hai.
- DMARC bắt đầu ở `p=none` (chỉ theo dõi); khi thư đã qua ổn vài tuần mới nâng lên `p=quarantine`.
- Nhà cung cấp có thể yêu cầu thêm bản ghi TXT "mã xác minh" hoặc MX cho subdomain gửi thư — thêm đủ theo hướng dẫn.

**Kiểm tra bản ghi đã hiện** (máy bạn):

```bash
nslookup -type=TXT _dmarc.<domain>
nslookup -type=TXT <domain>                  # tìm dòng v=spf1 ...
```

Trạng thái tên miền ở trang nhà cung cấp phải là **Verified/Authenticated**.

### 12.3 Điền vào `.env`

```ini
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<login SMTP>
SMTP_PASS=<SMTP key>
MAIL_FROM="E-Learning <no-reply@<domain>>"
```

`MAIL_FROM` phải thuộc tên miền đã xác minh. Áp dụng: `docker compose up -d api`.

**Kiểm tra:** đăng ký tài khoản trong app bằng một email thật → nhận mã OTP trong hộp thư (xem cả mục Spam). Mở thư → _Show original_ (Gmail): `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Có thể gửi thử vào <https://www.mail-tester.com> để chấm điểm (mục tiêu ≥ 9/10).

> `SMTP_HOST` để trống = API **không gửi thư thật**, chỉ ghi nội dung thư ra log. Một số nhà cung cấp VPS chặn kết nối SMTP đi ra (cổng 25 gần như luôn bị chặn; 465/587 có thể bị chặn ở tài khoản mới). Thử: `nc -vz smtp-relay.brevo.com 587`. Nếu hết thời gian chờ, thử cổng thay thế do nhà cung cấp SMTP hỗ trợ (Brevo: `2525`; Resend: `2587`) hoặc liên hệ hỗ trợ nhà cung cấp VPS.

---

## 13. Google Gemini (AI)

1. Vào <https://aistudio.google.com/apikey> (đăng nhập tài khoản Google) → **Create API key** → copy khóa.
2. Điền `deploy/.env`:
   ```ini
   GEMINI_API_KEY=<khóa của bạn>
   AI_PROVIDER=gemini
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
3. Áp dụng: `docker compose up -d api`.

Để trống `AI_PROVIDER`/`GEMINI_API_KEY` thì API chạy chế độ `mock` (câu trả lời giả, app vẫn dùng được). Kết quả AI được lưu trong bảng `AiContent`; khóa cache hiện **không phân biệt provider/model**, nên đổi `AI_PROVIDER` hoặc `GEMINI_MODEL` không tự sinh lại kết quả đã lưu — nội dung `mock` cũ có thể vẫn hiện sau khi bật Gemini. Dùng AI Tutor hoặc nội dung chưa có cache để kiểm tra provider mới.

**Kiểm tra:** trong app mở một khóa học → **AI Tutor** hỏi một câu → có câu trả lời thật (không phải văn bản giả của chế độ `mock`). Trong Grafana → dashboard **API** → hàng "AI (Google Gemini / mock)" có số liệu; `docker compose logs api | grep -i gemini` không có lỗi.

Lưu ý:

- Gói miễn phí có **giới hạn số request** (theo phút và theo ngày) và Google có thể dùng dữ liệu gửi lên để cải thiện sản phẩm → không gửi thông tin cá nhân nhạy cảm. Server có hạn mức riêng (`AI_*_LIMIT_*` trong `.env`) để không chạm trần; vượt hạn mức trả `429 AI_RATE_LIMITED`.
- Khóa bị lộ → vào AI Studio xóa rồi tạo lại, cập nhật `.env`.

---

## 14. Tắt/bật máy để tiết kiệm chi phí

Với demo hoặc đồ án, bạn có thể **dừng máy khi không dùng**:

- AWS: **EC2 → Instances → chọn máy → Instance state → Stop instance** (đừng chọn _Terminate_ — lệnh đó xóa máy). Khi cần: **Start instance**, chờ _status checks_ Passed rồi kiểm tra `https://api.<domain>/api/v1/health`.
- Mọi container đặt `restart: unless-stopped` và Docker tự chạy lại khi máy khởi động, thường mất 1–2 phút. Nếu có service thiếu: `cd ~/elearning/deploy && docker compose up -d`.
- Dữ liệu (volume Docker) nằm trên ổ đĩa nên được giữ nguyên qua Stop/Start. **Không** dùng `docker compose down -v` để "tắt demo": lệnh đó **xóa volume dữ liệu**.

Điều cần biết về chi phí: dừng máy chỉ ngừng tính tiền **giờ chạy máy**. Ổ đĩa (EBS) và địa chỉ IPv4 công khai/Elastic IP vẫn bị tính phí khi máy dừng. Hãy theo dõi trang Billing và hạn mức miễn phí/credit của tài khoản, đặt cảnh báo ngân sách (Budgets), và đừng giả định máy chạy 24/7 là miễn phí.

Khi kết thúc dự án: sao lưu DB và uploads ra ngoài máy chủ (mục 10) và kiểm tra khôi phục được; sau đó tự quyết định xóa instance, ổ đĩa, snapshot, **giải phóng (release) Elastic IP**, dọn bản ghi DNS và thu hồi các khóa/API key không còn cần.

---

## 15. Xử lý sự cố thường gặp

Lệnh hay dùng (trong `~/elearning/deploy`):

```bash
docker compose ps                         # trạng thái mọi service
docker compose logs -f --tail 100 api     # xem log (Ctrl+C để thoát) - thay api bằng caddy, postgres, grafana...
docker compose restart api                # khởi động lại một service
docker compose up -d                      # áp dụng thay đổi .env / compose
docker stats --no-stream                  # CPU/RAM từng container
df -h / && docker system df               # dung lượng ổ đĩa
```

| Triệu chứng                                                             | Nguyên nhân thường gặp → cách xử lý                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose` báo `Set DOMAIN in deploy/.env` (hoặc biến khác)       | Biến bắt buộc còn trống → điền trong `.env` (mục 6.2).                                                                                                                                                                                                                                                                                                                          |
| Trình duyệt báo chứng chỉ không hợp lệ / Caddy không xin được chứng chỉ | DNS chưa trỏ đúng (`nslookup`), có bản ghi `AAAA` thừa, cổng 80/443 bị chặn (`ufw` hoặc Security Group), hoặc đang dùng CA staging. Xem `docker compose logs caddy`. Bị Let's Encrypt giới hạn → dùng `ACME_CA` staging (mục 6.3) trong lúc thử.                                                                                                                                |
| `502 Bad Gateway` ở `api.`/`app.`                                       | Container chưa chạy hoặc chưa healthy: `docker compose ps`, `docker compose logs api`. Trước lần deploy đầu tiên đây là bình thường.                                                                                                                                                                                                                                            |
| `api` khởi động lại liên tục                                            | `docker compose logs api`: `Invalid environment variables ...` → sửa biến được nêu (vd. `TOTP_ENC_KEY` phải 32 byte base64; reCAPTCHA thiếu `CAPTCHA_ALLOWED_HOSTNAMES` hoặc dùng key test); `password authentication failed` → xem dòng dưới; lỗi migration → đọc thông báo Prisma.                                                                                            |
| `password authentication failed for user "elearning"`                   | Mật khẩu Postgres chỉ áp dụng khi **khởi tạo lần đầu**. Đổi `POSTGRES_PASSWORD` trong `.env` sau đó thì bị lệch. Sửa: đặt lại `.env` như cũ, hoặc đổi trong DB: `docker compose exec postgres psql -U elearning -c "ALTER USER elearning PASSWORD '<moi>';"` rồi cập nhật `.env`. (Chỉ khi chưa có dữ liệu mới nên `docker compose down -v` — lệnh đó **xóa toàn bộ dữ liệu**.) |
| `pull access denied` / `manifest unknown` khi kéo image                 | Image chưa được build (chạy workflow Deploy thành công trước), `GHCR_OWNER` sai chữ hoa/thường, hoặc gói riêng tư và chưa `docker login` (mục 8.4).                                                                                                                                                                                                                             |
| Workflow Deploy lỗi `Permission denied (publickey)`                     | `SSH_KEY` sai/thiếu dòng BEGIN/END, hoặc chưa thêm khóa công khai vào `~/.ssh/authorized_keys` của user trên VPS (8.1).                                                                                                                                                                                                                                                         |
| Workflow lỗi `Host key verification failed`                             | `SSH_KNOWN_HOSTS` sai IP/loại khóa → chạy lại `ssh-keyscan -t ed25519 <VPS_IP>` và dán lại, hoặc xóa secret này để dùng chế độ tin lần đầu.                                                                                                                                                                                                                                     |
| Workflow Deploy hết thời gian khi SSH                                   | Security Group/`ufw` chặn cổng 22 từ runner của GitHub (mục 2.2), hoặc máy đang tắt.                                                                                                                                                                                                                                                                                            |
| Máy hết RAM / container bị `Killed`                                     | `free -h`, `docker stats`; dashboard **Hạ tầng** → "OOM kill". Chắc chắn đã có swap (mục 3). Giảm retention của Prometheus, tắt profile không dùng, hoặc nâng cấu hình máy.                                                                                                                                                                                                     |
| Prometheus job `node` = 0 (DOWN)                                        | Thiếu luật `ufw` cho node-exporter. Kiểm tra `sudo ufw status` có dòng `9100/tcp ... 172.30.0.0/24`; nếu không, `sudo ufw allow from 172.30.0.0/24 to 172.17.0.1 port 9100 proto tcp` rồi `docker compose restart node-exporter prometheus`.                                                                                                                                    |
| Prometheus job `api` = 0                                                | API chưa chạy, hoặc đã đặt `METRICS_TOKEN` mà chưa cấu hình token cho Prometheus (xem chú thích trong [prometheus/prometheus.yml](prometheus/prometheus.yml)). Cách đơn giản: để trống `METRICS_TOKEN` (cổng 9464 không ra Internet).                                                                                                                                           |
| Dashboard **Hạ tầng** thiếu tên container                               | cAdvisor thiếu quyền trên một số máy → trong `docker-compose.yml`, mục `cadvisor` thêm dòng `privileged: true` rồi `docker compose up -d cadvisor`.                                                                                                                                                                                                                             |
| Dashboard trống ("No data")                                             | Chưa có lưu lượng (tạo thử bằng vòng lặp `curl` ở mục 7), khoảng thời gian chọn quá xa, hoặc job tương ứng đang DOWN (Explore → `up`).                                                                                                                                                                                                                                          |
| Dashboard **Logs** trống                                                | `docker compose logs alloy` (lỗi đọc `/var/run/docker.sock`?), `docker compose logs loki`. Loki giữ log 7 ngày.                                                                                                                                                                                                                                                                 |
| Không nhận được email OTP                                               | `docker compose logs api \| grep -iE "smtp\|mail"`; kiểm tra `SMTP_*`, tên miền đã **Verified**, thư trong mục Spam, cổng SMTP có bị chặn (mục 12.3). `SMTP_HOST` trống = API chỉ ghi thư ra log.                                                                                                                                                                               |
| Mã 2FA luôn "sai"                                                       | Đồng hồ điện thoại hoặc máy chủ bị lệch: `timedatectl` phải `synchronized: yes`; bật đồng bộ giờ tự động trên điện thoại.                                                                                                                                                                                                                                                       |
| CAPTCHA báo lỗi / không hiện                                            | Site key sai hoặc chưa build lại web/APK sau khi đổi key/nhà cung cấp; hostname chưa thêm trong widget hoặc `CAPTCHA_ALLOWED_HOSTNAMES`; `CAPTCHA_PROVIDER` ở server và ở bản build không khớp nhau; dùng nhầm key test ở production.                                                                                                                                           |
| Ổ đĩa đầy                                                               | `docker system df`; `docker image prune -af`; xóa bớt `backups/` cũ đã chép về máy; xem `du -sh /var/lib/docker/volumes/*`. Prometheus giữ 15 ngày/2 GB, Loki 7 ngày.                                                                                                                                                                                                           |
| Sau khi bật lại máy có service không lên                                | Docker tự chạy lại mọi service (`restart: unless-stopped`). Nếu thiếu: `cd ~/elearning/deploy && docker compose up -d`.                                                                                                                                                                                                                                                         |

### Cập nhật hệ điều hành

```bash
sudo apt update && sudo apt -y upgrade
[ -f /var/run/reboot-required ] && echo "Cần reboot" && sudo reboot
```

Sau reboot các container tự chạy lại (khoảng 1–2 phút). Bản vá bảo mật còn được tự động cài nhờ `unattended-upgrades` (mục 3).

---

## 16. Phụ lục: Mailpit và Uptime Kuma (tùy chọn)

### 16.1 Mailpit: thử email mà không gửi ra ngoài (staging)

Mailpit là hộp thư giả: mọi thư API gửi đều nằm lại đây, hữu ích khi test mà không muốn gửi thư thật.

```ini
# deploy/.env
COMPOSE_PROFILES=mail
SMTP_HOST=mailpit
SMTP_PORT=1025
```

rồi `docker compose up -d`. Giao diện chỉ mở ở `127.0.0.1:8025` của VPS; xem bằng **SSH tunnel** trên máy bạn:

```bash
ssh -i <key>.pem -L 8025:127.0.0.1:8025 ubuntu@<VPS_IP>
```

giữ cửa sổ này mở và vào <http://localhost:8025>. Mailpit hiển thị mọi mã OTP/liên kết nên **không bao giờ mở công khai** trên production ([caddy/sites/mail.caddy.example](caddy/sites/mail.caddy.example) mô tả cách mở có mật khẩu, chỉ cho staging). Production thật: để `COMPOSE_PROFILES` trống.

### 16.2 Uptime Kuma: trang theo dõi "web có sống không"

1. Thêm bản ghi DNS `A` cho `status` trỏ về `<VPS_IP>`.
2. `cp caddy/sites/status.caddy.example caddy/sites/status.caddy` (xem [status.caddy.example](caddy/sites/status.caddy.example)).
3. Trong `.env`: `COMPOSE_PROFILES=status` (hoặc `mail,status`) → `docker compose up -d`.
4. `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`.
5. Mở `https://status.<domain>` và **tạo tài khoản quản trị ngay** (người đầu tiên mở trang sẽ là chủ). Thêm monitor HTTP tới `https://api.<domain>/api/v1/health` và `https://app.<domain>`.

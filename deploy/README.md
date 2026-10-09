# Triển khai E-Learning lên VPS (AWS EC2 + Docker Compose)

> **Kiểm chứng mới nhất 07/10/2026:** SSH qua Elastic IP `13.238.92.36` thành công, fingerprint ED25519 khớp AWS system log. Docker 29.8.2 và Compose 5.6.0 đã cài; container `hello-world` chạy thành công bằng user `ubuntu`. Swap 2 GiB, UFW, fail2ban và SSH chỉ dùng key đã được kiểm tra. Chưa triển khai app hoặc trỏ DNS. Xem [AWS_CLOUD.md](AWS_CLOUD.md) trước các bước dùng chung bên dưới.

> **Nhà cung cấp hiện hành:** AWS EC2 Free Plan, Sydney, Ubuntu 24.04 x86/64, c7i-flex.large 2 vCPU/4 GiB, gp3 40 GiB. Chỉ bật khi test/demo. Giá Linux Console $0.11072/giờ (~$79.72/30 ngày, chưa ổ đĩa/IP/lưu lượng), credit $100 không đảm bảo chạy 24/7 tới bảo vệ. Người dùng chọn Elastic IP cố định; EBS và Elastic IP vẫn tiêu credit khi máy dừng. Không Upgrade/Activate advanced features. Các bước Linux cần sudo qua user Ubuntu, không mặc định root.

> **Lịch sử:** Oracle/GCP/DigitalOcean không còn là phương án đang thực hiện. Không tạo thêm máy hoặc làm lại provisioning trên EC2 đã chuẩn bị.

Hướng dẫn **từng bước, cho người làm lần đầu**. Làm tuần tự từ mục 1 đến mục 14; mỗi mục có lệnh cụ thể và cách **kiểm tra đã thành công**. Mọi lệnh ở khối `bash` chạy trên VPS (trừ khi ghi rõ "trên máy bạn").

> Thuật ngữ: **VPS/VM** = máy chủ ảo; **droplet** là tên gọi riêng của DigitalOcean · **domain** = tên miền; trong tài liệu này viết là `<domain>` — dự án dùng `eliuh.site`.

---

## 0. Tổng quan

### 0.1 Hệ thống gồm những gì

```
Internet ──► Caddy (cổng 80/443, HTTPS tự động Let's Encrypt)
               ├─ api.<domain>      ──► api        (Node/Express/Prisma, image GHCR)
               ├─ <domain>, app.<domain> ► web     (bản web của app Expo, file tĩnh, image GHCR)
               └─ grafana.<domain>  ──► grafana
                                         ▲   ▲
                    Prometheus ──────────┘   └──────── Loki ◄── Alloy (thu log mọi container)
                       ▲ scrape /metrics
   api:9464 · node-exporter (VPS) · cAdvisor (container) · postgres-exporter · loki · alloy · grafana

   postgres (dữ liệu, volume riêng) ◄── api · backup (pg_dump mỗi ngày) · postgres-exporter
   mailpit (tùy chọn, profile "mail"): hộp thư giả để thử email
```

| Service                                          | Vai trò                                   | Ai truy cập được                                             |
| ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| `caddy`                                          | Reverse proxy + HTTPS                     | **Internet** (cổng 80, 443 — cổng duy nhất mở ra ngoài)      |
| `api`                                            | REST API + `/metrics` (cổng nội bộ 9464)  | Qua Caddy (`api.<domain>`); `/metrics` chỉ trong mạng Docker |
| `web`                                            | Bản web của app                           | Qua Caddy (`<domain>`, `app.<domain>`)                       |
| `postgres`                                       | Cơ sở dữ liệu PostgreSQL 17               | Chỉ trong mạng Docker                                        |
| `backup`                                         | `pg_dump` hằng ngày vào `deploy/backups/` | Không có cổng                                                |
| `prometheus` / `loki` / `alloy`                  | Thu metrics / lưu log / thu log           | Chỉ trong mạng Docker                                        |
| `grafana`                                        | Dashboard                                 | Qua Caddy (`grafana.<domain>`, có đăng nhập)                 |
| `node-exporter`, `cadvisor`, `postgres-exporter` | Đo VPS / container / PostgreSQL           | Chỉ Prometheus                                               |
| `mailpit` _(tùy chọn)_                           | Hộp thư giả                               | Chỉ qua SSH tunnel (`127.0.0.1:8025`)                        |
| `uptime-kuma` _(tùy chọn)_                       | Trang uptime                              | Qua Caddy nếu bật `sites/status.caddy`                       |

Tổng giới hạn RAM đặt trong compose (`mem_limit`) ≈ 3,1 GB cho VPS 4 GB, kèm swap 2 GB ở mục 3.

### 0.2 Việc **bạn phải tự làm** (không ai làm hộ được)

| Việc                                                             | Mục                | Task PLAN | Tình trạng (07/10/2026)                                                                                                                                                                     |
| ---------------------------------------------------------------- | ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chọn nhà cung cấp / xác minh tài khoản                           | AWS_CLOUD.md §1    | OPS-04    | AWS Free Plan đã đăng ký, EC2 Sydney Running/checks Passed theo người dùng                                                                                                                  |
| Chuẩn bị EC2, IP, DNS và GitHub Secrets                          | AWS_CLOUD.md, 5, 8 | OPS-04    | SSH/Docker/swap/bảo mật đã kiểm chứng; Elastic IP `13.238.92.36` kết nối đúng máy; chờ DNS, env production, deploy và GitHub Secrets                                                        |
| Tạo tài khoản Cloudflare, widget Turnstile                       | 11                 | AUTH-11   | Keys đã nhập vào env local tương ứng; chỉ xác nhận biến hiện diện, chưa kiểm tra giá trị. `EXPO_PUBLIC_TURNSTILE_BASE_URL` còn trống; CAPTCHA thật chưa xác minh; VPS chưa có `deploy/.env` |
| Tạo tài khoản Brevo hoặc Resend, xác minh domain, SPF/DKIM/DMARC | 12                 | AUTH-11   | Brevo đã cấu hình và gửi OTP thật thành công                                                                                                                                                |
| Lấy API key Gemini ở Google AI Studio                            | 13                 | AI-01     | Gemini thật đã chạy trên Android (05/10/2026)                                                                                                                                               |
| Xác nhận CI checks                                               | —                  | OPS-03    | Run cũ: server/Docker pass, mobile bị hủy vì Jest không thoát. Đã sửa và xác nhận local 1467 test tự thoát exit 0; chưa push/rerun CI mới                                                   |
| Đăng nhập/liên kết Expo, cấu hình EAS và build APK               | 9                  | PLT-02    | Người dùng đã cài CLI, login/init thành công; project đã liên kết. Site key công khai đã lên EAS preview/production; chưa build vì chưa có VPS/API production                               |

> **Tuyệt đối không** dán mật khẩu, API key, private key vào chat, issue, commit hay ảnh chụp màn hình gửi người khác. Production secrets chỉ nằm trong `deploy/.env` trên VPS và GitHub Secrets; env local không commit.

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
└── scripts/deploy.sh         # cập nhật hệ thống (GitHub Actions gọi script này)
```

---

## 1. Nhà cung cấp và credit

**Hiện tại chọn AWS EC2:** làm theo [AWS_CLOUD.md](AWS_CLOUD.md). Máy Ubuntu x86_64 và Docker đã sẵn sàng; không cần hướng ARM64 của Oracle. Các tài liệu [Oracle](ORACLE_CLOUD.md) và [GCP](GOOGLE_CLOUD.md) chỉ giữ tham khảo. Không nâng cấp trả phí nếu chưa chủ động đồng ý.

**Phương án DigitalOcean cũ:** không mặc định Student Pack cấp $200 hay thời hạn một năm. Người dùng xác nhận không có credit ngày 07/10/2026. Mục 2 bên dưới chỉ giữ tham khảo, không phải bước cần thực hiện cho AWS.

---

## 2. Tạo droplet

### 2.1 Tạo SSH key trên máy bạn (Windows: PowerShell hoặc Git Bash)

```bash
ssh-keygen -t ed25519 -C "elearning-admin" -f ~/.ssh/elearning_admin
# Có thể đặt passphrase (khuyến nghị). Sinh ra 2 file: elearning_admin (BÍ MẬT) và elearning_admin.pub (công khai)
cat ~/.ssh/elearning_admin.pub        # in khóa công khai - copy dòng này
```

### 2.2 Tạo droplet

DigitalOcean → **Create → Droplets**:

| Mục            | Chọn                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| Region         | **Singapore (SGP1)** — gần Việt Nam nhất                                       |
| Image          | **Ubuntu 24.04 (LTS) x64**                                                     |
| Size           | **Basic → Regular (SSD) → 2 vCPU / 4 GB RAM / 80 GB** (≈ $24/tháng)            |
| Authentication | **SSH Key** → _New SSH Key_ → dán khóa công khai ở 2.1                         |
| Hostname       | `elearning`                                                                    |
| Tùy chọn khác  | bỏ qua _Backups_ (đã có sao lưu DB ở mục 10); có thể bật _Monitoring_ miễn phí |

Bấm **Create Droplet**, chờ ~1 phút, copy **địa chỉ IPv4** (vd. `203.0.113.10`).

### 2.3 Đăng nhập lần đầu

Trên máy bạn:

```bash
ssh -i ~/.ssh/elearning_admin root@203.0.113.10
```

Gõ `yes` khi hỏi dấu vân tay. **Kiểm tra:** thấy dòng chào `Welcome to Ubuntu 24.04...` và dấu nhắc `root@elearning:~#`.

---

## 3. Bảo mật cơ bản

Chạy trên VPS (đang là `root`).

### 3.1 Cập nhật hệ thống

```bash
apt update && apt -y upgrade
```

### 3.2 Tạo user `deploy` (không phải root)

```bash
adduser deploy                      # đặt mật khẩu mạnh (dùng cho sudo); các câu hỏi khác nhấn Enter
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

**Kiểm tra (BẮT BUỘC trước khi làm bước 3.3):** mở một cửa sổ terminal **mới** trên máy bạn:

```bash
ssh -i ~/.ssh/elearning_admin deploy@203.0.113.10
sudo whoami          # phải in: root
```

Nếu không vào được `deploy`, **dừng lại và sửa** — nếu tắt root + mật khẩu lúc này bạn sẽ tự khóa mình ngoài máy chủ.

### 3.3 Tắt đăng nhập root và đăng nhập bằng mật khẩu

Từ đây dùng user `deploy` (với `sudo`):

```bash
sudo tee /etc/ssh/sshd_config.d/01-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF
sudo sshd -t && sudo systemctl restart ssh
```

> Tên file bắt đầu bằng `01-` để được đọc **trước** `50-cloud-init.conf` (sshd giữ giá trị đầu tiên gặp).

**Kiểm tra:**

```bash
sudo sshd -T | grep -E "^(passwordauthentication|permitrootlogin)"
# passwordauthentication no
# permitrootlogin no
```

### 3.4 Tường lửa `ufw`: chỉ mở 22 / 80 / 443

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443                  # mở cả TCP và UDP (HTTP/3)
# Cho Prometheus (container) đọc node-exporter chạy trên IP cầu nối docker0 - dải mạng cố định trong docker-compose.yml:
sudo ufw allow from 172.30.0.0/24 to 172.17.0.1 port 9100 proto tcp comment 'prometheus -> node-exporter'
sudo ufw enable                     # gõ y
sudo ufw status verbose
```

**Kiểm tra:** `Status: active`, có các dòng `22/tcp`, `80/tcp`, `443` ALLOW và dòng `9100/tcp ... ALLOW IN 172.30.0.0/24`. Thử `ssh` từ máy bạn vẫn vào được (đừng đóng terminal đang mở cho tới lúc thử xong).

> Docker tự thêm luật iptables **bỏ qua ufw** cho cổng được `ports:` publish. Vì vậy trong `docker-compose.yml` **chỉ Caddy** publish 80/443 (và Mailpit chỉ bind `127.0.0.1`). Đừng thêm `ports:` cho Postgres/Grafana/Prometheus — chúng sẽ lộ ra Internet.
>
> Nếu muốn thêm một lớp nữa: DigitalOcean → **Networking → Firewalls** tạo firewall chỉ cho phép inbound 22, 80, 443 rồi gắn vào droplet.

### 3.5 fail2ban (chặn dò mật khẩu SSH)

```bash
sudo apt install -y fail2ban
sudo tee /etc/fail2ban/jail.local >/dev/null <<'EOF'
[DEFAULT]
backend = systemd
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
sudo systemctl enable --now fail2ban
```

**Kiểm tra:** `sudo fail2ban-client status sshd` in `Status for the jail: sshd`.

### 3.6 Tự động cập nhật bản vá bảo mật

```bash
sudo apt install -y unattended-upgrades
echo -e 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades
sudo unattended-upgrade --dry-run | tail -3
```

**Kiểm tra:** lệnh cuối chạy xong không báo lỗi. (Thỉnh thoảng có bản vá kernel: nếu có file `/var/run/reboot-required` thì `sudo reboot` lúc vắng người dùng.)

### 3.7 Swap 2 GB + múi giờ

Swap giúp VPS 4 GB không bị giết tiến trình khi RAM dồn đỉnh:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf && sudo sysctl --system >/dev/null
sudo timedatectl set-timezone Asia/Ho_Chi_Minh
```

**Kiểm tra:** `free -h` có dòng `Swap: 2.0Gi`; `timedatectl` có `System clock synchronized: yes` (đồng hồ đúng rất quan trọng cho mã 2FA TOTP).

---

## 4. Cài Docker Engine + Compose

Theo hướng dẫn chính thức của Docker (kho apt), user `deploy`:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl rsync
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Đăng xuất rồi đăng nhập SSH lại (để nhóm `docker` có hiệu lực). **Kiểm tra:**

```bash
docker run --rm hello-world         # in "Hello from Docker!"
docker compose version              # Docker Compose version v2.x
```

> `rsync` được cài ở đây vì GitHub Actions dùng nó để chép thư mục `deploy/` lên VPS (mục 8).

---

## 5. Trỏ DNS

Bạn cần 4 tên trỏ về IP của droplet:

| Loại | Tên (Host)         | Giá trị                     | TTL |
| ---- | ------------------ | --------------------------- | --- |
| A    | `@` (tên miền gốc) | `203.0.113.10` (IP droplet) | 300 |
| A    | `app`              | `203.0.113.10`              | 300 |
| A    | `api`              | `203.0.113.10`              | 300 |
| A    | `grafana`          | `203.0.113.10`              | 300 |

- Vào trang quản lý DNS của nơi bạn mua tên miền (hoặc đổi nameserver sang DigitalOcean rồi tạo bản ghi ở **Networking → Domains**).
- **TTL = 300 giây (5 phút)** trong lúc cấu hình để sửa sai có hiệu lực nhanh; ổn định rồi tăng lên 3600.
- Nếu dùng Cloudflare làm DNS: đặt các bản ghi này ở chế độ **DNS only** (đám mây xám), không bật proxy (đám mây cam), để Caddy tự lấy chứng chỉ.
- **Không** tạo bản ghi `AAAA` (IPv6) nếu droplet chưa bật IPv6 — Let's Encrypt sẽ thử IPv6 trước và thất bại.

**Kiểm tra** (chạy trên máy bạn; DNS có thể cần 5–30 phút để lan truyền):

```bash
nslookup api.<domain>               # Windows/macOS/Linux: phải ra đúng IP droplet
dig +short app.<domain>             # macOS/Linux/Git Bash có dig
```

Cả 4 tên (`<domain>`, `app.`, `api.`, `grafana.`) phải ra cùng IP trước khi sang mục 6.

### 5.1 Tên miền của nhóm: `eliuh.site` (đăng ký tại Tenten)

Bốn địa chỉ sau khi deploy: `https://eliuh.site` và `https://app.eliuh.site` (web app), `https://api.eliuh.site` (API), `https://grafana.eliuh.site` (giám sát). Trong `.env` trên VPS đặt `DOMAIN=eliuh.site`.

**Cách A (khuyên dùng) — tạo bản ghi ngay trên DNS của Tenten:**

1. Đăng nhập <https://id.tenten.vn> (tài khoản Tenten gửi khi mua) → **Quản lý dịch vụ** → **Tên miền** → ở dòng `eliuh.site` bấm **biểu tượng bánh răng** → **Cài đặt DNS** (hoặc vào thẳng <https://domain.tenten.vn>).
2. Nếu tên miền đã có sẵn bản ghi mặc định của Tenten (bản ghi `A` cho `@`/`www` trỏ về trang đỗ tên miền), **sửa** bản ghi `@` thay vì tạo trùng; xóa bản ghi `www` cũ hoặc trỏ nó về cùng IP.
3. Bấm **Thêm** và tạo lần lượt (Loại `A`, Giá trị = IP droplet, độ ưu tiên để mặc định, TTL 300 nếu có ô TTL):

   | Tên                | Loại | Giá trị    |
   | ------------------ | ---- | ---------- |
   | `@`                | A    | IP droplet |
   | `app`              | A    | IP droplet |
   | `api`              | A    | IP droplet |
   | `grafana`          | A    | IP droplet |
   | `www` _(tùy chọn)_ | A    | IP droplet |

4. Bấm **Lưu**. **Không** dùng nút "Cấu hình theo IP" của Tenten nếu tên miền đã có bản ghi khác (nút này xóa toàn bộ bản ghi cũ — sẽ mất cả bản ghi email SPF/DKIM ở mục 12).
5. Các bản ghi email của Brevo/Resend (mục 12.2: `TXT` SPF, `TXT`/`CNAME` DKIM, `TXT` `_dmarc`) cũng thêm ở đúng trang **Cài đặt DNS** này.

**Cách B — giao DNS cho DigitalOcean:** trên DigitalOcean vào **Networking → Domains**, thêm `eliuh.site` và tạo 4 bản ghi A ở bảng trên; rồi ở Tenten chọn bánh răng → **Cài đặt NS** → nhập `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com` → **Thêm NS**. Đổi nameserver có thể mất vài giờ mới có hiệu lực; từ đó mọi bản ghi (kể cả email) quản lý ở DigitalOcean.

Kiểm tra (Git Bash/PowerShell trên máy bạn):

```bash
nslookup eliuh.site
nslookup api.eliuh.site
nslookup app.eliuh.site
nslookup grafana.eliuh.site
```

Cả bốn phải trả về **đúng IP droplet** rồi mới sang mục 6 (Caddy chỉ xin được chứng chỉ HTTPS khi DNS đã đúng).

Tham khảo hướng dẫn của Tenten: [Hướng dẫn trỏ tên miền](https://help.tenten.vn/huong-dan-tro-ten-mien-ve-secureweb/), [Cập nhật bản ghi tên miền](https://tenten.vn/tin-tuc/cap-nhat-ban-ghi-ten-mien/).

---

## 6. Triển khai lần đầu

### 6.1 Chép thư mục `deploy/` lên VPS

Repo công khai nên có thể clone thẳng trên VPS:

```bash
mkdir -p ~/elearning
git clone --depth 1 https://github.com/kanele05/project_tbdd.git /tmp/project_tbdd
cp -r /tmp/project_tbdd/deploy ~/elearning/deploy
rm -rf /tmp/project_tbdd
cd ~/elearning/deploy && ls
```

_(Repo riêng tư? Trên máy bạn: `scp -i ~/.ssh/elearning_admin -r deploy deploy@203.0.113.10:~/elearning/`.)_

**Kiểm tra:** `ls` hiện `docker-compose.yml  caddy  grafana  scripts ...` và `ls -a` có `.env.example`.

### 6.2 Tạo `.env`

```bash
cd ~/elearning/deploy
cp .env.example .env
chmod 600 .env
# Sinh các bí mật ngẫu nhiên và điền vào .env:
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|"        .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|"                      .env
sed -i "s|^TOTP_ENC_KEY=.*|TOTP_ENC_KEY=$(openssl rand -base64 32)|"               .env
sed -i "s|^GRAFANA_ADMIN_PASSWORD=.*|GRAFANA_ADMIN_PASSWORD=$(openssl rand -hex 16)|" .env
# Điền tên miền và email nhận thông báo của Let's Encrypt:
sed -i "s|^DOMAIN=.*|DOMAIN=elearning-demo.xyz|"           .env
sed -i "s|^ACME_EMAIL=.*|ACME_EMAIL=ban@gmail.com|"        .env
nano .env                                                   # xem lại, điền SMTP/Turnstile/Gemini ở các mục 11-13 sau
```

Trước khi chạy seed ở mục 6.5, đặt hoặc xác nhận `PUBLIC_BASE_URL=https://api.<domain>` trong `deploy/.env` (domain hiện tại: `https://api.eliuh.site`). API dùng URL công khai này để tạo link tuyệt đối cho media.

**Kiểm tra:** `grep -E "^(DOMAIN|ACME_EMAIL|POSTGRES_PASSWORD|JWT_SECRET|TOTP_ENC_KEY|GRAFANA_ADMIN_PASSWORD)=" .env` — cả 6 dòng đều có giá trị. Sau đó:

```bash
docker compose config --quiet && echo "compose hop le"
```

> **Cất các giá trị này vào trình quản lý mật khẩu.** Đặc biệt `TOTP_ENC_KEY` (mất/đổi = không ai đăng nhập 2FA được) và `POSTGRES_PASSWORD`. Mật khẩu Postgres chỉ được áp dụng **lần đầu** volume dữ liệu được tạo; đổi trong `.env` sau đó không đổi mật khẩu trong database (xem mục 14).

### 6.3 Khởi động hạ tầng

Hai image của ứng dụng (`api`, `web`) chỉ có sau khi GitHub Actions build lần đầu (mục 8). Trong lúc chờ, bật phần còn lại để kiểm tra DNS, HTTPS và Grafana:

```bash
docker compose up -d caddy postgres backup prometheus loki alloy grafana node-exporter cadvisor postgres-exporter
docker compose ps
```

_(Muốn thử Let's Encrypt trước mà không lo bị giới hạn số lần xin chứng chỉ: tạm đặt `ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory` trong `.env`, kiểm tra xong đổi lại bản thật và `docker compose up -d --force-recreate caddy`; xóa chứng chỉ staging bằng `docker volume rm elearning_caddy_data` khi caddy đã dừng.)_

**Kiểm tra:** cột STATUS của mọi service là `Up` (postgres/prometheus/grafana có thêm `(healthy)` sau ~30 giây).

### 6.4 Kiểm tra HTTPS

Chờ ~1 phút để Caddy xin chứng chỉ, rồi:

```bash
curl -sI https://grafana.<domain> | head -3          # HTTP/2 302 (chuyển tới /login) - có ổ khóa HTTPS hợp lệ
curl -sI http://grafana.<domain> | head -3          # 308 chuyển sang https
docker compose logs caddy 2>&1 | grep -iE "certificate obtained|error" | tail
```

Mở trình duyệt: `https://grafana.<domain>` thấy trang đăng nhập Grafana **có ổ khóa**. `https://api.<domain>/api/v1/health` lúc này trả `502` (API chưa chạy) — bình thường.

### 6.5 Dữ liệu mẫu (chạy đúng **một lần**, sau khi `api` đã chạy ở mục 8)

```bash
docker compose exec -e SEED_FORCE=1 api /opt/tools/node_modules/.bin/tsx prisma/seed.ts
```

> ⚠ Seed **xóa toàn bộ dữ liệu** rồi tạo lại dữ liệu mẫu (tài khoản demo, khóa học...). Chỉ chạy trên database mới, **không bao giờ** chạy khi đã có người dùng thật. Tài khoản demo nằm ở `server/prisma/seed-data/users.ts`.

---

## 7. Grafana

1. Mở `https://grafana.<domain>`. Đăng nhập: user `GRAFANA_ADMIN_USER` (mặc định `admin`), mật khẩu `GRAFANA_ADMIN_PASSWORD` trong `.env`:
   ```bash
   grep GRAFANA_ADMIN .env
   ```
2. **Đổi mật khẩu ngay:** biểu tượng người dùng (góc dưới trái) → **Profile → Change password**. (Từ đó giá trị trong `.env` không còn là mật khẩu thật.) Quên mật khẩu:
   ```bash
   docker compose exec grafana grafana cli admin reset-admin-password "<mat-khau-moi>"
   ```
3. Vào **Dashboards → E-Learning** (thư mục tự nạp từ `grafana/dashboards/`). Có 4 dashboard:

| Dashboard                                   | Xem gì                                                                                                                                                                | Dữ liệu từ              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **E-Learning · API** _(trang chủ mặc định)_ | Request/s, tỷ lệ lỗi 4xx/5xx, latency p50/p95/p99 (tổng và theo route), request đang xử lý, CPU/RAM/event loop của Node.js, lệnh gọi AI (số lượng, độ trễ, tỷ lệ lỗi) | `/metrics` của API      |
| **E-Learning · Hạ tầng**                    | CPU, RAM, swap, disk, mạng, load của VPS; CPU/RAM/mạng/uptime từng container; OOM kill; trạng thái scrape (`up`)                                                      | node-exporter, cAdvisor |
| **E-Learning · PostgreSQL**                 | Kết nối, giao dịch/s, cache hit, dung lượng DB, deadlock, khóa, bảng lớn nhất                                                                                         | postgres-exporter       |
| **E-Learning · Logs**                       | Số dòng log API theo mức độ, lỗi gần đây, request chậm > 1 giây, truy vấn Postgres chậm, lỗi Caddy/5xx, ô tìm kiếm tự do                                              | Loki (qua Alloy)        |

Dashboard được nạp từ file nên **không sửa và lưu trong giao diện** được (tránh lệch với git). Muốn đổi: sửa file JSON trong `grafana/dashboards/`, deploy lại; Grafana tự nạp trong ≤ 60 giây.

**Kiểm tra:**

- **Connections → Data sources**: có `Prometheus` và `Loki`; bấm **Save & test** ra "Successfully queried".
- **Explore** → chọn Prometheus → chạy `up` → mọi job (`api`, `node`, `cadvisor`, `postgres`, `prometheus`, `loki`, `alloy`, `grafana`) bằng **1**. (`api` = 0 cho tới khi API chạy ở mục 8.)
- Tạo thử lưu lượng rồi xem dashboard API sau ~30 giây:
  ```bash
  for i in $(seq 1 60); do curl -s -o /dev/null https://api.<domain>/api/v1/health; done
  ```
- Nếu `node` ở trạng thái 0 → thiếu luật ufw ở mục 3.4 (xem mục 14).

> **Chụp ảnh dashboard cho báo cáo/slide:** mở dashboard, chọn khoảng thời gian rồi dùng nút **Share → Link/Snapshot**, hoặc chụp màn hình trực tiếp.

---

## 8. GitHub Actions: CI/CD tự động

Quy trình (`.github/workflows/`):

```
Pull Request / push develop ──► ci.yml:   server (typecheck, lint, format, test với PostgreSQL) · mobile · build thử Docker
push main hoặc tag v*       ──► deploy.yml: ci (kiểm thử) → build image api + web → đẩy lên GHCR → SSH vào VPS cập nhật
```

### 8.1 Tạo khóa SSH riêng cho GitHub Actions

Trên **máy bạn** (khóa riêng, không dùng chung khóa admin):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -N "" -f ~/.ssh/elearning_deploy
cat ~/.ssh/elearning_deploy.pub | ssh -i ~/.ssh/elearning_admin deploy@203.0.113.10 'cat >> ~/.ssh/authorized_keys'
ssh -i ~/.ssh/elearning_deploy deploy@203.0.113.10 'echo ok && docker ps >/dev/null && echo docker-ok'
ssh-keyscan -t ed25519 203.0.113.10        # in ra 1 dòng "203.0.113.10 ssh-ed25519 AAAA..." - dùng cho SSH_KNOWN_HOSTS
```

**Kiểm tra:** lệnh thứ 3 in `ok` và `docker-ok` (user `deploy` chạy được docker, không cần mật khẩu).

### 8.2 Tạo GitHub Secrets

Repo trên GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret               | Giá trị                                                                                                                                      | Bắt buộc        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `SSH_HOST`           | IP droplet, vd. `203.0.113.10`                                                                                                               | ✔               |
| `SSH_USER`           | `deploy`                                                                                                                                     | ✔               |
| `SSH_KEY`            | **toàn bộ** nội dung file `~/.ssh/elearning_deploy` (cả dòng `-----BEGIN OPENSSH PRIVATE KEY-----` và `END`) — `cat ~/.ssh/elearning_deploy` | ✔               |
| `DOMAIN`             | tên miền gốc, vd. `elearning-demo.xyz` (nhúng vào bản web: `https://api.<domain>/api/v1`)                                                    | ✔               |
| `SSH_KNOWN_HOSTS`    | dòng in ra bởi `ssh-keyscan` ở 8.1 (chống giả mạo máy chủ)                                                                                   | khuyến nghị     |
| `TURNSTILE_SITE_KEY` | site key Turnstile (mục 11); nhúng vào bản web lúc build                                                                                     | khi bật CAPTCHA |
| `SSH_PORT`           | cổng SSH nếu khác 22                                                                                                                         | tùy chọn        |
| `DEPLOY_PATH`        | thư mục deploy trên VPS nếu khác `elearning/deploy` (tính từ thư mục home)                                                                   | tùy chọn        |

Không cần secret để đăng nhập GHCR: workflow dùng `GITHUB_TOKEN` có sẵn.

Cũng kiểm tra **Settings → Actions → General → Workflow permissions**: để **Read and write permissions** (hoặc ít nhất đừng chặn `packages: write` ở cấp tổ chức).

### 8.3 Chạy lần đầu

1. Đảm bảo nhánh `main` có thư mục `.github/workflows/`, `deploy/`, `server/Dockerfile`, `mobile/Dockerfile.web` (merge `develop` → `main`).
2. Push/merge vào `main`, hoặc **Actions → Deploy → Run workflow** (chọn nhánh `main`).
3. Theo dõi tab **Actions**: `Kiểm tra secret` → `Kiểm thử` → `Build & push image api/web` (web mất ~5–10 phút lần đầu) → `Deploy lên VPS` → `Kiểm tra API qua HTTPS`.

**Kiểm tra:** mọi job xanh; trên máy bạn:

```bash
curl -s https://api.<domain>/api/v1/health      # {"data":{"status":"ok",...}}
```

Mở `https://app.<domain>` thấy app web; `https://grafana.<domain>` → dashboard API bắt đầu có số liệu. Rồi chạy seed ở mục 6.5.

### 8.4 Gói (package) GHCR

Image nằm ở `ghcr.io/<chu-repo>/elearning-api` và `elearning-web` (xem trong tab **Packages** của trang cá nhân/repo). Mặc định gói **riêng tư**; deploy vẫn chạy vì dùng `GITHUB_TOKEN`. Nếu muốn `docker compose pull` thủ công trên VPS:

- cách đơn giản: gói → **Package settings → Change visibility → Public**; hoặc
- giữ riêng tư và đăng nhập bằng token: GitHub → **Settings → Developer settings → Personal access tokens (classic)** → quyền `read:packages` →
  ```bash
  echo "<token>" | docker login ghcr.io -u <ten-github> --password-stdin
  ```

Nếu gói báo không cho repo truy cập: **Package settings → Manage Actions access → Add repository** (chọn repo, role _Write_).

### 8.5 Dùng hằng ngày

| Việc                      | Cách làm                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Kiểm thử                  | mở PR vào `develop`/`main` → `ci.yml` tự chạy                                                                    |
| Triển khai                | merge vào `main` → `deploy.yml` tự build + cập nhật VPS (tag image: `latest`, `sha-xxxxxxx`)                     |
| Phát hành                 | `git tag v1.0.0 && git push origin v1.0.0` → như trên, thêm tag `1.0.0`, `1.0`                                   |
| Deploy tay trên VPS       | `cd ~/elearning/deploy && bash scripts/deploy.sh`                                                                |
| Quay về bản cũ (rollback) | sửa `.env`: `IMAGE_TAG=sha-xxxxxxx` (mã commit cũ) rồi `bash scripts/deploy.sh`; xong đặt lại `IMAGE_TAG=latest` |
| Đổi `.env`                | sửa file rồi `docker compose up -d` (tự tạo lại container có thay đổi)                                           |

Mỗi lần deploy, `scripts/deploy.sh` kéo image mới, `docker compose up -d`, reload Caddy, restart Prometheus/Loki/Alloy nếu file cấu hình của chúng đổi, chờ API `healthy` (đã chạy xong `prisma migrate deploy`) và dọn image cũ.

---

## 9. Build APK Android bằng EAS

Trên **máy bạn** (cần Node.js):

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init                  # lần đầu: liên kết dự án với tài khoản Expo
npx eas-cli@latest build:configure -p android
```

Không cần cài `eas-cli` toàn cục. Lệnh `init` liên kết project Expo; `build:configure` cấu hình EAS Build. Tài khoản Expo miễn phí tại <https://expo.dev>.

Site key Turnstile là giá trị **công khai** được nhúng vào bundle, nhưng không nên commit trực tiếp vào `eas.json`. Trong Expo project, mở **Project settings → Environment variables**, tạo `EXPO_PUBLIC_TURNSTILE_SITE_KEY` với visibility `Plain text` cho cả hai environment `preview` và `production`. Khi có site key từ Cloudflare, có thể cấu hình bằng lệnh (chạy riêng cho từng environment):

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_TURNSTILE_SITE_KEY --value "PASTE_REAL_TURNSTILE_SITE_KEY" --environment preview --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_TURNSTILE_SITE_KEY --value "PASTE_REAL_TURNSTILE_SITE_KEY" --environment production --visibility plaintext
```

Trước mỗi lần build, kiểm tra cả hai environment có biến đúng (không phải test key hoặc giá trị placeholder):

```bash
npx eas-cli@latest env:list --environment preview
npx eas-cli@latest env:list --environment production
```

Trong `eas.json`, profile `preview` và `production` cần chọn EAS environment tương ứng (`"environment": "preview"` / `"environment": "production"`) và **xóa** `EXPO_PUBLIC_TURNSTILE_SITE_KEY` khỏi trường `env` của hai profile. Giá trị cùng tên trong `eas.json` có độ ưu tiên cao hơn biến EAS; placeholder `REPLACE_WITH_TURNSTILE_SITE_KEY` vì vậy sẽ che site key thật và làm CAPTCHA không hợp lệ. App mặc định dùng Turnstile test key nếu biến này vắng mặt, nên phải xác nhận biến production chứa site key thật trước khi build production. Hướng dẫn chính thức: [EAS environment variables](https://docs.expo.dev/eas/environment-variables/).

Giữ `EXPO_PUBLIC_API_URL=https://api.eliuh.site/api/v1` và `EXPO_PUBLIC_TURNSTILE_BASE_URL=https://app.eliuh.site` trong `env` của từng profile `eas.json`; site key lấy riêng từ EAS environment được profile chọn. Trong `mobile/.env` local cũng đặt `EXPO_PUBLIC_TURNSTILE_BASE_URL=https://app.eliuh.site` và cho phép cả hai hostname `eliuh.site` và `app.eliuh.site` trong widget Cloudflare. Site key là công khai, còn `TURNSTILE_SECRET_KEY` chỉ lưu trong `server/.env`/`deploy/.env` phía server; không đưa secret key vào `mobile/.env`, EAS, `eas.json`, app hoặc GitHub Actions. VPS chưa được tạo nên chưa chạy build. CAPTCHA thật hiện chưa được xác minh; CI combined status cũng chưa xác nhận xanh. Khi API/VPS và các key đã sẵn sàng:

```bash
npx eas-cli@latest build -p android --profile preview       # ra file APK cài trực tiếp được (khuyên dùng)
# npx eas-cli@latest build -p android --profile production # ra AAB để đưa lên Google Play
```

Trả lời `Yes` khi EAS hỏi tạo Android keystore. Build chạy trên máy chủ của Expo (gói miễn phí có thể phải xếp hàng 10–30 phút). Xong, EAS in **liên kết tải APK + mã QR**.

**Kiểm tra:** mở liên kết trên điện thoại Android → tải APK → cho phép "cài từ nguồn không xác định" → cài → mở app, đăng nhập được và danh sách khóa học hiện ra (app đang gọi `https://api.<domain>`). Lưu liên kết/QR vào README gốc (task DEP-04).

> Chỉ build APK production sau khi API trên VPS đã sẵn sàng và URL production trong `eas.json` hoạt động; VPS hiện chưa sẵn sàng nên chưa chạy build production. Đổi domain hoặc site key = phải build lại APK (hai giá trị này được nhúng vào app lúc build). iPhone chưa có bản native — dùng bản web `https://app.<domain>` (có thể "Thêm vào Màn hình chính").

---

## 10. Sao lưu và khôi phục database

### 10.1 Sao lưu tự động

Container `backup` chạy `pg_dump` (định dạng nén `-Fc`) mỗi ngày lúc `BACKUP_HOUR_UTC` (mặc định 20:00 UTC = 03:00 sáng giờ Việt Nam), giữ `BACKUP_KEEP` bản mới nhất (mặc định 7) trong `deploy/backups/`. Khi khởi động, nếu 12 giờ qua chưa có bản nào nó sao lưu ngay.

```bash
cd ~/elearning/deploy
docker compose logs backup | tail -5      # [backup] ... ok (xx KB)
ls -lh backups/                           # elearning-20261103-200000.dump ...
```

### 10.2 Sao lưu thủ công (trước khi nâng cấp lớn)

```bash
docker compose run --rm --entrypoint sh backup -c 'pg_dump --format=custom --no-owner -f /backups/manual-$(date -u +%Y%m%d-%H%M%S).dump'
ls -lh backups/manual-*
```

Bản `manual-*` không bị xóa tự động.

### 10.3 Chép bản sao lưu về máy bạn (nên làm định kỳ — VPS hỏng là mất cả backup nếu chỉ lưu trên đó)

Trên **máy bạn**:

```bash
scp -i ~/.ssh/elearning_admin "deploy@203.0.113.10:~/elearning/deploy/backups/*.dump" ./backups-elearning/
```

Kiểm tra một file đọc được: `docker compose exec -T postgres pg_restore --list < backups/<file>.dump | head` in danh sách bảng.

File người dùng tải lên (ảnh đại diện, bài nộp) nằm ở volume `elearning_uploads`, không nằm trong dump:

```bash
docker run --rm -v elearning_uploads:/data -v "$PWD/backups":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

### 10.4 Khôi phục

> ⚠ Ghi đè dữ liệu hiện tại bằng nội dung bản sao lưu. Làm sao lưu thủ công (10.2) trước.

```bash
cd ~/elearning/deploy
docker compose stop api                                   # ngắt kết nối vào DB
docker compose exec -T postgres pg_restore -U elearning -d elearning \
  --clean --if-exists --no-owner < backups/elearning-20261103-200000.dump
docker compose start api
```

(`elearning` là `POSTGRES_USER`/`POSTGRES_DB` trong `.env`; sửa nếu bạn đổi. Các cảnh báo kiểu "role ... does not exist" có thể bỏ qua.)

Khôi phục trên **VPS mới**: làm mục 2–6 để có `.env` (dùng lại **đúng** `TOTP_ENC_KEY` và `JWT_SECRET` cũ), `docker compose up -d postgres`, chờ `healthy`, chạy lệnh `pg_restore` ở trên, rồi `docker compose up -d`.

**Kiểm tra:** `docker compose exec postgres psql -U elearning -d elearning -c '\dt'` liệt kê bảng; `curl https://api.<domain>/api/v1/health` ra `ok`; đăng nhập app bằng tài khoản cũ.

---

## 11. CAPTCHA: reCAPTCHA v2 Checkbox / Turnstile

### 11.1 Lựa chọn hiện tại: reCAPTCHA v2 Checkbox (AUTH-14)

Người dùng chọn checkbox thật của Google ngày 08/10. Không dùng nút xác nhận tự dựng để thay CAPTCHA. Turnstile cũ vẫn là provider mặc định cho tới khi có key Google thật và triển khai đồng bộ API/web.

1. Tự mở <https://www.google.com/recaptcha/admin/create>, chọn **Challenge (v2) → “I'm not a robot” Checkbox**, không chọn Invisible/v3. Khai báo `eliuh.site`, `app.eliuh.site`, `api.eliuh.site`; thêm `localhost` nếu thử local.
2. Trong `server/.env` local đặt `CAPTCHA_PROVIDER=recaptcha_v2`, `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `CAPTCHA_ALLOWED_HOSTNAMES=eliuh.site,app.eliuh.site,api.eliuh.site,localhost`. Secret chỉ nằm phía server, không gửi vào chat.
3. Trong `mobile/.env` local đặt `EXPO_PUBLIC_CAPTCHA_PROVIDER=recaptcha_v2`, `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` bằng site key công khai, `EXPO_PUBLIC_RECAPTCHA_BASE_URL=https://app.eliuh.site`. Khởi động lại server/Expo sau khi đổi env. Cần hostname local trong allowlist server khi thử web localhost.
4. Production `deploy/.env` dùng cùng bốn biến server, nhưng bỏ `localhost` khỏi `CAPTCHA_ALLOWED_HOSTNAMES`. Web build lấy site key/provider từ Compose. Backup `.env` và image API/web hiện tại; build cả hai image thành công trước khi chuyển provider và recreate đồng thời API/web. Không chạy seed/migration cho đổi CAPTCHA. Giữ bản cũ để rollback cả provider và hai image nếu kiểm tay thất bại.
5. GitHub Actions: tạo repository variable `CAPTCHA_PROVIDER=recaptcha_v2`, secret `RECAPTCHA_SITE_KEY` (công khai nhưng quản lý cùng cấu hình build). Không đưa `RECAPTCHA_SECRET_KEY` vào build args, web, EAS hoặc workflow. Secret chỉ ở `deploy/.env` trên VPS.
6. EAS preview/production: cấu hình ba biến public tương ứng ở environment được profile chọn. Không để giá trị trong `eas.json` ghi đè nhầm provider/site key. Build lại web/APK khi đổi cấu hình public.
7. Người dùng tự tick widget và thử đăng ký/quên mật khẩu/đăng nhập cần CAPTCHA. Server kiểm success, hostname allowlist chính xác, token mới không quá 120 giây và từ chối lỗi mạng; token đã dùng/expiry phải lấy lại. Key test chỉ dùng dev; production không nhận key test. Không coi unit test/mock là đã kiểm CAPTCHA thật.

Nguồn chính thức: [Hiển thị checkbox v2](https://developers.google.com/recaptcha/docs/display), [Xác minh token server](https://developers.google.com/recaptcha/docs/verify).

### 11.2 Provider Turnstile tương thích / lịch sử

Turnstile là CAPTCHA miễn phí của Cloudflare, dùng ở đăng ký, quên mật khẩu và đăng nhập sau 3 lần sai (AUTH-05).

1. Tạo tài khoản miễn phí tại <https://dash.cloudflare.com/sign-up> (bạn tự làm; **không** cần chuyển DNS sang Cloudflare).
2. Dashboard → menu trái **Turnstile** → **Add widget**:
   - **Widget name:** `E-Learning`
   - **Hostname Management:** thêm cả `eliuh.site` và `app.eliuh.site` (Caddy phục vụ web trên cả hai hostname; CAPTCHA trong WebView dùng `app.eliuh.site`)
   - **Widget Mode:** _Managed_ (khuyên dùng) → **Create**
3. Cloudflare hiển thị **Site Key** (công khai) và **Secret Key** (bí mật).
4. Sau khi VPS sẵn sàng, cấu hình `TURNSTILE_SITE_KEY` và `TURNSTILE_SECRET_KEY` trong `deploy/.env` trên VPS rồi khởi động lại API. Chỉ site key được dùng ở client: lưu GitHub Secret `TURNSTILE_SITE_KEY` để build web và EAS environment variable `EXPO_PUBLIC_TURNSTILE_SITE_KEY` trong `preview`/`production` để build APK. Local `mobile/.env` cần site key và `EXPO_PUBLIC_TURNSTILE_BASE_URL=https://app.eliuh.site`; allowlist widget phải có cả `eliuh.site` và `app.eliuh.site`. Không lưu secret key trong EAS hoặc client.
5. Build lại web và APK sau khi cấu hình site key, vì site key được nhúng vào bundle. Chỉ xác nhận biến hiện diện không chứng minh CAPTCHA thật hoạt động; kiểm thử luồng CAPTCHA thật trước khi đánh dấu hoàn tất.

**Key để thử (dev), không cần tài khoản — KHÔNG dùng production:**

|            | Site key                   | Secret key                            |
| ---------- | -------------------------- | ------------------------------------- |
| Luôn qua   | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Luôn trượt | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |

**Kiểm tra:** mở `https://app.<domain>` → màn Đăng ký → thấy ô "Verify you are human" và đăng ký được. Lỗi `110200` (domain not allowed) = hostname đang mở chưa nằm trong danh sách ở bước 2.

---

## 12. Gửi email: Brevo hoặc Resend (SMTP)

API gửi mã OTP xác minh email và mã quên mật khẩu qua SMTP (AUTH-02, AUTH-03, AUTH-07). Gửi bằng một dịch vụ chuyên dụng (**không** gửi trực tiếp từ VPS — sẽ vào spam) và phải xác minh domain để thư không bị từ chối.

### 12.1 Chọn nhà cung cấp

|                           | Brevo                                                                 | Resend                                      |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| Gói miễn phí              | khoảng 300 thư/ngày                                                   | khoảng 3.000 thư/tháng (100/ngày), 1 domain |
| Đăng ký                   | <https://www.brevo.com>                                               | <https://resend.com>                        |
| `SMTP_HOST` / `SMTP_PORT` | `smtp-relay.brevo.com` / `587`                                        | `smtp.resend.com` / `587`                   |
| `SMTP_USER`               | "Login" hiển thị ở trang _SMTP & API_                                 | `resend`                                    |
| `SMTP_PASS`               | **SMTP key** tạo ở trang _SMTP & API_ (không phải mật khẩu tài khoản) | **API key** (`re_...`) tạo ở _API Keys_     |

_(Hạn mức và giao diện có thể thay đổi — xem trang của nhà cung cấp.)_ Chọn một trong hai.

### 12.2 Xác minh domain (SPF · DKIM · DMARC)

Thêm domain ở nhà cung cấp (Brevo: _Senders, Domains & Dedicated IPs → Domains → Add a domain_; Resend: _Domains → Add Domain_). Họ hiển thị **chính xác** các bản ghi DNS cần tạo — copy nguyên văn vào trang DNS của tên miền (cùng nơi tạo bản ghi A ở mục 5), chờ rồi bấm **Verify**.

| Bản ghi   | Kiểu · Tên                          | Để làm gì                                        | Ví dụ giá trị _(chỉ minh họa — dùng đúng giá trị nhà cung cấp đưa)_ |
| --------- | ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| **SPF**   | TXT · `@` hoặc subdomain gửi thư    | Liệt kê máy chủ được phép gửi thư cho domain     | `v=spf1 include:spf.brevo.com ~all`                                 |
| **DKIM**  | TXT/CNAME · `<selector>._domainkey` | Chữ ký số chứng minh thư không bị sửa/giả        | `v=DKIM1; k=rsa; p=MIGfMA0...`                                      |
| **DMARC** | TXT · `_dmarc`                      | Quy định xử lý thư SPF/DKIM không khớp + báo cáo | `v=DMARC1; p=none; rua=mailto:ban@gmail.com`                        |

Lưu ý quan trọng:

- Mỗi domain chỉ được có **một** bản ghi SPF. Nếu đã có sẵn, **gộp** `include:` mới vào cùng một dòng, không tạo dòng thứ hai.
- DMARC bắt đầu ở `p=none` (chỉ theo dõi); khi thư đã qua ổn vài tuần mới nâng lên `p=quarantine`.
- Nhà cung cấp có thể yêu cầu thêm một bản ghi TXT "mã xác minh" hoặc MX cho subdomain (vd. `send.<domain>` của Resend) — thêm đủ theo hướng dẫn.

**Kiểm tra bản ghi đã hiện** (máy bạn):

```bash
nslookup -type=TXT _dmarc.<domain>
nslookup -type=TXT <domain>                  # tìm dòng v=spf1 ...
```

Trạng thái domain ở trang nhà cung cấp phải là **Verified/Authenticated**.

### 12.3 Điền vào `.env`

```ini
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<login SMTP>
SMTP_PASS=<SMTP key>
MAIL_FROM="E-Learning <no-reply@<domain>>"
```

`MAIL_FROM` phải thuộc domain đã xác minh. Áp dụng: `docker compose up -d api`.

**Kiểm tra:** đăng ký tài khoản trong app bằng một email thật → nhận mã OTP trong hộp thư (xem cả mục Spam). Mở thư → _Show original_ (Gmail): `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Gửi thử vào <https://www.mail-tester.com> để chấm điểm (mục tiêu ≥ 9/10).

> DigitalOcean có thể **chặn kết nối SMTP đi ra** (cổng 25 luôn bị chặn; 465/587 có thể bị chặn ở tài khoản mới). Thử: `nc -vz smtp-relay.brevo.com 587`. Nếu timeout → thử cổng thay thế (Brevo: `2525`; Resend: `2587`) hoặc liên hệ hỗ trợ DigitalOcean để mở.

### 12.4 Thử email trên staging bằng Mailpit (không gửi ra ngoài)

Mailpit là hộp thư giả: mọi thư API gửi đều nằm lại đây, hữu ích khi test mà không muốn gửi thư thật.

```bash
# .env:
COMPOSE_PROFILES=mail
SMTP_HOST=mailpit
SMTP_PORT=1025
# rồi:
docker compose up -d
```

Xem thư bằng **SSH tunnel** (cổng 8025 chỉ mở trên `127.0.0.1` của VPS). Trên **máy bạn**:

```bash
ssh -i ~/.ssh/elearning_admin -L 8025:127.0.0.1:8025 deploy@203.0.113.10
```

giữ cửa sổ này mở, vào <http://localhost:8025>. Mailpit hiển thị mọi mã OTP/liên kết nên **không bao giờ mở công khai** trên production (`caddy/sites/mail.caddy.example` mô tả cách mở có mật khẩu, chỉ cho staging). Production thật: để `COMPOSE_PROFILES` trống.

---

## 13. Google Gemini (AI)

1. Vào <https://aistudio.google.com/apikey> (đăng nhập tài khoản Google) → **Create API key** → chọn/ tạo một project → copy khóa (`AIza...`).
2. Điền `deploy/.env`:
   ```ini
   GEMINI_API_KEY=AIza...
   AI_PROVIDER=gemini
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
3. Áp dụng: `docker compose up -d api`.

Kết quả AI được lưu trong bảng `AiContent`; khóa cache hiện **không phân biệt provider/model**, và tóm tắt/quiz không có TTL. Đổi `AI_PROVIDER` hoặc `GEMINI_MODEL` không tự sinh lại kết quả cũ: nội dung mock có thể vẫn xuất hiện sau khi bật Gemini. Không chạy seed hoặc xóa toàn bộ cache/DB chỉ để đổi cấu hình; rà soát riêng kết quả mock cần làm mới trước demo. Dùng AI Tutor hoặc nội dung chưa có cache để kiểm tra provider mới.

**Kiểm tra:** trong app mở một khóa học → **AI Tutor** hỏi một câu → có câu trả lời (không còn là văn bản giả của chế độ `mock`). Trong Grafana → dashboard **API** → hàng "AI (Google Gemini / mock)" có số liệu; `docker compose logs api | grep -i gemini` không có lỗi.

Lưu ý:

- Gói miễn phí có **giới hạn số request** (theo phút và theo ngày) và Google có thể dùng dữ liệu gửi lên để cải thiện sản phẩm → app không gửi thông tin cá nhân nhạy cảm. Server có hạn mức riêng (`AI_*_LIMIT_*` trong `.env`) để không chạm trần; vượt hạn mức trả `429 AI_RATE_LIMITED`.
- Khóa bị lộ → vào AI Studio xóa rồi tạo lại, cập nhật `.env`.

---

## 14. Xử lý sự cố thường gặp

Lệnh hay dùng (trong `~/elearning/deploy`):

```bash
docker compose ps                         # trạng thái mọi service
docker compose logs -f --tail 100 api     # xem log (Ctrl+C để thoát) - thay api bằng caddy, postgres, grafana...
docker compose restart api                # khởi động lại một service
docker compose up -d                      # áp dụng thay đổi .env / compose
docker stats --no-stream                  # CPU/RAM từng container
df -h / && docker system df               # dung lượng ổ đĩa
```

### 14.1 Bảng chẩn đoán

| Triệu chứng                                                             | Nguyên nhân thường gặp → cách xử lý                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose` báo `Set DOMAIN in deploy/.env` (hoặc biến khác)       | Biến bắt buộc còn trống → điền trong `.env` (mục 6.2).                                                                                                                                                                                                                                                                                                                       |
| Trình duyệt báo chứng chỉ không hợp lệ / Caddy không xin được chứng chỉ | DNS chưa trỏ đúng (`nslookup`), có bản ghi AAAA thừa, cổng 80/443 bị chặn (ufw hoặc Firewall của DigitalOcean), hoặc đang dùng CA staging. Xem `docker compose logs caddy`. Bị Let's Encrypt giới hạn → dùng `ACME_CA` staging (mục 6.3) trong lúc thử.                                                                                                                      |
| `502 Bad Gateway` ở `api.`/`app.`                                       | Container chưa chạy hoặc chưa healthy: `docker compose ps`, `docker compose logs api`. Trước lần deploy đầu tiên đây là bình thường.                                                                                                                                                                                                                                         |
| `api` khởi động lại liên tục                                            | `docker compose logs api`: `Invalid environment variables ...` → sửa biến được nêu (vd. `TOTP_ENC_KEY` phải 32 byte base64 và khác khóa dev); `password authentication failed` → xem dòng dưới; lỗi migration → đọc thông báo Prisma.                                                                                                                                        |
| `password authentication failed for user "elearning"`                   | Mật khẩu Postgres chỉ áp dụng khi **khởi tạo lần đầu**. Đổi `POSTGRES_PASSWORD` trong `.env` sau đó thì lệch. Sửa: đặt lại `.env` như cũ, hoặc đổi trong DB: `docker compose exec postgres psql -U elearning -c "ALTER USER elearning PASSWORD '<moi>';"` rồi cập nhật `.env`. (Chỉ khi chưa có dữ liệu mới nên `docker compose down -v` — lệnh đó **xóa toàn bộ dữ liệu**.) |
| `pull access denied` / `manifest unknown` khi kéo image                 | Image chưa được build (chạy `deploy.yml` thành công trước), tên chủ repo (`GHCR_OWNER`) sai chữ hoa/thường, hoặc gói riêng tư và chưa `docker login` (mục 8.4).                                                                                                                                                                                                              |
| Workflow Deploy lỗi `Permission denied (publickey)`                     | `SSH_KEY` sai/thiếu dòng BEGIN/END, hoặc chưa thêm khóa công khai vào `~/.ssh/authorized_keys` của `deploy` (8.1).                                                                                                                                                                                                                                                           |
| Workflow lỗi `Host key verification failed`                             | `SSH_KNOWN_HOSTS` sai IP/loại khóa → chạy lại `ssh-keyscan -t ed25519 <IP>` và dán lại, hoặc xóa secret này để dùng chế độ tin lần đầu.                                                                                                                                                                                                                                      |
| VPS hết RAM / container bị `Killed`                                     | `free -h`, `docker stats`; dashboard **Hạ tầng** → "OOM kill". Chắc chắn đã bật swap (3.7). Giảm `--storage.tsdb.retention.*` của Prometheus, tắt profile không dùng, hoặc nâng droplet.                                                                                                                                                                                     |
| Prometheus job `node` = 0 (DOWN)                                        | Thiếu luật ufw cho node-exporter (3.4). Thử: `docker compose exec prometheus wget -qO- http://host.docker.internal:9100/metrics \| head -3`. Không ra gì → thêm lại luật ufw rồi `docker compose restart node-exporter prometheus`.                                                                                                                                          |
| Prometheus job `api` = 0                                                | API chưa chạy, hoặc đã đặt `METRICS_TOKEN` mà chưa cấu hình token cho Prometheus (xem phần bình luận trong `prometheus/prometheus.yml`). Cách đơn giản: để trống `METRICS_TOKEN` (cổng 9464 đã không ra Internet).                                                                                                                                                           |
| Dashboard **Hạ tầng** không có tên container / thiếu container          | cAdvisor chạy chưa đủ quyền trên một số máy → trong `docker-compose.yml`, mục `cadvisor` thêm dòng `privileged: true` rồi `docker compose up -d cadvisor`.                                                                                                                                                                                                                   |
| Dashboard trống ("No data")                                             | Chưa có lưu lượng (tạo thử bằng vòng lặp `curl` ở mục 7), khoảng thời gian chọn quá xa, hoặc job tương ứng đang DOWN (Explore → `up`).                                                                                                                                                                                                                                       |
| Dashboard **Logs** trống                                                | `docker compose logs alloy` (lỗi đọc `/var/run/docker.sock`?), `docker compose logs loki`. Log Loki giữ 7 ngày.                                                                                                                                                                                                                                                              |
| Không nhận được email OTP                                               | `docker compose logs api \| grep -iE "smtp\|mail"`; kiểm tra `SMTP_*`, domain đã **Verified**, thư trong mục Spam, và cổng SMTP có bị chặn (mục 12.3). `SMTP_HOST` trống = API chỉ ghi thư ra log.                                                                                                                                                                           |
| Mã 2FA luôn "sai"                                                       | Đồng hồ điện thoại hoặc VPS lệch: `timedatectl` phải `synchronized: yes`; bật đồng bộ giờ tự động trên điện thoại.                                                                                                                                                                                                                                                           |
| CAPTCHA báo lỗi / không hiện                                            | Site key sai hoặc chưa build lại web/APK sau khi đổi key; hostname chưa thêm trong widget (lỗi `110200`); dùng nhầm key test ở production.                                                                                                                                                                                                                                   |
| Ổ đĩa đầy                                                               | `docker system df`; `docker image prune -af`; xóa bớt `backups/` cũ đã chép về máy; xem `du -sh /var/lib/docker/volumes/*`. Prometheus giữ 15 ngày/2 GB, Loki 7 ngày.                                                                                                                                                                                                        |
| Sau khi khởi động lại VPS có service không lên                          | Docker tự chạy lại mọi service (`restart: unless-stopped`). Nếu thiếu: `cd ~/elearning/deploy && docker compose up -d`.                                                                                                                                                                                                                                                      |

### 14.2 Cập nhật hệ điều hành

```bash
sudo apt update && sudo apt -y upgrade
[ -f /var/run/reboot-required ] && echo "Cần reboot" && sudo reboot
```

Sau reboot các container tự chạy lại (khoảng 1–2 phút).

### 14.3 Dọn dẹp khi không dùng nữa

Khi nộp bài/bảo vệ xong: sao lưu DB và uploads ra ngoài VPS, kiểm tra khôi phục trước khi xóa. Với Google Cloud, rà soát VM, persistent disks, snapshots và static IP theo [GOOGLE_CLOUD.md](GOOGLE_CLOUD.md#5-kết-thúc-demotrial); dừng VM không đồng nghĩa mọi tài nguyên đã ngừng tiêu credit. Với DigitalOcean, xóa droplet và tài nguyên phụ khi không dùng; không giả định còn credit. Dọn DNS và thu hồi khóa/API key không còn cần thiết.

---

## Phụ lục: Uptime Kuma (tùy chọn)

Trang theo dõi "web có sống không" kèm thông báo khi sập:

1. Thêm bản ghi DNS `A` cho `status` trỏ về IP VPS.
2. `cp caddy/sites/status.caddy.example caddy/sites/status.caddy`
3. Trong `.env`: `COMPOSE_PROFILES=status` (hoặc `mail,status`) → `docker compose up -d`
4. `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`
5. Mở `https://status.<domain>` và **tạo tài khoản quản trị ngay** (người đầu tiên mở trang sẽ là chủ). Thêm monitor HTTP tới `https://api.<domain>/api/v1/health` và `https://app.<domain>`.

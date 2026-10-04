#!/usr/bin/env bash
# Cập nhật hệ thống trên VPS sau khi có image mới (GitHub Actions gọi script này qua SSH; chạy tay cũng được):
#
#   cd ~/elearning/deploy && ./scripts/deploy.sh
#   IMAGE_TAG=sha-abc1234 ./scripts/deploy.sh      # quay về một phiên bản cũ (rollback)
#
# Việc script làm:
#   1. kéo image api + web mới nhất từ GHCR (yêu cầu đã `docker login ghcr.io` nếu package ở chế độ private);
#   2. docker compose up -d (chỉ tạo lại container có thay đổi);
#   3. nạp lại cấu hình Caddy; restart Prometheus/Loki/Alloy/Grafana nếu file cấu hình của chúng đổi;
#   4. chờ API "healthy" (migration chạy xong), in log và thoát lỗi nếu quá 3 phút;
#   5. dọn image cũ không còn dùng.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

log() { printf '\n==> %s\n' "$*"; }

[ -f .env ] || { echo "Thiếu deploy/.env - sao chép .env.example rồi điền giá trị (README mục 6)." >&2; exit 1; }
command -v docker >/dev/null || { echo "Chưa cài Docker (README mục 4)." >&2; exit 1; }

# --- 1. Kéo image ----------------------------------------------------------------
log "Kéo image api + web (${IMAGE_TAG:-theo .env}, mặc định latest)"
docker compose pull api web

# --- 2. Khởi động / cập nhật -------------------------------------------------------
log "docker compose up -d"
docker compose up -d --remove-orphans

# --- 3. Nạp lại cấu hình -------------------------------------------------------------
# Container chỉ tự tạo lại khi định nghĩa trong docker-compose.yml đổi; file cấu hình được mount vào thì không.
# -> so sánh checksum với lần deploy trước (lưu ở .state/) để biết service nào cần restart.
mkdir -p .state
config_changed() {
  local name="$1"
  shift
  local new old
  new="$(find "$@" -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
  old="$(cat ".state/${name}" 2>/dev/null || true)"
  [ "$new" = "$old" ] && return 1
  echo "$new" >".state/${name}"
}

if config_changed prometheus prometheus; then
  log "Cấu hình Prometheus đổi -> restart"
  docker compose restart prometheus
fi
if config_changed loki loki; then
  log "Cấu hình Loki đổi -> restart"
  docker compose restart loki
fi
if config_changed alloy alloy; then
  log "Cấu hình Alloy đổi -> restart"
  docker compose restart alloy
fi
# Dashboard Grafana tự nạp lại sau tối đa 60 giây; chỉ datasource/provider (provisioning) cần restart.
if config_changed grafana grafana/provisioning; then
  log "Provisioning Grafana đổi -> restart"
  docker compose restart grafana
fi
# Caddy: reload không làm rớt kết nối. Lỗi cú pháp -> Caddy giữ cấu hình cũ và báo lỗi tại đây.
log "Nạp lại cấu hình Caddy"
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --force ||
  echo "CẢNH BÁO: reload Caddy lỗi - xem: docker compose logs caddy" >&2

# --- 4. Chờ API sẵn sàng ---------------------------------------------------------------
log "Chờ API healthy (lần đầu có thể mất vài chục giây để chạy migration)"
status="unknown"
for _ in $(seq 1 36); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' elearning-api 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  sleep 5
done
if [ "$status" != "healthy" ]; then
  echo "API không healthy sau 3 phút (trạng thái: ${status}). 60 dòng log gần nhất:" >&2
  docker compose logs --tail 60 api >&2 || true
  exit 1
fi

# --- 5. Dọn dẹp ----------------------------------------------------------------------------
log "Dọn image không dùng quá 7 ngày"
docker image prune -af --filter "until=168h" >/dev/null || true

log "Xong. Trạng thái các service:"
docker compose ps --format 'table {{.Name}}\t{{.Status}}'

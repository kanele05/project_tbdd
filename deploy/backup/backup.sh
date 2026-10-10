#!/bin/sh
# Sao lưu PostgreSQL hằng ngày bằng pg_dump (định dạng custom -Fc, đã nén), giữ BACKUP_KEEP bản mới nhất.
# Chạy trong container "backup" (image postgres:17-alpine; kết nối qua biến PGHOST/PGUSER/PGPASSWORD/PGDATABASE).
# Khôi phục: xem deploy/README.md mục "Sao lưu và khôi phục".
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"
BACKUP_HOUR_UTC="${BACKUP_HOUR_UTC:-20}" # 20:00 UTC = 03:00 giờ Việt Nam

log() {
  echo "[backup] $(date -u '+%Y-%m-%dT%H:%M:%SZ') $*"
}

BACKUP_RETRIES="${BACKUP_RETRIES:-6}"        # số lần thử lại khi dump lỗi
BACKUP_RETRY_DELAY_S="${BACKUP_RETRY_DELAY_S:-300}" # 5 phút giữa hai lần thử

# Chờ PostgreSQL nhận kết nối (sau khi máy/stack vừa khởi động, healthcheck có thể xanh trước khi DB thật sự sẵn sàng).
wait_for_db() {
  tries=0
  until pg_isready --quiet; do
    tries=$((tries + 1))
    if [ "$tries" -ge 30 ]; then
      log "database not ready after 60s"
      return 1
    fi
    sleep 2
  done
}

# Sao lưu, nếu lỗi thì thử lại tối đa BACKUP_RETRIES lần (không bỏ trống cả ngày như trước).
run_backup_with_retry() {
  attempt=1
  while ! { wait_for_db && run_backup; }; do
    if [ "$attempt" -ge "$BACKUP_RETRIES" ]; then
      log "giving up after ${attempt} attempts"
      return 1
    fi
    log "retrying in ${BACKUP_RETRY_DELAY_S}s (attempt $((attempt + 1))/${BACKUP_RETRIES})"
    sleep "$BACKUP_RETRY_DELAY_S"
    attempt=$((attempt + 1))
  done
}

run_backup() {
  file="$BACKUP_DIR/${PGDATABASE}-$(date -u +%Y%m%d-%H%M%S).dump"
  log "dumping ${PGDATABASE} -> ${file}"
  # Ghi ra file .partial rồi mới đổi tên: không bao giờ để lại file dump dở dang trông như bản hợp lệ.
  if pg_dump --format=custom --no-owner --file="${file}.partial"; then
    mv "${file}.partial" "${file}"
    log "ok ($(du -h "${file}" | cut -f1))"
  else
    rm -f "${file}.partial"
    log "FAILED"
    return 1
  fi
  # Giữ BACKUP_KEEP bản mới nhất, xóa phần còn lại.
  ls -1t "$BACKUP_DIR"/"${PGDATABASE}"-*.dump 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | while read -r old; do
    log "removing old backup ${old}"
    rm -f "${old}"
  done
}

seconds_until_next_run() {
  now="$(date -u +%s)"
  today_target=$((now - now % 86400 + BACKUP_HOUR_UTC * 3600))
  if [ "$now" -ge "$today_target" ]; then
    echo $((today_target + 86400 - now))
  else
    echo $((today_target - now))
  fi
}

mkdir -p "$BACKUP_DIR"

# Khi (re)start: sao lưu ngay nếu 12 giờ qua chưa có bản nào (xác nhận cấu hình đúng, tránh dồn nhiều bản khi deploy liên tục).
if [ -z "$(find "$BACKUP_DIR" -name "${PGDATABASE}-*.dump" -mmin -720 2>/dev/null | head -n 1)" ]; then
  run_backup_with_retry || true
fi

while true; do
  wait_s="$(seconds_until_next_run)"
  log "next backup in ${wait_s}s"
  sleep "$wait_s"
  run_backup_with_retry || true
done

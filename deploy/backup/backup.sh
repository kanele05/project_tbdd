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
  run_backup || true
fi

while true; do
  wait_s="$(seconds_until_next_run)"
  log "next backup in ${wait_s}s"
  sleep "$wait_s"
  run_backup || true
done

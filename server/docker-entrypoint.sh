#!/bin/sh
# Áp migration (idempotent, an toàn khi chạy lại) rồi chạy server. `exec` để Node là PID chính và nhận SIGTERM.
set -eu

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  echo "[entrypoint] prisma migrate deploy"
  node node_modules/prisma/build/index.js migrate deploy
fi

exec "$@"

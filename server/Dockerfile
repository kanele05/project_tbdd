# syntax=docker/dockerfile:1.7
#
# Image cho API (Express + Prisma). Build từ thư mục server/:
#   docker build -t elearning-api server/
# Khi khởi động container: `prisma migrate deploy` rồi `node dist/server.js` (xem docker-entrypoint.sh).

ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
# 1) build: cài đủ dependency (kể cả dev). `npm ci` tự chạy `prisma generate` (postinstall)
#    nên phải COPY prisma/ + prisma.config.ts TRƯỚC. Sau đó biên dịch TypeScript -> dist/.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
ENV CI=true CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------
# 2) prod-deps: chỉ dependency production (+ Prisma CLI để chạy migrate deploy) và công cụ seed.
#    Bỏ qua postinstall của dự án (cần prisma generate, đã làm ở stage build).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS prod-deps
WORKDIR /app
ENV CI=true CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts
# Prisma CLI phải nằm trong cây production (container chạy `prisma migrate deploy` khi khởi động).
RUN test -f node_modules/prisma/build/index.js \
 || { echo "ERROR: 'prisma' is not in the production dependency tree - move it to dependencies in server/package.json"; exit 1; }
# `--ignore-scripts` bỏ qua bước tải schema-engine của Prisma -> gọi CLI một lần để tải sẵn vào image
# (nếu không, container sẽ tải lúc khởi động: chậm và cần mạng).
RUN node node_modules/prisma/build/index.js --version
# tsx chỉ để chạy seed (`docker compose exec api ...`); cài riêng ở /opt/tools để không lẫn vào node_modules của app.
RUN --mount=type=cache,target=/root/.npm npm install --prefix /opt/tools --no-save --ignore-scripts \
    "tsx@$(node -p "require('./package-lock.json').packages['node_modules/tsx'].version")"

# ---------------------------------------------------------------------------
# 3) runtime: image cuối, chạy bằng user `node` (không phải root).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
# openssl: schema-engine của Prisma cần để nhận diện libssl.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN mkdir -p /app/uploads && chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /opt/tools /opt/tools
COPY --from=build --chown=node:node /app/dist ./dist
# src/ (kèm Prisma Client đã generate) + tsconfig.json: chỉ để chạy seed bằng tsx (alias `@/`).
COPY --from=build --chown=node:node /app/src ./src
COPY --chown=node:node package.json prisma.config.ts tsconfig.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node static ./static
COPY --chown=node:node scripts/updateCoursePreviews.ts ./scripts/updateCoursePreviews.ts
COPY --chown=node:node scripts/setUserRole.ts ./scripts/setUserRole.ts
COPY --chown=node:node scripts/backfillNotificationKeys.ts ./scripts/backfillNotificationKeys.ts
COPY --chown=node:node scripts/replaceLessonVideo.ts ./scripts/replaceLessonVideo.ts
COPY --chown=node:node --chmod=0755 docker-entrypoint.sh ./docker-entrypoint.sh

USER node
RUN node -e "require('./dist/generated/prisma/client.js')"
EXPOSE 4000
VOLUME ["/app/uploads"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]

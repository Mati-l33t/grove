# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Grove runtime ────────────────────────────────────────────────────
FROM node:22-alpine

ARG PB_VERSION=0.22.27
ARG TARGETARCH

RUN apk add --no-cache ca-certificates curl unzip

RUN ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "amd64") \
    && PB_FILE="pocketbase_${PB_VERSION}_linux_${ARCH}.zip" \
    && curl -fsSL \
       "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_FILE}" \
       -o /tmp/pb.zip \
    && curl -fsSL \
       "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/checksums.txt" \
       -o /tmp/pb.checksums \
    && EXPECTED=$(grep "${PB_FILE}" /tmp/pb.checksums | awk '{print $1}') \
    && ACTUAL=$(sha256sum /tmp/pb.zip | awk '{print $1}') \
    && [ -n "$EXPECTED" ] && [ "$EXPECTED" = "$ACTUAL" ] || { echo "PocketBase checksum mismatch"; exit 1; } \
    && unzip -q /tmp/pb.zip pocketbase -d /app/ \
    && rm /tmp/pb.zip /tmp/pb.checksums \
    && chmod +x /app/pocketbase

COPY package.json  /app/package.json
COPY reminder.js   /app/reminder.js
RUN cd /app && npm install --silent

# Pre-built frontend (seeded to data volume by entrypoint on every start)
COPY --from=builder /build/dist /app/pb_public_seed

# PocketBase config
COPY pb/pb_migrations/ /app/pb_migrations/
COPY pb/pb_hooks/      /app/pb_hooks/

COPY docker-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

VOLUME /data
EXPOSE 8090

ENTRYPOINT ["/app/entrypoint.sh"]

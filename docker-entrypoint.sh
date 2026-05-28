#!/bin/sh
set -e

PB_DATA=/data/pb_data
PB_PUBLIC=/data/pb_public

mkdir -p "$PB_DATA" "$PB_PUBLIC"

# Sync pre-built frontend from the image to the data volume on every start.
# This applies frontend updates automatically when the image is refreshed.
cp -r /app/pb_public_seed/. "$PB_PUBLIC/"

# Generate VAPID keys if missing, then write vapid-public.txt to pb_public.
# Always runs so the public key file stays in sync after updates.
GROVE_VAPID_FILE=/data/vapid-keys.json \
GROVE_DB_FILE=/data/pb_data/data.db \
GROVE_PB_PUBLIC=/data/pb_public \
  node /app/reminder.js --setup

# Run the reminder service in a restart loop so it survives transient errors.
(
  while true; do
    GROVE_VAPID_FILE=/data/vapid-keys.json \
    GROVE_DB_FILE=/data/pb_data/data.db \
    GROVE_PB_PUBLIC=/data/pb_public \
    GROVE_RUNTIME=docker \
      node /app/reminder.js || true
    echo "[grove-reminder] restarting in 5s..."
    sleep 5
  done
) &

export GROVE_RUNTIME=docker

exec /app/pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir="$PB_DATA" \
  --publicDir="$PB_PUBLIC" \
  --migrationsDir=/app/pb_migrations \
  --hooksDir=/app/pb_hooks

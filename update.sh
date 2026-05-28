#!/bin/bash
set -e

GROVE_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$GROVE_DIR/frontend"

echo "==> Updating Grove..."

# Pull latest code
git -C "$GROVE_DIR" pull --ff-only

# Update frontend dependencies and rebuild
echo "==> Rebuilding frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

# Update reminder service dependencies
cd "$GROVE_DIR"
npm install --silent --save web-push better-sqlite3

# Ensure VAPID keys exist (no-op if already generated)
node "$GROVE_DIR/reminder.js" --setup

# Deploy frontend (preserves vapid-public.txt since it's not in dist/)
cp -r "$FRONTEND_DIR/dist/"* "$GROVE_DIR/pb/pb_public/"

# Reload systemd unit files in case they changed
cp "$GROVE_DIR/grove-reminder.service" /etc/systemd/system/grove-reminder.service
systemctl daemon-reload

# Restart services
echo "==> Restarting services..."
systemctl restart grove.service
systemctl restart grove-reminder.service

echo "Grove updated successfully."

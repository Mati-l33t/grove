#!/bin/bash
set -e

GROVE_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$GROVE_DIR/frontend"
PB_VERSION="0.39.0"

echo "==> Updating Grove..."

# ── Node.js version check ──────────────────────────────────────────────────────
NODE_MAJOR=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt 22 ]; then
    echo "==> Upgrading Node.js to v22..."
    if command -v apt-get >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        export LC_ALL=C
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
        apt-get install -y -qq nodejs
    else
        echo "Error: Node.js 22+ required. Please upgrade manually then re-run."
        exit 1
    fi
fi

# Pull latest code
git -C "$GROVE_DIR" pull --ff-only

# Upgrade PocketBase binary if version changed
CURRENT_PB=$("$GROVE_DIR/pb/pocketbase" --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1 || echo "0")
if [ "$CURRENT_PB" != "$PB_VERSION" ]; then
    echo "==> Upgrading PocketBase $CURRENT_PB → $PB_VERSION..."
    ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
    PB_FILE="pocketbase_${PB_VERSION}_linux_${ARCH}.zip"
    curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_FILE}" -o /tmp/pb.zip
    curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/checksums.txt" -o /tmp/pb.checksums
    EXPECTED=$(grep "${PB_FILE}" /tmp/pb.checksums | awk '{print $1}')
    ACTUAL=$(sha256sum /tmp/pb.zip | awk '{print $1}')
    if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then
        echo "Error: PocketBase checksum verification failed — aborting"
        rm -f /tmp/pb.zip /tmp/pb.checksums
        exit 1
    fi
    rm -f /tmp/pb.checksums
    unzip -q /tmp/pb.zip pocketbase -d /tmp/pb_new
    chmod +x /tmp/pb_new/pocketbase
    chown grove:grove /tmp/pb_new/pocketbase
    mv /tmp/pb_new/pocketbase "$GROVE_DIR/pb/pocketbase"
    rm -f /tmp/pb.zip
fi

# Update frontend dependencies and rebuild
echo "==> Rebuilding frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

# Update reminder service dependencies
cd "$GROVE_DIR"
npm install

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

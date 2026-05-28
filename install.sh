#!/bin/bash
set -e

GROVE_DIR="$(cd "$(dirname "$0")" && pwd)"
PB_VERSION="0.22.27"
PB_DIR="$GROVE_DIR/pb"
FRONTEND_DIR="$GROVE_DIR/frontend"

echo "==> Installing Grove..."

# Check dependencies
for cmd in node npm curl unzip; do
    command -v "$cmd" >/dev/null 2>&1 || { echo "Error: $cmd is required but not installed."; exit 1; }
done

# Download PocketBase if not present
if [ ! -f "$PB_DIR/pocketbase" ]; then
    echo "==> Downloading PocketBase v$PB_VERSION..."
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64) PB_ARCH="amd64" ;;
        aarch64|arm64) PB_ARCH="arm64" ;;
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    mkdir -p "$PB_DIR"
    curl -sL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" -o /tmp/pb.zip
    unzip -q /tmp/pb.zip pocketbase -d "$PB_DIR"
    chmod +x "$PB_DIR/pocketbase"
    rm /tmp/pb.zip
fi

# Install frontend dependencies and build
echo "==> Building frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

# Install reminder service dependencies
echo "==> Installing reminder service dependencies..."
cd "$GROVE_DIR"
npm install --silent --save web-push better-sqlite3

# Create pb_public if it doesn't exist
mkdir -p "$PB_DIR/pb_public"

# Copy built frontend
cp -r "$FRONTEND_DIR/dist/"* "$PB_DIR/pb_public/"

# Generate VAPID keys and write public key to pb_public
echo "==> Setting up push notifications..."
node "$GROVE_DIR/reminder.js" --setup

# Install and start grove systemd service
echo "==> Setting up systemd services..."
cp "$GROVE_DIR/grove.service" /etc/systemd/system/grove.service 2>/dev/null || true
cp "$GROVE_DIR/grove-reminder.service" /etc/systemd/system/grove-reminder.service

systemctl daemon-reload
systemctl enable grove.service grove-reminder.service
systemctl restart grove.service
sleep 2
systemctl start grove-reminder.service

echo ""
echo "Grove installed successfully."
echo "Open PocketBase admin at :8090/_/ to complete first-time setup."

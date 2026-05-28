#!/usr/bin/env bash
set -euo pipefail
exec 2>&1

GROVE_DIR="$(cd "$(dirname "$0")" && pwd)"
PB_VERSION="0.22.27"
PB_DIR="$GROVE_DIR/pb"
FRONTEND_DIR="$GROVE_DIR/frontend"

# ── Root check ─────────────────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: this script must be run as root." >&2
    exit 1
fi

echo "==> Installing Grove..."

# ── System dependencies ────────────────────────────────────────────────────────
# build-essential and python3 are required to compile better-sqlite3 native addon
if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    export LC_ALL=C
    echo "==> Installing system dependencies..."
    apt-get update -qq
    apt-get install -y -qq curl unzip build-essential python3
fi

# Node / npm must already be installed (via nodesource or manually)
for cmd in node npm curl unzip; do
    command -v "$cmd" >/dev/null 2>&1 || { echo "Error: $cmd is required but not installed."; exit 1; }
done

# ── PocketBase ─────────────────────────────────────────────────────────────────
if [ ! -f "$PB_DIR/pocketbase" ]; then
    echo "==> Downloading PocketBase v$PB_VERSION..."
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)       PB_ARCH="amd64" ;;
        aarch64|arm64) PB_ARCH="arm64" ;;
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    mkdir -p "$PB_DIR"
    curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
        -o /tmp/pb.zip
    unzip -q /tmp/pb.zip pocketbase -d "$PB_DIR"
    chmod +x "$PB_DIR/pocketbase"
    rm /tmp/pb.zip
fi

# ── Frontend ───────────────────────────────────────────────────────────────────
echo "==> Building frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

# ── Reminder service dependencies ─────────────────────────────────────────────
echo "==> Installing reminder service dependencies..."
cd "$GROVE_DIR"
npm install --silent

# ── Copy frontend build ────────────────────────────────────────────────────────
mkdir -p "$PB_DIR/pb_public"
cp -r "$FRONTEND_DIR/dist/"* "$PB_DIR/pb_public/"

# ── VAPID keys ─────────────────────────────────────────────────────────────────
echo "==> Setting up push notifications..."
node "$GROVE_DIR/reminder.js" --setup

# ── Systemd services ───────────────────────────────────────────────────────────
echo "==> Setting up systemd services..."
cp "$GROVE_DIR/grove.service" /etc/systemd/system/grove.service
cp "$GROVE_DIR/grove-reminder.service" /etc/systemd/system/grove-reminder.service

systemctl daemon-reload
systemctl enable grove.service grove-reminder.service
systemctl restart grove.service
sleep 2
systemctl start grove-reminder.service

echo ""
echo "Grove installed successfully."
echo "Open PocketBase admin at :8090/_/ to complete first-time setup."

#!/usr/bin/env bash
set -euo pipefail
exec 2>&1

GROVE_DIR="$(cd "$(dirname "$0")" && pwd)"
PB_VERSION="0.39.0"
PB_DIR="$GROVE_DIR/pb"
FRONTEND_DIR="$GROVE_DIR/frontend"
NONINTERACTIVE=0
[[ "${1:-}" == "--noninteractive" ]] && NONINTERACTIVE=1

# ── Root check ─────────────────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: this script must be run as root." >&2
    exit 1
fi

echo "==> Installing Grove..."

# ── System dependencies ────────────────────────────────────────────────────────
if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    export LC_ALL=C
    echo "==> Installing system dependencies..."
    apt-get update -qq
    apt-get install -y -qq curl unzip
    NODE_MAJOR=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])" 2>/dev/null || echo "0")
    if [ "$NODE_MAJOR" -lt 22 ]; then
        echo "==> Installing Node.js 22..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
        apt-get install -y -qq nodejs
    fi
fi

# Node 22+ and npm are required
for cmd in node npm curl unzip; do
    command -v "$cmd" >/dev/null 2>&1 || { echo "Error: $cmd is required but not installed."; exit 1; }
done
NODE_MAJOR=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
    echo "Error: Node.js 22 or higher is required (found $(node --version))."
    exit 1
fi

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
    PB_FILE="pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip"
    curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_FILE}" \
        -o /tmp/pb.zip
    curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/checksums.txt" \
        -o /tmp/pb.checksums
    EXPECTED=$(grep "${PB_FILE}" /tmp/pb.checksums | awk '{print $1}')
    ACTUAL=$(sha256sum /tmp/pb.zip | awk '{print $1}')
    if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then
        echo "Error: PocketBase checksum verification failed — aborting"
        rm -f /tmp/pb.zip /tmp/pb.checksums
        exit 1
    fi
    rm -f /tmp/pb.checksums
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
npm install

# ── Copy frontend build ────────────────────────────────────────────────────────
mkdir -p "$PB_DIR/pb_public"
cp -r "$FRONTEND_DIR/dist/"* "$PB_DIR/pb_public/"

# ── VAPID keys ─────────────────────────────────────────────────────────────────
echo "==> Setting up push notifications..."
node "$GROVE_DIR/reminder.js" --setup

# ── Service user ───────────────────────────────────────────────────────────────
echo "==> Creating service user..."
id -u grove &>/dev/null || useradd -r -s /sbin/nologin grove
mkdir -p "$PB_DIR/pb_data"
chown -R grove:grove "$PB_DIR/pb_data"
chown grove:grove "$GROVE_DIR/vapid-keys.json"
chmod 600 "$GROVE_DIR/vapid-keys.json"

# ── Systemd services ───────────────────────────────────────────────────────────
echo "==> Setting up systemd services..."
cp "$GROVE_DIR/grove.service" /etc/systemd/system/grove.service
cp "$GROVE_DIR/grove-reminder.service" /etc/systemd/system/grove-reminder.service

systemctl daemon-reload
systemctl enable grove.service grove-reminder.service
systemctl restart grove.service
echo -n "==> Waiting for PocketBase to start..."
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8090/api/health >/dev/null 2>&1; then
        echo " ready."
        break
    fi
    sleep 1
    echo -n "."
    if [ "$i" -eq 30 ]; then
        echo " timed out — check 'journalctl -u grove' for errors."
        exit 1
    fi
done
systemctl start grove-reminder.service


# ── PocketBase superuser ───────────────────────────────────────────────────────
if [ "$NONINTERACTIVE" = "1" ]; then
    PB_ADMIN_EMAIL="${GROVE_PB_ADMIN_EMAIL:-}"
    PB_ADMIN_PASS="${GROVE_PB_ADMIN_PASS:-}"
else
    echo ""
    echo "==> Create your PocketBase admin account"
    echo "    This is used to manage users and settings at :8090/_/"
    echo ""
    while true; do
        read -rp "  Admin email:    " PB_ADMIN_EMAIL
        [ -n "$PB_ADMIN_EMAIL" ] && break
        echo "  Email cannot be empty."
    done
    while true; do
        read -rsp "  Admin password: " PB_ADMIN_PASS
        echo ""
        if [ ${#PB_ADMIN_PASS} -lt 10 ]; then
            echo "  Password must be at least 10 characters."
            continue
        fi
        read -rsp "  Confirm password: " PB_ADMIN_PASS2
        echo ""
        if [ "$PB_ADMIN_PASS" = "$PB_ADMIN_PASS2" ]; then
            break
        fi
        echo "  Passwords do not match, try again."
    done
fi

"$PB_DIR/pocketbase" superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASS" \
    --dir="$PB_DIR" >/dev/null

echo ""
echo "Grove installed successfully."
echo "  App:    http://$(hostname -I | awk '{print $1}'):8090"
echo "  Admin:  http://$(hostname -I | awk '{print $1}'):8090/_/"
echo ""
echo "  Log in to the app and register your first user account."
echo "  Use the Admin panel to manage users and settings."

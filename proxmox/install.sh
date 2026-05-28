#!/bin/bash
set -e

# Must run as root on a Proxmox PVE host
[[ $EUID -ne 0 ]] && echo "Error: run as root." && exit 1
command -v pct >/dev/null 2>&1 || { echo "Error: this script must run on a Proxmox PVE host."; exit 1; }

# ── Configuration (override with environment variables) ───────────────────────
CT_ID="${GROVE_CT_ID:-$(pvesh get /cluster/nextid)}"
CT_HOSTNAME="${GROVE_HOSTNAME:-grove}"
CT_MEMORY="${GROVE_MEMORY:-1024}"
CT_CORES="${GROVE_CORES:-2}"
CT_DISK="${GROVE_DISK:-8}"
CT_STORAGE="${GROVE_STORAGE:-local-lvm}"
CT_BRIDGE="${GROVE_BRIDGE:-vmbr0}"
CT_IP="${GROVE_IP:-dhcp}"

echo "==> Grove LXC installer"
echo "    Container ID : CT${CT_ID}"
echo "    Hostname     : ${CT_HOSTNAME}"
echo "    Memory       : ${CT_MEMORY} MB"
echo "    Cores        : ${CT_CORES}"
echo "    Disk         : ${CT_DISK} GB on ${CT_STORAGE}"
echo "    Network      : ${CT_BRIDGE} / ${CT_IP}"
echo ""

# ── Find or download Debian 12 template ───────────────────────────────────────
TEMPLATE=$(find /var/lib/vz/template/cache -name "debian-12-standard_*.tar.zst" 2>/dev/null | sort | tail -1)

if [ -z "$TEMPLATE" ]; then
    echo "==> Downloading Debian 12 template..."
    pveam update >/dev/null 2>&1
    TMPL_NAME=$(pveam available --section system 2>/dev/null | grep "debian-12-standard" | sort | tail -1 | awk '{print $2}')
    [ -z "$TMPL_NAME" ] && { echo "Error: could not find Debian 12 template. Run: pveam update"; exit 1; }
    pveam download local "$TMPL_NAME"
    TEMPLATE=$(find /var/lib/vz/template/cache -name "debian-12-standard_*.tar.zst" 2>/dev/null | sort | tail -1)
fi

[ -z "$TEMPLATE" ] && { echo "Error: template not found after download."; exit 1; }
TMPL_REF="local:vztmpl/$(basename "$TEMPLATE")"

# ── Build network config ───────────────────────────────────────────────────────
if [ "$CT_IP" = "dhcp" ]; then
    NET="name=eth0,bridge=${CT_BRIDGE},ip=dhcp,ip6=auto"
else
    NET="name=eth0,bridge=${CT_BRIDGE},ip=${CT_IP},gw=${GROVE_GW:-}"
fi

# ── Create and start the container ────────────────────────────────────────────
echo "==> Creating CT${CT_ID}..."
pct create "$CT_ID" "$TMPL_REF" \
    --arch amd64 \
    --hostname "$CT_HOSTNAME" \
    --memory "$CT_MEMORY" \
    --cores "$CT_CORES" \
    --rootfs "${CT_STORAGE}:${CT_DISK}" \
    --net0 "$NET" \
    --unprivileged 1 \
    --features nesting=1 \
    --start 1

echo "==> Waiting for container to boot..."
sleep 8

# ── Install runtime dependencies inside the LXC ───────────────────────────────
echo "==> Installing dependencies..."
pct exec "$CT_ID" -- bash -c "
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq curl git unzip
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs
"

# ── Clone Grove and run the installer ─────────────────────────────────────────
echo "==> Installing Grove..."
pct exec "$CT_ID" -- bash -c "
    git clone https://github.com/Mati-l33t/grove.git /opt/grove
    cd /opt/grove && bash install.sh
"

# ── Done ──────────────────────────────────────────────────────────────────────
CT_IP_ADDR=$(pct exec "$CT_ID" -- hostname -I 2>/dev/null | awk '{print $1}' || echo "<container-ip>")

echo ""
echo "Grove is running in CT${CT_ID}."
echo ""
echo "  App:            http://${CT_IP_ADDR}:8090"
echo "  PocketBase admin: http://${CT_IP_ADDR}:8090/_/"
echo ""
echo "Open the PocketBase admin URL first to set a superuser password,"
echo "then register your account in the app."

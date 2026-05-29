#!/usr/bin/env bash
# Grove — Proxmox LXC Installer
# https://github.com/Mati-l33t/grove
#
# Run on your Proxmox VE host:
#   bash <(curl -fsSL https://raw.githubusercontent.com/Mati-l33t/grove/main/proxmox/install.sh)

set -euo pipefail

REPO_URL="https://github.com/Mati-l33t/grove"

YW="\033[33m"
GN="\033[1;92m"
RD="\033[01;31m"
BL="\033[36m"
CM="\033[0;92m"
CL="\033[m"
BOLD="\033[1m"
TAB="  "

APP="Grove"
NSAPP="grove"
var_cpu="2"
var_ram="1024"
var_disk="4"
var_unprivileged="1"

msg_info()  { echo -e "${TAB}${YW}  ⏳ ${1}...${CL}"; }
msg_ok()    { echo -e "${TAB}${CM}  ✔️   ${1}${CL}"; }
msg_error() { echo -e "${TAB}${RD}  ✖️   ${1}${CL}"; exit 1; }

header_info() {
  clear
  cat << 'EOF'

   ██████╗ ██████╗  ██████╗ ██╗   ██╗███████╗
  ██╔════╝ ██╔══██╗██╔═══██╗██║   ██║██╔════╝
  ██║  ███╗██████╔╝██║   ██║██║   ██║█████╗
  ██║   ██║██╔══██╗██║   ██║╚██╗ ██╔╝██╔══╝
  ╚██████╔╝██║  ██║╚██████╔╝ ╚████╔╝ ███████╗
   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═══╝  ╚══════╝

EOF
  echo -e "${TAB}${BOLD}${BL}Grove — Proxmox LXC Installer${CL}"
  echo -e "${TAB}${YW}GitHub: ${REPO_URL}${CL}"
  echo ""
}

# ── Storage picker ─────────────────────────────────────────────────────────────
select_storage() {
  local type="$1"
  local content="rootdir"
  [ "$type" = "template" ] && content="vztmpl"

  local names=()
  while IFS= read -r name; do
    names+=("$name" " ")
  done < <(pvesm status -content "$content" 2>/dev/null | awk 'NR>1 {print $1}')

  local count=$(( ${#names[@]} / 2 ))
  if [ "$count" -eq 0 ]; then
    msg_error "No suitable ${type} storage found — check Proxmox storage config"
  fi
  if [ "$count" -eq 1 ]; then
    echo "${names[0]}"
    return
  fi

  whiptail --backtitle "Grove Installer" \
    --title "$([ "$type" = "template" ] && echo "TEMPLATE STORAGE" || echo "CONTAINER STORAGE")" \
    --menu "\nWhere to store the ${type}?" 16 58 8 \
    "${names[@]}" \
    3>&1 1>&2 2>&3
}

# ── Template ───────────────────────────────────────────────────────────────────
get_template() {
  local storage="$1"

  # Scan all storages with vztmpl for an existing Debian 13 template first
  local all_storages
  all_storages=$(pvesm status -content vztmpl 2>/dev/null | awk 'NR>1 {print $1}' || true)

  for stor in $all_storages; do
    local hit
    hit=$(pveam list "$stor" 2>/dev/null | awk '{print $1}' | grep "debian-13" | sort -V | tail -1 || true)
    if [ -n "$hit" ]; then
      echo -e "  ${CM}✔️   Template found on '${stor}': ${hit}${CL}" >&2
      echo "$hit"
      return
    fi
  done

  # Not found — download to chosen storage
  echo -e "  ${YW}  ⏳ Updating template list...${CL}" >&2
  pveam update >/dev/null 2>&1

  local avail
  avail=$(pveam available --section system 2>/dev/null | awk '{print $2}' | grep "^debian-13" | sort -V | tail -1 || true)

  if [ -z "$avail" ]; then
    echo -e "  ${YW}  ⏳ Debian 13 not available yet — falling back to Debian 12...${CL}" >&2
    avail=$(pveam available --section system 2>/dev/null | awk '{print $2}' | grep "^debian-12" | sort -V | tail -1 || true)
    [ -z "$avail" ] && msg_error "No Debian template available in pveam"
  fi

  echo -e "  ${YW}  ⏳ Downloading ${avail} to ${storage}...${CL}" >&2
  pveam download "$storage" "$avail" >/dev/null 2>&1
  echo -e "  ${CM}✔️   Template downloaded${CL}" >&2
  echo "${storage}:vztmpl/${avail}"
}

# ── Default settings ───────────────────────────────────────────────────────────
default_settings() {
  CTID=$(pvesh get /cluster/nextid 2>/dev/null || echo 200)
  HN="$NSAPP"
  DISK_SIZE="$var_disk"
  CORE_COUNT="$var_cpu"
  RAM_SIZE="$var_ram"
  BRG="vmbr0"
  NET="dhcp"
  GATE=""
  VLAN_TAG=""
  UNPRIVILEGED="$var_unprivileged"
  ROOT_PASSWORD=""
  AUTOLOGIN=1

  echo -e "${TAB}${BOLD}⚙️  Using Default Settings${CL}"
  echo -e "${TAB}🆔  Container ID:  ${BL}${CTID}${CL}"
  echo -e "${TAB}🏠  Hostname:      ${BL}${HN}${CL}"
  echo -e "${TAB}💾  Disk Size:     ${BL}${DISK_SIZE} GB${CL}"
  echo -e "${TAB}🧠  CPU Cores:     ${BL}${CORE_COUNT}${CL}"
  echo -e "${TAB}🛠️  RAM:           ${BL}${RAM_SIZE} MB${CL}"
  echo -e "${TAB}🌉  Bridge:        ${BL}${BRG}${CL}"
  echo -e "${TAB}📡  IP:            ${BL}DHCP${CL}"
  echo -e "${TAB}🔑  Root login:    ${BL}autologin (no password)${CL}"
  echo ""
}

# ── Advanced settings ──────────────────────────────────────────────────────────
advanced_settings() {
  local nextid
  nextid=$(pvesh get /cluster/nextid 2>/dev/null || echo 200)

  CTID=$(whiptail --backtitle "Grove Installer" --title "CONTAINER ID" \
    --inputbox "\nSet Container ID:" 8 58 "$nextid" 3>&1 1>&2 2>&3) || exit

  HN=$(whiptail --backtitle "Grove Installer" --title "HOSTNAME" \
    --inputbox "\nSet Hostname:" 8 58 "$NSAPP" 3>&1 1>&2 2>&3) || exit
  HN=$(echo "${HN,,}" | tr -d ' ')

  DISK_SIZE=$(whiptail --backtitle "Grove Installer" --title "DISK SIZE" \
    --inputbox "\nSet Disk Size in GB:" 8 58 "$var_disk" 3>&1 1>&2 2>&3) || exit

  CORE_COUNT=$(whiptail --backtitle "Grove Installer" --title "CPU CORES" \
    --inputbox "\nAllocate CPU Cores:" 8 58 "$var_cpu" 3>&1 1>&2 2>&3) || exit

  RAM_SIZE=$(whiptail --backtitle "Grove Installer" --title "RAM" \
    --inputbox "\nAllocate RAM in MB:" 8 58 "$var_ram" 3>&1 1>&2 2>&3) || exit

  # Bridge — list available vmbr interfaces
  local bridge_opts=()
  while IFS= read -r br; do
    bridge_opts+=("$br" " ")
  done < <(ip link show 2>/dev/null | awk -F': ' '/^[0-9]+: vmbr/{print $2}' | cut -d@ -f1)

  if [ "${#bridge_opts[@]}" -gt 2 ]; then
    BRG=$(whiptail --backtitle "Grove Installer" --title "NETWORK BRIDGE" \
      --menu "\nSelect network bridge:" 16 58 6 "${bridge_opts[@]}" 3>&1 1>&2 2>&3) || exit
  else
    BRG="vmbr0"
  fi

  local ip_choice
  ip_choice=$(whiptail --backtitle "Grove Installer" --title "IP CONFIGURATION" \
    --menu "\nSelect IP configuration:" 12 58 2 \
    "dhcp"   "Automatic (DHCP)" \
    "static" "Static IP" \
    3>&1 1>&2 2>&3) || exit

  NET="dhcp"; GATE=""
  if [ "$ip_choice" = "static" ]; then
    NET=$(whiptail --backtitle "Grove Installer" --title "STATIC IP" \
      --inputbox "\nEnter Static IP with CIDR:\n(e.g. 192.168.1.50/24)" 10 58 "" 3>&1 1>&2 2>&3) || exit
    local gw
    gw=$(whiptail --backtitle "Grove Installer" --title "GATEWAY" \
      --inputbox "\nEnter Gateway IP:\n(e.g. 192.168.1.1)" 10 58 "" 3>&1 1>&2 2>&3) || exit
    GATE=",gw=${gw}"
  fi

  local vlan_input
  vlan_input=$(whiptail --backtitle "Grove Installer" --title "VLAN TAG" \
    --inputbox "\nSet VLAN Tag (leave blank for none):" 8 58 "" 3>&1 1>&2 2>&3) || exit
  [ -n "$vlan_input" ] && VLAN_TAG=",tag=${vlan_input}" || VLAN_TAG=""

  UNPRIVILEGED="$var_unprivileged"

  local pw1 pw2
  pw1=$(whiptail --backtitle "Grove Installer" --title "ROOT PASSWORD" \
    --passwordbox "\nSet root password for the container:" 10 58 "" 3>&1 1>&2 2>&3) || exit
  pw2=$(whiptail --backtitle "Grove Installer" --title "ROOT PASSWORD" \
    --passwordbox "\nConfirm root password:" 10 58 "" 3>&1 1>&2 2>&3) || exit
  if [ "$pw1" != "$pw2" ]; then
    whiptail --backtitle "Grove Installer" --title "ERROR" \
      --msgbox "\nPasswords do not match. Please run the installer again." 10 58
    exit 1
  fi
  ROOT_PASSWORD="$pw1"
  AUTOLOGIN=0

  echo -e "${TAB}${BOLD}🧩 Using Advanced Settings${CL}"
  echo -e "${TAB}🆔  Container ID:  ${BL}${CTID}${CL}"
  echo -e "${TAB}🏠  Hostname:      ${BL}${HN}${CL}"
  echo -e "${TAB}💾  Disk Size:     ${BL}${DISK_SIZE} GB${CL}"
  echo -e "${TAB}🧠  CPU Cores:     ${BL}${CORE_COUNT}${CL}"
  echo -e "${TAB}🛠️  RAM:           ${BL}${RAM_SIZE} MB${CL}"
  echo -e "${TAB}🌉  Bridge:        ${BL}${BRG}${CL}"
  echo -e "${TAB}📡  IP:            ${BL}${NET}${CL}"
  echo -e "${TAB}🔑  Root password: set"
  echo ""
}

# ── Build container ────────────────────────────────────────────────────────────
build_container() {
  msg_info "Selecting storage"
  TEMPLATE_STORAGE=$(select_storage template)
  CONTAINER_STORAGE=$(select_storage container)
  msg_ok "Storage selected"

  TEMPLATE=$(get_template "$TEMPLATE_STORAGE")
  msg_ok "Template ready"

  local tz
  tz=$(timedatectl show --value --property=Timezone 2>/dev/null || echo "UTC")
  [[ "$tz" == Etc/* ]] && tz="UTC"

  local ns
  ns=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf 2>/dev/null || true)
  [ -z "$ns" ] && ns="8.8.8.8"

  msg_info "Creating LXC container ${CTID}"
  pct create "$CTID" "$TEMPLATE" \
    --hostname    "$HN" \
    --cores       "$CORE_COUNT" \
    --memory      "$RAM_SIZE" \
    --rootfs      "${CONTAINER_STORAGE}:${DISK_SIZE}" \
    --net0        "name=eth0,bridge=${BRG},ip=${NET}${GATE}${VLAN_TAG}" \
    --nameserver  "$ns" \
    --features    "nesting=1" \
    --unprivileged "$UNPRIVILEGED" \
    --onboot      1 \
    --timezone    "$tz"
  msg_ok "LXC container ${CTID} created"

  msg_info "Tagging container"
  pct set "$CTID" --tags "proxmox-scripts;grove" >/dev/null 2>&1 || true
  msg_ok "Tags set"

  msg_info "Starting container"
  pct start "$CTID"
  sleep 5
  msg_ok "Container started"

  if [ "$AUTOLOGIN" = "1" ]; then
    msg_info "Configuring autologin"
    pct exec "$CTID" -- bash -c "
      mkdir -p /etc/systemd/system/container-getty@1.service.d
      printf '[Service]\nExecStart=\nExecStart=-/sbin/agetty --autologin root --noclear --keep-baud tty%%I 115200,38400,9600 \$TERM\n' \
        > /etc/systemd/system/container-getty@1.service.d/override.conf
      systemctl daemon-reload
      systemctl restart container-getty@1 2>/dev/null || true
    "
    msg_ok "Autologin configured"
  else
    msg_info "Setting root password"
    pct exec "$CTID" -- bash -c "echo 'root:${ROOT_PASSWORD}' | chpasswd"
    msg_ok "Root password set"
  fi

  msg_info "Setting login banner"
  cat > /tmp/grove-motd << 'EOF'
#!/bin/sh
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
printf '\n'
printf '   ██████╗ ██████╗  ██████╗ ██╗   ██╗███████╗\n'
printf '  ██╔════╝ ██╔══██╗██╔═══██╗██║   ██║██╔════╝\n'
printf '  ██║  ███╗██████╔╝██║   ██║██║   ██║█████╗\n'
printf '  ██║   ██║██╔══██╗██║   ██║╚██╗ ██╔╝██╔══╝\n'
printf '  ╚██████╔╝██║  ██║╚██████╔╝ ╚████╔╝ ███████╗\n'
printf '   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═══╝  ╚══════╝\n'
printf '\n'
printf '  Grove LXC Container\n'
printf '  Web UI:  http://%s:8090\n' "$IP"
printf '  GitHub:  https://github.com/Mati-l33t/grove\n'
printf '  Scripts: https://proxmox-scripts.com\n'
printf '\n'
EOF
  pct push "$CTID" /tmp/grove-motd /etc/profile.d/grove-welcome.sh
  pct exec "$CTID" -- bash -c "chmod +x /etc/profile.d/grove-welcome.sh && truncate -s 0 /etc/motd"
  rm -f /tmp/grove-motd
  msg_ok "Login banner set"

  msg_info "Waiting for network"
  local tries=0
  while ! pct exec "$CTID" -- ping -c1 -W2 8.8.8.8 >/dev/null 2>&1; do
    sleep 3
    tries=$((tries + 1))
    if [ "$tries" -gt 15 ]; then
      msg_error "Network not reachable inside container — check bridge/gateway"
    fi
  done
  msg_ok "Network connected"

  msg_info "Waiting for DNS"
  local dns_tries=0
  while ! pct exec "$CTID" -- getent hosts github.com >/dev/null 2>&1; do
    sleep 2
    dns_tries=$((dns_tries + 1))
    if [ "$dns_tries" -gt 15 ]; then
      msg_error "DNS not resolving inside container — check nameserver config"
    fi
  done
  msg_ok "DNS working"

  CT_IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
}

# ── Run install inside container ───────────────────────────────────────────────
run_install() {
  msg_info "Installing dependencies"
  pct exec "$CTID" -- bash -c "
    export DEBIAN_FRONTEND=noninteractive
    export LC_ALL=C
    apt-get update -qq
    apt-get install -y -qq git curl unzip build-essential python3
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs
  "
  msg_ok "Dependencies installed"

  msg_info "Cloning Grove repository"
  pct exec "$CTID" -- git clone https://github.com/Mati-l33t/grove.git /opt/grove
  msg_ok "Repository cloned"

  msg_info "Running Grove installer"
  pct exec "$CTID" -- bash /opt/grove/install.sh
  msg_ok "Grove installed"
}

# ── Main ───────────────────────────────────────────────────────────────────────
header_info

if whiptail --backtitle "Grove Installer" --title "INSTALL MODE" \
  --yesno "\nWould you like to use Default Settings?\n\nDefaults:\n  CPU: ${var_cpu} cores\n  RAM: ${var_ram} MB\n  Disk: ${var_disk} GB\n  IP: DHCP\n  Type: Unprivileged" 16 58; then
  default_settings
else
  advanced_settings
fi

echo -e "${TAB}${BOLD}🚀 Creating Grove LXC...${CL}"
build_container
run_install

echo ""
msg_ok "Grove installation complete!"
echo ""
echo -e "${TAB}${GN}🌐 App:    ${BL}http://${CT_IP}:8090${CL}"
echo -e "${TAB}${GN}🔧 Admin:  ${BL}http://${CT_IP}:8090/_/${CL}"
echo -e "${TAB}${YW}📋 Logs:   journalctl -u grove -f  (inside container)${CL}"
echo -e "${TAB}${YW}🖥️  Enter:  pct enter ${CTID}${CL}"
echo ""
echo -e "${TAB}Open the Admin URL first to set your PocketBase superuser password,"
echo -e "${TAB}then register your account in the app."
echo ""

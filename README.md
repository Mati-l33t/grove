# Grove

**Self-hosted family organizer** — shared calendar, to-do lists, shopping lists, recipes, and meal planner in one place.

Keep your family organised with an app that runs on your own server. All data stays at home.

---

## Features

- **Shared calendar** — per-member color coding, all-day events, recurring events, reminders
- **To-do & shopping lists** — personal or shared with the whole household
- **Recipe storage** — ingredients, cook times, tags, image upload, import from URL
- **Meal planner** — weekly view, assign recipes to slots, add a week's ingredients to your shopping list
- **Today dashboard** — daily agenda at a glance: events, meals, and list summaries
- **Household management** — invite family members with a 6-character code
- **Push notifications & email reminders** for upcoming events
- **AI assistant** — optional, connects to any OpenAI-compatible endpoint (Ollama, Groq, OpenAI, etc.)
- **PWA** — installable on Android, iOS, tablet, and desktop
- **Dark / light mode**
- **Admin panel** — manage users, instance settings, and app updates

---

## Install

### Proxmox LXC

Run this on your **Proxmox host** as root:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Mati-l33t/grove/main/proxmox/install.sh)
```

Creates a Debian 12 LXC (2 cores, 1 GB RAM, 8 GB disk) and installs Grove automatically.  
Grove will be available at `http://<container-ip>:8090`.

**Custom options** — set environment variables before running:

```bash
GROVE_CT_ID=200 GROVE_MEMORY=2048 GROVE_STORAGE=local-lvm \
  bash <(curl -fsSL https://raw.githubusercontent.com/Mati-l33t/grove/main/proxmox/install.sh)
```

| Variable | Default | Description |
|---|---|---|
| `GROVE_CT_ID` | next available | LXC container ID |
| `GROVE_HOSTNAME` | `grove` | Container hostname |
| `GROVE_MEMORY` | `1024` | RAM in MB |
| `GROVE_CORES` | `2` | CPU cores |
| `GROVE_DISK` | `8` | Disk in GB |
| `GROVE_STORAGE` | `local-lvm` | Proxmox storage ID |
| `GROVE_BRIDGE` | `vmbr0` | Network bridge |
| `GROVE_IP` | `dhcp` | Static IP in CIDR (e.g. `192.168.1.50/24`) or `dhcp` |

---

### Docker

```bash
curl -fsSL https://raw.githubusercontent.com/Mati-l33t/grove/main/docker-compose.yml -o docker-compose.yml
docker compose up -d
```

Grove will be available at `http://localhost:8090`. All data is stored in a named Docker volume (`grove_data`) and is never affected by updates or container restarts.

Pre-built images for `linux/amd64` and `linux/arm64`:
```
ghcr.io/mati-l33t/grove:latest
```

---

## First-time setup

1. Open `http://<host>:8090/_/` — set your PocketBase superuser email and password here.
2. Open `http://<host>:8090` and register your account. The first registered user is automatically granted admin access.
3. Go to Settings to create or join a household and start sharing content with family members.

---

## Updating

**Proxmox LXC** — run inside the container, or click **Update** in the admin panel (Admin → Settings):

```bash
/opt/grove/update.sh
```

**Docker:**

```bash
docker compose pull && docker compose up -d
```

The admin panel checks for new releases automatically and shows a notification when an update is available.

---

## Manual install (Debian / Ubuntu)

For non-Proxmox servers, run `install.sh` directly as root:

```bash
git clone https://github.com/Mati-l33t/grove.git /opt/grove
cd /opt/grove && bash install.sh
```

Requirements: `node` (v18+), `npm`, `curl`, `unzip`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | PocketBase (Go, SQLite) |
| Frontend | React 18, Vite, TypeScript |
| UI components | shadcn/ui + Tailwind CSS v3 |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| Push notifications | Web Push (VAPID) |
| PWA | vite-plugin-pwa |

---

## License

[MIT](LICENSE.md)

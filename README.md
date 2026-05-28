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

Creates a Debian 12 or 13 LXC (2 cores, 1 GB RAM, 8 GB disk) and installs Grove automatically.  
Grove will be available at `http://<container-ip>:8090`.

The installer prompts you to choose between default settings or advanced options (container ID, hostname, disk size, CPU, RAM, bridge, static IP, VLAN).

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

## Manual install (Debian / Ubuntu / existing LXC)

Works on any Debian or Ubuntu system — including an existing Proxmox LXC. Run as root:

```bash
git clone https://github.com/Mati-l33t/grove.git /opt/grove
cd /opt/grove && bash install.sh
```

Requirements: `node` (v18+), `npm`, `curl`, `unzip`. The script installs any missing build tools automatically on Debian/Ubuntu.

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

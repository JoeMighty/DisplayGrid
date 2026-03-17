<div align="center">

# DisplayGrid

**Open-source, self-hosted digital signage for the places people gather.**

Restaurants, churches, schools, event venues, and community spaces — DisplayGrid gives you full control over your screens without a cloud subscription, recurring fees, or vendor lock-in.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-18%2B-brightgreen.svg)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange.svg)](https://pnpm.io)
[![SQLite](https://img.shields.io/badge/database-SQLite-lightblue.svg)](https://sqlite.org)

**[Website](https://joemighty.github.io/DisplayGrid/) · [Setup Guide](docs/SETUP.md) · [Report a Bug](https://github.com/JoeMighty/DisplayGrid/issues)**

</div>

---

## Features

- **Multi-screen management** — configure resolution, refresh rate, rotation, colour profile, and panel grid per screen
- **Zone-based organisation** — group screens into named zones (lobby, corridor, reception)
- **Playlist builder** — drag-and-drop slides with per-slide durations, transitions, and day/time scheduling
- **Asset library** — upload images, videos, and PDFs with automatic WebP optimisation via Sharp
- **Real-time delivery** — WebSocket server pushes playlist updates to displays instantly
- **Screen health monitoring** — live online/offline status, last-seen timestamps, and client IP
- **Emergency override** — broadcast a full-screen alert to every display simultaneously
- **Kiosk lock** — PIN-protected overlay with configurable key combo; no browser chrome visible
- **Offline resilience** — display clients cache their last playlist and keep playing through network outages
- **Role-based access** — Super Admin, Admin, Operator, Viewer
- **LED wall support** — define panel grids (e.g. 3×2) for tiled display configurations

### Coming Soon

- **Multi-zone layouts** — split a screen into independently controlled regions
- **Time-based scheduling** — automatically switch playlists by time of day or day of week

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Dashboard | Next.js 14 (App Router), Tailwind CSS |
| Database | SQLite · Drizzle ORM · better-sqlite3 |
| Auth | NextAuth v5 (JWT, edge-safe) |
| Real-time | Node.js `ws` WebSocket server |
| Display client | Vite + React |
| Monorepo | Turborepo + pnpm workspaces |
| Image processing | Sharp (WebP, JPEG, PNG, AVIF) |

---

## Requirements

- **Node.js** 18 or 20 LTS
- **pnpm** 9+
- **Chromium or Google Chrome** on display client machines
- A machine to act as the server (Raspberry Pi 4/5, mini PC, or any always-on device)

---

## Quick Start

```bash
git clone https://github.com/JoeMighty/DisplayGrid.git
cd DisplayGrid
pnpm install
```

**Configure the dashboard:**

```bash
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

Edit `apps/dashboard/.env.local`:

```env
NEXTAUTH_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXTAUTH_URL=http://localhost:3000
DB_PATH=/absolute/path/to/DisplayGrid/data/displaygrid.db
```

**Create the database:**

```bash
mkdir -p data
pnpm db:migrate
```

**Start:**

```bash
# Terminal 1 — dashboard (port 3000) + display client (port 5173)
pnpm dev

# Terminal 2 — WebSocket server (port 3001)
node apps/dashboard/ws-server.js
```

Open `http://localhost:3000` and follow the first-run setup wizard.

---

## Local Domain (Optional)

For a cleaner dev URL — `http://displaygrid.test` instead of `http://localhost:3000`:

```powershell
# Windows — run PowerShell as Administrator
.\scripts\add-hosts.ps1
```

```bash
# macOS / Linux
sudo ./scripts/add-hosts.sh
```

Then optionally run Caddy for clean URLs without a port number:

```bash
caddy run --config Caddyfile
```

See **[docs/SETUP.md](docs/SETUP.md)** for the complete setup guide.

---

## Project Structure

```
DisplayGrid/
├── apps/
│   ├── dashboard/          # Next.js dashboard (port 3000)
│   │   ├── src/app/        # App Router pages and API routes
│   │   └── ws-server.js    # WebSocket server (port 3001)
│   └── display-client/     # Vite/React kiosk client (port 5173)
├── packages/
│   ├── db/                 # Drizzle schema + SQLite client
│   └── shared/             # Constants shared across apps
├── data/                   # SQLite database + uploaded assets (gitignored)
├── docs/                   # GitHub Pages site + setup guides
├── scripts/                # Hosts file setup (add-hosts.ps1 / .sh)
└── Caddyfile               # Optional reverse proxy for clean URLs
```

---

## Hardware

### Server

| | Minimum | Recommended |
|---|---|---|
| Device | Raspberry Pi 4 (2 GB) | Raspberry Pi 5 (4 GB+) or mini PC |
| OS | Any Linux, macOS, Windows | Same |
| Storage | 8 GB+ SD / SSD | 32 GB+ SSD |

### Display Client

Any device running Chromium in kiosk mode:

| Device | Suitable for |
|--------|-------------|
| Raspberry Pi 5 | 4K content, smooth video |
| Raspberry Pi 4 | 1080p images and web slides |
| Mini PC / NUC | Any resolution |
| Old laptop or Mac mini | Any resolution |

---

## Kiosk Setup

### Linux / Raspberry Pi

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  http://<server>:5173
```

Add to `/etc/xdg/lxsession/LXDE-pi/autostart` for boot autostart.

### macOS

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --kiosk --noerrdialogs --disable-infobars \
  http://<server>:5173
```

Add as a Login Item in **System Settings → General → Login Items**.

### Windows

Create a shortcut with target:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-infobars http://<server>:5173
```

Copy to `shell:startup` to run on login.

**Unlock kiosk:** Hold `Ctrl+Alt+K` for 3 seconds to open the admin panel.

---

## Network Deployment

For kiosks on separate machines, point the display client at the server's IP:

```env
# apps/display-client/.env.local
VITE_API_BASE=http://192.168.1.10:3000
VITE_WS_BASE=ws://192.168.1.10:3001

# Pre-configure token to skip the token entry screen
VITE_SCREEN_TOKEN=your-screen-token-here
```

See [docs/SETUP.md](docs/SETUP.md) for cross-VLAN and firewall configuration.

---

## User Roles

| Role | Can do |
|------|--------|
| **Super Admin** | Everything, including deleting users and assigning any role |
| **Admin** | Manage all content and users (cannot delete users) |
| **Operator** | Manage screens, playlists, assets — no user management |
| **Viewer** | Read-only access to all content pages |

---

## Contributing

Issues and pull requests are welcome. Please open an issue before starting significant work so we can discuss the approach.

---

## Ethical Use

DisplayGrid is designed for community gathering places — restaurants, churches, schools, and event venues. It is not intended for surveillance, military use, law enforcement monitoring, or facial recognition systems.

---

## Licence

MIT — see [LICENSE](LICENSE)

*By [JoeMighty](https://github.com/JoeMighty)*

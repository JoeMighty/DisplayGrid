# DisplayGrid — Setup Guide

This guide covers everything you need to get DisplayGrid running: the dashboard server, the WebSocket service, and one or more display clients (kiosks).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Prerequisites](#2-prerequisites)
3. [Server Setup](#3-server-setup)
   - [3.1 Clone & Install](#31-clone--install)
   - [3.2 Environment Variables](#32-environment-variables)
   - [3.3 Database](#33-database)
   - [3.4 Local Domain (displaygrid.test)](#34-local-domain-displaygridtest)
   - [3.5 Start the Services](#35-start-the-services)
   - [3.6 First-Run Setup Wizard](#36-first-run-setup-wizard)
4. [Kiosk / Display Client Setup](#4-kiosk--display-client-setup)
   - [4.1 Same Machine as Server](#41-same-machine-as-server)
   - [4.2 Separate Machine on the Same Network](#42-separate-machine-on-the-same-network)
   - [4.3 Pre-configuring the Screen Token](#43-pre-configuring-the-screen-token)
   - [4.4 Kiosk Mode (Full-Screen Browser)](#44-kiosk-mode-full-screen-browser)
5. [Clean URLs with Caddy (Optional)](#5-clean-urls-with-caddy-optional)
6. [User Roles](#6-user-roles)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. System Overview

DisplayGrid has three components that work together:

```
┌─────────────────────────────────────────┐
│              SERVER MACHINE             │
│                                         │
│  ┌──────────────┐   ┌────────────────┐  │
│  │  Dashboard   │   │   WS Server    │  │
│  │  (Next.js)   │   │  (ws-server)   │  │
│  │  port 3000   │   │   port 3001    │  │
│  └──────┬───────┘   └───────┬────────┘  │
│         │                   │           │
└─────────┼───────────────────┼───────────┘
          │  HTTP             │  WebSocket
          ▼                   ▼
┌─────────────────────────────────────────┐
│           KIOSK / DISPLAY MACHINE       │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │       Display Client (Vite)      │   │
│  │  Full-screen browser, port 5173  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

| Component | What it does |
|-----------|-------------|
| **Dashboard** (Next.js, port 3000) | Web UI for managing screens, zones, playlists, assets, and users |
| **WS Server** (Node, port 3001) | Pushes playlist updates to display clients in real time |
| **Display Client** (Vite/React, port 5173) | Runs on kiosk screens, receives and plays content |

The server and kiosk can be the **same machine** (ideal for a single-screen setup or development) or **different machines** on the same network (production, multi-screen setup).

---

## 2. Prerequisites

Install these on the **server machine**:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18 or 20 LTS | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Git | any | https://git-scm.com |

For kiosk machines you only need a modern web browser (Chrome recommended).

---

## 3. Server Setup

### 3.1 Clone & Install

```bash
git clone https://github.com/JoeMighty/DisplayGrid.git
cd DisplayGrid
pnpm install
```

### 3.2 Environment Variables

Copy the example files and edit them:

```bash
# Dashboard
cp apps/dashboard/.env.example apps/dashboard/.env.local

# Display client (only needed if running on the same machine)
cp apps/display-client/.env.example apps/display-client/.env.local
```

**`apps/dashboard/.env.local`**

```env
# Generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_SECRET=your-secret-here

# The public URL of your dashboard
NEXTAUTH_URL=http://displaygrid.test:3000

# Absolute path to the SQLite database
# Windows:   C:/path/to/DisplayGrid/data/displaygrid.db
# Mac/Linux: /path/to/DisplayGrid/data/displaygrid.db
DB_PATH=/path/to/DisplayGrid/data/displaygrid.db
```

**`apps/display-client/.env.local`** (same-machine setup)

```env
VITE_API_BASE=http://displaygrid.test:3000
VITE_WS_BASE=ws://displaygrid.test:3001
```

### 3.3 Database

Create the data folder and run migrations:

```bash
# Create the data directory
mkdir -p data

# Run database migrations
pnpm db:migrate
```

> The database is a single SQLite file. Keep regular backups of the `data/` folder.

### 3.4 Local Domain (displaygrid.test)

This step makes `displaygrid.test` resolve to your local machine instead of typing `localhost:3000`.

**Windows** (run PowerShell as Administrator):

```powershell
.\scripts\add-hosts.ps1
```

**macOS / Linux**:

```bash
chmod +x scripts/add-hosts.sh
sudo ./scripts/add-hosts.sh
```

**Manual** (any OS) — add this line to your hosts file:

```
127.0.0.1    displaygrid.test
```

- Windows: `C:\Windows\System32\drivers\etc\hosts`
- Mac/Linux: `/etc/hosts`

### 3.5 Start the Services

Open **two terminal windows** in the project root:

**Terminal 1 — Dashboard + Display Client**

```bash
pnpm dev
```

This starts:
- Dashboard at `http://displaygrid.test:3000`
- Display client at `http://displaygrid.test:5173`

**Terminal 2 — WebSocket Server**

```bash
node apps/dashboard/ws-server.js
```

> Keep both terminals running while DisplayGrid is in use.

### 3.6 First-Run Setup Wizard

On your first visit to `http://displaygrid.test:3000` you'll be taken through the setup wizard:

1. **App name** — e.g. "DisplayGrid" or your organisation name
2. **Super Admin account** — username and password for the primary admin

After setup you'll be redirected to the dashboard login page.

---

## 4. Kiosk / Display Client Setup

### 4.1 Same Machine as Server

If the kiosk is on the same machine as the server (common for development or single-screen setups):

1. Ensure `apps/display-client/.env.local` contains:
   ```env
   VITE_API_BASE=http://displaygrid.test:3000
   VITE_WS_BASE=ws://displaygrid.test:3001
   ```
2. The display client is already served at `http://displaygrid.test:5173` when you run `pnpm dev`.
3. Open a browser and navigate to `http://displaygrid.test:5173`.
4. Enter the screen token (found in the dashboard under **Screens → your screen → Copy Token**).

### 4.2 Separate Machine on the Same Network

For kiosks on a different device (TV, PC, tablet, Raspberry Pi):

**On the server machine**, find its local IP address:

```bash
# Windows
ipconfig

# macOS / Linux
ip route get 1 | awk '{print $7}' || hostname -I | awk '{print $1}'
```

Example result: `192.168.1.10`

**On the kiosk machine**, you have two options:

#### Option A — Run the Vite dev server on the kiosk

Clone the repo on the kiosk and create `.env.local` pointing to the server:

```bash
git clone https://github.com/JoeMighty/DisplayGrid.git
cd DisplayGrid
pnpm install

# Create env file pointing to the server IP
cat > apps/display-client/.env.local << EOF
VITE_API_BASE=http://192.168.1.10:3000
VITE_WS_BASE=ws://192.168.1.10:3001
EOF

cd apps/display-client
pnpm dev
```

Open `http://localhost:5173` on the kiosk.

#### Option B — Build a static bundle (recommended for production)

On the **server machine**, build the display client:

```bash
cd apps/display-client
VITE_API_BASE=http://192.168.1.10:3000 VITE_WS_BASE=ws://192.168.1.10:3001 pnpm build
```

This produces a `dist/` folder. Serve it on the kiosk with any static file server:

```bash
# Using Node's built-in serve (install once: npm i -g serve)
serve apps/display-client/dist

# Or with Python
python3 -m http.server 8080 --directory apps/display-client/dist
```

Then open `http://localhost:8080` on the kiosk.

> **Firewall note**: Make sure ports **3000** (dashboard) and **3001** (WS server) are open on the server machine's firewall so kiosks can reach them.

### 4.3 Pre-configuring the Screen Token

To skip the token entry screen on boot, set `VITE_SCREEN_TOKEN` in the display client's env:

```env
VITE_API_BASE=http://192.168.1.10:3000
VITE_WS_BASE=ws://192.168.1.10:3001
VITE_SCREEN_TOKEN=your-screen-token-here
```

Get the token from the dashboard: **Screens → your screen → ⋮ menu → Copy Token**.

With this set, the kiosk boots directly into the playing state with no user interaction required.

### 4.4 Kiosk Mode (Full-Screen Browser)

For production kiosks you'll want the browser in full-screen, no UI chrome.

**Chrome / Chromium (all platforms)**:

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-infobars http://localhost:8080

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk http://localhost:8080

# Linux
google-chrome --kiosk --noerrdialogs http://localhost:8080
```

**Raspberry Pi** — add to `/etc/xdg/lxsession/LXDE-pi/autostart`:

```
@chromium-browser --kiosk --noerrdialogs --disable-infobars http://192.168.1.10:8080
```

**Unlock kiosk** (when locked): Hold `Ctrl+Alt+K` for 3 seconds to bring up the admin unlock panel.

---

## 5. Clean URLs with Caddy (Optional)

By default, the dashboard is at `displaygrid.test:3000` (with port). If you want clean URLs with no port — `http://displaygrid.test` — use Caddy as a reverse proxy.

**Install Caddy**: https://caddyserver.com/docs/install

**Run** (from the project root):

```bash
caddy run --config Caddyfile
```

Caddy listens on port 80 and forwards:
- `http://displaygrid.test` → Next.js dashboard on :3000
- `http://displaygrid.test/ws*` → WebSocket server on :3001

**Update your env files** to remove the port:

```env
# apps/dashboard/.env.local
NEXTAUTH_URL=http://displaygrid.test

# apps/display-client/.env.local
VITE_API_BASE=http://displaygrid.test
VITE_WS_BASE=ws://displaygrid.test
```

> **Windows note**: Listening on port 80 requires Caddy to be run as Administrator, or you can configure `http_port` in the Caddyfile to use a non-privileged port.

---

## 6. User Roles

| Role | Dashboard access | Can do |
|------|-----------------|--------|
| **Super Admin** | Full access | Everything — including deleting users and assigning any role |
| **Admin** | Full access | Manage screens, zones, playlists, assets, users (except deleting) |
| **Operator** | Screens, Zones, Playlists, Assets | Day-to-day content management, no user management |
| **Viewer** | Screens, Zones, Playlists, Assets | Read-only — cannot create, edit, or delete anything |

The **Super Admin** account is created during the setup wizard. Additional users can be added from the **Users** page (admins and super admins only).

---

## 7. Troubleshooting

### Dashboard won't start

- Check that `apps/dashboard/.env.local` exists and `DB_PATH` points to a valid directory.
- Run `pnpm db:migrate` to ensure the database schema is up to date.

### Display client shows a black screen

- Confirm the WS server (`node apps/dashboard/ws-server.js`) is running.
- Check that the screen token is correct and the screen has a zone/playlist assigned in the dashboard.
- Open browser DevTools (F12) → Console for error messages.

### Kiosk can't connect to the server

- Verify the server's IP address is correct in the display client env.
- Check the server firewall allows inbound connections on ports 3000 and 3001.
- Try `ping 192.168.1.10` from the kiosk to confirm network connectivity.

### `displaygrid.test` doesn't resolve

- Ensure the hosts file entry was added correctly (may require a browser restart or DNS flush).
- Windows DNS flush: `ipconfig /flushdns`
- macOS DNS flush: `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`

### Caddy fails to start on Windows (port 80 in use)

- Run Caddy as Administrator, or change the port in `Caddyfile` using `http_port 8080` in the global options block.

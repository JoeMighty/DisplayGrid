# DisplayGrid

**Open source, self-hosted digital signage for the places people gather.**

Restaurants, churches, schools, event venues, and community spaces — DisplayGrid gives you full control over your screens without a cloud subscription, recurring fees, or a vendor lock-in.

---

## Features

- **Multi-screen zones** — organise displays into named zones, manage dozens of screens from one dashboard
- **Live WebSocket updates** — push playlist changes instantly, no page reloads on displays
- **Offline resilience** — IndexedDB + Cache API keeps screens playing through network outages
- **Kiosk lock screen** — PIN-protected exit overlay, no cursor or browser chrome visible
- **Role-based access** — Super Admin, Admin, Operator, Viewer
- **Emergency override** — push urgent content to every screen instantly, site-wide
- **Scheduled slides** — show content only on specific days, times, or date ranges
- **Image compression** — automatic WebP conversion via sharp, configurable quality and dimensions

---

## Requirements

- **Node.js** 20 or later
- **pnpm** 9 (installed automatically by `install.sh` if missing)
- **Chromium or Google Chrome** on display client machines
- A machine to act as the server (Raspberry Pi 4/5, mini PC, or any always-on Linux/macOS/Windows device)

---

## Quick Start

```bash
git clone https://github.com/JoeMighty/DisplayGrid.git
cd DisplayGrid
bash scripts/install.sh
```

Then edit `.env` to set `NEXTAUTH_URL` to your LAN IP or hostname, and start the server:

```bash
pnpm dev
```

Open `http://<your-server>:3000` in a browser and complete the first-run setup wizard.

---

## Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create data directories
mkdir -p data/uploads

# 3. Copy and configure environment
cp .env.example .env
# Edit .env — set NEXTAUTH_URL, generate NEXTAUTH_SECRET:
#   openssl rand -base64 32

# 4. Run database migrations
pnpm db:migrate

# 5. Start
pnpm dev
```

---

## First-Run Setup Wizard

On first launch, all routes redirect to `/setup`. The wizard:

1. Sets the application name
2. Creates the first Super Admin account
3. Configures the kiosk PIN and key combo
4. Creates your first zone and screen
5. Marks setup as complete — normal auth then applies

---

## Hardware Requirements

### Server

| | Minimum | Recommended |
|---|---|---|
| Device | Raspberry Pi 4 (2GB RAM) | Raspberry Pi 5 (4GB+ RAM) |
| OS | Raspberry Pi OS Lite, Ubuntu, any Linux | Same |
| Notes | Any always-on machine works | Active cooling recommended |

The server runs the Next.js dashboard on port `3000` and the WebSocket server on port `3001`.

### Display Client

Any device that can run **Chromium in kiosk mode**:

| Device | Suitable for |
|--------|-------------|
| Raspberry Pi 5 | 4K content, smooth video |
| Raspberry Pi 4 | 1080p images and web slides |
| Budget x86 mini PC | Any resolution |
| Old laptop or Mac mini | Any resolution |

No special GPU required for standard image and web content.

---

## Display Client Setup

Each screen is identified by a unique token. The URL pattern is:

```
http://<server>:3000/screen/<token>
```

Create a screen in the dashboard to get its token, then point a browser at that URL.

---

## Kiosk Setup: Linux and Raspberry Pi 5

```bash
bash scripts/kiosk-setup.sh http://<server>:3000/screen/<token>
```

Then reboot. Chromium will launch automatically in kiosk mode.

---

## Kiosk Setup: macOS

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --autoplay-policy=no-user-gesture-required \
  'http://<server>:3000/screen/<token>'
```

To auto-start on login, add the command as a Login Item in **System Settings > General > Login Items**.

---

## Kiosk Setup: Windows

Create a shortcut with this target:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-infobars --autoplay-policy=no-user-gesture-required http://<server>:3000/screen/<token>
```

Press `Win+R`, type `shell:startup`, and copy the shortcut into that folder to auto-start on login.

---

## Raspberry Pi 5 Guide

**Recommended hardware:**
- Raspberry Pi 5 (4GB or 8GB)
- Active cooler (official Raspberry Pi Active Cooler or equivalent)
- 32GB+ microSD (A2 rated) or USB SSD for the server
- Official Raspberry Pi power supply (27W USB-C for Pi 5)

**Production server — run as a systemd service:**

```bash
# Copy the service file
sudo cp scripts/service/displaygrid.service /etc/systemd/system/

# Edit the file if your user is not 'pi'
sudo nano /etc/systemd/system/displaygrid.service

# Build first
pnpm build

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable displaygrid
sudo systemctl start displaygrid

# Check logs
sudo journalctl -u displaygrid -f
```

---

## Cross-VLAN / Network Setup

If your server and display clients are on different VLANs:

- Server firewall: allow TCP `3000` inbound from display device VLANs
- Server firewall: allow TCP `3001` inbound from display device VLANs
- Router: permit routing between server VLAN and display VLANs
- DNS / mDNS: `displaygrid.local` (or your chosen hostname) must resolve from all VLANs

**mDNS setup on server (Linux/Pi):**

```bash
sudo apt-get install -y avahi-daemon
sudo systemctl enable --now avahi-daemon
# Set hostname in /etc/hostname and /etc/hosts
```

---

## Configuration

All variables live in `.env` (copied from `.env.example` by `install.sh`).

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Full URL of the dashboard — use LAN IP or hostname, never localhost |
| `NEXTAUTH_SECRET` | Random secret for session signing — generated by install.sh |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for display clients |
| `WS_PORT` | WebSocket server port (default `3001`) |
| `DB_PATH` | Path to SQLite database file |
| `UPLOAD_PATH` | Path for uploaded asset files |
| `DEFAULT_IMAGE_QUALITY` | JPEG/WebP quality 1–100 (default `90`) |
| `DEFAULT_IMAGE_FORMAT` | Output format: `webp`, `jpeg`, or `png` |
| `DEFAULT_IMAGE_MAX_WIDTH` | Max image width in pixels (default `3840`) |
| `DEFAULT_IMAGE_MAX_HEIGHT` | Max image height in pixels (default `2160`) |

---

## Image Compression Settings

Images are processed through **sharp** on upload. Defaults apply at install. Super Admins can adjust quality, format, and max dimensions at runtime via **Settings → Compression** — no restart required.

PNG uploads are always lossless regardless of quality setting.

---

## LED Wall / Custom Resolution

When creating a screen, set a custom resolution and panel grid (columns × rows) to match your LED wall configuration. The display client renders at the configured resolution and the grid overlay aligns panels accordingly.

---

## Contributing

Issues and pull requests are welcome. Please open an issue before starting significant work so we can discuss the approach.

---

## Ethical Use

DisplayGrid is designed for places where communities gather — restaurants, churches, schools, and event venues. It is not intended for surveillance, military use, law enforcement monitoring, or facial recognition systems.

See [ETHICAL.md](ETHICAL.md) for the full statement.

---

## Licence

MIT — see [LICENSE](LICENSE). Please also read [ETHICAL.md](ETHICAL.md) for intended use.

---

*By [JoeMighty](https://github.com/JoeMighty)*

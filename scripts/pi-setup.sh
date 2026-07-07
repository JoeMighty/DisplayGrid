#!/usr/bin/env bash
#
# DisplayGrid — Raspberry Pi kiosk setup
#
# Turns a fresh Raspberry Pi OS (Lite recommended) into a fullscreen kiosk that
# boots straight into a DisplayGrid screen. Run it once on the Pi:
#
#   curl -sSL https://joemighty.github.io/DisplayGrid/pi-setup.sh | bash
#
# It asks for your server address and screen token (or reads DG_SERVER /
# DG_TOKEN from the environment for unattended installs), then configures
# Chromium to launch on boot at  http://<server>/display?token=<token>.
#
# Re-running is safe — it overwrites its own config and leaves nothing else
# behind. Undo with:  ~/.displaygrid/uninstall.sh
#
set -euo pipefail

BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
say()  { printf '%s\n' "${BOLD}==>${RESET} $*"; }
warn() { printf '%s\n' "${YELLOW}warning:${RESET} $*" >&2; }
die()  { printf '%s\n' "${RED}error:${RESET} $*" >&2; exit 1; }

# ── Sanity checks ─────────────────────────────────────────────────────────────
[ "$(id -u)" -ne 0 ] || die "Run as your normal user (e.g. 'pi'), not root. It uses sudo where needed."
command -v apt-get >/dev/null || die "This script is for Raspberry Pi OS / Debian. apt-get not found."

USER_NAME="$(id -un)"
HOME_DIR="$HOME"
DG_DIR="$HOME_DIR/.displaygrid"

# ── Gather config ─────────────────────────────────────────────────────────────
# DG_SERVER example: http://192.168.1.10:5555  (packaged app uses 5555; Docker/source use 3000)
SERVER="${DG_SERVER:-}"
TOKEN="${DG_TOKEN:-}"

if [ -z "$SERVER" ]; then
  printf '%s' "${BOLD}Server address${RESET} (e.g. http://192.168.1.10:5555): "
  read -r SERVER </dev/tty
fi
if [ -z "$TOKEN" ]; then
  printf '%s' "${BOLD}Screen token${RESET} (from the Screens page, e.g. lobby): "
  read -r TOKEN </dev/tty
fi

[ -n "$SERVER" ] || die "Server address is required."
[ -n "$TOKEN" ]  || die "Screen token is required."

# Normalise: strip trailing slash, ensure scheme.
SERVER="${SERVER%/}"
case "$SERVER" in
  http://*|https://*) : ;;
  *) SERVER="http://$SERVER" ;;
esac
DISPLAY_URL="$SERVER/display?token=$TOKEN"

say "Kiosk will open: ${GREEN}$DISPLAY_URL${RESET}"

# ── Install packages ──────────────────────────────────────────────────────────
# Pi OS Lite has no desktop, so pull a minimal X stack + Chromium. openbox gives
# us a bare window manager; unclutter hides the mouse cursor.
say "Installing Chromium and a minimal X session (this can take a few minutes)…"
CHROMIUM_PKG="chromium-browser"
apt-cache show chromium-browser >/dev/null 2>&1 || CHROMIUM_PKG="chromium"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  xserver-xorg x11-xserver-utils xinit openbox unclutter "$CHROMIUM_PKG"

CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium)"
[ -n "$CHROMIUM_BIN" ] || die "Chromium did not install correctly."

# ── Write kiosk launcher ──────────────────────────────────────────────────────
mkdir -p "$DG_DIR"
cat > "$DG_DIR/url" <<EOF
$DISPLAY_URL
EOF

cat > "$DG_DIR/kiosk.sh" <<EOF
#!/usr/bin/env bash
# Launched by the displaygrid-kiosk systemd service via xinit.
set -eu
URL="\$(cat "$DG_DIR/url")"

# Keep the screen awake.
xset s off -dpms s noblank || true
unclutter -idle 0.5 -root &

# Chromium's crash bubble reappears after a hard power-off; scrub it so the
# next boot doesn't show a "restore pages" bar over the signage.
PROFILE="$DG_DIR/chromium"
mkdir -p "\$PROFILE/Default"
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' \
  "\$PROFILE/Default/Preferences" 2>/dev/null || true

# Relaunch on crash so an unattended screen self-heals.
while true; do
  "$CHROMIUM_BIN" \\
    --kiosk --incognito --noerrdialogs --disable-infobars --no-first-run \\
    --disable-session-crashed-bubble --disable-features=TranslateUI \\
    --autoplay-policy=no-user-gesture-required \\
    --check-for-update-interval=31536000 \\
    --user-data-dir="\$PROFILE" \\
    --app="\$URL" || true
  sleep 3
done
EOF
chmod +x "$DG_DIR/kiosk.sh"

# openbox session that just runs our launcher
cat > "$DG_DIR/xinitrc" <<EOF
#!/usr/bin/env bash
exec openbox-session &
exec "$DG_DIR/kiosk.sh"
EOF
chmod +x "$DG_DIR/xinitrc"

# ── systemd service: start X on boot, on the console TTY ──────────────────────
say "Enabling the kiosk to start on boot…"
sudo tee /etc/systemd/system/displaygrid-kiosk.service >/dev/null <<EOF
[Unit]
Description=DisplayGrid Kiosk
After=systemd-user-sessions.service network-online.target
Wants=network-online.target

[Service]
User=$USER_NAME
PAMName=login
TTYPath=/dev/tty1
Environment=XINITRC=$DG_DIR/xinitrc
ExecStart=/usr/bin/startx %E{XINITRC} -- :0 vt1 -keeptty -nolisten tcp
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Allow startx from a service (Debian restricts X to console users otherwise).
if [ -f /etc/X11/Xwrapper.config ]; then
  sudo sed -i 's/^allowed_users=.*/allowed_users=anybody/' /etc/X11/Xwrapper.config
  grep -q '^needs_root_rights' /etc/X11/Xwrapper.config \
    && sudo sed -i 's/^needs_root_rights=.*/needs_root_rights=yes/' /etc/X11/Xwrapper.config \
    || echo 'needs_root_rights=yes' | sudo tee -a /etc/X11/Xwrapper.config >/dev/null
else
  printf 'allowed_users=anybody\nneeds_root_rights=yes\n' | sudo tee /etc/X11/Xwrapper.config >/dev/null
fi

# ── Uninstaller ───────────────────────────────────────────────────────────────
cat > "$DG_DIR/uninstall.sh" <<EOF
#!/usr/bin/env bash
set -eu
sudo systemctl disable --now displaygrid-kiosk.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/displaygrid-kiosk.service
sudo systemctl daemon-reload
rm -rf "$DG_DIR"
echo "DisplayGrid kiosk removed. Reboot to return to a normal console."
EOF
chmod +x "$DG_DIR/uninstall.sh"

sudo systemctl daemon-reload
sudo systemctl enable displaygrid-kiosk.service >/dev/null

# ── Done ──────────────────────────────────────────────────────────────────────
cat <<EOF

${GREEN}${BOLD}DisplayGrid kiosk is set up.${RESET}

  Screen URL : $DISPLAY_URL
  Change URL : edit ${DIM}$DG_DIR/url${RESET} then ${DIM}sudo systemctl restart displaygrid-kiosk${RESET}
  Start now  : ${DIM}sudo systemctl start displaygrid-kiosk${RESET}
  Logs       : ${DIM}journalctl -u displaygrid-kiosk -b${RESET}
  Uninstall  : ${DIM}$DG_DIR/uninstall.sh${RESET}

Reboot to launch the kiosk:  ${BOLD}sudo reboot${RESET}
EOF

#!/bin/bash
# DisplayGrid Linux / Raspberry Pi 5 Kiosk Setup
# Usage: bash kiosk-setup.sh <screen-url>
# e.g.   bash kiosk-setup.sh http://displaygrid.local:3000/screen/abc123
set -e

SCREEN_URL=$1
[ -z "$SCREEN_URL" ] && { echo 'ERROR: screen URL required'; echo 'Usage: bash kiosk-setup.sh <screen-url>'; exit 1; }

echo ''
echo '  DisplayGrid — Kiosk Setup'
echo "  Screen URL: $SCREEN_URL"
echo ''

sudo apt-get update -qq
sudo apt-get install -y chromium-browser unclutter xdotool

# Pi only: disable screen blanking via raspi-config
if command -v raspi-config >/dev/null 2>&1; then
  sudo raspi-config nonint do_blanking 1
  echo '✓ Screen blanking disabled (Pi)'
fi

mkdir -p ~/.config/lxsession/LXDE-pi

cat > ~/.config/lxsession/LXDE-pi/autostart << EOF
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0 -root
@chromium-browser \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --disable-pinch \\
  --overscroll-history-navigation=0 \\
  --check-for-update-interval=31536000 \\
  --autoplay-policy=no-user-gesture-required \\
  $SCREEN_URL
EOF

echo '✓ Kiosk autostart configured'
echo ''
echo '  Reboot to activate: sudo reboot'
echo ''

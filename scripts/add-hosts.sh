#!/usr/bin/env bash
# DisplayGrid — macOS / Linux hosts file setup
# Adds the displaygrid.test entry to /etc/hosts
#
# Usage:
#   chmod +x scripts/add-hosts.sh
#   sudo ./scripts/add-hosts.sh

HOSTS_FILE="/etc/hosts"
ENTRY="127.0.0.1\tdisplaygrid.test\t# DisplayGrid local dev"

# Check if already present
if grep -q "displaygrid\.test" "$HOSTS_FILE"; then
  echo "displaygrid.test is already in your hosts file."
  exit 0
fi

# Check for root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: This script must be run with sudo."
  echo "Usage: sudo ./scripts/add-hosts.sh"
  exit 1
fi

printf "\n%b\n" "$ENTRY" >> "$HOSTS_FILE"

echo "Done! displaygrid.test now points to 127.0.0.1"
echo ""
echo "You can now access:"
echo "  Dashboard:      http://displaygrid.test:3000"
echo "  Display client: http://displaygrid.test:5173"
echo ""
echo "Optional — for clean URLs without the port number, install Caddy"
echo "and run: caddy run --config Caddyfile"

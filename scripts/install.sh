#!/bin/bash
set -e

echo ''
echo '  ██████╗ ██╗███████╗██████╗ ██╗      █████╗ ██╗   ██╗ ██████╗ ██████╗ ██╗██████╗ '
echo '  ██╔══██╗██║██╔════╝██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝██╔════╝ ██╔══██╗██║██╔══██╗'
echo '  ██║  ██║██║███████╗██████╔╝██║     ███████║ ╚████╔╝ ██║  ███╗██████╔╝██║██║  ██║'
echo '  ██║  ██║██║╚════██║██╔═══╝ ██║     ██╔══██║  ╚██╔╝  ██║   ██║██╔══██╗██║██║  ██║'
echo '  ██████╔╝██║███████║██║     ███████╗██║  ██║   ██║   ╚██████╔╝██║  ██║██║██████╔╝'
echo '  ╚═════╝ ╚═╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝ '
echo ''
echo '  Open Source Digital Signage'
echo '  Author: JoeMighty — github.com/JoeMighty'
echo ''

# ─── Node version check ───────────────────────────────────────────────────────
NODE_VER=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VER" ]; then
  echo 'ERROR: Node.js not found. Please install Node.js 20 or later.'
  echo '       https://nodejs.org'
  exit 1
fi
if [ "$NODE_VER" -lt 20 ]; then
  echo "ERROR: Node.js 20+ required. You have Node $NODE_VER."
  exit 1
fi
echo "✓ Node.js $(node -v)"

# ─── pnpm ─────────────────────────────────────────────────────────────────────
if ! command -v pnpm >/dev/null 2>&1; then
  echo '  Installing pnpm...'
  npm install -g pnpm
fi
echo "✓ pnpm $(pnpm -v)"

# ─── Dependencies ─────────────────────────────────────────────────────────────
echo ''
echo '  Installing dependencies...'
pnpm install

# ─── Data directories ─────────────────────────────────────────────────────────
mkdir -p data/uploads
echo '✓ data/ directories created'

# ─── .env ─────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(openssl rand -base64 32)
  # Use a temp file for cross-platform sed compatibility
  sed "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|" .env > .env.tmp && mv .env.tmp .env
  echo '✓ .env created with generated NEXTAUTH_SECRET'
  echo ''
  echo '  ⚠  ACTION REQUIRED: Edit .env and set NEXTAUTH_URL to your LAN IP or hostname.'
  echo '     Example: NEXTAUTH_URL=http://displaygrid.local:3000'
else
  echo '✓ .env already exists — skipping'
fi

# ─── Database ─────────────────────────────────────────────────────────────────
echo ''
echo '  Setting up database...'
pnpm db:generate
pnpm db:migrate
echo '✓ Database ready'

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ''
echo '  ─────────────────────────────────────────────'
echo '  Install complete.'
echo ''
echo '  Next steps:'
echo '    1. Edit .env  →  set NEXTAUTH_URL to your LAN IP or hostname'
echo '    2. pnpm dev   →  start the development server'
echo '    3. Open your browser and complete the setup wizard'
echo '  ─────────────────────────────────────────────'
echo ''

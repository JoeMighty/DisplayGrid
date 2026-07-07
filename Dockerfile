# DisplayGrid server — dashboard (Next.js standalone) + WebSocket server.
#
#   docker run -d -p 3000:3000 -p 3001:3001 -v displaygrid-data:/data \
#     ghcr.io/joemighty/displaygrid:latest
#
# All persistent state (SQLite DB, uploaded assets, auth secret) lives in /data.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

RUN corepack enable

# Manifests first so the install layer caches across source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/dashboard/package.json       apps/dashboard/
COPY apps/display-client/package.json  apps/display-client/
COPY apps/electron-server/package.json apps/electron-server/
COPY apps/electron-kiosk/package.json  apps/electron-kiosk/
COPY packages/db/package.json          packages/db/
COPY packages/shared/package.json      packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXTAUTH_SECRET=build-placeholder \
    NEXTAUTH_URL=http://localhost:3000 \
    DB_PATH=/tmp/build.db

# Browser displays are served by the dashboard at /display.
RUN cd apps/display-client && npx vite build --base=/display/ --outDir dist-web && \
    mkdir -p ../dashboard/public && rm -rf ../dashboard/public/display && \
    cp -r dist-web ../dashboard/public/display

RUN cd apps/dashboard && pnpm build

# Stage the standalone output exactly like CI does: static assets and public
# land inside the traced tree; ws-server.js and the ws module (not traced by
# the Next build) are added at the root.
RUN STANDALONE=apps/dashboard/.next/standalone && \
    mkdir -p "$STANDALONE/apps/dashboard/.next/static" && \
    cp -r apps/dashboard/.next/static/. "$STANDALONE/apps/dashboard/.next/static/" && \
    if [ -d apps/dashboard/public ] && [ "$(ls -A apps/dashboard/public)" ]; then \
      mkdir -p "$STANDALONE/apps/dashboard/public" && \
      cp -r apps/dashboard/public/. "$STANDALONE/apps/dashboard/public/"; \
    fi && \
    cp apps/dashboard/ws-server.js "$STANDALONE/ws-server.js" && \
    if [ ! -d "$STANDALONE/node_modules/ws" ]; then \
      WS_DIR=$(node -e "console.log(require('path').dirname(require.resolve('ws/package.json',{paths:[process.cwd()+'/apps/dashboard']})))") && \
      cp -rL "$WS_DIR" "$STANDALONE/node_modules/ws"; \
    fi

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /srv/displaygrid

ENV NODE_ENV=production \
    DB_PATH=/data/displaygrid.db \
    UPLOAD_DIR=/data/uploads \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build /app/apps/dashboard/.next/standalone ./
COPY packages/db/drizzle ./drizzle
COPY docker/entrypoint.js ./entrypoint.js

RUN mkdir -p /data && chown -R node:node /data /srv/displaygrid
USER node
VOLUME /data

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "entrypoint.js"]

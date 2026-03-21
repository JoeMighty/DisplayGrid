const { app, Tray, Menu, shell, nativeImage, dialog, Notification } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ── Path helpers ────────────────────────────────────────────────────────────

const isDev = !app.isPackaged;

// In dev:  project root is 3 levels up from apps/electron-server/electron/
// In prod: bundled resources live in process.resourcesPath
const ROOT = isDev
  ? path.resolve(__dirname, '../../..')
  : process.resourcesPath;

function resPath(...parts) {
  return path.join(ROOT, ...parts);
}

// User data dir — where the SQLite db lives at runtime
const DB_PATH = path.join(app.getPath('userData'), 'displaygrid.db');

// ── Child processes ─────────────────────────────────────────────────────────

let nextProcess = null;
let wsProcess   = null;

function spawnNext() {
  const serverJs = isDev
    ? resPath('apps/dashboard/.next/standalone/server.js')
    : resPath('server.js');

  if (!fs.existsSync(serverJs)) {
    dialog.showErrorBox(
      'Build required',
      `Dashboard not built yet.\n\nRun: pnpm --filter @displaygrid/dashboard build\n\nExpected: ${serverJs}`
    );
    return;
  }

  const env = {
    ...process.env,
    PORT: '3000',
    NODE_ENV: 'production',
    DB_PATH,
    NEXTAUTH_URL: 'http://localhost:3000',
    // Copy .next/standalone static files path
    NEXT_SHARP_PATH: isDev
      ? resPath('node_modules/sharp')
      : resPath('sharp'),
  };

  const cwd = isDev
    ? resPath('apps/dashboard/.next/standalone')
    : ROOT;

  nextProcess = spawn(process.execPath, [serverJs], { env, cwd, stdio: 'pipe' });
  nextProcess.stdout.on('data', d => console.log('[next]', d.toString().trim()));
  nextProcess.stderr.on('data', d => console.error('[next]', d.toString().trim()));
  nextProcess.on('exit', code => console.log('[next] exited', code));
}

function spawnWs() {
  const wsJs = isDev
    ? resPath('apps/dashboard/ws-server.js')
    : resPath('ws-server.js');

  if (!fs.existsSync(wsJs)) {
    console.error('ws-server.js not found at', wsJs);
    return;
  }

  const env = { ...process.env, DB_PATH };

  wsProcess = spawn(process.execPath, [wsJs], { env, stdio: 'pipe' });
  wsProcess.stdout.on('data', d => console.log('[ws]', d.toString().trim()));
  wsProcess.stderr.on('data', d => console.error('[ws]', d.toString().trim()));
  wsProcess.on('exit', code => console.log('[ws] exited', code));
}

function killAll() {
  if (nextProcess) { try { nextProcess.kill(); } catch {} nextProcess = null; }
  if (wsProcess)   { try { wsProcess.kill();   } catch {} wsProcess   = null; }
}

function restartAll() {
  killAll();
  setTimeout(() => { spawnNext(); spawnWs(); }, 500);
}

// ── Tray ────────────────────────────────────────────────────────────────────

let tray = null;

function createTray() {
  const iconFile = path.join(__dirname, 'icon.png');
  const icon = fs.existsSync(iconFile)
    ? nativeImage.createFromPath(iconFile)
    : nativeImage.createEmpty();

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('DisplayGrid');
  refreshTrayMenu();
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'DisplayGrid Server',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => shell.openExternal('http://localhost:3000'),
    },
    {
      label: 'Open Display Client',
      click: () => shell.openExternal('http://localhost:5173'),
    },
    { type: 'separator' },
    {
      label: 'Restart Services',
      click: () => {
        restartAll();
        new Notification({ title: 'DisplayGrid', body: 'Services restarting…' }).show();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { killAll(); app.quit(); },
    },
  ]));
}

// ── App lifecycle ───────────────────────────────────────────────────────────

// Single instance lock — only one server app at a time
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.setName('DisplayGrid Server');

// Don't show in macOS dock
if (process.platform === 'darwin') app.dock.hide();

app.whenReady().then(() => {
  createTray();
  spawnNext();
  spawnWs();

  // Wait for Next.js to be ready, then show notification
  waitForPort(3000, 60_000).then(() => {
    new Notification({
      title: 'DisplayGrid',
      body: 'Server is running — open http://localhost:3000',
    }).show();
  }).catch(() => {});
});

app.on('window-all-closed', (e) => {
  // Keep running even with no windows open
  e.preventDefault?.();
});

app.on('before-quit', killAll);

// ── Helpers ─────────────────────────────────────────────────────────────────

function waitForPort(port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get(`http://localhost:${port}`, () => { req.destroy(); resolve(); });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(attempt, 1000);
      });
      req.setTimeout(1000, () => req.destroy());
    }
    attempt();
  });
}

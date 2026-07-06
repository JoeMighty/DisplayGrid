const { app, BrowserWindow, Tray, Menu, shell, nativeImage, dialog, Notification } = require('electron');
const { spawn } = require('child_process');
const { randomBytes } = require('crypto');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { autoUpdater } = require('electron-updater');

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

// User data dir — where the SQLite db and secrets live at runtime
const userData = app.getPath('userData');
const DB_PATH  = path.join(userData, 'displaygrid.db');

// ── Logging ──────────────────────────────────────────────────────────────────

const LOG_PATH = path.join(userData, 'displaygrid-server.log');

function initLog() {
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(LOG_PATH, `--- DisplayGrid Server started ${new Date().toISOString()} ---\n`);
}

function log(tag, msg) {
  const line = `[${new Date().toISOString()}] [${tag}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
}

// ── Auth secret ───────────────────────────────────────────────────────────────

const SECRET_PATH = path.join(userData, 'auth-secret');

function getOrCreateSecret() {
  try {
    const existing = fs.readFileSync(SECRET_PATH, 'utf8').trim();
    if (existing.length > 0) return existing;
  } catch {}
  const secret = randomBytes(32).toString('hex');
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
  return secret;
}

// ── Database migrations ─────────────────────────────────────────────────────
//
// The dashboard never creates its own schema — tables come from the drizzle
// migration SQL in packages/db/drizzle (bundled as resources/drizzle).  Run
// any unapplied migrations against the userData DB before starting the
// servers.  Dev installs keep using `pnpm db:migrate`.

function runMigrations() {
  if (isDev) return;
  try {
    // resources/node_modules/better-sqlite3 is rebuilt for Electron's ABI by
    // CI, so the main process can load it directly.
    const Database = require(resPath('node_modules/better-sqlite3'));
    const dir = resPath('drizzle');
    const journal = JSON.parse(fs.readFileSync(path.join(dir, 'meta', '_journal.json'), 'utf8'));
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const sqlite = new Database(DB_PATH);
    try {
      sqlite.pragma('journal_mode = WAL');
      sqlite.exec('CREATE TABLE IF NOT EXISTS displaygrid_migrations (tag TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
      const applied = new Set(sqlite.prepare('SELECT tag FROM displaygrid_migrations').all().map(r => r.tag));
      for (const entry of journal.entries) {
        if (applied.has(entry.tag)) continue;
        const sql = fs.readFileSync(path.join(dir, `${entry.tag}.sql`), 'utf8');
        sqlite.transaction(() => {
          sqlite.exec(sql);
          sqlite.prepare('INSERT INTO displaygrid_migrations (tag, applied_at) VALUES (?, ?)').run(entry.tag, Date.now());
        })();
        log('main', `DB migration applied: ${entry.tag}`);
      }
    } finally {
      sqlite.close();
    }
  } catch (e) {
    log('main', `DB migration FAILED: ${e.message}`);
  }
}

// ── Auto-update ─────────────────────────────────────────────────────────────
//
// electron-updater can self-update the NSIS install (Windows) and the
// AppImage (Linux). The unsigned macOS build and the .deb cannot — those get
// a manual "Check for Updates" that compares against the latest GitHub
// release and opens the download page.

const RELEASES_URL = 'https://github.com/JoeMighty/DisplayGrid/releases/latest';

// Set when an update has been downloaded and is ready to install on restart.
let updateReadyVersion = null;

function autoUpdateSupported() {
  return process.platform === 'win32' ||
         (process.platform === 'linux' && !!process.env.APPIMAGE);
}

function initAutoUpdate() {
  if (isDev || !autoUpdateSupported()) return;
  autoUpdater.channel = 'server';
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', (info) => {
    updateReadyVersion = info.version;
    log('updater', `Update v${info.version} downloaded — will install on restart`);
    refreshTrayMenu();
    new Notification({
      title: 'DisplayGrid',
      body: `Update v${info.version} downloaded. Restart DisplayGrid to apply it.`,
    }).show();
  });
  autoUpdater.on('error', (e) => log('updater', `Error: ${e.message}`));
  const check = () => autoUpdater.checkForUpdates().catch(e => log('updater', `Check failed: ${e.message}`));
  check();
  setInterval(check, 4 * 60 * 60 * 1000);
}

// Compare dotted versions: returns true when b is newer than a.
function isNewerVersion(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pb[i] || 0) > (pa[i] || 0)) return true;
    if ((pb[i] || 0) < (pa[i] || 0)) return false;
  }
  return false;
}

async function manualUpdateCheck() {
  try {
    const res = await fetch('https://api.github.com/repos/JoeMighty/DisplayGrid/releases/latest', {
      headers: { 'User-Agent': 'DisplayGrid-Server' },
    });
    const latest = String((await res.json()).tag_name || '').replace(/^v/, '');
    if (latest && isNewerVersion(app.getVersion(), latest)) {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        message: `DisplayGrid v${latest} is available (you have v${app.getVersion()}).`,
        buttons: ['Open download page', 'Later'],
      });
      if (response === 0) shell.openExternal(RELEASES_URL);
    } else {
      dialog.showMessageBox({ type: 'info', message: `DisplayGrid is up to date (v${app.getVersion()}).` });
    }
  } catch (e) {
    log('updater', `Manual check failed: ${e.message}`);
    dialog.showMessageBox({ type: 'warning', message: 'Could not check for updates. Are you online?' });
  }
}

function checkForUpdatesInteractive() {
  if (autoUpdateSupported() && !isDev) {
    autoUpdater.checkForUpdates()
      .then(r => {
        if (!r || !r.updateInfo || !isNewerVersion(app.getVersion(), r.updateInfo.version)) {
          dialog.showMessageBox({ type: 'info', message: `DisplayGrid is up to date (v${app.getVersion()}).` });
        }
        // If newer, the update-downloaded handler takes over.
      })
      .catch(() => manualUpdateCheck());
  } else {
    manualUpdateCheck();
  }
}

// ── Child processes ─────────────────────────────────────────────────────────

let nextProcess = null;
let wsProcess   = null;

function spawnNext() {
  // In dev: standalone is at <repo root>/apps/dashboard/.next/standalone/apps/dashboard/server.js
  // In prod: electron-builder copies .next/standalone/* to resources root.
  //          pnpm monorepo standalone mirrors the workspace structure, so server.js lands at
  //          resources/apps/dashboard/server.js (not resources/server.js).
  const serverJs = isDev
    ? resPath('apps/dashboard/.next/standalone/apps/dashboard/server.js')
    : resPath('apps/dashboard/server.js');

  log('main', `Starting Next.js server: ${serverJs}`);

  if (!fs.existsSync(serverJs)) {
    log('main', `ERROR: server.js not found at ${serverJs}`);
    dialog.showErrorBox(
      'Build required',
      `Dashboard not built yet.\n\nRun: pnpm --filter @displaygrid/dashboard build\n\nExpected: ${serverJs}`
    );
    return;
  }

  const env = {
    ...process.env,
    // ELECTRON_RUN_AS_NODE makes the Electron binary behave like Node.js
    // when used as a child process — required on all platforms
    ELECTRON_RUN_AS_NODE: '1',
    PORT: '5555',
    NODE_ENV: 'production',
    DB_PATH,
    NEXTAUTH_URL: 'http://localhost:5555',
    NEXTAUTH_SECRET: getOrCreateSecret(),
    // Auth.js v5 rejects requests in production unless the host is trusted;
    // the server only binds localhost, so trusting it is safe.
    AUTH_TRUST_HOST: 'true',
    // Keep uploaded assets in userData alongside the DB. Without this the
    // dashboard defaults to cwd/../../data/uploads, which lands outside the
    // install directory in packaged apps.
    UPLOAD_DIR: path.join(userData, 'uploads'),
    // Next.js standalone bundles its own node_modules including sharp
    NEXT_SHARP_PATH: isDev
      ? resPath('node_modules/sharp')
      : resPath('node_modules/sharp'),
  };

  const cwd = isDev
    ? resPath('apps/dashboard/.next/standalone')
    : ROOT;

  log('main', `CWD: ${cwd}`);

  nextProcess = spawn(process.execPath, [serverJs], { env, cwd, stdio: 'pipe' });
  nextProcess.stdout.on('data', d => log('next', d.toString().trim()));
  nextProcess.stderr.on('data', d => log('next:err', d.toString().trim()));
  nextProcess.on('exit', code => log('next', `exited with code ${code}`));
}

function spawnWs() {
  const wsJs = isDev
    ? resPath('apps/dashboard/ws-server.js')
    : resPath('ws-server.js');

  log('main', `Starting WS server: ${wsJs}`);

  if (!fs.existsSync(wsJs)) {
    log('main', `ERROR: ws-server.js not found at ${wsJs}`);
    return;
  }

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    DB_PATH,
    // ws-server.js sits at the resources root, so Node.js module resolution
    // walks up away from the dashboard subtree.  NODE_PATH bridges the gap:
    // better-sqlite3 (rebuilt for Electron by CI) lives in
    // resources/apps/dashboard/node_modules/ alongside next's other deps.
    NODE_PATH: resPath('apps/dashboard/node_modules'),
  };

  wsProcess = spawn(process.execPath, [wsJs], { env, stdio: 'pipe' });
  wsProcess.stdout.on('data', d => log('ws', d.toString().trim()));
  wsProcess.stderr.on('data', d => log('ws:err', d.toString().trim()));
  wsProcess.on('exit', code => log('ws', `exited with code ${code}`));
}

function killAll() {
  if (nextProcess) { try { nextProcess.kill(); } catch {} nextProcess = null; }
  if (wsProcess)   { try { wsProcess.kill();   } catch {} wsProcess   = null; }
}

function restartAll() {
  killAll();
  setTimeout(() => { spawnNext(); spawnWs(); }, 500);
}

// ── Main window ─────────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'DisplayGrid',
    icon: path.join(__dirname, 'icon.png'),
    show: false, // revealed once the server is ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:5555');

  // Hide instead of close so the server keeps running
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function showWindow() {
  if (!mainWindow) createWindow();
  mainWindow.show();
  mainWindow.focus();
}

// ── Application menu ────────────────────────────────────────────────────────

function createAppMenu() {
  const version = app.getVersion();
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: `DisplayGrid  v${version}`, enabled: false },
        {
          label: 'Check for Updates…',
          click: () => checkForUpdatesInteractive(),
        },
        { type: 'separator' },
        {
          label: 'Website',
          click: () => shell.openExternal('https://joemighty.github.io/DisplayGrid/'),
        },
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/JoeMighty/DisplayGrid'),
        },
        { type: 'separator' },
        {
          label: 'View Logs',
          click: () => shell.openPath(LOG_PATH),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
  tray.on('double-click', () => showWindow());
  refreshTrayMenu();
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'DisplayGrid Server', enabled: false },
    ...(updateReadyVersion ? [{
      label: `Restart to update (v${updateReadyVersion})`,
      click: () => { app.isQuiting = true; killAll(); autoUpdater.quitAndInstall(); },
    }] : []),
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => showWindow(),
    },
    {
      label: 'Open in Browser',
      click: () => shell.openExternal('http://localhost:5555'),
    },
    { type: 'separator' },
    {
      label: 'Restart Services',
      click: () => {
        restartAll();
        new Notification({ title: 'DisplayGrid', body: 'Services restarting…' }).show();
      },
    },
    {
      label: 'View Logs',
      click: () => shell.openPath(LOG_PATH),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.isQuiting = true; killAll(); app.quit(); },
    },
  ]));
}

// ── App lifecycle ───────────────────────────────────────────────────────────

// Single instance lock — focus existing window if a second instance is launched
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => showWindow());

app.setName('DisplayGrid Server');

// macOS: app.dock is always visible — the dock icon lets users re-open the window
// even when it has been closed/hidden to the background.

app.whenReady().then(() => {
  initLog();
  log('main', `isDev=${isDev} ROOT=${ROOT}`);
  runMigrations();
  createAppMenu();
  createTray();
  createWindow();
  spawnNext();
  spawnWs();
  initAutoUpdate();

  // Show the window once the server is ready
  waitForPort(5555, 60_000).then(() => {
    log('main', 'Next.js ready on port 5555');
    showWindow();
  }).catch(() => {
    log('main', 'Timed out waiting for port 5555');
  });
});

// Keep the app alive when the window is closed (still in tray)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On non-mac, keep running in tray — do NOT quit
  }
});

app.on('activate', () => showWindow()); // macOS dock click

app.on('before-quit', () => { app.isQuiting = true; killAll(); });

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

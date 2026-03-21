const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Paths ───────────────────────────────────────────────────────────────────

const isDev = !app.isPackaged;
const userDataDir = app.getPath('userData');
const configPath  = path.join(userDataDir, 'kiosk-config.json');

// ── Config ──────────────────────────────────────────────────────────────────

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {
      apiBase:     'http://localhost:3000',
      wsBase:      'ws://localhost:3001',
      screenToken: '',
    };
  }
}

function saveConfig(config) {
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ── Window ──────────────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow the renderer to connect to any server host
      webSecurity: true,
    },
  });

  // Pass user data path to preload via env
  process.env.DISPLAYGRID_USER_DATA = userDataDir;

  // Disable right-click context menu
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  // Block all navigation away from the display client
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const config = loadConfig();
    const allowed = [config.apiBase, 'file://'].some(base => url.startsWith(base));
    if (!allowed) e.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Load the display client
  if (isDev) {
    // In dev, point at the running Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the bundled display-client build
    const indexHtml = path.join(process.resourcesPath, 'renderer/index.html');
    mainWindow.loadFile(indexHtml);
  }
}

// ── IPC ─────────────────────────────────────────────────────────────────────

ipcMain.on('save-token', (_event, token) => {
  const config = loadConfig();
  config.screenToken = token;
  saveConfig(config);
});

// ── Shortcuts ───────────────────────────────────────────────────────────────

// Ctrl+Alt+Q or Cmd+Alt+Q — emergency quit (for dev/setup)
function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Alt+Q', () => app.quit());
}

// ── App lifecycle ───────────────────────────────────────────────────────────

// Single instance — only one kiosk window at a time
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.setName('DisplayGrid Kiosk');

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

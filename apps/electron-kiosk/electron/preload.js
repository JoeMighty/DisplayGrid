const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs   = require('fs');

// Read config written by the main process
const configPath = path.join(process.env.DISPLAYGRID_USER_DATA || '', 'kiosk-config.json');

let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {}

// Expose config to the renderer as window.__displaygrid
contextBridge.exposeInMainWorld('__displaygrid', {
  apiBase:     config.apiBase     || 'http://localhost:3000',
  wsBase:      config.wsBase      || 'ws://localhost:3001',
  screenToken: config.screenToken || '',
  isElectron:  true,

  // Allow renderer to save the token after first-run pairing
  saveToken: (token) => ipcRenderer.send('save-token', token),
});

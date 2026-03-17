/**
 * DisplayGrid WebSocket server — runs on port 3001.
 * Display clients connect here with their screen token.
 * Keeps screen_sessions table up to date and broadcasts
 * playlist payloads when requested.
 */

'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const url = require('url');
const path = require('path');

// Load env from .env.local
try {
  require('fs').readFileSync(path.join(__dirname, '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .forEach(l => {
      const [k, ...v] = l.split('=');
      if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
    });
} catch {}

const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH ?? path.resolve(__dirname, '../../data/displaygrid.db');
const db = new Database(DB_PATH);

const PORT = parseInt(process.env.WS_PORT ?? '3001');
const wss  = new WebSocketServer({ port: PORT });

// Map of screenId → Set<WebSocket>
const connections = new Map();

function broadcast(screenId, payload) {
  const conns = connections.get(screenId);
  if (!conns) return;
  const msg = JSON.stringify(payload);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function getPlayload(screenId) {
  const rawSlides = db.prepare(`
    SELECT s.*, a.filename as asset_filename, a.mime_type as asset_mime_type, a.type as asset_type
    FROM slides s
    LEFT JOIN playlists p ON s.playlist_id = p.id
    LEFT JOIN assets a ON s.asset_id = a.id
    WHERE p.screen_id = ? AND p.is_active = 1 AND s.enabled = 1
    ORDER BY s.sort_order ASC
  `).all(screenId);

  // Map snake_case DB columns → camelCase expected by SlidePlayer
  const slides = rawSlides.map(s => ({
    ...s,
    contentType:     s.content_type,
    durationSeconds: s.duration_seconds,
    assetId:         s.asset_id,
    sortOrder:       s.sort_order,
    playlistId:      s.playlist_id,
    createdAt:       s.created_at,
  }));

  const override = db.prepare(`
    SELECT * FROM emergency_override
    WHERE is_active = 1 AND (active_to IS NULL OR active_to > ?)
    LIMIT 1
  `).get(Math.floor(Date.now() / 1000));

  return { type: 'playlist', slides, override: override ?? null };
}

wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  const token = query.token;

  if (!token) { ws.close(1008, 'Missing token'); return; }

  const screen = db.prepare('SELECT * FROM screens WHERE token = ?').get(token);
  if (!screen) { ws.close(1008, 'Invalid token'); return; }

  const screenId = screen.id;
  const ip = req.socket.remoteAddress;

  // Register session
  db.prepare(`
    INSERT INTO screen_sessions (screen_id, last_seen, ip, client_version)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(screen_id) DO UPDATE SET last_seen = excluded.last_seen, ip = excluded.ip, client_version = excluded.client_version
  `).run(screenId, Math.floor(Date.now() / 1000), ip, query.version ?? null);

  if (!connections.has(screenId)) connections.set(screenId, new Set());
  connections.get(screenId).add(ws);

  console.log(`[WS] Screen connected: ${screen.name} (id=${screenId}, ip=${ip})`);

  // Send initial playlist
  ws.send(JSON.stringify(getPlayload(screenId)));

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'heartbeat') {
        db.prepare('UPDATE screen_sessions SET last_seen = ?, current_slide_id = ? WHERE screen_id = ?')
          .run(Math.floor(Date.now() / 1000), msg.slideId ?? null, screenId);
        ws.send(JSON.stringify({ type: 'ack' }));
      } else if (msg.type === 'get_playlist') {
        ws.send(JSON.stringify(getPlayload(screenId)));
      }
    } catch {}
  });

  ws.on('close', () => {
    connections.get(screenId)?.delete(ws);
    console.log(`[WS] Screen disconnected: ${screen.name} (id=${screenId})`);
  });
});

// Exported so other modules can call broadcast()
module.exports = { broadcast, wss };

console.log(`[WS] DisplayGrid WebSocket server running on ws://localhost:${PORT}`);

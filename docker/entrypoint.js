/**
 * Container entrypoint for the DisplayGrid server.
 *
 * 1. Applies any unapplied drizzle migrations to the SQLite DB (same
 *    journal-based runner the Electron app uses).
 * 2. Ensures an auth secret exists (persisted in /data unless provided).
 * 3. Spawns the Next.js standalone server and the WebSocket server, and
 *    forwards termination signals so `docker stop` shuts down cleanly.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DB_PATH = process.env.DB_PATH || '/data/displaygrid.db';
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.join(ROOT, 'drizzle');

function log(tag, msg) {
  process.stdout.write(`[${tag}] ${msg}\n`);
}

// ── Migrations ──────────────────────────────────────────────────────────────

function runMigrations() {
  const Database = require(path.join(ROOT, 'node_modules/better-sqlite3'));
  const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8'));
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  try {
    sqlite.pragma('journal_mode = WAL');
    sqlite.exec('CREATE TABLE IF NOT EXISTS displaygrid_migrations (tag TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
    const applied = new Set(sqlite.prepare('SELECT tag FROM displaygrid_migrations').all().map(r => r.tag));
    for (const entry of journal.entries) {
      if (applied.has(entry.tag)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8');
      sqlite.transaction(() => {
        sqlite.exec(sql);
        sqlite.prepare('INSERT INTO displaygrid_migrations (tag, applied_at) VALUES (?, ?)').run(entry.tag, Date.now());
      })();
      log('migrate', `applied: ${entry.tag}`);
    }
  } finally {
    sqlite.close();
  }
}

// ── Auth secret ─────────────────────────────────────────────────────────────

function getOrCreateSecret() {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  const secretPath = path.join(path.dirname(DB_PATH), 'auth-secret');
  try {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing) return existing;
  } catch {}
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  log('main', `generated auth secret at ${secretPath}`);
  return secret;
}

// ── Processes ───────────────────────────────────────────────────────────────

runMigrations();

const env = {
  ...process.env,
  NODE_ENV: 'production',
  DB_PATH,
  NEXTAUTH_SECRET: getOrCreateSecret(),
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || 'true',
  PORT: process.env.PORT || '3000',
  HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
  UPLOAD_DIR: process.env.UPLOAD_DIR || '/data/uploads',
};

const children = [];

function launch(name, script) {
  const child = spawn(process.execPath, [script], { cwd: ROOT, env, stdio: 'inherit' });
  child.on('exit', (code) => {
    log(name, `exited with code ${code}`);
    shutdown(code === 0 ? 0 : 1);
  });
  children.push(child);
  log('main', `started ${name} (pid ${child.pid})`);
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) { try { c.kill('SIGTERM'); } catch {} }
  setTimeout(() => process.exit(code), 3000).unref();
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

launch('next', path.join(ROOT, 'apps/dashboard/server.js'));
launch('ws', path.join(ROOT, 'ws-server.js'));

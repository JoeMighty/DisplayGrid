import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { getSetting, setSetting } from '@/lib/settings';

// API tokens for machine access. Stored as JSON in settings (no migration).
// Only the SHA-256 hash is kept — the plaintext is shown once on creation.
const SETTINGS_KEY = 'api_tokens';
const PREFIX = 'dg_';

export interface StoredToken {
  id:        string;
  name:      string;
  hash:      string;
  createdAt: number;
  lastUsed:  number | null;
}
export interface TokenSummary {
  id: string; name: string; createdAt: number; lastUsed: number | null;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

async function readAll(): Promise<StoredToken[]> {
  const raw = await getSetting(SETTINGS_KEY);
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
async function writeAll(tokens: StoredToken[]) {
  await setSetting(SETTINGS_KEY, JSON.stringify(tokens));
}

export async function listTokens(): Promise<TokenSummary[]> {
  return (await readAll()).map(({ id, name, createdAt, lastUsed }) => ({ id, name, createdAt, lastUsed }));
}

/** Creates a token and returns the plaintext ONCE. */
export async function createToken(name: string): Promise<{ token: string; summary: TokenSummary }> {
  const token = PREFIX + randomBytes(24).toString('hex');
  const rec: StoredToken = {
    id: randomBytes(6).toString('hex'),
    name: name.slice(0, 60).trim() || 'API token',
    hash: sha256(token),
    createdAt: Date.now(),
    lastUsed: null,
  };
  const all = await readAll();
  all.push(rec);
  await writeAll(all);
  return { token, summary: { id: rec.id, name: rec.name, createdAt: rec.createdAt, lastUsed: rec.lastUsed } };
}

export async function revokeToken(id: string) {
  await writeAll((await readAll()).filter(t => t.id !== id));
}

/**
 * Verifies the Authorization: Bearer <token> header against stored hashes.
 * Returns the token name on success (and bumps lastUsed), else null.
 */
export async function verifyApiToken(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const presented = m[1].trim();
  if (!presented.startsWith(PREFIX)) return null;

  const hash = sha256(presented);
  const all = await readAll();
  const found = all.find(t => t.hash === hash);
  if (!found) return null;

  found.lastUsed = Date.now();
  await writeAll(all);
  return found.name;
}

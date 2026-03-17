/**
 * REST heartbeat endpoint for display clients that can't use WebSocket.
 * Also used by the dashboard to poll screen online status.
 * Public route (no auth) — protected by screen token only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, screens, screenSessions } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET /api/screen-session?token=<token>  — return session info
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const [screen] = await db.select().from(screens).where(eq(screens.token, token)).limit(1);
  if (!screen) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  const [session] = await db.select().from(screenSessions).where(eq(screenSessions.screenId, screen.id)).limit(1);
  return NextResponse.json({ screen, session: session ?? null });
}

// POST /api/screen-session — heartbeat from display client
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, slideId, version } = body;
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const [screen] = await db.select().from(screens).where(eq(screens.token, token)).limit(1);
  if (!screen) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const now = new Date();

  await db
    .insert(screenSessions)
    .values({ screenId: screen.id, lastSeen: now, ip, currentSlideId: slideId ?? null, clientVersion: version ?? null })
    .onConflictDoUpdate({
      target: screenSessions.screenId,
      set: { lastSeen: now, ip, currentSlideId: slideId ?? null, clientVersion: version ?? null },
    });

  return NextResponse.json({ ok: true });
}

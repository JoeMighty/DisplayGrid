import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, playlists, slides, screens } from '@/lib/db';
import { eq, count } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id:       playlists.id,
      name:     playlists.name,
      screenId: playlists.screenId,
      isActive: playlists.isActive,
    })
    .from(playlists)
    .all();

  // Enrich with slide counts and screen names
  const enriched = await Promise.all(rows.map(async p => {
    const [slideCount] = await db.select({ count: count() }).from(slides).where(eq(slides.playlistId, p.id));
    const [screen]     = await db.select({ name: screens.name }).from(screens).where(eq(screens.id, p.screenId));
    return { ...p, slideCount: slideCount?.count ?? 0, screenName: screen?.name ?? null };
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { screenId, name } = await req.json();
  if (!screenId) return NextResponse.json({ error: 'screenId required' }, { status: 400 });

  const [playlist] = await db.insert(playlists).values({
    screenId,
    name: name?.trim() || 'Default',
    isActive: true,
  }).returning();

  return NextResponse.json(playlist, { status: 201 });
}

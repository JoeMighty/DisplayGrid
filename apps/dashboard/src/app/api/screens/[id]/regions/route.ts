import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, screenRegions, playlists } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const screenId = parseInt(params.id);
    const rows = await db
      .select({
        id:           screenRegions.id,
        screenId:     screenRegions.screenId,
        name:         screenRegions.name,
        x:            screenRegions.x,
        y:            screenRegions.y,
        width:        screenRegions.width,
        height:       screenRegions.height,
        playlistId:   screenRegions.playlistId,
        sortOrder:    screenRegions.sortOrder,
        playlistName: playlists.name,
      })
      .from(screenRegions)
      .leftJoin(playlists, eq(screenRegions.playlistId, playlists.id))
      .where(eq(screenRegions.screenId, screenId))
      .orderBy(screenRegions.sortOrder)
      .all();

    return NextResponse.json(rows);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const screenId = parseInt(params.id);
    const { name, x, y, width, height, playlistId, sortOrder } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const [region] = await db.insert(screenRegions).values({
      screenId,
      name:       name.trim(),
      x:          x ?? 0,
      y:          y ?? 0,
      width:      width ?? 100,
      height:     height ?? 100,
      playlistId: playlistId ?? null,
      sortOrder:  sortOrder ?? 0,
    }).returning();

    return NextResponse.json(region, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

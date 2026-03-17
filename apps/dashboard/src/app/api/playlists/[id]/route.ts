import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, playlists, slides, assets } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const slideRows = await db
    .select({
      id:              slides.id,
      playlistId:      slides.playlistId,
      assetId:         slides.assetId,
      contentType:     slides.contentType,
      content:         slides.content,
      durationSeconds: slides.durationSeconds,
      transition:      slides.transition,
      sortOrder:       slides.sortOrder,
      scheduleJson:    slides.scheduleJson,
      enabled:         slides.enabled,
      assetFilename:   assets.filename,
      assetOrigName:   assets.originalName,
      assetMimeType:   assets.mimeType,
      assetType:       assets.type,
    })
    .from(slides)
    .leftJoin(assets, eq(slides.assetId, assets.id))
    .where(eq(slides.playlistId, id))
    .orderBy(slides.sortOrder)
    .all();

  return NextResponse.json({ ...playlist, slides: slideRows });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id   = parseInt(params.id);
  const body = await req.json();

  await db.update(playlists).set({ name: body.name, isActive: body.isActive }).where(eq(playlists.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.delete(playlists).where(eq(playlists.id, parseInt(params.id)));
  return new NextResponse(null, { status: 204 });
}

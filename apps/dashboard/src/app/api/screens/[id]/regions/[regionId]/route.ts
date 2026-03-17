import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, screenRegions } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; regionId: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const regionId = parseInt(params.regionId);
  const { name, x, y, width, height, playlistId, sortOrder } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const [updated] = await db
    .update(screenRegions)
    .set({
      name:       name.trim(),
      x:          x ?? 0,
      y:          y ?? 0,
      width:      width ?? 100,
      height:     height ?? 100,
      playlistId: playlistId ?? null,
      sortOrder:  sortOrder ?? 0,
    })
    .where(eq(screenRegions.id, regionId))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; regionId: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.delete(screenRegions).where(eq(screenRegions.id, parseInt(params.regionId)));
  return NextResponse.json({ ok: true });
}

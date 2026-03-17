import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, screens } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  const { name, zoneId, resolutionW, resolutionH, refreshRate, rotation, panelGridCols, panelGridRows, colourProfile } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const [updated] = await db.update(screens).set({
    name:          name.trim(),
    zoneId:        zoneId ?? null,
    resolutionW:   resolutionW,
    resolutionH:   resolutionH,
    refreshRate:   refreshRate,
    rotation:      rotation,
    panelGridCols: panelGridCols,
    panelGridRows: panelGridRows,
    colourProfile: colourProfile,
  }).where(eq(screens.id, id)).returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  await db.delete(screens).where(eq(screens.id, id));
  return NextResponse.json({ ok: true });
}

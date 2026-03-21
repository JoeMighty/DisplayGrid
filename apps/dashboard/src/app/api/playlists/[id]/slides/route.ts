import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, slides } from '@/lib/db';
import { eq } from 'drizzle-orm';

// POST — add a slide to a playlist
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const playlistId = parseInt(params.id);
  const body = await req.json();

  const { contentType, assetId, content, durationSeconds, transition, sortOrder, scheduleJson, enabled } = body;
  if (!contentType) return NextResponse.json({ error: 'contentType required' }, { status: 400 });

  const [slide] = await db.insert(slides).values({
    playlistId,
    contentType,
    assetId:         assetId         ?? null,
    content:         content         ?? null,
    durationSeconds: durationSeconds ?? 10,
    transition:      transition      ?? 'fade',
    sortOrder:       sortOrder       ?? 0,
    scheduleJson:    scheduleJson    ?? null,
    enabled:         enabled         ?? true,
  }).returning();

  return NextResponse.json(slide, { status: 201 });
}

// PUT — reorder all slides (bulk update sortOrder)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { order } = await req.json() as { order: number[] };

  for (let i = 0; i < order.length; i++) {
    await db.update(slides).set({ sortOrder: i }).where(eq(slides.id, order[i]));
  }

  return NextResponse.json({ ok: true });
}

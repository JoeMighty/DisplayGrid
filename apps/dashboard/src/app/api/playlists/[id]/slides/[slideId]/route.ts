import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, slides } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest, { params }: { params: { id: string; slideId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const slideId = parseInt(params.slideId);
  const body = await req.json();

  await db.update(slides).set({
    contentType:     body.contentType,
    assetId:         body.assetId         ?? null,
    content:         body.content         ?? null,
    durationSeconds: body.durationSeconds ?? 10,
    transition:      body.transition      ?? 'fade',
    scheduleJson:    body.scheduleJson    ?? null,
    enabled:         body.enabled         ?? true,
  }).where(eq(slides.id, slideId));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; slideId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.delete(slides).where(eq(slides.id, parseInt(params.slideId)));
  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, zones } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const [updated] = await db.update(zones).set({ name: name.trim(), description: description?.trim() || null }).where(eq(zones.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  await db.delete(zones).where(eq(zones.id, id));
  return NextResponse.json({ ok: true });
}

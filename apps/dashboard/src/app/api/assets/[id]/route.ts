import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, assets } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete file from disk (best-effort)
  try { await unlink(asset.path); } catch {}

  await db.delete(assets).where(eq(assets.id, id));
  return new NextResponse(null, { status: 204 });
}
